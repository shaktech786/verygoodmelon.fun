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
  /** Every comfort setting a preset covers, so choosing one never keeps another preset's leftovers. Theme and text size stay as they are. */
  settings: Pick<AccessibilitySettings, 'reduceMotion' | 'muted' | 'volume' | 'contrast' | 'greyscale'>
}

export const ACCESSIBILITY_PRESETS: Record<AccessibilityPreset, AccessibilityPresetConfig> = {
  calm: {
    name: 'Calm',
    settings: { reduceMotion: true, muted: false, volume: 30, contrast: 'normal', greyscale: false },
  },
  focus: {
    name: 'Focus',
    settings: { reduceMotion: false, muted: true, volume: DEFAULT_ACCESSIBILITY_SETTINGS.volume, contrast: 'high', greyscale: false },
  },
  'sensory-friendly': {
    name: 'Sensory-friendly',
    settings: { reduceMotion: true, muted: true, volume: DEFAULT_ACCESSIBILITY_SETTINGS.volume, contrast: 'normal', greyscale: true },
  },
}

const CONTRAST_NAMES: Record<ContrastMode, string | null> = { normal: null, high: 'high contrast', 'extra-high': 'highest contrast' }

/** What choosing a preset turns on, in the words the settings panel uses. */
export function presetSummary(settings: AccessibilityPresetConfig['settings']): string {
  const turnedOn = [
    settings.reduceMotion && 'reduce motion',
    CONTRAST_NAMES[settings.contrast],
    settings.muted && 'mute',
    settings.greyscale && 'greyscale',
  ].filter((item): item is string => Boolean(item))
  const list = turnedOn.length > 1 ? `${turnedOn.slice(0, -1).join(', ')} and ${turnedOn[turnedOn.length - 1]}` : turnedOn[0] ?? ''
  const sound = !settings.muted && settings.volume !== DEFAULT_ACCESSIBILITY_SETTINGS.volume ? `, with sound at ${settings.volume}%` : ''
  return `Turns on ${list}${sound}`
}
