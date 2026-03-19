'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface VoteCounts {
  optionA: number
  optionB: number
}

interface UseRealtimeVotesReturn {
  votes: Record<string, VoteCounts>
  isConnected: boolean
  /** Dilemma IDs that received a realtime update recently (choice that changed). */
  recentlyUpdated: Record<string, 'A' | 'B'>
  clearUpdated: (dilemmaId: string) => void
  /** Seed vote counts from REST. Call this after fetching initial data. */
  seedVotes: (dilemmaId: string, choiceA: number, choiceB: number) => void
}

/**
 * Subscribes to Supabase Realtime for live vote updates on the hard_choices_votes table.
 *
 * - Call `seedVotes` after loading REST data so realtime increments start from the correct base.
 * - On INSERT events, increments the local vote count for the relevant dilemma/choice.
 * - Falls back to REST polling (every 10s) when Supabase env vars are missing.
 * - Cleans up subscription on unmount.
 */
export function useRealtimeVotes(
  dilemmaIds: string[]
): UseRealtimeVotesReturn {
  const [votes, setVotes] = useState<Record<string, VoteCounts>>({})
  const [isConnected, setIsConnected] = useState(false)
  const [recentlyUpdated, setRecentlyUpdated] = useState<Record<string, 'A' | 'B'>>({})
  const channelRef = useRef<RealtimeChannel | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dilemmaIdsRef = useRef(dilemmaIds)
  useEffect(() => { dilemmaIdsRef.current = dilemmaIds }, [dilemmaIds])

  const clearUpdated = useCallback((dilemmaId: string) => {
    setRecentlyUpdated((prev) => {
      const next = { ...prev }
      delete next[dilemmaId]
      return next
    })
  }, [])

  const seedVotes = useCallback((dilemmaId: string, choiceA: number, choiceB: number) => {
    setVotes((prev) => ({
      ...prev,
      [dilemmaId]: { optionA: choiceA, optionB: choiceB },
    }))
  }, [])

  const startPolling = useCallback(() => {
    if (pollingRef.current) return
    pollingRef.current = setInterval(async () => {
      for (const id of dilemmaIdsRef.current) {
        try {
          const res = await fetch(`/api/hard-choices/votes?dilemmaId=${id}`)
          if (res.ok) {
            const data = await res.json()
            setVotes((prev) => ({
              ...prev,
              [id]: { optionA: data.choiceA ?? 0, optionB: data.choiceB ?? 0 },
            }))
          }
        } catch {
          // Silently fail -- polling is best-effort
        }
      }
    }, 10_000)
  }, [])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // If Supabase is not configured, fall back to REST polling
    if (!supabaseUrl || !supabaseAnonKey) {
      startPolling()
      return () => stopPolling()
    }

    const supabase = createClient()

    const channel = supabase
      .channel('hard-choices-votes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'hard_choices_votes',
        },
        (payload) => {
          const newRow = payload.new as {
            id: string
            dilemma_id: string
            choice: string
            created_at: string | null
          }

          const { dilemma_id, choice } = newRow

          setVotes((prev) => {
            const current = prev[dilemma_id] || { optionA: 0, optionB: 0 }
            return {
              ...prev,
              [dilemma_id]: {
                optionA: current.optionA + (choice === 'A' ? 1 : 0),
                optionB: current.optionB + (choice === 'B' ? 1 : 0),
              },
            }
          })

          // Mark as recently updated for pulse animation
          if (choice === 'A' || choice === 'B') {
            setRecentlyUpdated((prev) => ({
              ...prev,
              [dilemma_id]: choice as 'A' | 'B',
            }))
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          startPolling()
        }
      })

    channelRef.current = channel

    return () => {
      setIsConnected(false)
      stopPolling()
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [startPolling, stopPolling])

  return { votes, isConnected, recentlyUpdated, clearUpdated, seedVotes }
}

/**
 * Merges realtime vote data with REST-fetched data.
 * When realtime data exists for a dilemma, it is authoritative
 * (seeded from REST, then incremented by realtime events).
 */
export function mergeVotes(
  restChoiceA: number,
  restChoiceB: number,
  realtimeVotes: VoteCounts | undefined
): { choiceA: number; choiceB: number } {
  if (!realtimeVotes) {
    return { choiceA: restChoiceA, choiceB: restChoiceB }
  }
  return {
    choiceA: realtimeVotes.optionA,
    choiceB: realtimeVotes.optionB,
  }
}
