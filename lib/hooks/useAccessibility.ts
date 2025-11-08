/**
 * useAccessibility Hook
 *
 * Manages all accessibility settings with localStorage persistence
 * and automatic system preference detection.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AccessibilitySettings,
  AccessibilityPreset,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  ACCESSIBILITY_PRESETS,
} from '@/types/accessibility'

const STORAGE_KEY = 'verygoodmelon:accessibility:settings'

/**
 * Load settings from localStorage
 */
function loadSettings(): AccessibilitySettings {
  if (typeof window === 'undefined') {
    return DEFAULT_ACCESSIBILITY_SETTINGS
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Validate parsed data has expected structure
      if (parsed && typeof parsed === 'object') {
        // Merge with defaults to handle new settings
        return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...parsed }
      }
    }
  } catch (error) {
    console.error('Failed to load accessibility settings, resetting to defaults:', error)
    // Clear corrupted data
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('Failed to clear corrupted settings:', e)
    }
  }

  return detectSystemPreferences()
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: AccessibilitySettings): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save accessibility settings:', error)
  }
}

/**
 * Detect system preferences
 */
function detectSystemPreferences(): AccessibilitySettings {
  const settings = { ...DEFAULT_ACCESSIBILITY_SETTINGS }

  if (typeof window === 'undefined') {
    return settings
  }

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    settings.reduceMotion = true
  }

  // Check for high contrast preference
  if (window.matchMedia('(prefers-contrast: more)').matches) {
    settings.contrast = 'high'
  }

  return settings
}

/**
 * Apply settings to DOM
 */
function applySettings(settings: AccessibilitySettings): void {
  if (typeof window === 'undefined') return

  const root = document.documentElement

  // Transition duration
  const transitionDuration = settings.reduceMotion ? '0ms' : '75ms'
  root.style.setProperty('--transition-duration', transitionDuration)

  // Animation speed
  root.style.setProperty('--animation-speed', String(settings.animationSpeed))

  // Contrast multiplier
  const contrastMultiplier =
    settings.contrast === 'extra-high' ? '1.5' :
    settings.contrast === 'high' ? '1.2' : '1'
  root.style.setProperty('--contrast-multiplier', contrastMultiplier)

  // Pause animations
  if (settings.pauseAnimations) {
    root.style.setProperty('--animation-play-state', 'paused')
  } else {
    root.style.setProperty('--animation-play-state', 'running')
  }

  // Colorblind mode (via CSS filter)
  const colorblindFilter = getColorblindFilter(settings.colorblindMode)
  root.style.setProperty('--colorblind-filter', colorblindFilter)

  // Data attributes for CSS targeting
  root.setAttribute('data-reduce-motion', String(settings.reduceMotion))
  root.setAttribute('data-contrast', settings.contrast)
  root.setAttribute('data-colorblind-mode', settings.colorblindMode)
  root.setAttribute('data-pause-animations', String(settings.pauseAnimations))
  root.setAttribute('data-muted', String(settings.muted))
  root.setAttribute('data-volume', String(settings.volume))
  root.setAttribute('data-theme', settings.theme)
}

/**
 * Get CSS filter for colorblind modes
 */
function getColorblindFilter(mode: AccessibilitySettings['colorblindMode']): string {
  switch (mode) {
    case 'deuteranopia':
      return 'url(#deuteranopia-filter)'
    case 'protanopia':
      return 'url(#protanopia-filter)'
    case 'tritanopia':
      return 'url(#tritanopia-filter)'
    case 'monochrome':
      return 'grayscale(100%)'
    default:
      return 'none'
  }
}

/**
 * Main accessibility hook
 */
export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(loadSettings)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize and apply settings on mount
  useEffect(() => {
    const initialSettings = loadSettings()
    setSettings(initialSettings)
    applySettings(initialSettings)
    setIsInitialized(true)
  }, [])

  // Save and apply settings on change
  useEffect(() => {
    if (!isInitialized) return

    saveSettings(settings)
    applySettings(settings)
  }, [settings, isInitialized])

  // Update a single setting
  const updateSetting = useCallback(
    <K extends keyof AccessibilitySettings>(
      key: K,
      value: AccessibilitySettings[K]
    ) => {
      setSettings((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  // Update multiple settings at once
  const updateSettings = useCallback(
    (updates: Partial<AccessibilitySettings>) => {
      setSettings((prev) => ({ ...prev, ...updates }))
    },
    []
  )

  // Apply a preset
  const applyPreset = useCallback((preset: AccessibilityPreset) => {
    const presetConfig = ACCESSIBILITY_PRESETS[preset]
    updateSettings(presetConfig.settings)
  }, [updateSettings])

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaults = detectSystemPreferences()
    setSettings(defaults)
  }, [])

  // Toggle reduce motion
  const toggleReduceMotion = useCallback(() => {
    updateSetting('reduceMotion', !settings.reduceMotion)
  }, [settings.reduceMotion, updateSetting])

  // Toggle mute
  const toggleMute = useCallback(() => {
    updateSetting('muted', !settings.muted)
  }, [settings.muted, updateSetting])

  // Set volume
  const setVolume = useCallback(
    (volume: number) => {
      updateSetting('volume', Math.max(0, Math.min(100, volume)))
    },
    [updateSetting]
  )

  return {
    settings,
    updateSetting,
    updateSettings,
    applyPreset,
    resetToDefaults,
    toggleReduceMotion,
    toggleMute,
    setVolume,
    isInitialized,
  }
}

/**
 * Hook to check if reduced motion is active
 * Useful for components that need to know motion preference
 */
export function useReducedMotion(): boolean {
  const { settings } = useAccessibility()
  return settings.reduceMotion
}

/**
 * Hook to get current volume setting
 * Useful for audio components
 */
export function useVolume(): { volume: number; muted: boolean } {
  const { settings } = useAccessibility()
  return {
    volume: settings.volume,
    muted: settings.muted,
  }
}
