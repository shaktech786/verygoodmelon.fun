'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ALL_GAMES, type GameConfig } from '@/lib/games/config'
import { useGameHistory } from '@/lib/stores/game-history'

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
        focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
      "
      aria-label={`Play ${game.title}: ${game.hook}`}
    >
      <Image
        src={game.cardImage}
        alt=""
        width={16}
        height={24}
        className="flex-shrink-0 rounded-sm"
        aria-hidden="true"
      />
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
  // Play history lives in this browser only, so nothing renders until after hydration.
  const [mounted, setMounted] = useState(false)

  const visits = useGameHistory((s) => s.visits)
  const getMostPlayed = useGameHistory((s) => s.getMostPlayed)
  const getNeverPlayed = useGameHistory((s) => s.getNeverPlayed)

  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  if (!mounted) return null

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
      <p className="text-xs text-primary-light text-center">
        Every card, every thought. Time to revisit a favorite?
      </p>
    )
  }

  return (
    <section
      aria-label="Personalized game suggestions"
      className={`
        w-full max-w-md mx-auto mt-10 sm:mt-14 px-4 animate-fade
      `}
    >
      <p className="text-xs text-primary-light text-center mb-3">
        {heading}
      </p>
      {content}
    </section>
  )
}
