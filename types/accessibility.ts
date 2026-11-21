/**
 * Accessibility Settings Types
 */

export type ContrastMode = 'normal' | 'high' | 'extra-high'

export type ThemeMode = 'light' | 'dark' | 'auto'

export type TextSize = 'default' | 'large' | 'larger'

export interface AccessibilitySettings {
  theme: ThemeMode
  textSize: TextSize
  contrast: ContrastMode
  reduceMotion: boolean
  greyscale: boolean
  muted: boolean
  /** 0-100, read by games through the html data-volume attribute */
  volume: number
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  theme: 'auto',
  textSize: 'default',
  contrast: 'normal',
  reduceMotion: false,
  greyscale: false,
  muted: false,
  volume: 70,
}

export type AccessibilityPreset = 'calm' | 'focus' | 'sensory-friendly'

export interface AccessibilityPresetConfig {
  name: string
  description: string
  settings: Partial<AccessibilitySettings>
}

export const ACCESSIBILITY_PRESETS: Record<AccessibilityPreset, AccessibilityPresetConfig> = {
  calm: {
    name: 'Calm',
    description: 'Still motion and softer sound',
    settings: { reduceMotion: true, muted: false, volume: 30 },
  },
  focus: {
    name: 'Focus',
    description: 'No sound and higher contrast',
    settings: { muted: true, contrast: 'high' },
  },
  'sensory-friendly': {
    name: 'Sensory-friendly',
    description: 'No motion, no sound and no colour',
    settings: { reduceMotion: true, muted: true, greyscale: true },
  },
}
