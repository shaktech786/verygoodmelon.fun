'use client'

import { CrossGameSuggestions } from '@/components/games/CrossGameSuggestions'
import { GameVisitTracker } from '@/components/games/GameVisitTracker'
import { AmbientSoundscape } from '@/components/ui/AmbientSoundscape'

interface GamePageWrapperProps {
  gameId: string
  children: React.ReactNode
}

/**
 * Wraps game page content with:
 * - The game's ambient soundscape, switched on from the settings panel
 * - One suggested next game (below game content), which turns gentle in care mode
 */
export function GamePageWrapper({ gameId, children }: GamePageWrapperProps) {
  return (
    <>
      <GameVisitTracker gameId={gameId} />
      {children}
      <AmbientSoundscape gameId={gameId} />
      <div className="container mx-auto px-4 max-w-4xl">
        <CrossGameSuggestions currentGameId={gameId} />
      </div>
    </>
  )
}
