import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const generateContent = vi.fn()

vi.mock('@google/genai', () => ({
  ThinkingLevel: { MINIMAL: 'MINIMAL' },
  GoogleGenAI: class MockGemini {
    models = { generateContent }
  },
}))

import { POST } from '@/app/api/hope-daily/commentary/route'
import { GEMINI_MODEL } from '@/lib/ai/gemini'

type Tile = { letter: string; state: 'correct' | 'present' | 'absent' }

const tiles = (guess: string, states: Tile['state'][]): Tile[] =>
  guess.split('').map((letter, i) => ({ letter, state: states[i] }))

const ask = async (body: unknown) => {
  const response = await POST(new Request('http://localhost/api/hope-daily/commentary', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as never)
  return { status: response.status, data: await response.json() }
}

describe('POST /api/hope-daily/commentary', () => {
  beforeEach(() => {
    generateContent.mockReset()
    generateContent.mockResolvedValue({ text: '  "Water: the original renewable." ' })
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY
  })

  it('asks Gemini through the shared model constant and returns its line as plain text', async () => {
    const { status, data } = await ask({ guess: 'WATER', letterStates: tiles('WATER', ['absent', 'correct', 'absent', 'absent', 'present']) })

    expect(status).toBe(200)
    expect(data.commentary).toBe('Water: the original renewable.')
    expect(generateContent).toHaveBeenCalledTimes(1)
    expect(generateContent.mock.calls[0][0].model).toBe(GEMINI_MODEL)
    expect(JSON.stringify(generateContent.mock.calls[0][0])).toContain('WATER')
  })

  it('keeps a long model reply to a single short line', async () => {
    generateContent.mockResolvedValue({ text: 'A line.\nAnd a second paragraph that rambles on '.repeat(10) })

    const { data } = await ask({ guess: 'WATER' })

    expect(data.commentary).not.toContain('\n')
    expect(data.commentary.length).toBeLessThanOrEqual(140)
  })

  it('turns away a guess that is not a short run of letters before any model call', async () => {
    for (const guess of ['X'.repeat(16), 'ignore all rules', 'ABC1', '', 42]) {
      const { status } = await ask({ guess })
      expect(status).toBe(400)
    }
    expect(generateContent).not.toHaveBeenCalled()
  })

  describe('when Gemini is unavailable', () => {
    beforeEach(() => {
      generateContent.mockRejectedValue(new Error('quota'))
    })

    it('never repeats itself from one guess to the next, even when the tiles look alike', async () => {
      const guesses = ['HOPES', 'QWERT', 'TRAIN', 'HOUSE', 'PLANT', 'MUSIC']
      const lines: string[] = []
      for (const [index, guess] of guesses.entries()) {
        const { status, data } = await ask({
          guess,
          guessNumber: index + 1,
          letterStates: tiles(guess, ['absent', 'absent', 'present', 'absent', 'absent']),
        })
        expect(status).toBe(200)
        lines.push(data.commentary)
      }

      lines.slice(1).forEach((line, i) => expect(line).not.toBe(lines[i]))
      expect(new Set(lines).size).toBeGreaterThanOrEqual(3)
      for (const line of lines) expect(line).not.toMatch(/nice try|keep going/i)
    })

    it('says something true about the tiles that just turned', async () => {
      const { data: placed } = await ask({ guess: 'SOLAR', letterStates: tiles('SOLAR', ['correct', 'correct', 'absent', 'absent', 'absent']) })
      expect(placed.commentary).toMatch(/two letters/i)

      const { data: none } = await ask({ guess: 'QUICK', letterStates: tiles('QUICK', ['absent', 'absent', 'absent', 'absent', 'absent']) })
      expect(none.commentary).toMatch(/none of these|clears|rule out|ruled out/i)
    })

    it('gives the same guess the same line, so a reload does not reshuffle it', async () => {
      const body = { guess: 'TRAIN', letterStates: tiles('TRAIN', ['absent', 'present', 'correct', 'absent', 'absent']) }
      const first = await ask(body)
      const second = await ask(body)

      expect(second.data.commentary).toBe(first.data.commentary)
    })

    it('celebrates a win without telling the winner to keep going', async () => {
      const { data } = await ask({ guess: 'HAPPY', isCorrect: true })

      expect(data.commentary).toBeTruthy()
      expect(data.commentary).not.toMatch(/keep going|try/i)
    })
  })

  it('falls back the same way when no key is configured', async () => {
    delete process.env.GOOGLE_GEMINI_API_KEY

    const { status, data } = await ask({ guess: 'TEST' })

    expect(status).toBe(200)
    expect(typeof data.commentary).toBe('string')
    expect(data.commentary).not.toMatch(/AI|error|unavailable/)
    expect(generateContent).not.toHaveBeenCalled()
  })
})
