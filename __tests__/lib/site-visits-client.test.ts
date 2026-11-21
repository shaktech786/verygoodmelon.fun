import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

async function freshModule() {
  vi.resetModules()
  return import('@/lib/analytics/visits')
}

describe('siteVisitCount', () => {
  beforeEach(() => {
    sessionStorage.clear()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks the server once per page load, however many parts of the page want the count', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ count: 7 }), { status: 200 }))
    const { siteVisitCount } = await freshModule()

    const counts = await Promise.all([siteVisitCount(), siteVisitCount(), siteVisitCount()])

    expect(counts).toEqual([7, 7, 7])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]).toEqual({ method: 'POST' })
  })

  it('counts a visit once per tab, then only reads the total', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ count: 7 }), { status: 200 }))
    await (await freshModule()).siteVisitCount()
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ count: 7 }), { status: 200 }))
    await (await freshModule()).siteVisitCount()

    expect(fetchMock.mock.calls[1][1]).toBeUndefined()
  })

  it('gives no count, never an error, when the server has none, and does not ask again', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    const { siteVisitCount } = await freshModule()

    expect(await siteVisitCount()).toBeNull()
    expect(await siteVisitCount()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('gives no count when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'))
    const { siteVisitCount } = await freshModule()

    expect(await siteVisitCount()).toBeNull()
  })
})
