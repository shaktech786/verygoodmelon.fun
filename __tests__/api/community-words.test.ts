import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const insert = vi.fn()
const read = vi.fn()
const createClient = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => {
    createClient(...args)
    return {
      from: (table: string) => ({
        insert: (row: unknown) => ({ retry: () => insert(table, row) }),
        select: () => ({
          order: () => ({ limit: () => ({ retry: () => read(table) }) }),
        }),
      }),
    }
  },
}))

import * as lastWords from '@/app/api/last-words/route'
import * as firstWords from '@/app/api/first-words/route'

let ipCounter = 0
function submit(route: typeof lastWords, body: unknown, ip = `10.0.0.${++ipCounter}`) {
  const request = new Request('http://localhost/api/last-words', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `${ip}, 192.168.0.1` },
  })
  return route.POST(request as never)
}

describe('community words routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    insert.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  describe('POST (submitting words)', () => {
    it('stores accepted words with the server credentials', async () => {
      const response = await submit(lastWords, { words: '  Thank you for the ordinary days.  ' })

      expect(response.status).toBe(201)
      expect(await response.json()).toEqual({ stored: true })
      expect(createClient).toHaveBeenCalledWith('https://test.supabase.co', 'service-key', expect.anything())
      expect(insert).toHaveBeenCalledWith('last_words', { words: 'Thank you for the ordinary days.' })
    })

    it('writes The Awakening’s words to their own table', async () => {
      await submit(firstWords, { words: 'Oh. It is quiet here.' })
      expect(insert).toHaveBeenCalledWith('first_words', { words: 'Oh. It is quiet here.' })
    })

    it('quietly declines abusive words without storing them', async () => {
      const response = await submit(lastWords, { words: 'k y s, all of you' })

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ stored: false })
      expect(insert).not.toHaveBeenCalled()
    })

    it('quietly declines links and contact details', async () => {
      const response = await submit(lastWords, { words: 'buy now at cheap-pills.ru' })
      expect(await response.json()).toEqual({ stored: false })
      expect(insert).not.toHaveBeenCalled()
    })

    it('never stores words that sound like someone may be in danger', async () => {
      for (const words of ['I want to kill myself', 'I just want it all to be over', 'I am going to take all my pills tonight']) {
        const response = await submit(lastWords, { words })
        expect(await response.json()).toEqual({ stored: false })
      }
      expect(insert).not.toHaveBeenCalled()
    })

    it('rejects malformed, empty and over-long submissions', async () => {
      for (const body of ['not json', {}, { words: 42 }, { words: '   ' }, { words: 'a'.repeat(501) }]) {
        const response = await submit(lastWords, body)
        expect(response.status).toBe(400)
      }
      expect(insert).not.toHaveBeenCalled()
    })

    it('limits how often one visitor can submit, without affecting anyone else', async () => {
      const ip = '203.0.113.9'
      const statuses: number[] = []
      for (let i = 0; i < 7; i++) {
        statuses.push((await submit(lastWords, { words: `Thank you, number ${i}` }, ip)).status)
      }
      expect(statuses.slice(0, 6)).toEqual([201, 201, 201, 201, 201, 201])
      expect(statuses[6]).toBe(429)
      expect((await submit(lastWords, { words: 'Someone else entirely' }, '203.0.113.10')).status).toBe(201)
    })

    it('answers "not stored" when the server has no write credentials', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      const response = await submit(lastWords, { words: 'Be kind' })

      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({ stored: false })
      expect(insert).not.toHaveBeenCalled()
    })

    it('answers "not stored" when the database cannot be reached', async () => {
      insert.mockResolvedValue({ error: { message: 'getaddrinfo ENOTFOUND' } })
      const response = await submit(lastWords, { words: 'Be kind' })

      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({ stored: false })
    })
  })

  describe('GET (the shared cloud)', () => {
    it('counts each word once per person and leaves out abuse, swearing, contact details and words of crisis', async () => {
      read.mockResolvedValue({
        data: [
          { words: 'Love love love love love' },
          { words: 'I love you, garden' },
          { words: 'Fuck cancer, love you' },
          { words: 'you are all faggots' },
          { words: 'visit www.spam.example garden' },
          { words: 'I want to end it all, nobody would miss me' },
          { words: 'Love you, even dying' },
          { words: null },
        ],
        error: null,
      })

      const response = await lastWords.GET()
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toContain('no-store')
      expect(body.total).toBe(4)
      expect(body.words).toEqual([
        { word: 'love', count: 4 },
        { word: 'cancer', count: 1 },
        { word: 'even', count: 1 },
        { word: 'garden', count: 1 },
      ])
      expect(read).toHaveBeenCalledWith('last_words')
    })

    it('answers "unavailable" when the database cannot be reached', async () => {
      read.mockResolvedValue({ data: null, error: { message: 'getaddrinfo ENOTFOUND' } })
      expect((await firstWords.GET()).status).toBe(503)
    })

    it('answers "unavailable" when the database is not configured', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      expect((await lastWords.GET()).status).toBe(503)
      expect(read).not.toHaveBeenCalled()
    })
  })
})
