'use client'

import { useEffect, useState } from 'react'

function getCachedWisdom(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const today = new Date().toISOString().split('T')[0]
    const cached = localStorage.getItem('verygoodmelon:daily-wisdom')
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed.date === today && parsed.text) {
        return parsed.text
      }
    }
  } catch {
    // localStorage may be unavailable
  }
  return null
}

/**
 * Fetches today's daily wisdom from the API.
 * Caches in localStorage to avoid re-fetching on page navigation.
 */
export function useDailyWisdom() {
  const [wisdom, setWisdom] = useState<string | null>(() => getCachedWisdom())
  const [isLoaded, setIsLoaded] = useState(() => getCachedWisdom() !== null)

  useEffect(() => {
    // Already have cached wisdom
    if (wisdom) return

    let mounted = true
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = 'verygoodmelon:daily-wisdom'

    async function fetchWisdom() {
      try {
        const res = await fetch('/api/daily-wisdom')
        if (!res.ok) return
        const data = await res.json()
        if (mounted && data.wisdom) {
          setWisdom(data.wisdom)
          setIsLoaded(true)
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ date: today, text: data.wisdom }))
          } catch {
            // Silent fail
          }
        }
      } catch {
        // Silently fail — wisdom is non-critical
      }
    }

    fetchWisdom()

    return () => {
      mounted = false
    }
  }, [wisdom])

  return { wisdom, isLoaded }
}
