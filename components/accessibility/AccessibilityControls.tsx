'use client'

import { useEffect, useState } from 'react'
import { AccessibilityPanel } from './AccessibilityPanel'

const OPEN_ACCESSIBILITY_EVENT = 'verygoodmelon:open-accessibility'

/** Opens the settings panel; the header's gear calls this. */
export function openAccessibilitySettings(): void {
  window.dispatchEvent(new Event(OPEN_ACCESSIBILITY_EVENT))
}

export function AccessibilityControls() {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  useEffect(() => {
    const open = () => setIsPanelOpen(true)
    window.addEventListener(OPEN_ACCESSIBILITY_EVENT, open)
    return () => window.removeEventListener(OPEN_ACCESSIBILITY_EVENT, open)
  }, [])

  return <AccessibilityPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
}
