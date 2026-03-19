import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the supabase server client
// The route does: const supabase = await createClient()
// Then: supabase.from('site_visits').select('*', { count: 'exact', head: true })
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

import { GET, POST } from '@/app/api/site-visits/route'

describe('/api/site-visits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

    // Default: mockFrom returns select/insert chains
    mockSelect.mockReturnValue({ count: 42, error: null })
    mockInsert.mockReturnValue({ error: null })

    mockFrom.mockImplementation(() => ({
      select: mockSelect,
      insert: mockInsert,
    }))
  })

  describe('GET', () => {
    it('returns visit count', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.count).toBe(42)
      expect(mockFrom).toHaveBeenCalledWith('site_visits')
    })

    it('returns 0 when count is null', async () => {
      mockSelect.mockReturnValue({ count: null, error: null })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.count).toBe(0)
    })

    it('returns 500 on database error', async () => {
      mockSelect.mockReturnValue({ count: null, error: { message: 'DB error' } })

      const response = await GET()
      expect(response.status).toBe(500)
    })
  })

  describe('POST', () => {
    it('records visit and returns updated count', async () => {
      // First call to from() is for insert, second for select (count)
      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { insert: () => ({ error: null }) }
        }
        return { select: () => ({ count: 43, error: null }) }
      })

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.count).toBe(43)
    })

    it('returns 500 on insert error', async () => {
      mockFrom.mockImplementation(() => ({
        insert: () => ({ error: { message: 'Insert failed' } }),
      }))

      const response = await POST()
      expect(response.status).toBe(500)
    })
  })
})
