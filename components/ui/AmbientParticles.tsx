'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  pulseSpeed: number
  pulsePhase: number
}

/**
 * Interactive Constellation Background
 *
 * Stars that connect with lines when the mouse is nearby.
 * Dark mode: light stars, white lines
 * Light mode: subtle dark dots, gray lines
 */
export function AmbientParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const animationRef = useRef<number | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isDark, setIsDark] = useState(true)

  // Initialize stars (reduced for subtlety)
  const initStars = useCallback((width: number, height: number) => {
    const count = Math.floor((width * height) / 50000) // Much lower density
    const stars: Star[] = []

    for (let i = 0; i < Math.min(count, 20); i++) { // Max 20 stars (was 50)
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5, // Smaller stars
        opacity: Math.random() * 0.2 + 0.1, // Much dimmer
        pulseSpeed: Math.random() * 0.01 + 0.005, // Slower pulse
        pulsePhase: Math.random() * Math.PI * 2,
      })
    }

    starsRef.current = stars
  }, [])

  // Animation loop
  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    const stars = starsRef.current
    const mouse = mouseRef.current
    const connectionDistance = 100 // Reduced from 150
    const mouseInfluence = 120 // Reduced from 200

    // Colors based on theme
    const starColor = isDark ? 'rgba(255, 255, 255,' : 'rgba(0, 0, 0,'
    const lineColor = isDark ? 'rgba(255, 255, 255,' : 'rgba(0, 0, 0,'

    // Draw connections first (behind stars)
    stars.forEach((star, i) => {
      // Connection to mouse
      const mouseDistX = mouse.x - star.x
      const mouseDistY = mouse.y - star.y
      const mouseDist = Math.sqrt(mouseDistX * mouseDistX + mouseDistY * mouseDistY)

      if (mouseDist < mouseInfluence) {
        const opacity = (1 - mouseDist / mouseInfluence) * 0.15 // Much subtler (was 0.4)
        ctx.beginPath()
        ctx.moveTo(star.x, star.y)
        ctx.lineTo(mouse.x, mouse.y)
        ctx.strokeStyle = `${lineColor}${opacity})`
        ctx.lineWidth = 0.5 // Thinner lines
        ctx.stroke()
      }

      // Connections to other stars (only nearby)
      for (let j = i + 1; j < stars.length; j++) {
        const other = stars[j]
        const distX = other.x - star.x
        const distY = other.y - star.y
        const dist = Math.sqrt(distX * distX + distY * distY)

        if (dist < connectionDistance) {
          // Stronger connection when mouse is near both stars
          const mouseToMidX = mouse.x - (star.x + other.x) / 2
          const mouseToMidY = mouse.y - (star.y + other.y) / 2
          const mouseToMid = Math.sqrt(mouseToMidX * mouseToMidX + mouseToMidY * mouseToMidY)

          let opacity = (1 - dist / connectionDistance) * 0.06 // Much subtler (was 0.15)
          if (mouseToMid < mouseInfluence) {
            opacity += (1 - mouseToMid / mouseInfluence) * 0.08 // Reduced (was 0.2)
          }

          ctx.beginPath()
          ctx.moveTo(star.x, star.y)
          ctx.lineTo(other.x, other.y)
          ctx.strokeStyle = `${lineColor}${Math.min(opacity, 0.15)})` // Max 0.15 (was 0.4)
          ctx.lineWidth = 0.5 // Thinner
          ctx.stroke()
        }
      }
    })

    // Draw stars with very subtle pulse and glow
    stars.forEach((star) => {
      // Very subtle pulse - barely noticeable
      const pulse = Math.sin(time * star.pulseSpeed * 0.2 + star.pulsePhase) * 0.05 + 0.95
      const size = star.size * pulse

      // Glow boost when mouse is near (reduced)
      const mouseDistX = mouse.x - star.x
      const mouseDistY = mouse.y - star.y
      const mouseDist = Math.sqrt(mouseDistX * mouseDistX + mouseDistY * mouseDistY)
      const glowBoost = mouseDist < mouseInfluence ? (1 - mouseDist / mouseInfluence) * 0.15 : 0 // Was 0.4

      const baseOpacity = star.opacity * 0.4 // Even dimmer base (was 0.6)
      const opacity = Math.min(baseOpacity + glowBoost, 0.4) // Max 0.4 (was 0.9)

      // Outer glow (soft halo)
      const gradient = ctx.createRadialGradient(
        star.x, star.y, 0,
        star.x, star.y, size * 3
      )
      gradient.addColorStop(0, `${starColor}${opacity})`)
      gradient.addColorStop(0.4, `${starColor}${opacity * 0.3})`)
      gradient.addColorStop(1, `${starColor}0)`)

      ctx.beginPath()
      ctx.arc(star.x, star.y, size * 3, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      // Inner bright core
      ctx.beginPath()
      ctx.arc(star.x, star.y, size * 0.6, 0, Math.PI * 2)
      ctx.fillStyle = `${starColor}${Math.min(opacity * 1.5, 1)})`
      ctx.fill()
    })

    animationRef.current = requestAnimationFrame(animate)
  }, [isDark])

  useEffect(() => {
    // Check reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(motionQuery.matches)
    const motionHandler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    motionQuery.addEventListener('change', motionHandler)

    // Check theme
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      if (theme === 'dark') {
        setIsDark(true)
      } else if (theme === 'light') {
        setIsDark(false)
      } else {
        // Auto - check system preference
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
      }
    }

    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      motionQuery.removeEventListener('change', motionHandler)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (reducedMotion) return

    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initStars(canvas.width, canvas.height)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [reducedMotion, animate, initStars])

  if (reducedMotion) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  )
}
