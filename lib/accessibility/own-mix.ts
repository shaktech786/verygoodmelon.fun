import { DEFAULT_ACCESSIBILITY_SETTINGS, type AccessibilitySettings } from '@/types/accessibility'

/**
 * Whether a fine-tune control that the dial speaks for (motion, greyscale, sound or contrast) has been moved
 * off where this visitor started, in which case the dial reads "Your own mix" (docs/design-system/PLAN.md
 * section 4.3). The baseline is what the device asks for, so reduced motion or more contrast set on the
 * device never counts as a mix the visitor made.
 */
export function isOwnMix(settings: AccessibilitySettings, baseline: AccessibilitySettings = DEFAULT_ACCESSIBILITY_SETTINGS): boolean {
  return (
    settings.reduceMotion !== baseline.reduceMotion ||
    settings.greyscale !== baseline.greyscale ||
    settings.muted !== baseline.muted ||
    settings.contrast !== baseline.contrast
  )
}
