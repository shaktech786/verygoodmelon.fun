'use client'

import { useEffect, useState, useRef } from 'react'

/**
 * Hook to track cursor position
 */
export function useCursorPosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return position
}

/**
 * Hook to create a custom cursor follower
 * Returns ref to attach to follower element
 */
export function useCursorFollower(options: {
  speed?: number
  offset?: { x: number; y: number }
} = {}) {
  const { speed = 0.15, offset = { x: 0, y: 0 } } = options
  const followerRef = useRef<HTMLDivElement>(null)
  const positionRef = useRef({ x: 0, y: 0 })
  const targetRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = {
        x: e.clientX + offset.x,
        y: e.clientY + offset.y
      }
    }

    const animate = () => {
      if (!followerRef.current) return

      // Smooth follow using lerp
      positionRef.current.x += (targetRef.current.x - positionRef.current.x) * speed
      positionRef.current.y += (targetRef.current.y - positionRef.current.y) * speed

      followerRef.current.style.transform = `translate(${positionRef.current.x}px, ${positionRef.current.y}px)`

      rafRef.current = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [speed, offset.x, offset.y])

  return followerRef
}

/**
 * Hook to detect hover state globally
 * Useful for custom cursor states
 */
export function useGlobalHover() {
  const [isHovering, setIsHovering] = useState(false)
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Check if hovering over interactive element
      const isInteractive =
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.getAttribute('role') === 'button' ||
        target.style.cursor === 'pointer' ||
        target.classList.contains('cursor-pointer')

      setIsHovering(isInteractive)
      setHoveredElement(isInteractive ? target : null)
    }

    const handleMouseOut = () => {
      setIsHovering(false)
      setHoveredElement(null)
    }

    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('mouseout', handleMouseOut)

    return () => {
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mouseout', handleMouseOut)
    }
  }, [])

  return { isHovering, hoveredElement }
}

/**
 * Hook to detect cursor activity (idle/active)
 */
export function useCursorActivity(idleTimeout: number = 2000) {
  const [isIdle, setIsIdle] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    const handleActivity = () => {
      setIsIdle(false)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setIsIdle(true)
      }, idleTimeout)
    }

    window.addEventListener('mousemove', handleActivity, { passive: true })
    window.addEventListener('mousedown', handleActivity, { passive: true })

    // Set initial timeout
    handleActivity()

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('mousedown', handleActivity)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [idleTimeout])

  return isIdle
}

/**
 * Hook to create magnetic cursor effect
 * Elements are pulled toward cursor
 */
export function useMagneticCursor(
  strength: number = 0.3,
  maxDistance: number = 100
) {
  const elementRef = useRef<HTMLElement>(null)
  const [isNear, setIsNear] = useState(false)

  useEffect(() => {
    if (!elementRef.current) return

    const element = elementRef.current
    const originalPosition = { x: 0, y: 0 }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const deltaX = e.clientX - centerX
      const deltaY = e.clientY - centerY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      if (distance < maxDistance) {
        setIsNear(true)
        const factor = Math.max(0, 1 - distance / maxDistance) * strength
        const moveX = deltaX * factor
        const moveY = deltaY * factor

        element.style.transform = `translate(${moveX}px, ${moveY}px)`
      } else {
        setIsNear(false)
        element.style.transform = `translate(${originalPosition.x}px, ${originalPosition.y}px)`
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      element.style.transform = 'translate(0, 0)'
    }
  }, [strength, maxDistance])

  return { ref: elementRef, isNear }
}

/**
 * Hook to create cursor trail effect
 */
export function useCursorTrail(trailLength: number = 10) {
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setTrail(prev => {
        const newTrail = [{ x: e.clientX, y: e.clientY }, ...prev]
        return newTrail.slice(0, trailLength)
      })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [trailLength])

  return trail
}
