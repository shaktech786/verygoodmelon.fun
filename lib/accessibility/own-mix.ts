import { DEFAULT_ACCESSIBILITY_SETTINGS, type AccessibilitySettings } from '@/types/accessibility'

/**
 * Whether a fine-tune control that the dial speaks for (motion, greyscale, sound or contrast) has been moved
 * off its default, in which case the dial reads "Your own mix" (docs/design-system/PLAN.md section 4.3).
 */
export function isOwnMix(settings: AccessibilitySettings): boolean {
  const defaults = DEFAULT_ACCESSIBILITY_SETTINGS
  return (
    settings.reduceMotion !== defaults.reduceMotion ||
    settings.greyscale !== defaults.greyscale ||
    settings.muted !== defaults.muted ||
    settings.contrast !== defaults.contrast
  )
}
