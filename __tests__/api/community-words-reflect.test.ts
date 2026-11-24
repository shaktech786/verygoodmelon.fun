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
async function reflect(handler: typeof lastWordsReflect, message: unknown, ip = `10.1.0.${++ipCounter}`) {
  const response = await handler(
    new Request('http://localhost/api/last-words/reflect', {
      method: 'POST',
      body: JSON.stringify({ message }),
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    }) as never
  )
  return { status: response.status, body: await response.json() }
}

type Call = [{ contents: string; config: { temperature: number } }]
const isJudgement = (call: Call) => call[0].config.temperature === 0

/** Answers the judgement call with a verdict and the creative call with a reply. */
function answer({ risk, ...reply }: { risk: unknown; reply?: string; intention?: string }) {
  generateContent.mockImplementation(async (request: Call[0]) =>
    request.config.temperature === 0 ? { text: JSON.stringify({ risk }) } : { text: JSON.stringify(reply) }
  )
}

function replyPrompts(): string[] {
  return (generateContent.mock.calls as Call[]).filter((call) => !isJudgement(call)).map((call) => String(call[0].contents))
}

function judgementCalls(): Call[] {
  return (generateContent.mock.calls as Call[]).filter(isJudgement)
}

describe('reflection routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns the written reflection', async () => {
    answer({ risk: false, reply: '  You chose gratitude over regret.  ' })
    const { status, body } = await reflect(lastWordsReflect, 'Thank you for the ordinary days.')

    expect(status).toBe(200)
    expect(body).toEqual({ reflection: 'You chose gratitude over regret.', safe: true })
    expect(replyPrompts()[0]).toContain('Thank you for the ordinary days.')
  })

  it('gives each game its own voice', async () => {
    answer({ risk: false, reply: 'Welcome.' })
    await reflect(lastWordsReflect, 'Goodbye')
    await reflect(firstWordsReflect, 'Hello?')

    const [last, first] = replyPrompts()
    expect(last).not.toEqual(first)
    expect(first).toMatch(/waking back up/i)
  })

  it('answers words that sound like someone may be in danger with care, never with improvisation', async () => {
    const { body } = await reflect(lastWordsReflect, 'I am going to kill myself tonight')

    expect(body).toEqual({ reflection: CARE_REFLECTION, care: true })
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('answers with care when the judgement finds risk, whatever the reply says', async () => {
    answer({ risk: true, reply: 'You can rest here now.' })
    const { body } = await reflect(firstWordsReflect, 'Everything feels heavy lately and I am done')

    expect(body).toEqual({ reflection: CARE_REFLECTION, care: true })
  })

  it('passes on the reply when the judgement finds no risk', async () => {
    answer({ risk: false, reply: 'Carry that laugh back into today.' })
    const { body } = await reflect(firstWordsReflect, 'Where did everyone go? I want to tell them a joke.')

    expect(body.reflection).toBe('Carry that laugh back into today.')
  })

  it('asks for a risk judgement and, for the arrival, a reply that turns back toward life', async () => {
    answer({ risk: false, reply: 'Welcome back.' })
    await reflect(firstWordsReflect, 'Hello?')

    expect(String(judgementCalls()[0][0].contents)).toMatch(/risk/i)
    const prompt = String(replyPrompts()[0])
    expect(prompt).toMatch(/never (?:suggest|say|imply)[^.]*(?:stay|no need to (?:go|return))/i)
  })

  it('gives The Awakening one small thing to bring back into tomorrow', async () => {
    answer({ risk: false, reply: 'That quiet sounds like rest you have been missing.', intention: 'Take ten quiet minutes tomorrow morning.' })
    const { body } = await reflect(firstWordsReflect, 'It is so quiet here.')

    expect(body).toEqual({
      reflection: 'That quiet sounds like rest you have been missing.',
      intention: 'Take ten quiet minutes tomorrow morning.',
      safe: true,
    })
    expect(String(replyPrompts()[0])).toMatch(/"intention"/)
  })

  it('replaces an intention that is unfit to show or sounds like danger with a written one', async () => {
    for (const intention of ['Never wake up again', 'Visit www.example.com', '']) {
      answer({ risk: false, reply: 'Carry that home.', intention })
      const { body } = await reflect(firstWordsReflect, 'Hello?')

      expect(body.reflection).toBe('Carry that home.')
      expect(body.intention).toBeTruthy()
      expect(body.intention).not.toMatch(/wake up|example/i)
    }
  })

  it('when the words could not be judged, hands nothing back to do and asks for the quiet line of support', async () => {
    generateContent.mockRejectedValue(new Error('quota'))
    const { status, body } = await reflect(firstWordsReflect, 'I am so tired of all of it, I do not want to go home')

    expect(status).toBe(200)
    expect(body.unjudged).toBe(true)
    expect(body.reflection).toBeTruthy()
    expect(body).not.toHaveProperty('intention')
    expect(body).not.toHaveProperty('care')
    expect(body).not.toHaveProperty('safe')
    // Nothing that would read as a push back toward the ending, or as an alarm
    expect(body.reflection).not.toMatch(/wait|sooner|today|tomorrow|while you are here|danger|crisis|help/i)
  })

  it('treats a judgement that carries no verdict as unjudged', async () => {
    generateContent.mockResolvedValue({ text: 'You chose gratitude over regret.' })
    const { body } = await reflect(lastWordsReflect, 'Thank you for the ordinary days.')

    expect(body.unjudged).toBe(true)
    expect(body.reflection).not.toBe('You chose gratitude over regret.')
    expect(body).not.toHaveProperty('safe')
  })

  it('treats a rate-limited visitor as unjudged too', async () => {
    answer({ risk: false, reply: 'Say it soon.' })
    const ip = '10.9.9.9'
    for (let i = 0; i < 10; i++) await reflect(lastWordsReflect, `Love you ${i}`, ip)
    const { body } = await reflect(lastWordsReflect, 'Love you again', ip)

    expect(judgementCalls()).toHaveLength(10)
    expect(body.unjudged).toBe(true)
    expect(body.reflection).not.toMatch(/wait|sooner/i)
  })

  it('never suggests something for "today" under a heading that says tomorrow', async () => {
    answer({ risk: false, reply: 'Carry that home.', intention: 'Call your sister today and laugh.' })
    for (let i = 0; i < 12; i++) {
      const { body } = await reflect(firstWordsReflect, 'I miss my sister.')
      expect(body.intention).toBeTruthy()
      expect(body.intention).not.toMatch(/\btoday\b/i)
    }
    expect(String(replyPrompts()[0])).toMatch(/never use the word "today"/i)
  })

  it('gives no intention alongside care, and none to The Final Word', async () => {
    answer({ risk: true, reply: 'Rest.', intention: 'Stay.' })
    expect((await reflect(firstWordsReflect, 'I am so tired')).body).toEqual({ reflection: CARE_REFLECTION, care: true })

    answer({ risk: false, reply: 'Say it soon.', intention: 'Call her.' })
    expect((await reflect(lastWordsReflect, 'Love you, sis')).body).toEqual({ reflection: 'Say it soon.', safe: true })
    expect(replyPrompts().at(-1)).not.toMatch(/"intention"/)
  })

  it('asks The Final Word for plain words of its own instead of echoing the question', async () => {
    answer({ risk: false, reply: 'Say it soon.' })
    await reflect(lastWordsReflect, 'Love you, sis')

    const prompt = String(replyPrompts()[0])
    expect(prompt).not.toMatch(/hold[s]? most dear/i)
    expect(prompt).toMatch(/never use the words? [^.]*dear/i)
  })

  it('never passes on a reply that fails the same filter as the shared cloud', async () => {
    answer({ risk: false, reply: 'Visit www.example.com for more, faggot.' })
    const { body } = await reflect(firstWordsReflect, 'Hello?')

    expect(body.reflection).toBeTruthy()
    expect(body.reflection).not.toMatch(/example|faggot/)
  })

  it('falls back to a written reflection when nothing comes back', async () => {
    generateContent.mockRejectedValue(new Error('quota'))
    const { status, body } = await reflect(lastWordsReflect, 'Be kind')

    expect(status).toBe(200)
    expect(body.reflection.length).toBeGreaterThan(20)
    expect(body.unjudged).toBe(true)
    expect(body.reflection).not.toMatch(/\bAI\b|generat|error|sorry/i)
  })

  it('judges risk in its own steady call, apart from the creative reply', async () => {
    answer({ risk: false, reply: 'Say it soon.' })
    await reflect(lastWordsReflect, 'I hope you all know I loved you. Go outside more.')

    const [judgement] = judgementCalls()
    expect(judgementCalls()).toHaveLength(1)
    expect(judgement[0]).toMatchObject({ model: 'test-model', config: { temperature: 0 } })
    expect((judgement[0].config as { maxOutputTokens: number }).maxOutputTokens).toBeLessThanOrEqual(64)
    expect(judgement[0].contents).toContain('I hope you all know I loved you. Go outside more.')
    expect(replyPrompts()).toHaveLength(1)
    expect(replyPrompts()[0]).not.toMatch(/"risk"/)
  })

  it('stays unjudged when the judgement fails, even if the reply came back', async () => {
    generateContent.mockImplementation(async (request: Call[0]) => {
      if (request.config.temperature === 0) throw new Error('quota')
      return { text: JSON.stringify({ reply: 'Say it soon.' }) }
    })
    const { body } = await reflect(lastWordsReflect, 'Thank you for the ordinary days.')

    expect(body.unjudged).toBe(true)
    expect(body).not.toHaveProperty('safe')
  })

  it('stays unjudged when the judgement is garbled or not a yes or no', async () => {
    for (const verdict of ['{"risk": "no"}', '{}', 'false', 'maybe']) {
      generateContent.mockImplementation(async (request: Call[0]) =>
        request.config.temperature === 0 ? { text: verdict } : { text: JSON.stringify({ reply: 'Say it soon.' }) }
      )
      const { body } = await reflect(lastWordsReflect, 'Thank you for the ordinary days.')
      expect(body.unjudged).toBe(true)
    }
  })

  it('passes on a written fallback when only the reply fails after a safe judgement', async () => {
    generateContent.mockImplementation(async (request: Call[0]) => {
      if (request.config.temperature === 0) return { text: JSON.stringify({ risk: false }) }
      throw new Error('quota')
    })
    const { body } = await reflect(lastWordsReflect, 'Thank you for the ordinary days.')

    expect(body.safe).toBe(true)
    expect(body.reflection.length).toBeGreaterThan(20)
  })

  it('rejects an empty or over-long message', async () => {
    expect((await reflect(lastWordsReflect, '')).status).toBe(400)
    expect((await reflect(lastWordsReflect, 'a'.repeat(501))).status).toBe(400)
  })
})
