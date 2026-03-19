'use client'

import { useEffect, useRef } from 'react'
import { useGameHistory } from '@/lib/stores/game-history'

interface GameVisitTrackerProps {
  gameId: string
}

/**
 * Invisible component that records game visits and time spent.
 * Drop into GamePageWrapper to auto-track all game pages.
 */
export function GameVisitTracker({ gameId }: GameVisitTrackerProps) {
  const startTime = useRef<number>(Date.now())
  const recordVisit = useGameHistory((s) => s.recordVisit)
  const recordDuration = useGameHistory((s) => s.recordDuration)

  useEffect(() => {
    startTime.current = Date.now()
    recordVisit(gameId)

    return () => {
      const elapsed = Math.round((Date.now() - startTime.current) / 1000)
      recordDuration(gameId, elapsed)
    }
    // Only run on mount/unmount for this gameId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  return null
}
