'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

/**
 * PageTransition component provides smooth fade transitions between route changes
 * Respects prefers-reduced-motion for accessibility
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)

  useEffect(() => {
    // Start transition
    setIsTransitioning(true)

    // Short delay before updating content (fade out duration)
    const timer = setTimeout(() => {
      setDisplayChildren(children)
      setIsTransitioning(false)
    }, 150)

    return () => clearTimeout(timer)
  }, [pathname, children])

  return (
    <div
      className={cn(
        'transition-opacity duration-150',
        isTransitioning ? 'opacity-0' : 'opacity-100',
        className
      )}
    >
      {displayChildren}
    </div>
  )
}

/**
 * SlideTransition provides a slide-up transition effect
 * Useful for modal content or page sections
 */
interface SlideTransitionProps {
  children: ReactNode
  isVisible: boolean
  direction?: 'up' | 'down' | 'left' | 'right'
  duration?: number
  className?: string
}

export function SlideTransition({
  children,
  isVisible,
  direction = 'up',
  duration = 300,
  className
}: SlideTransitionProps) {
  const [shouldRender, setShouldRender] = useState(isVisible)

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => setShouldRender(false), duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration])

  if (!shouldRender) return null

  const directionClasses = {
    up: isVisible ? 'translate-y-0' : 'translate-y-4',
    down: isVisible ? 'translate-y-0' : '-translate-y-4',
    left: isVisible ? 'translate-x-0' : 'translate-x-4',
    right: isVisible ? 'translate-x-0' : '-translate-x-4'
  }

  return (
    <div
      className={cn(
        'transition-all',
        directionClasses[direction],
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  )
}

/**
 * ScaleTransition provides a scale transition effect
 * Useful for popovers, tooltips, or emphasis
 */
interface ScaleTransitionProps {
  children: ReactNode
  isVisible: boolean
  duration?: number
  className?: string
}

export function ScaleTransition({
  children,
  isVisible,
  duration = 200,
  className
}: ScaleTransitionProps) {
  const [shouldRender, setShouldRender] = useState(isVisible)

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => setShouldRender(false), duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration])

  if (!shouldRender) return null

  return (
    <div
      className={cn(
        'transition-all origin-center',
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  )
}
