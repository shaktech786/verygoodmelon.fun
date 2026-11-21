import { describe, it, expect, vi, beforeEach } from 'vitest'

const generateContent = vi.fn()

vi.mock('@/lib/ai/gemini', () => ({
  GEMINI_MODEL: 'test-model',
  MINIMAL_THINKING: {},
  getGemini: () => ({ models: { generateContent } }),
}))

import { POST as lastWordsReflect } from '@/app/api/last-words/reflect/route'
import { POST as firstWordsReflect } from '@/app/api/first-words/reflect/route'
import { CARE_REFLECTION } from '@/lib/games/community-words/reflect'

let ipCounter = 0
async function reflect(handler: typeof lastWordsReflect, message: unknown) {
  const response = await handler(
    new Request('http://localhost/api/last-words/reflect', {
      method: 'POST',
      body: JSON.stringify({ message }),
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.1.0.${++ipCounter}` },
    }) as never
  )
  return { status: response.status, body: await response.json() }
}

describe('reflection routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns the written reflection', async () => {
    generateContent.mockResolvedValue({ text: '  You chose gratitude over regret.  ' })
    const { status, body } = await reflect(lastWordsReflect, 'Thank you for the ordinary days.')

    expect(status).toBe(200)
    expect(body).toEqual({ reflection: 'You chose gratitude over regret.' })
    expect(generateContent.mock.calls[0][0].contents).toContain('Thank you for the ordinary days.')
  })

  it('gives each game its own voice', async () => {
    generateContent.mockResolvedValue({ text: 'Welcome.' })
    await reflect(lastWordsReflect, 'Goodbye')
    await reflect(firstWordsReflect, 'Hello?')

    const [last, first] = generateContent.mock.calls.map((call) => String(call[0].contents))
    expect(last).not.toEqual(first)
    expect(first).toMatch(/waking back up/i)
  })

  it('answers words that sound like someone may be in danger with care, never with improvisation', async () => {
    const { body } = await reflect(lastWordsReflect, 'I am going to kill myself tonight')

    expect(body).toEqual({ reflection: CARE_REFLECTION, care: true })
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('answers with care when the reply itself judges the words to carry risk', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ risk: true, reply: 'You can rest here now.' }) })
    const { body } = await reflect(firstWordsReflect, 'Everything feels heavy lately and I am done')

    expect(body).toEqual({ reflection: CARE_REFLECTION, care: true })
  })

  it('passes on the reply when the judgement finds no risk', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ risk: false, reply: 'Carry that laugh back into today.' }) })
    const { body } = await reflect(firstWordsReflect, 'Where did everyone go? I want to tell them a joke.')

    expect(body.reflection).toBe('Carry that laugh back into today.')
  })

  it('asks for a risk judgement and, for the arrival, a reply that turns back toward life', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ risk: false, reply: 'Welcome back.' }) })
    await reflect(firstWordsReflect, 'Hello?')

    const prompt = String(generateContent.mock.calls[0][0].contents)
    expect(prompt).toMatch(/risk/i)
    expect(prompt).toMatch(/never (?:suggest|say|imply)[^.]*(?:stay|no need to (?:go|return))/i)
  })

  it('gives The Awakening one small thing to bring back into tomorrow', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({ risk: false, reply: 'That quiet sounds like rest you have been missing.', intention: 'Take ten quiet minutes tomorrow morning.' }),
    })
    const { body } = await reflect(firstWordsReflect, 'It is so quiet here.')

    expect(body).toEqual({
      reflection: 'That quiet sounds like rest you have been missing.',
      intention: 'Take ten quiet minutes tomorrow morning.',
    })
    expect(String(generateContent.mock.calls[0][0].contents)).toMatch(/"intention"/)
  })

  it('replaces an intention that is unfit to show or sounds like danger with a written one', async () => {
    for (const intention of ['Never wake up again', 'Visit www.example.com', '']) {
      generateContent.mockResolvedValueOnce({ text: JSON.stringify({ risk: false, reply: 'Carry that home.', intention }) })
      const { body } = await reflect(firstWordsReflect, 'Hello?')

      expect(body.reflection).toBe('Carry that home.')
      expect(body.intention).toBeTruthy()
      expect(body.intention).not.toMatch(/wake up|example/i)
    }
  })

  it('offers a written intention whenever a fresh one is not available', async () => {
    generateContent.mockRejectedValue(new Error('quota'))
    const { body } = await reflect(firstWordsReflect, 'Hello?')

    expect(body.reflection).toBeTruthy()
    expect(body.intention).toBeTruthy()
  })

  it('gives no intention alongside care, and none to The Final Word', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ risk: true, reply: 'Rest.', intention: 'Stay.' }) })
    expect((await reflect(firstWordsReflect, 'I am so tired')).body).toEqual({ reflection: CARE_REFLECTION, care: true })

    generateContent.mockResolvedValue({ text: JSON.stringify({ risk: false, reply: 'Say it soon.', intention: 'Call her.' }) })
    expect((await reflect(lastWordsReflect, 'Love you, sis')).body).toEqual({ reflection: 'Say it soon.' })
    expect(String(generateContent.mock.calls.at(-1)?.[0].contents)).not.toMatch(/"intention"/)
  })

  it('asks The Final Word for plain words of its own instead of echoing the question', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ risk: false, reply: 'Say it soon.' }) })
    await reflect(lastWordsReflect, 'Love you, sis')

    const prompt = String(generateContent.mock.calls[0][0].contents)
    expect(prompt).not.toMatch(/hold[s]? most dear/i)
    expect(prompt).toMatch(/never use the words? [^.]*dear/i)
  })

  it('never passes on a reply that fails the same filter as the shared cloud', async () => {
    generateContent.mockResolvedValue({ text: 'Visit www.example.com for more, faggot.' })
    const { body } = await reflect(firstWordsReflect, 'Hello?')

    expect(body.reflection).toBeTruthy()
    expect(body.reflection).not.toMatch(/example|faggot/)
  })

  it('falls back to a written reflection when nothing comes back', async () => {
    generateContent.mockRejectedValue(new Error('quota'))
    const { status, body } = await reflect(lastWordsReflect, 'Be kind')

    expect(status).toBe(200)
    expect(body.reflection.length).toBeGreaterThan(20)
    expect(body.reflection).not.toMatch(/\bAI\b|generat|error|sorry/i)
  })

  it('rejects an empty or over-long message', async () => {
    expect((await reflect(lastWordsReflect, '')).status).toBe(400)
    expect((await reflect(lastWordsReflect, 'a'.repeat(501))).status).toBe(400)
  })
})
