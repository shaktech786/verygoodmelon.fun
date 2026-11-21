import { afterEach, describe, expect, it, vi } from 'vitest'
import { hushAmbient, isLayerHushed, subscribeToHush } from '@/lib/audio/ambient-hush'

const releases: (() => void)[] = []
const hush = (...args: Parameters<typeof hushAmbient>) => {
  const release = hushAmbient(...args)
  releases.push(release)
  return release
}

afterEach(() => {
  for (const release of releases.splice(0)) release()
})

describe('ambient hush', () => {
  it('hushes nothing until a game asks', () => {
    expect(isLayerHushed('rain')).toBe(false)
    expect(isLayerHushed('drone')).toBe(false)
  })

  it('can hush the whole soundscape, then give it back', () => {
    const release = hush('all')
    expect(isLayerHushed('rain')).toBe(true)
    expect(isLayerHushed('drone')).toBe(true)
    release()
    expect(isLayerHushed('rain')).toBe(false)
  })

  it('can hush only some layers, keeping the rest', () => {
    hush(['ocean-waves'])
    expect(isLayerHushed('ocean-waves')).toBe(true)
    expect(isLayerHushed('drone')).toBe(false)
  })

  it('keeps a layer hushed while any request still holds it, and a second release does nothing', () => {
    const first = hush(['ocean-waves'])
    const second = hush('all')
    first()
    expect(isLayerHushed('ocean-waves')).toBe(true)
    second()
    second()
    expect(isLayerHushed('ocean-waves')).toBe(false)
  })

  it('tells listeners when the hush changes, and stops when unsubscribed', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToHush(listener)
    const release = hush('all')
    release()
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    hush('all')
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
