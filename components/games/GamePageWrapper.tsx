'use client'

import { CrossGameSuggestions } from '@/components/games/CrossGameSuggestions'
import { SoundToggle } from '@/components/ui/SoundToggle'

interface GamePageWrapperProps {
  gameId: string
  children: React.ReactNode
}

/**
 * Wraps game page content with:
 * - Ambient sound toggle (bottom-right corner)
 * - Cross-game suggestions (below game content)
 */
export function GamePageWrapper({ gameId, children }: GamePageWrapperProps) {
  return (
    <>
      {children}
      <div className="container mx-auto px-4 max-w-4xl">
        <CrossGameSuggestions currentGameId={gameId} />
      </div>
      <SoundToggle gameId={gameId} />
    </>
  )
}
