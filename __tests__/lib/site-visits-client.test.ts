import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

async function freshModule() {
  vi.resetModules()
  return import('@/lib/analytics/visits')
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('recordVisit', () => {
  beforeEach(() => {
    sessionStorage.clear()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('records the visit once per page load, however many parts of the page ask', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ count: 7 }), { status: 200 }))
    const { recordVisit } = await freshModule()

    recordVisit()
    recordVisit()
    recordVisit()
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]).toEqual({ method: 'POST' })
  })

  it('records a visit once per tab, and sends nothing on later page loads', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ count: 7 }), { status: 200 }))
    ;(await freshModule()).recordVisit()
    await settle()
    ;(await freshModule()).recordVisit()
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('tries again on the next page load when the server could not record it', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    ;(await freshModule()).recordVisit()
    await settle()
    ;(await freshModule()).recordVisit()
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('stays quiet when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'))
    const { recordVisit } = await freshModule()

    expect(() => recordVisit()).not.toThrow()
    await settle()
    expect(sessionStorage.getItem('hasVisited')).toBeNull()
  })
})
