'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LeaderboardEntry {
  id: string
  username: string
  avatar_url: string | null
  points: number | null
  total_games_played: number | null
}

export function useLeaderboard(limit = 10) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, points, total_games_played')
          .order('points', { ascending: false })
          .limit(limit)

        if (error) throw error
        setLeaderboard(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [limit])

  return { leaderboard, loading, error }
}
