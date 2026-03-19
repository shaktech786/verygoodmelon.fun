'use client'

import { useEffect, useRef, useState } from 'react'
import { GameCardShowcase } from '@/components/games/GameCardShowcase'
import { SHOWCASE_GAMES } from '@/lib/games/config'
import { usePresence } from '@/lib/hooks/usePresence'
import { useDailyWisdom } from '@/lib/hooks/useDailyWisdom'

/**
 * Get today's featured game index (rotates daily, deterministic)
 */
function getDailyFeaturedIndex(): number {
  const today = new Date()
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )
  return dayOfYear % SHOWCASE_GAMES.length
}

/**
 * Homepage - Lively yet Minimal
 *
 * Design principles:
 * - Breathing space: cards float gently
 * - Staggered entrance: personality on load
 * - Cursor interaction: subtle parallax delight
 * - Minimal text: let the cards speak
 * - Warm presence: you're not alone here
 */
export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })
  const containerRef = useRef<HTMLDivElement>(null)
  const { count: presenceCount, isLoaded: presenceLoaded } = usePresence()
  const { wisdom, isLoaded: wisdomLoaded } = useDailyWisdom()
  const dailyFeaturedIndex = getDailyFeaturedIndex()

  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  // Subtle parallax on mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setMousePosition({ x, y })
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="min-h-[80vh] flex flex-col items-center justify-center px-4 sm:px-6 py-12"
    >
      {/* Minimal tagline - sets the tone */}
      <div
        className={`
          text-center mb-8 sm:mb-12
          transition-all duration-700 ease-out
          ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        <p className="text-primary-light text-sm sm:text-base tracking-widest uppercase mb-2">
          Think deeply
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-light text-foreground">
          Feel <span className="text-accent font-medium">lighter</span>
        </h1>
      </div>

      {/* Presence indicator - warm, not metrics-y */}
      {presenceLoaded && presenceCount > 0 && (
        <div
          className={`
            mb-10 sm:mb-14 text-center
            transition-all duration-700 ease-out
            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
          `}
          style={{ transitionDelay: mounted ? '400ms' : '0ms' }}
          aria-live="polite"
        >
          <p className="text-primary-light/50 text-xs sm:text-sm flex items-center justify-center gap-2">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse-slow"
              aria-hidden="true"
            />
            {presenceCount === 1
              ? 'Someone else is here too'
              : `${presenceCount} others exploring right now`
            }
          </p>
        </div>
      )}

      {/* Cards grid - larger, fewer columns, breathing */}
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
          {SHOWCASE_GAMES.map((game, index) => {
            // Very subtle parallax offset per card
            const offsetX = (mousePosition.x - 0.5) * (index % 2 === 0 ? 2 : -2)
            const offsetY = (mousePosition.y - 0.5) * (index % 3 === 0 ? 1.5 : -1.5)
            const isFeatured = index === dailyFeaturedIndex

            return (
              <div
                key={game.id}
                className={`
                  transition-all duration-700 ease-out
                  ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                `}
                style={{
                  transitionDelay: mounted ? `${150 + index * 100}ms` : '0ms',
                  transform: mounted ? `translate(${offsetX}px, ${offsetY}px)` : undefined,
                }}
              >
                <div className="animate-float" style={{ animationDelay: `${index * 0.5}s` }}>
                  <GameCardShowcase
                    game={game}
                    priority={index < 2}
                    isFeatured={isFeatured}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Subtle prompt - only appears after cards */}
      <div
        className={`
          mt-12 sm:mt-16 text-center
          transition-all duration-700 ease-out
          ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
        style={{ transitionDelay: mounted ? '800ms' : '0ms' }}
      >
        <p className="text-primary-light/60 text-xs sm:text-sm">
          Pick a card, any card
        </p>
      </div>

      {/* Daily wisdom - ambient, quiet, appears last */}
      {wisdomLoaded && wisdom && (
        <div
          className={`
            mt-10 sm:mt-14 max-w-lg text-center px-6
            transition-all duration-1000 ease-out
            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
          style={{ transitionDelay: mounted ? '1200ms' : '0ms' }}
        >
          <div className="border-t border-card-border pt-6">
            <p className="text-primary-light/50 text-xs sm:text-sm italic leading-relaxed">
              {wisdom}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
