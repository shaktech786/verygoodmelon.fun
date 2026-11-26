'use client'

import { useCareMode } from '@/components/games/CareMode'
import { GentleGames } from '@/components/games/CrossGameSuggestions'
import { CounterPacket } from './CounterPacket'

/** After words of danger the gentle games and the helplines take today's packet's place. */
export function CounterOrCare({ serverGameId }: { serverGameId: string }) {
  const { care } = useCareMode()
  return care ? (
    <div className="sp-care-slot">
      <GentleGames />
    </div>
  ) : (
    <CounterPacket serverGameId={serverGameId} />
  )
}
