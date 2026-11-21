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
  const root = document.documentElement
  for (const name of root.getAttributeNames()) root.removeAttribute(name)
})

describe('migrateSettings', () => {
  it('keeps every setting saved by the current version', async () => {
    const { migrateSettings } = await loadModule()
    const current = {
      theme: 'dark',
      textSize: 'larger',
      contrast: 'high',
      reduceMotion: true,
      greyscale: true,
      muted: true,
      volume: 40,
    }

    expect(migrateSettings(current)).toEqual(current)
  })

  it('turns a removed colour-blind simulation into no filter and keeps the rest', async () => {
    const { migrateSettings } = await loadModule()
    const legacy = {
      reduceMotion: false,
      contrast: 'high',
      animationSpeed: 0.5,
      colorblindMode: 'deuteranopia',
      pauseAnimations: false,
      theme: 'dark',
      volume: 30,
      muted: false,
      showKeyboardShortcuts: true,
      clickAssist: false,
      timingFlexibility: false,
      showInstructions: true,
      tutorialMode: true,
    }

    expect(migrateSettings(legacy)).toEqual({
      ...DEFAULT_ACCESSIBILITY_SETTINGS,
      contrast: 'high',
      theme: 'dark',
      volume: 30,
      greyscale: false,
    })
  })

  it('carries the old Monochrome mode over to greyscale', async () => {
    const { migrateSettings } = await loadModule()
    expect(migrateSettings({ colorblindMode: 'monochrome' })?.greyscale).toBe(true)
    expect(migrateSettings({ colorblindMode: 'tritanopia' })?.greyscale).toBe(false)
  })

  it('carries the old Pause Animations switch over to reduced motion', async () => {
    const { migrateSettings } = await loadModule()
    expect(migrateSettings({ pauseAnimations: true, reduceMotion: false })?.reduceMotion).toBe(true)
  })

  it('replaces values it does not recognise with defaults', async () => {
    const { migrateSettings } = await loadModule()
    expect(
      migrateSettings({ contrast: 'ultra', theme: 7, textSize: 'huge', volume: 500, muted: 'yes' })
    ).toEqual({ ...DEFAULT_ACCESSIBILITY_SETTINGS, volume: 100 })
  })

  it('returns null for anything that is not a settings object', async () => {
    const { migrateSettings } = await loadModule()
    expect(migrateSettings(null)).toBeNull()
    expect(migrateSettings('dark')).toBeNull()
    expect(migrateSettings([1, 2])).toBeNull()
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
    })

    const root = document.documentElement
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
  it('loads and migrates settings stored by an older version', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ contrast: 'extra-high', colorblindMode: 'protanopia', animationSpeed: 2 })
    )
    const { useAccessibility } = await loadModule()
    const { result } = renderHook(() => useAccessibility())

    expect(result.current.settings).toEqual({ ...DEFAULT_ACCESSIBILITY_SETTINGS, contrast: 'extra-high' })
    expect(document.documentElement.getAttribute('data-contrast')).toBe('extra-high')
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

  it('applies a preset without touching settings the preset does not mention', async () => {
    const { useAccessibility } = await loadModule()
    const { result } = renderHook(() => useAccessibility())

    act(() => result.current.updateSetting('textSize', 'larger'))
    act(() => result.current.applyPreset('sensory-friendly'))

    expect(result.current.settings.textSize).toBe('larger')
    expect(result.current.settings.reduceMotion).toBe(true)
    expect(result.current.settings.muted).toBe(true)
  })

  it('lets each preset replace the last one instead of keeping its leftovers', async () => {
    const { useAccessibility } = await loadModule()
    const { result } = renderHook(() => useAccessibility())

    act(() => result.current.applyPreset('calm'))
    act(() => result.current.applyPreset('focus'))

    expect(result.current.settings).toMatchObject({ reduceMotion: false, volume: 70, muted: true, contrast: 'high', greyscale: false })
  })
})

describe('preset summaries', () => {
  it('name everything a preset turns on, and nothing it does not', async () => {
    const { ACCESSIBILITY_PRESETS, presetSummary } = await import('@/types/accessibility')
    expect(presetSummary(ACCESSIBILITY_PRESETS.calm.settings)).toBe('Turns on reduce motion, with sound at 30%')
    expect(presetSummary(ACCESSIBILITY_PRESETS.focus.settings)).toBe('Turns on high contrast and mute')
    expect(presetSummary(ACCESSIBILITY_PRESETS['sensory-friendly'].settings)).toBe('Turns on reduce motion, mute and greyscale')
  })
})
