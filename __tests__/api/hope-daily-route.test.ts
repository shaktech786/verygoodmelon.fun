import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/games/hope-daily/words', () => ({
  getWordOfDay: () => ({
    word: 'TOPSOIL',
    clue: 'The rich upper layer of the ground',
    category: 'Nature',
    fact: 'A single gram of healthy topsoil, about a pinch, typically holds 100 million to a billion bacteria, tiny recyclers that help plants grow.',
    source: 'https://cfaes.osu.edu/fact-sheet/understanding-soil-microbes-and-nutrient-recycling',
  }),
}))

import { GET, POST, PUT } from '@/app/api/hope-daily/route'
import { REFLECTIONS } from '@/lib/games/hope-daily/reflections'

const guess = async (body: unknown) => {
  const response = await POST(new Request('http://localhost/api/hope-daily', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as never)
  return { status: response.status, data: await response.json() }
}

describe('GET /api/hope-daily', () => {
  it('sends the theme, the length, the clue and the story with the word left out', async () => {
    const data = await (await GET()).json()

    expect(data).toMatchObject({ category: 'Nature', wordLength: 7, clue: 'The rich upper layer of the ground' })
    expect(data.story.length).toBeGreaterThanOrEqual(2)
    expect(JSON.stringify(data)).not.toMatch(/topsoil/i)
    expect(data.story.flat()).toContainEqual({ text: '', word: true })
  })
})

describe('POST /api/hope-daily', () => {
  it('names the letters in place for a guess that is not the word', async () => {
    const { status, data } = await guess({ guess: 'compost' })

    expect(status).toBe(200)
    expect(data).toEqual({ isCorrect: false, inPlace: [[1, 'O'], [4, 'O']] })
  })

  it('also shows the next letter not yet known when asked', async () => {
    const { data } = await guess({ guess: 'COMPOST', wantLetter: true, known: [0] })

    expect(data.letter).toEqual({ position: 2, letter: 'P' })
  })

  it('reveals the whole good news, its source and its own reflection for the word', async () => {
    const { data } = await guess({ guess: 'Topsoil' })

    expect(data.isCorrect).toBe(true)
    expect(data.reveal).toMatchObject({
      word: 'TOPSOIL',
      category: 'Nature',
      kind: REFLECTIONS.TOPSOIL.kind,
      reflection: REFLECTIONS.TOPSOIL.text,
      source: 'https://cfaes.osu.edu/fact-sheet/understanding-soil-microbes-and-nutrient-recycling',
    })
    expect(data.reveal.story.flat()).toContainEqual({ text: 'topsoil', word: true })
  })

  it('explains a guess of the wrong length or with other characters, kindly', async () => {
    expect(await guess({ guess: 'SOIL' })).toEqual({ status: 400, data: { error: 'Today’s word has 7 letters.' } })
    expect(await guess({ guess: 'TOPS0IL' })).toEqual({ status: 400, data: { error: 'Letters only, please.' } })
    expect((await guess({})).status).toBe(400)
    expect((await guess('not json')).status).toBe(400)
  })
})

describe('PUT /api/hope-daily', () => {
  it('shows the word and its good news to someone who would rather be told', async () => {
    const data = await (await PUT()).json()

    expect(data.word).toBe('TOPSOIL')
    expect(data.reflection).toBe(REFLECTIONS.TOPSOIL.text)
  })
})
