import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/games/hope-daily/words', () => ({
  getWordOfDay: () => ({
    word: 'HAPPY',
    clue: 'How a good day feels',
    category: 'Health',
    fact: 'Happiness is contagious.',
    source: 'https://example.org',
  }),
}))

import { POST } from '@/app/api/hope-daily/hint/route'

const ask = async (body: unknown) => {
  const response = await POST(new Request('http://localhost/api/hope-daily/hint', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as never)
  return { status: response.status, data: await response.json() }
}

describe('POST /api/hope-daily/hint', () => {
  it('shows the first letter the player does not know yet', async () => {
    expect(await ask({ known: [] })).toEqual({ status: 200, data: { position: 0, letter: 'H' } })
    expect(await ask({ known: [0, 1, 3] })).toEqual({ status: 200, data: { position: 2, letter: 'P' } })
  })

  it('has nothing more to give once every letter is known', async () => {
    expect((await ask({ known: [0, 1, 2, 3, 4] })).status).toBe(400)
  })

  it('turns away a request that does not list known places', async () => {
    expect((await ask({})).status).toBe(400)
    expect((await ask({ known: ['a'] })).status).toBe(400)
    expect((await ask({ known: [9] })).status).toBe(400)
  })
})
