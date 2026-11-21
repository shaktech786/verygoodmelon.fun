'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import {
  AccessibilitySettings,
  AccessibilityPreset,
  ContrastMode,
  TextSize,
  ThemeMode,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  ACCESSIBILITY_PRESETS,
} from '@/types/accessibility'

const STORAGE_KEY = 'verygoodmelon:accessibility:settings'

const THEMES: readonly ThemeMode[] = ['light', 'dark', 'auto']
const TEXT_SIZES: readonly TextSize[] = ['default', 'large', 'larger']
const CONTRASTS: readonly ContrastMode[] = ['normal', 'high', 'extra-high']

function oneOf<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return options.find((option) => option === value) ?? fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/**
 * Reads settings saved by any version of the site. Removed options are mapped to
 * their nearest surviving setting so a returning visitor keeps what they chose.
 */
export function migrateSettings(stored: unknown): AccessibilitySettings | null {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null
  const raw = stored as Record<string, unknown>
  const defaults = DEFAULT_ACCESSIBILITY_SETTINGS

  const volume =
    typeof raw.volume === 'number' && Number.isFinite(raw.volume)
      ? Math.round(Math.min(100, Math.max(0, raw.volume)))
      : defaults.volume

  return {
    theme: oneOf(THEMES, raw.theme, defaults.theme),
    textSize: oneOf(TEXT_SIZES, raw.textSize, defaults.textSize),
    contrast: oneOf(CONTRASTS, raw.contrast, defaults.contrast),
    reduceMotion: raw.pauseAnimations === true || bool(raw.reduceMotion, defaults.reduceMotion),
    greyscale: raw.colorblindMode === 'monochrome' || bool(raw.greyscale, defaults.greyscale),
    muted: bool(raw.muted, defaults.muted),
    volume,
  }
}

function detectSystemPreferences(): AccessibilitySettings {
  return {
    ...DEFAULT_ACCESSIBILITY_SETTINGS,
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    contrast: window.matchMedia('(prefers-contrast: more)').matches ? 'high' : 'normal',
  }
}

function loadSettings(): AccessibilitySettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const migrated = stored ? migrateSettings(JSON.parse(stored)) : null
    if (migrated) return migrated
  } catch {
    // Unreadable storage (private mode, corrupt JSON) falls through to system preferences
  }
  return detectSystemPreferences()
}

export function applySettings(settings: AccessibilitySettings): void {
  const root = document.documentElement
  root.setAttribute('data-theme', settings.theme)
  root.setAttribute('data-text-size', settings.textSize)
  root.setAttribute('data-contrast', settings.contrast)
  root.setAttribute('data-reduce-motion', String(settings.reduceMotion))
  root.setAttribute('data-greyscale', String(settings.greyscale))
  root.setAttribute('data-muted', String(settings.muted))
  root.setAttribute('data-volume', String(settings.volume))
}

let current: AccessibilitySettings | null = null
const listeners = new Set<() => void>()

function getSnapshot(): AccessibilitySettings {
  current ??= loadSettings()
  return current
}

function getServerSnapshot(): AccessibilitySettings {
  return DEFAULT_ACCESSIBILITY_SETTINGS
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function commit(next: AccessibilitySettings, persist: boolean): void {
  current = next
  try {
    if (persist) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Settings still apply for this visit when storage is unavailable
  }
  applySettings(next)
  listeners.forEach((listener) => listener())
}

/** One shared set of accessibility settings for the whole page, saved in localStorage. */
export function useAccessibility() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    applySettings(settings)
  }, [settings])

  const updateSettings = useCallback((updates: Partial<AccessibilitySettings>) => {
    commit({ ...getSnapshot(), ...updates }, true)
  }, [])

  const updateSetting = useCallback(
    <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
      updateSettings({ [key]: value })
    },
    [updateSettings]
  )

  const applyPreset = useCallback(
    (preset: AccessibilityPreset) => updateSettings(ACCESSIBILITY_PRESETS[preset].settings),
    [updateSettings]
  )

  const resetToDefaults = useCallback(() => commit(detectSystemPreferences(), false), [])

  return { settings, updateSetting, updateSettings, applyPreset, resetToDefaults }
}
