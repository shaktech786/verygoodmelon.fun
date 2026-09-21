import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockInsert = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

import { POST } from '@/app/api/game-events/route'

function postEvent(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest('http://localhost/api/game-events', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers,
    })
  )
}

describe('POST /api/game-events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
    mockInsert.mockReturnValue({ error: null })
    mockFrom.mockImplementation(() => ({ insert: mockInsert }))
  })

  it('records an open event with no duration', async () => {
    const response = await postEvent({ event: 'open', gameId: 'hope-daily' })

    expect(response.status).toBe(204)
    expect(mockFrom).toHaveBeenCalledWith('game_events')
    expect(mockInsert).toHaveBeenCalledWith({
      game_id: 'hope-daily',
      event: 'open',
      duration_seconds: null,
    })
  })

  it('records a close event with its duration', async () => {
    const response = await postEvent({ event: 'close', gameId: 'cascade', durationSeconds: 95 })

    expect(response.status).toBe(204)
    expect(mockInsert).toHaveBeenCalledWith({
      game_id: 'cascade',
      event: 'close',
      duration_seconds: 95,
    })
  })

  it('stores only the game, event, and duration — never anything about the visitor', async () => {
    await postEvent(
      { event: 'open', gameId: 'hope-daily', userId: 'abc', email: 'someone@example.com' },
      { 'x-forwarded-for': '203.0.113.7', 'user-agent': 'TestBrowser/1.0', cookie: 'sb=secret' }
    )

    const stored = mockInsert.mock.calls[0][0]
    expect(Object.keys(stored).sort()).toEqual(['duration_seconds', 'event', 'game_id'])
    expect(JSON.stringify(stored)).not.toMatch(/203\.0\.113\.7|TestBrowser|secret|someone@example\.com|abc/)
  })

  it.each([
    ['an unknown game', { event: 'open', gameId: 'not-a-game' }],
    ['an unknown event', { event: 'rage_quit', gameId: 'hope-daily' }],
    ['a close without a duration', { event: 'close', gameId: 'hope-daily' }],
    ['a negative duration', { event: 'close', gameId: 'hope-daily', durationSeconds: -5 }],
    ['a duration over a day', { event: 'close', gameId: 'hope-daily', durationSeconds: 86_401 }],
    ['a fractional duration', { event: 'close', gameId: 'hope-daily', durationSeconds: 1.5 }],
    ['malformed JSON', '{not json'],
  ])('rejects %s', async (_label, body) => {
    const response = await postEvent(body)

    expect(response.status).toBe(400)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns 500 when the insert fails', async () => {
    mockInsert.mockReturnValue({ error: { message: 'Insert failed' } })

    const response = await postEvent({ event: 'open', gameId: 'hope-daily' })

    expect(response.status).toBe(500)
  })

  it('is a silent no-op when Supabase is not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const response = await postEvent({ event: 'open', gameId: 'hope-daily' })

    expect(response.status).toBe(204)
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
