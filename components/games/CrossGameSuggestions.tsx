'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ALL_GAMES, type GameConfig } from '@/lib/games/config'

/**
 * Relationship map between games based on thematic connections.
 * Maps game IDs to arrays of related game IDs.
 */
const RELATED_GAMES: Record<string, string[]> = {
  'last-words': ['first-words', 'timeless-minds'],
  'first-words': ['last-words', 'the-unrusher'],
  'timeless-minds': ['hard-choices', 'idea-lab'],
  'hard-choices': ['thought-pockets', 'timeless-minds'],
  'the-unrusher': ['breathing-patterns', 'first-words'],
  'hope-daily': ['idea-lab', 'the-unrusher'],
  'idea-lab': ['timeless-minds', 'thought-pockets'],
  'thought-pockets': ['hard-choices', 'idea-lab'],
  'breathing-patterns': ['the-unrusher', 'calm-garden'],
  'calm-garden': ['breathing-patterns', 'the-unrusher'],
}

/** Emoji hints per game for compact cards */
const GAME_EMOJI: Record<string, string> = {
  'last-words': '🕯️',
  'first-words': '✨',
  'timeless-minds': '🦉',
  'hard-choices': '⚖️',
  'the-unrusher': '🌿',
  'hope-daily': '🌅',
  'idea-lab': '🔮',
  'thought-pockets': '🃏',
  'breathing-patterns': '🫁',
  'calm-garden': '🌱',
}

interface CrossGameSuggestionsProps {
  currentGameId: string
}

export function CrossGameSuggestions({ currentGameId }: CrossGameSuggestionsProps) {
  const [visible, setVisible] = useState(false)

  // Delay appearance for a subtle entrance
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const delay = prefersReducedMotion ? 0 : 1000

    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [])

  const relatedIds = RELATED_GAMES[currentGameId] ?? []
  const suggestions: GameConfig[] = relatedIds
    .map((id) => ALL_GAMES.find((g) => g.id === id))
    .filter((g): g is GameConfig => g !== undefined && g.id !== currentGameId)
    .slice(0, 3)

  if (suggestions.length === 0) {
    return null
  }

  return (
    <section
      aria-label="Related games you might enjoy"
      className={`
        mt-12 pt-8 border-t border-foreground/10
        transition-opacity duration-700 ease-out
        ${visible ? 'opacity-100' : 'opacity-0'}
      `}
      style={{ transitionProperty: 'opacity' }}
    >
      <h3 className="text-sm font-medium text-primary-light/60 mb-4 text-center">
        Continue your journey...
      </h3>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {suggestions.map((game) => (
          <Link
            key={game.id}
            href={`/games/${game.slug}`}
            className="
              group flex items-center gap-3
              px-4 py-3 rounded-lg
              bg-card-bg border border-card-border
              hover:border-foreground/20 hover:bg-card-bg/80
              transition-colors duration-75
              focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
              sm:flex-1 sm:max-w-[220px]
            "
            aria-label={`Play ${game.title}: ${game.description}`}
          >
            <span className="text-xl flex-shrink-0" aria-hidden="true">
              {GAME_EMOJI[game.id] ?? '🎮'}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-foreground/90 truncate">
                {game.title}
              </p>
              <p className="text-xs text-primary-light/50 truncate">
                {game.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
