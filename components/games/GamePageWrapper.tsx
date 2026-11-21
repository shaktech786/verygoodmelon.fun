'use client'

import { CrossGameSuggestions } from '@/components/games/CrossGameSuggestions'
import { GameVisitTracker } from '@/components/games/GameVisitTracker'
import { SoundToggle } from '@/components/ui/SoundToggle'

interface GamePageWrapperProps {
  gameId: string
  children: React.ReactNode
}

/**
 * Wraps game page content with:
 * - Ambient sound toggle (floating on wider screens, under the game on phones)
 * - Cross-game suggestions (below game content), which turn gentle in care mode
 */
export function GamePageWrapper({ gameId, children }: GamePageWrapperProps) {
  return (
    <>
      <GameVisitTracker gameId={gameId} />
      {children}
      <SoundToggle gameId={gameId} />
      <div className="container mx-auto px-4 max-w-4xl">
        <CrossGameSuggestions currentGameId={gameId} />
      </div>
    </>
  )
}
