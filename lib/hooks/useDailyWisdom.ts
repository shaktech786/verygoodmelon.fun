'use client'

import { useEffect, useState } from 'react'

const CACHE_KEY = 'verygoodmelon:daily-wisdom'

const today = () => new Date().toISOString().split('T')[0]

function getCachedWisdom(): string | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed.date === today() && typeof parsed.text === 'string' && parsed.text) {
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
  // The cache is only read after mount: the server never has it, so reading it during render breaks hydration.
  const [wisdom, setWisdom] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const cached = getCachedWisdom()
    if (cached) {
      queueMicrotask(() => {
        if (mounted) setWisdom(cached)
      })
      return () => {
        mounted = false
      }
    }

    async function fetchWisdom() {
      try {
        const res = await fetch('/api/daily-wisdom')
        if (!res.ok) return
        const data = await res.json()
        if (mounted && typeof data.wisdom === 'string' && data.wisdom) {
          setWisdom(data.wisdom)
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today(), text: data.wisdom }))
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
  }, [])

  return { wisdom, isLoaded: wisdom !== null }
}
