'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ALL_GAMES, type GameConfig } from '@/lib/games/config'
import { useGameHistory } from '@/lib/stores/game-history'

/** Emoji hints per game for compact display */
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
  'cascade': '🎮',
  'mind-debate': '🎭',
}

function GameLink({ game }: { game: GameConfig }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="
        group inline-flex items-center gap-2
        px-3 py-2 rounded-lg
        bg-card-bg border border-card-border
        hover:border-foreground/20 hover:bg-card-bg/80
        transition-colors duration-75
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
      "
      aria-label={`Play ${game.title}: ${game.description}`}
    >
      <span className="text-base flex-shrink-0" aria-hidden="true">
        {GAME_EMOJI[game.id] ?? '🎮'}
      </span>
      <span className="text-sm text-foreground group-hover:text-foreground/90">
        {game.title}
      </span>
    </Link>
  )
}

/**
 * Personalized suggestions based on game history.
 * Shows contextual recommendations without being attention-grabbing.
 * Renders nothing for brand-new users.
 */
export function PersonalizedSuggestions() {
  const [visible, setVisible] = useState(false)
  const [hydrated] = useState(() => typeof window !== 'undefined')

  const visits = useGameHistory((s) => s.visits)
  const getMostPlayed = useGameHistory((s) => s.getMostPlayed)
  const getNeverPlayed = useGameHistory((s) => s.getNeverPlayed)

  // Delayed fade-in, respecting reduced motion
  useEffect(() => {
    if (!hydrated) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const delay = prefersReducedMotion ? 0 : 1000

    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [hydrated])

  if (!hydrated) return null

  // Unique games visited
  const visitedGameIds = new Set(visits.map((v) => v.gameId))
  const visitedCount = visitedGameIds.size
  const neverPlayed = getNeverPlayed()
  const mostPlayed = getMostPlayed()

  // New user: show nothing
  if (visitedCount === 0) return null

  const findGame = (id: string): GameConfig | undefined =>
    ALL_GAMES.find((g) => g.id === id)

  let heading: string
  let content: React.ReactNode

  if (visitedCount <= 3) {
    // Early explorer: suggest never-played games
    heading = 'Try something new'
    const suggestions = neverPlayed
      .slice(0, 2)
      .map(findGame)
      .filter((g): g is GameConfig => g !== undefined)

    content = (
      <div className="flex flex-wrap gap-2 justify-center">
        {suggestions.map((game) => (
          <GameLink key={game.id} game={game} />
        ))}
      </div>
    )
  } else if (neverPlayed.length > 0) {
    // Returning user: show favorite + a suggestion
    heading = 'Welcome back'
    const favoriteGame = mostPlayed[0] ? findGame(mostPlayed[0]) : undefined
    const suggestion = findGame(neverPlayed[0])

    const games = [favoriteGame, suggestion].filter(
      (g): g is GameConfig => g !== undefined
    )

    content = (
      <div className="flex flex-wrap gap-2 justify-center">
        {games.map((game) => (
          <GameLink key={game.id} game={game} />
        ))}
      </div>
    )
  } else {
    // Completionist: played everything
    heading = "You've explored everything"
    content = (
      <p className="text-xs text-primary-light/40 text-center">
        Every card, every thought. Time to revisit a favorite?
      </p>
    )
  }

  return (
    <section
      aria-label="Personalized game suggestions"
      className={`
        w-full max-w-md mx-auto mt-10 sm:mt-14 px-4
        transition-opacity duration-700 ease-out
        ${visible ? 'opacity-100' : 'opacity-0'}
      `}
      style={{ transitionProperty: 'opacity' }}
    >
      <p className="text-xs text-primary-light/50 text-center mb-3">
        {heading}
      </p>
      {content}
    </section>
  )
}
