'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Game } from '@/types/database'

export function useGames() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('is_active', true)
          .order('play_count', { ascending: false })

        if (error) throw error
        setGames(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [])

  return { games, loading, error }
}

export function useGame(slug: string) {
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('slug', slug)
          .single()

        if (error) throw error
        setGame(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchGame()
  }, [slug])

  return { game, loading, error }
}
