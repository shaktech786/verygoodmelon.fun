'use client'

import { useEffect, useRef } from 'react'
import { recordGameEvent } from '@/lib/analytics'

interface GameVisitTrackerProps {
  gameId: string
}

/**
 * Invisible component that records anonymous game opens and time spent.
 * Drop into GamePageWrapper to auto-track all game pages.
 */
export function GameVisitTracker({ gameId }: GameVisitTrackerProps) {
  const startTime = useRef(0)

  useEffect(() => {
    startTime.current = Date.now()
    recordGameEvent({ event: 'open', gameId })

    let closed = false
    const close = () => {
      if (closed) return
      closed = true
      const elapsed = Math.round((Date.now() - startTime.current) / 1000)
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
