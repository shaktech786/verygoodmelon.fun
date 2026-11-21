/**
 * Floating Accessibility Settings Button
 * Always visible, opens the accessibility panel
 */

'use client'

import { Settings } from 'lucide-react'

interface AccessibilityButtonProps {
  onClick: () => void
  'aria-expanded': boolean
}

export function AccessibilityButton({
  onClick,
  'aria-expanded': ariaExpanded,
}: AccessibilityButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        hidden sm:flex fixed bottom-6 right-6 z-50
        w-14 h-14
        items-center justify-center
        bg-card-bg
        border-2 border-card-border
        rounded-full
        shadow-lg hover:shadow-xl
        transition-all duration-75
        hover:scale-110
        focus:outline-none focus:ring-2 focus:ring-focus-ring
        mb-safe-bottom mr-safe-right
      "
      aria-label="Open accessibility settings"
      aria-expanded={ariaExpanded}
      aria-controls="accessibility-panel"
    >
      <Settings size={20} className="text-foreground" aria-hidden="true" />
    </button>
  )
}
