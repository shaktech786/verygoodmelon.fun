/**
 * Accessibility Settings Types
 */

import { DEFAULT_SENSE, type Sense } from '@/lib/design/tokens'

export type ContrastMode = 'normal' | 'high' | 'extra-high'

export type ThemeMode = 'light' | 'dark' | 'auto'

export type TextSize = 'default' | 'large' | 'larger'

export type SpacingMode = 'standard' | 'roomy'

export interface AccessibilitySettings {
  theme: ThemeMode
  textSize: TextSize
  contrast: ContrastMode
  reduceMotion: boolean
  greyscale: boolean
  muted: boolean
  /** 0-100, read by games through the html data-volume attribute */
  volume: number
  /** The sensory dial: how much the site moves, how soft its colours are */
  sense: Sense
  spacing: SpacingMode
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  theme: 'auto',
  textSize: 'default',
  contrast: 'normal',
  reduceMotion: false,
  greyscale: false,
  muted: false,
  volume: 70,
  sense: DEFAULT_SENSE,
  spacing: 'standard',
}
