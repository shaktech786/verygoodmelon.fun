'use client'

import { useCallback } from 'react'
import { useAccessibility } from '@/lib/hooks/useAccessibility'
import type { Sense } from '@/lib/design/tokens'

/** The sensory dial. It is one of the site's saved settings, and `data-sense` on <html> is how CSS reads it. */
export function useSenseDial() {
  const { settings, updateSetting } = useAccessibility()
  const setSense = useCallback((next: Sense) => updateSetting('sense', next), [updateSetting])
  return { sense: settings.sense, setSense }
}
