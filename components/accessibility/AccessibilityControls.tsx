/**
 * AccessibilityControls
 * Wrapper component that manages the button and panel
 */

'use client'

import { useEffect, useState } from 'react'
import { AccessibilityButton } from './AccessibilityButton'
import { AccessibilityPanel } from './AccessibilityPanel'

const OPEN_ACCESSIBILITY_EVENT = 'verygoodmelon:open-accessibility'

/** Opens the settings panel from elsewhere, such as the phone menu where the floating button is hidden. */
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

  return (
    <>
      <AccessibilityButton
        onClick={() => setIsPanelOpen(true)}
        aria-expanded={isPanelOpen}
      />
      <AccessibilityPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  )
}
