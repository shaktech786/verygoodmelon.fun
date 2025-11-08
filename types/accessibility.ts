/**
 * Accessibility Settings Types
 */

export type ContrastMode = 'normal' | 'high' | 'extra-high'

export type ColorblindMode =
  | 'none'
  | 'deuteranopia'
  | 'protanopia'
  | 'tritanopia'
  | 'monochrome'

export type AnimationSpeed = 0.5 | 1 | 1.5 | 2

export type ThemeMode = 'light' | 'dark' | 'auto'

export interface AccessibilitySettings {
  // Visual Controls
  reduceMotion: boolean
  contrast: ContrastMode
  animationSpeed: AnimationSpeed
  colorblindMode: ColorblindMode
  pauseAnimations: boolean
  theme: ThemeMode

  // Audio Controls
  volume: number // 0-100
  muted: boolean

  // Interaction Controls
  showKeyboardShortcuts: boolean
  clickAssist: boolean
  timingFlexibility: boolean

  // Content Controls
  showInstructions: boolean
  tutorialMode: boolean
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  // Visual
  reduceMotion: false,
  contrast: 'normal',
  animationSpeed: 1,
  colorblindMode: 'none',
  pauseAnimations: false,
  theme: 'auto',

  // Audio
  volume: 70,
  muted: false,

  // Interaction
  showKeyboardShortcuts: true,
  clickAssist: false,
  timingFlexibility: false,

  // Content
  showInstructions: true,
  tutorialMode: true,
}

export type AccessibilityPreset = 'calm' | 'focus' | 'sensory-friendly'

export interface AccessibilityPresetConfig {
  name: string
  description: string
  settings: Partial<AccessibilitySettings>
}

export const ACCESSIBILITY_PRESETS: Record<
  AccessibilityPreset,
  AccessibilityPresetConfig
> = {
  calm: {
    name: 'Calm Mode',
    description: 'Slower animations, reduced audio, always-visible instructions',
    settings: {
      reduceMotion: false,
      animationSpeed: 0.5,
      volume: 30,
      contrast: 'normal',
      showInstructions: true,
    },
  },
  focus: {
    name: 'Focus Mode',
    description: 'No audio, high contrast, minimal distractions',
    settings: {
      reduceMotion: false,
      muted: true,
      contrast: 'high',
      showInstructions: false,
      tutorialMode: false,
    },
  },
  'sensory-friendly': {
    name: 'Sensory-Friendly Mode',
    description: 'No motion, no audio, maximum contrast, minimal stimulation',
    settings: {
      reduceMotion: true,
      muted: true,
      contrast: 'extra-high',
      colorblindMode: 'monochrome',
      animationSpeed: 0.5,
      pauseAnimations: true,
    },
  },
}
