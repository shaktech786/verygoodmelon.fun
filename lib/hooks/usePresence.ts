'use client'

import { useEffect, useState } from 'react'

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

    // Also record this visit
    fetch('/api/site-visits', { method: 'POST' }).catch(() => {})

    fetchPresence()

    // Refresh every 2 minutes
    const interval = setInterval(fetchPresence, 2 * 60 * 1000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  return { count, isLoaded }
}
