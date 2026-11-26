import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { DEFAULT_ACCESSIBILITY_SETTINGS } from '@/types/accessibility'

const STORAGE_KEY = 'verygoodmelon:accessibility:settings'

async function loadModule() {
  vi.resetModules()
  return import('@/lib/hooks/useAccessibility')
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  const root = document.documentElement
  for (const name of root.getAttributeNames()) root.removeAttribute(name)
})

describe('parseSettings', () => {
  it('keeps every setting saved by the current version', async () => {
    const { parseSettings } = await loadModule()
    const current = {
      theme: 'dark',
      textSize: 'larger',
      contrast: 'high',
      reduceMotion: true,
      greyscale: true,
      muted: true,
      volume: 40,
      sense: 'lively',
      spacing: 'roomy',
    }

    expect(parseSettings(current)).toEqual(current)
  })

  it('gives a saved object without sense or spacing the defaults for both', async () => {
    const { parseSettings } = await loadModule()
    const migrated = parseSettings({ theme: 'dark', textSize: 'large', contrast: 'high', reduceMotion: true, greyscale: false, muted: true, volume: 40 })
    expect(migrated).toMatchObject({ sense: 'gentle', spacing: 'standard', theme: 'dark', muted: true })
  })

  it('replaces an unknown sense or spacing with the default', async () => {
    const { parseSettings } = await loadModule()
    expect(parseSettings({ sense: 'loud', spacing: 'huge' })).toMatchObject({ sense: 'gentle', spacing: 'standard' })
    expect(parseSettings({ sense: 'quiet', spacing: 'roomy' })).toMatchObject({ sense: 'quiet', spacing: 'roomy' })
  })

  it('replaces values it does not recognise with defaults', async () => {
    const { parseSettings } = await loadModule()
    expect(
      parseSettings({ contrast: 'ultra', theme: 7, textSize: 'huge', volume: 500, muted: 'yes' })
    ).toEqual({ ...DEFAULT_ACCESSIBILITY_SETTINGS, volume: 100 })
  })

  it('returns null for anything that is not a settings object', async () => {
    const { parseSettings } = await loadModule()
    expect(parseSettings(null)).toBeNull()
    expect(parseSettings('dark')).toBeNull()
    expect(parseSettings([1, 2])).toBeNull()
  })
})

describe('applySettings', () => {
  it('marks the page with the chosen text size, contrast, theme and greyscale', async () => {
    const { applySettings } = await loadModule()
    applySettings({
      ...DEFAULT_ACCESSIBILITY_SETTINGS,
      textSize: 'larger',
      contrast: 'extra-high',
      theme: 'dark',
      greyscale: true,
      sense: 'quiet',
      spacing: 'roomy',
    })

    const root = document.documentElement
    expect(root.getAttribute('data-sense')).toBe('quiet')
    expect(root.getAttribute('data-spacing')).toBe('roomy')
    expect(root.getAttribute('data-text-size')).toBe('larger')
    expect(root.getAttribute('data-contrast')).toBe('extra-high')
    expect(root.getAttribute('data-theme')).toBe('dark')
    expect(root.getAttribute('data-greyscale')).toBe('true')
  })

  it('publishes sound settings for games and sets no removed attributes', async () => {
    const { applySettings } = await loadModule()
    applySettings({ ...DEFAULT_ACCESSIBILITY_SETTINGS, muted: true, volume: 25 })

    const root = document.documentElement
    expect(root.getAttribute('data-muted')).toBe('true')
    expect(root.getAttribute('data-volume')).toBe('25')
    expect(root.hasAttribute('data-colorblind-mode')).toBe(false)
    expect(root.hasAttribute('data-pause-animations')).toBe(false)
  })
})

describe('useAccessibility', () => {
  it('loads the saved settings and applies them to the page', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ contrast: 'extra-high' }))
    const { useAccessibility } = await loadModule()
    const { result } = renderHook(() => useAccessibility())

    expect(result.current.settings).toEqual({ ...DEFAULT_ACCESSIBILITY_SETTINGS, contrast: 'extra-high' })
    expect(document.documentElement.getAttribute('data-contrast')).toBe('extra-high')
  })

  it('carries Pause animations into Reduce motion and the Monochrome filter into Greyscale', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pauseAnimations: true, colorblindMode: 'monochrome' }))
    const { useAccessibility } = await loadModule()
    const { result } = renderHook(() => useAccessibility())

    expect(result.current.settings).toEqual({ ...DEFAULT_ACCESSIBILITY_SETTINGS, reduceMotion: true, greyscale: true })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({ reduceMotion: true, greyscale: true })
  })

  it('removes the retired settings and keys, and keeps settings it does not know yet', async () => {
    localStorage.setItem('shakfun:accessibility:settings', '{"theme":"dark"}')
    sessionStorage.setItem('verygoodmelon:press:sense', 'quiet')
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'dark', pauseAnimations: false, colorblindMode: 'deuteranopia', animationSpeed: 0.5, sense: 'quiet', fromLater: 1 })
    )
    const { useAccessibility } = await loadModule()
    const { result } = renderHook(() => useAccessibility())

    expect(localStorage.getItem('shakfun:accessibility:settings')).toBeNull()
    expect(sessionStorage.getItem('verygoodmelon:press:sense')).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({ theme: 'dark', sense: 'quiet', fromLater: 1 })
    expect(result.current.settings).toMatchObject({ theme: 'dark', sense: 'quiet', reduceMotion: false, greyscale: false })
  })

  it('fills a setting that was never saved from the device, so reduced motion still holds', async () => {
    const original = window.matchMedia
    window.matchMedia = (query: string) => ({ matches: query.includes('reduced-motion'), media: query }) as MediaQueryList
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'dark' }))
    const { useAccessibility } = await loadModule()
    const { result } = renderHook(() => useAccessibility())

    expect(result.current.settings).toMatchObject({ theme: 'dark', reduceMotion: true })
    window.matchMedia = original
  })

  it('shares one set of settings between every component that uses it', async () => {
    const { useAccessibility } = await loadModule()
    const panel = renderHook(() => useAccessibility())
    const game = renderHook(() => useAccessibility())

    act(() => panel.result.current.updateSetting('muted', true))

    expect(game.result.current.settings.muted).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').muted).toBe(true)
  })

  it('does not save anything until the visitor changes a setting', async () => {
    const { useAccessibility } = await loadModule()
    renderHook(() => useAccessibility())
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('resets to defaults and forgets the saved choice', async () => {
    const { useAccessibility } = await loadModule()
    const { result } = renderHook(() => useAccessibility())

    act(() => result.current.updateSettings({ textSize: 'large', contrast: 'high' }))
    act(() => result.current.resetToDefaults())

    expect(result.current.settings).toEqual(DEFAULT_ACCESSIBILITY_SETTINGS)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(document.documentElement.getAttribute('data-text-size')).toBe('default')
  })
})
