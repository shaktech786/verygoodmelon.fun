'use client'

import { Gamepad2 } from 'lucide-react'
import { useGames } from '@/lib/hooks/useGames'
import { GameCard } from '@/components/games/GameCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

export default function GamesPage() {
  const { games, loading, error } = useGames()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <EmptyState
          icon={<Gamepad2 size={32} />}
          title="Oops! Something went wrong"
          description={error.message}
          action={
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl">
      <div className="mb-12 animate-fade">
        <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-3">
          Games
        </h1>
        <p className="text-lg text-primary-light">
          Thoughtful games to play at your own pace.
        </p>
      </div>

      {games.length === 0 ? (
        <EmptyState
          icon={<Gamepad2 size={32} />}
          title="No games yet"
          description="Games are coming soon! Check back later for exciting new additions."
          action={
            <Button onClick={() => window.location.href = '/'}>
              Back to Home
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {games.map((game, index) => {
            // Stagger middle column for asymmetric layout (every 3rd card starting from index 1)
            const isMiddleColumn = (index % 3 === 1)
            return (
              <div
                key={game.id}
                className={`
                  transform transition-all duration-300
                  ${isMiddleColumn ? 'lg:translate-y-8' : ''}
                `}
              >
                <GameCard game={game} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
