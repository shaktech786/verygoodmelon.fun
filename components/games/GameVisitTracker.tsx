'use client'

import { useEffect, useRef } from 'react'
import { useGameHistory } from '@/lib/stores/game-history'
import { recordGameEvent } from '@/lib/analytics'

interface GameVisitTrackerProps {
  gameId: string
}

/**
 * Invisible component that records game visits and time spent.
 * Drop into GamePageWrapper to auto-track all game pages.
 *
 * Personal history stays in this browser (localStorage, powers homepage
 * suggestions). The site-wide count sent to the server is anonymous.
 */
export function GameVisitTracker({ gameId }: GameVisitTrackerProps) {
  const startTime = useRef(0)
  const recordVisit = useGameHistory((s) => s.recordVisit)
  const recordDuration = useGameHistory((s) => s.recordDuration)

  useEffect(() => {
    startTime.current = Date.now()
    recordVisit(gameId)
    recordGameEvent({ event: 'open', gameId })

    let closed = false
    const close = () => {
      if (closed) return
      closed = true
      const elapsed = Math.round((Date.now() - startTime.current) / 1000)
      recordDuration(gameId, elapsed)
      recordGameEvent({ event: 'close', gameId, durationSeconds: elapsed })
    }

    // Unmount covers in-app navigation; pagehide covers closing the tab
    window.addEventListener('pagehide', close)

    return () => {
      window.removeEventListener('pagehide', close)
      close()
    }
    // Only run on mount/unmount for this gameId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  return null
}
