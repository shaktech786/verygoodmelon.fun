'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import {
  AccessibilitySettings,
  ContrastMode,
  SpacingMode,
  TextSize,
  ThemeMode,
  DEFAULT_ACCESSIBILITY_SETTINGS,
} from '@/types/accessibility'
import { SENSES } from '@/lib/design/tokens'
import { ACCESSIBILITY_STORAGE_KEY } from '@/lib/accessibility/boot-script'

const STORAGE_KEY = ACCESSIBILITY_STORAGE_KEY

const THEMES: readonly ThemeMode[] = ['light', 'dark', 'auto']
const TEXT_SIZES: readonly TextSize[] = ['default', 'large', 'larger']
const CONTRASTS: readonly ContrastMode[] = ['normal', 'high', 'extra-high']
const SPACINGS: readonly SpacingMode[] = ['standard', 'roomy']

function oneOf<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return options.find((option) => option === value) ?? fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** Reads saved settings, replacing any value that is not one of the current options with the base (the device's own preference). */
export function parseSettings(
  stored: unknown,
  base: AccessibilitySettings = DEFAULT_ACCESSIBILITY_SETTINGS,
): AccessibilitySettings | null {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null
  const raw = stored as Record<string, unknown>

  const volume =
    typeof raw.volume === 'number' && Number.isFinite(raw.volume)
      ? Math.round(Math.min(100, Math.max(0, raw.volume)))
      : base.volume

  return {
    theme: oneOf(THEMES, raw.theme, base.theme),
    textSize: oneOf(TEXT_SIZES, raw.textSize, base.textSize),
    contrast: oneOf(CONTRASTS, raw.contrast, base.contrast),
    reduceMotion: bool(raw.reduceMotion, base.reduceMotion),
    greyscale: bool(raw.greyscale, base.greyscale),
    muted: bool(raw.muted, base.muted),
    volume,
    sense: oneOf(SENSES, raw.sense, base.sense),
    spacing: oneOf(SPACINGS, raw.spacing, base.spacing),
  }
}

/** Storage left by earlier versions of the site, which nothing reads any more. */
const LEGACY_LOCAL_KEYS = ['shakfun:accessibility:settings']
const LEGACY_SESSION_KEYS = ['verygoodmelon:press:sense']
/** Settings earlier versions saved inside the object. Only these are ever removed, so a newer build's settings survive an older tab. */
const RETIRED_FIELDS = [
  'animationSpeed',
  'colorblindMode',
  'pauseAnimations',
  'showInstructions',
  'tutorialMode',
  'showKeyboardShortcuts',
  'clickAssist',
  'timingFlexibility',
]

/**
 * Carries the two retired choices that still mean something into their new settings
 * (Pause animations is Reduce motion, the Monochrome filter is Greyscale), then drops the retired fields and keys.
 */
function migrateLegacyStorage(): void {
  try {
    for (const key of LEGACY_LOCAL_KEYS) localStorage.removeItem(key)
    for (const key of LEGACY_SESSION_KEYS) sessionStorage.removeItem(key)
    const stored = localStorage.getItem(STORAGE_KEY)
    const raw: unknown = stored ? JSON.parse(stored) : null
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return
    const saved = { ...(raw as Record<string, unknown>) }
    if (!RETIRED_FIELDS.some((name) => name in saved)) return
    if (saved.pauseAnimations === true) saved.reduceMotion = true
    if (saved.colorblindMode === 'monochrome') saved.greyscale = true
    for (const name of RETIRED_FIELDS) delete saved[name]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch {
    // Storage that cannot be reached has nothing to carry over
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
  migrateLegacyStorage()
  const device = detectSystemPreferences()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const saved = stored ? parseSettings(JSON.parse(stored), device) : null
    if (saved) return saved
  } catch {
    // Unreadable storage (private mode, corrupt JSON) falls through to system preferences
  }
  return device
}

export function applySettings(settings: AccessibilitySettings): void {
  const root = document.documentElement
  root.setAttribute('data-theme', settings.theme)
  root.setAttribute('data-sense', settings.sense)
  root.setAttribute('data-spacing', settings.spacing)
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

let device: AccessibilitySettings | null = null
const getDevice = () => (device ??= detectSystemPreferences())
const unchanging = () => () => {}

/** One shared set of accessibility settings for the whole page, saved in localStorage. */
export function useAccessibility() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  // Where a visitor starts and where reset returns them: the defaults plus what the device asks for
  const baseline = useSyncExternalStore(unchanging, getDevice, getServerSnapshot)

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

  const resetToDefaults = useCallback(() => commit(detectSystemPreferences(), false), [])

  return { settings, baseline, updateSetting, updateSettings, resetToDefaults }
}
