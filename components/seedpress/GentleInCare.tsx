'use client'

import { useCareMode } from '@/components/games/CareMode'
import { GentleGames } from '@/components/games/CrossGameSuggestions'

/** Leads a games list while care mode lasts, with the helplines beside it, and is nothing otherwise. */
export function GentleInCare() {
  const { care } = useCareMode()
  return care ? <GentleGames /> : null
}
