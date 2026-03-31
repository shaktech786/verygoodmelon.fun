'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { GameCardShowcase } from '@/components/games/GameCardShowcase'
import { PersonalizedSuggestions } from '@/components/home/PersonalizedSuggestions'
import { SHOWCASE_GAMES } from '@/lib/games/config'
import type { GameConfig } from '@/lib/games/config'
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

/** Category display order */
const CATEGORY_ORDER: GameConfig['category'][] = [
  'Thought',
  'Wisdom',
  'Creative',
  'Puzzle',
  'Action',
]

/** Category descriptions -- one line each */
const CATEGORY_DESCRIPTIONS: Record<GameConfig['category'], string> = {
  Thought: 'Explore big questions and see things differently',
  Wisdom: 'Learn from the greatest minds in history',
  Creative: 'Make, combine, and grow something new',
  Puzzle: 'Playful challenges with a positive twist',
  Action: 'Fast-paced games that keep surprising you',
}

/**
 * Homepage - Clear, Inviting, Informative
 *
 * Design principles:
 * - Every game is immediately understandable
 * - Title, description, and hook always visible
 * - Category grouping gives structure without clutter
 * - Breathing space and subtle parallax delight
 * - Warm presence: you're not alone here
 */
export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })
  const containerRef = useRef<HTMLDivElement>(null)
  const { count: presenceCount, isLoaded: presenceLoaded } = usePresence()
  const { wisdom, isLoaded: wisdomLoaded } = useDailyWisdom()
  const dailyFeaturedIndex = getDailyFeaturedIndex()
  const featuredGameId = SHOWCASE_GAMES[dailyFeaturedIndex]?.id

  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  // Group games by category with pre-computed global indices for staggered animation
  const { gamesByCategory, gameIndices } = useMemo(() => {
    const groups = new Map<GameConfig['category'], GameConfig[]>()
    const indices = new Map<string, number>()
    let idx = 0

    // First pass: group by category in display order
    for (const cat of CATEGORY_ORDER) {
      const catGames = SHOWCASE_GAMES.filter((g) => g.category === cat)
      if (catGames.length > 0) {
        groups.set(cat, catGames)
        for (const game of catGames) {
          indices.set(game.id, idx++)
        }
      }
    }

    return { gamesByCategory: groups, gameIndices: indices }
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
      className="min-h-[80vh] flex flex-col items-center px-4 sm:px-6 py-12"
    >
      {/* Minimal tagline - sets the tone */}
      <div
        className={`
          text-center mb-6 sm:mb-10
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
            mb-8 sm:mb-12 text-center
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

      {/* Games by category */}
      <div className="w-full max-w-3xl space-y-10 sm:space-y-14">
        {CATEGORY_ORDER.map((category) => {
          const games = gamesByCategory.get(category)
          if (!games || games.length === 0) return null

          // Use first game's index for category header delay
          const firstGameIdx = gameIndices.get(games[0].id) ?? 0

          return (
            <section
              key={category}
              aria-labelledby={`category-${category.toLowerCase()}`}
            >
              {/* Category header */}
              <div
                className={`
                  mb-4 sm:mb-5
                  transition-all duration-700 ease-out
                  ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}
                style={{ transitionDelay: mounted ? `${150 + firstGameIdx * 80}ms` : '0ms' }}
              >
                <h2
                  id={`category-${category.toLowerCase()}`}
                  className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary-light/60"
                >
                  {category}
                </h2>
                <p className="text-xs text-primary-light/40 mt-0.5">
                  {CATEGORY_DESCRIPTIONS[category]}
                </p>
              </div>

              {/* Game cards in this category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {games.map((game) => {
                  const currentIndex = gameIndices.get(game.id) ?? 0
                  const isFeatured = game.id === featuredGameId

                  // Very subtle parallax offset per card
                  const offsetX = (mousePosition.x - 0.5) * (currentIndex % 2 === 0 ? 1.5 : -1.5)
                  const offsetY = (mousePosition.y - 0.5) * (currentIndex % 3 === 0 ? 1 : -1)

                  return (
                    <div
                      key={game.id}
                      className={`
                        transition-all duration-700 ease-out
                        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
                      `}
                      style={{
                        transitionDelay: mounted ? `${200 + currentIndex * 80}ms` : '0ms',
                        transform: mounted ? `translate(${offsetX}px, ${offsetY}px)` : undefined,
                      }}
                    >
                      <div className="animate-float" style={{ animationDelay: `${currentIndex * 0.4}s` }}>
                        <GameCardShowcase
                          game={game}
                          priority={currentIndex < 3}
                          isFeatured={isFeatured}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {/* Personalized suggestions based on play history */}
      <PersonalizedSuggestions />

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
