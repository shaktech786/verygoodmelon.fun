/**
 * Design System Constants
 * Standardized timings, easing, and animations for consistent UX
 */

export const TRANSITIONS = {
  // Interaction timings
  INSTANT: '75ms',
  FAST: '150ms',
  NORMAL: '300ms',
  SLOW: '500ms',

  // Easing functions
  EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
  EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  BOUNCE: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  // Combined
  HOVER: 'all 150ms cubic-bezier(0, 0, 0.2, 1)',
  CLICK: 'all 75ms cubic-bezier(0, 0, 0.2, 1)',
  SLIDE: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

export const ANIMATIONS = {
  FADE_IN: 'fade-in 400ms ease-out',
  SLIDE_UP: 'slide-up 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  SCALE_IN: 'scale-in 200ms cubic-bezier(0, 0, 0.2, 1)',
  PULSE: 'pulse 2s ease-in-out infinite',
} as const
