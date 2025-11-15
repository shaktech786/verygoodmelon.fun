/**
 * Animation utilities with progressive enhancement
 * Respects user preferences for reduced motion
 */

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get animation classes with progressive enhancement
 * Returns empty string if user prefers reduced motion
 */
export function getAnimationClass(
  animationClass: string,
  fallback: string = ''
): string {
  if (prefersReducedMotion()) {
    return fallback
  }
  return animationClass
}

/**
 * Get animation duration with progressive enhancement
 * Returns 0ms if user prefers reduced motion
 */
export function getAnimationDuration(duration: number): number {
  if (prefersReducedMotion()) {
    return 0
  }
  return duration
}

/**
 * Animation preset classes
 */
export const ANIMATIONS = {
  // Entrances
  fadeIn: 'animate-fade',
  slideInUp: 'animate-slide-up',
  slideInRight: 'animate-slide-in-right',
  bounceIn: 'animate-bounce-in',
  scaleIn: 'animate-scale-in',
  flipIn: 'animate-flip-in',

  // Micro-interactions
  ripple: 'ripple-effect',
  shake: 'animate-shake',
  glow: 'animate-glow',
  check: 'animate-check',

  // Loaders
  melonSpin: 'animate-melon-spin',
  pulse: 'animate-pulse',
  pulseSlow: 'animate-pulse-slow',
  shimmer: 'skeleton',

  // Feedback
  progress: 'animate-progress',
  countUp: 'animate-count-up',
  stagger: 'stagger-children',

  // Gestures
  dragHint: 'animate-drag-hint',
  height: 'animate-height',
} as const

/**
 * Spring animation configuration presets
 * Based on react-spring or framer-motion style configs
 */
export const SPRING_PRESETS = {
  gentle: {
    tension: 120,
    friction: 14,
    mass: 1
  },
  wobbly: {
    tension: 180,
    friction: 12,
    mass: 1
  },
  stiff: {
    tension: 210,
    friction: 20,
    mass: 1
  },
  slow: {
    tension: 280,
    friction: 60,
    mass: 1
  }
} as const

/**
 * Easing function presets
 */
export const EASINGS = {
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
} as const

/**
 * Transition duration presets (milliseconds)
 */
export const DURATIONS = {
  instant: 75,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 800
} as const

/**
 * Create a custom animation with progressive enhancement
 */
export function createAnimation(config: {
  name: string
  duration?: number
  easing?: string
  delay?: number
  iterationCount?: number | 'infinite'
}): string {
  const {
    name,
    duration = DURATIONS.normal,
    easing = EASINGS.easeOut,
    delay = 0,
    iterationCount = 1
  } = config

  if (prefersReducedMotion()) {
    return ''
  }

  const parts = [
    name,
    `${duration}ms`,
    easing,
    delay > 0 ? `${delay}ms` : null,
    iterationCount !== 1 ? iterationCount : null
  ].filter(Boolean)

  return parts.join(' ')
}

/**
 * Stagger delay calculator for sequential animations
 */
export function getStaggerDelay(index: number, baseDelay: number = 50): number {
  if (prefersReducedMotion()) {
    return 0
  }
  return index * baseDelay
}

/**
 * Check if animations are supported
 */
export function supportsAnimation(): boolean {
  if (typeof window === 'undefined') return false

  const element = document.createElement('div')
  const prefixes = ['animation', 'webkitAnimation', 'mozAnimation', 'oAnimation', 'msAnimation']

  return prefixes.some(prefix => prefix in element.style)
}

/**
 * Safe requestAnimationFrame wrapper
 */
export function safeRequestAnimationFrame(callback: FrameRequestCallback): number {
  if (typeof window === 'undefined' || !window.requestAnimationFrame) {
    return setTimeout(callback, 16) as unknown as number
  }
  return window.requestAnimationFrame(callback)
}

/**
 * Safe cancelAnimationFrame wrapper
 */
export function safeCancelAnimationFrame(id: number): void {
  if (typeof window === 'undefined' || !window.cancelAnimationFrame) {
    clearTimeout(id)
    return
  }
  window.cancelAnimationFrame(id)
}

/**
 * Wait for animation to complete
 */
export function waitForAnimation(element: HTMLElement, animationName: string): Promise<void> {
  return new Promise((resolve) => {
    if (prefersReducedMotion()) {
      resolve()
      return
    }

    const handleAnimationEnd = (e: AnimationEvent) => {
      if (e.animationName === animationName) {
        element.removeEventListener('animationend', handleAnimationEnd)
        resolve()
      }
    }

    element.addEventListener('animationend', handleAnimationEnd)
  })
}

/**
 * Wait for transition to complete
 */
export function waitForTransition(element: HTMLElement, property?: string): Promise<void> {
  return new Promise((resolve) => {
    if (prefersReducedMotion()) {
      resolve()
      return
    }

    const handleTransitionEnd = (e: TransitionEvent) => {
      if (!property || e.propertyName === property) {
        element.removeEventListener('transitionend', handleTransitionEnd)
        resolve()
      }
    }

    element.addEventListener('transitionend', handleTransitionEnd)
  })
}
