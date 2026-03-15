import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @supabase/supabase-js - the route uses createClient directly (not @/lib/supabase/server)
const mockInsert = vi.fn()
const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

import { POST, GET } from '@/app/api/timeless-minds/request-thinker/route'

describe('/api/timeless-minds/request-thinker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

    // Default mock: successful insert chain
    mockInsert.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'test-id-123' }, error: null }),
      }),
    })

    // Default mock for from()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'thinker_requests') {
        return { insert: mockInsert }
      }
      if (table === 'thinker_phone_book_access') {
        return {
          insert: () => Promise.resolve({ error: null }),
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  describe('POST', () => {
    it('returns 400 for missing required fields', async () => {
      const request = new Request('http://localhost/api/timeless-minds/request-thinker', {
        method: 'POST',
        body: JSON.stringify({ requesterName: 'Test' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as never)
      expect(response.status).toBe(400)
    })

    it('returns 400 for missing email', async () => {
      const request = new Request('http://localhost/api/timeless-minds/request-thinker', {
        method: 'POST',
        body: JSON.stringify({
          requesterName: 'Test User',
          requestedName: 'Nikola Tesla',
          reasonForRequest: 'Interested in his views',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as never)
      expect(response.status).toBe(400)
    })

    it('blocks living people', async () => {
      const request = new Request('http://localhost/api/timeless-minds/request-thinker', {
        method: 'POST',
        body: JSON.stringify({
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          requestedName: 'Elon Musk',
          reasonForRequest: 'I want to chat',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as never)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('deceased')
    })

    it('blocks harmful figures', async () => {
      const request = new Request('http://localhost/api/timeless-minds/request-thinker', {
        method: 'POST',
        body: JSON.stringify({
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          requestedName: 'Hitler',
          reasonForRequest: 'Historical interest',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as never)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('positive historical figures')
    })

    it('accepts valid submission', async () => {
      const request = new Request('http://localhost/api/timeless-minds/request-thinker', {
        method: 'POST',
        body: JSON.stringify({
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          requestedName: 'Nikola Tesla',
          reasonForRequest: 'Interested in his views on innovation',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.requestId).toBeDefined()
    })

    it('returns success in dev mode when Supabase is not configured', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const request = new Request('http://localhost/api/timeless-minds/request-thinker', {
        method: 'POST',
        body: JSON.stringify({
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          requestedName: 'Nikola Tesla',
          reasonForRequest: 'Interested in his views on innovation',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.requestId).toContain('mock_')
    })
  })

  describe('GET', () => {
    it('returns 400 for missing email', async () => {
      const request = new Request('http://localhost/api/timeless-minds/request-thinker')

      const response = await GET(request as never)
      expect(response.status).toBe(400)
    })

    it('returns hasAccess false when no access record exists', async () => {
      const request = new Request('http://localhost/api/timeless-minds/request-thinker?email=test@example.com')

      const response = await GET(request as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasAccess).toBe(false)
    })

    it('returns hasAccess true when access record exists', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'thinker_phone_book_access') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      single: () => Promise.resolve({
                        data: { id: 'access-1', user_email: 'test@example.com', is_active: true },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const request = new Request('http://localhost/api/timeless-minds/request-thinker?email=test@example.com')

      const response = await GET(request as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasAccess).toBe(true)
      expect(data.accessDetails).toBeDefined()
    })

    it('returns hasAccess false when Supabase is not configured', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const request = new Request('http://localhost/api/timeless-minds/request-thinker?email=test@example.com')

      const response = await GET(request as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasAccess).toBe(false)
    })
  })
})
