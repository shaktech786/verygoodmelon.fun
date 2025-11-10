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
        fixed top-4 right-4 z-50
        w-12 h-12
        flex items-center justify-center
        bg-card-bg
        border-2 border-card-border
        rounded-full
        shadow-lg hover:shadow-xl
        transition-all duration-75
        hover:scale-110
        focus:outline-none focus:ring-2 focus:ring-accent
      "
      aria-label="Open accessibility settings"
      aria-expanded={ariaExpanded}
      aria-controls="accessibility-panel"
    >
      <Settings size={20} className="text-foreground" aria-hidden="true" />
    </button>
  )
}
