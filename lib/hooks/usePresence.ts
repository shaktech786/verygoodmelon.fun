'use client'

import { useEffect, useState } from 'react'
import { siteVisitCount } from '@/lib/analytics/visits'

/**
 * Fetches approximate count of active visitors (last 10 minutes).
 * Returns 0 until data is loaded. Refreshes every 2 minutes.
 */
export function usePresence() {
  const [count, setCount] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true

    async function fetchPresence() {
      try {
        const res = await fetch('/api/site-visits/presence')
        if (!res.ok) return
        const data = await res.json()
        if (mounted) {
          setCount(data.count ?? 0)
          setIsLoaded(true)
        }
      } catch {
        // Silently fail — presence is non-critical
      }
    }

    // The footer records this visit; waiting for it lets the visit count towards presence
    siteVisitCount().then(fetchPresence)

    // Refresh every 2 minutes
    const interval = setInterval(fetchPresence, 2 * 60 * 1000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  return { count, isLoaded }
}
