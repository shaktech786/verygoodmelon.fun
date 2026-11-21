import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockInsert = vi.fn()
const mockProbe = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => (table === 'thinker_requests' ? { insert: mockInsert, select: () => ({ limit: mockProbe }) } : {}),
  }),
}))

vi.mock('@/lib/email/send-email', () => ({ sendEmail: vi.fn(() => Promise.resolve()) }))

import { POST, GET } from '@/app/api/timeless-minds/request-thinker/route'

const post = (body: unknown) =>
  POST(new Request('http://localhost/api/timeless-minds/request-thinker', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as never)

const validRequest = {
  requesterEmail: 'test@example.com',
  requestedName: 'Nikola Tesla',
  reasonForRequest: 'Interested in his views on innovation',
}

describe('/api/timeless-minds/request-thinker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    mockInsert.mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'test-id-123' }, error: null }) }),
    })
    mockProbe.mockResolvedValue({ data: [], error: null })
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  describe('GET: whether requests can be kept right now', () => {
    it('says yes when storage answers', async () => {
      const response = await GET()
      expect(await response.json()).toEqual({ available: true })
    })

    it('says no when storage is not set up', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      const response = await GET()
      expect(await response.json()).toEqual({ available: false })
    })

    it('says no when storage cannot be reached', async () => {
      mockProbe.mockResolvedValue({ data: null, error: { message: 'TypeError: fetch failed' } })
      expect(await (await GET()).json()).toEqual({ available: false })

      mockProbe.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'))
      expect(await (await GET()).json()).toEqual({ available: false })
    })
  })

  describe('POST', () => {
    it('returns 400 for missing required fields', async () => {
      const response = await post({ requesterName: 'Test' })
      expect(response.status).toBe(400)
    })

    it('returns 400 for missing email', async () => {
      const response = await post({ requestedName: 'Nikola Tesla', reasonForRequest: 'Interested in his views' })
      expect(response.status).toBe(400)
    })

    it('blocks living people', async () => {
      const response = await post({ ...validRequest, requestedName: 'Elon Musk' })
      expect(response.status).toBe(400)
      expect((await response.json()).error).toContain('deceased')
    })

    it('still explains the rules when there is nowhere to keep requests', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      const response = await post({ ...validRequest, requestedName: 'Elon Musk' })
      expect(response.status).toBe(400)
      expect((await response.json()).error).toContain('deceased')
    })

    it('blocks harmful figures', async () => {
      const response = await post({ ...validRequest, requestedName: 'Hitler' })
      expect(response.status).toBe(400)
      expect((await response.json()).error).toContain('positive historical figures')
    })

    it('keeps a valid request, with or without a name', async () => {
      const response = await post(validRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.requestId).toBe('test-id-123')
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ requester_name: null, requested_name: 'Nikola Tesla' }))
    })

    it('never claims success when there is nowhere to keep the request', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const response = await post(validRequest)

      expect(response.status).toBe(503)
      expect((await response.json()).success).toBeUndefined()
    })
  })
})
