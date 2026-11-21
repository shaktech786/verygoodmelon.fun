'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface VoteCounts {
  choiceA: number
  choiceB: number
}

type Choice = 'A' | 'B'

interface UseRealtimeVotesReturn {
  /** Vote counts by dilemma ID, for every dilemma seeded so far. */
  votes: Record<string, VoteCounts>
  isConnected: boolean
  /** Dilemma IDs that received a realtime update recently (choice that changed). */
  recentlyUpdated: Record<string, Choice>
  clearUpdated: (dilemmaId: string) => void
  /** Seed vote counts from REST. Call this after fetching initial data. */
  seedVotes: (dilemmaId: string, choiceA: number, choiceB: number) => void
  /** Call before posting the player's own vote, so its realtime echo is not counted twice. */
  expectOwnVote: (dilemmaId: string, choice: Choice) => void
  /** Call when the player's own vote could not be posted. */
  cancelOwnVote: (dilemmaId: string, choice: Choice) => void
}

const POLL_INTERVAL_MS = 10_000

let channelCount = 0

/**
 * Keeps vote counts for the hard_choices_votes table fresh.
 *
 * - Nothing connects until `seedVotes` has been called once: a successful REST
 *   read proves the backend is reachable, so an unreachable one costs no socket.
 * - On INSERT events, increments the count of dilemmas that have been seeded.
 * - If live updates are unavailable, polls only `watchedDilemmaId`, and stops
 *   for good on the first failure rather than retrying a broken backend.
 */
export function useRealtimeVotes(watchedDilemmaId: string | null): UseRealtimeVotesReturn {
  const [votes, setVotes] = useState<Record<string, VoteCounts>>({})
  const [isConnected, setIsConnected] = useState(false)
  const [backendReachable, setBackendReachable] = useState(false)
  const [recentlyUpdated, setRecentlyUpdated] = useState<Record<string, Choice>>({})
  const seededIds = useRef(new Set<string>())
  const ownVotes = useRef(new Map<string, number>())
  const watchedIdRef = useRef(watchedDilemmaId)
  useEffect(() => { watchedIdRef.current = watchedDilemmaId }, [watchedDilemmaId])

  const clearUpdated = useCallback((dilemmaId: string) => {
    setRecentlyUpdated((prev) => {
      const next = { ...prev }
      delete next[dilemmaId]
      return next
    })
  }, [])

  const seedVotes = useCallback((dilemmaId: string, choiceA: number, choiceB: number) => {
    seededIds.current.add(dilemmaId)
    setVotes((prev) => ({ ...prev, [dilemmaId]: { choiceA, choiceB } }))
    setBackendReachable(true)
  }, [])

  const expectOwnVote = useCallback((dilemmaId: string, choice: Choice) => {
    const key = `${dilemmaId}:${choice}`
    ownVotes.current.set(key, (ownVotes.current.get(key) ?? 0) + 1)
  }, [])

  const cancelOwnVote = useCallback((dilemmaId: string, choice: Choice) => {
    const key = `${dilemmaId}:${choice}`
    const pending = ownVotes.current.get(key) ?? 0
    if (pending > 0) ownVotes.current.set(key, pending - 1)
  }, [])

  useEffect(() => {
    if (!backendReachable) return

    let polling: ReturnType<typeof setInterval> | null = null

    const stopPolling = () => {
      if (polling) clearInterval(polling)
      polling = null
    }

    const startPolling = () => {
      if (polling) return
      polling = setInterval(async () => {
        const id = watchedIdRef.current
        if (!id) return
        try {
          const res = await fetch(`/api/hard-choices/votes?dilemmaId=${id}`)
          if (!res.ok) throw new Error(`Failed to refresh votes: ${res.status}`)
          const data: VoteCounts = await res.json()
          setVotes((prev) => ({ ...prev, [id]: { choiceA: data.choiceA, choiceB: data.choiceB } }))
        } catch {
          stopPolling()
        }
      }, POLL_INTERVAL_MS)
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      startPolling()
      return stopPolling
    }

    const supabase = createClient()
    let closed = false

    const closeChannel = (socketFailed: boolean) => {
      if (closed) return
      closed = true
      setIsConnected(false)
      void supabase.removeChannel(channel)
      // Otherwise the client keeps retrying the socket for as long as the page is open.
      if (socketFailed) void supabase.realtime.disconnect()
    }

    const channel = supabase
      // A removed channel lingers until its leave completes, and asking for the same
      // name again in that window (a quick remount) returns the dead channel.
      .channel(`hard-choices-votes-${++channelCount}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'hard_choices_votes' },
        (payload) => {
          const { dilemma_id, choice } = payload.new as { dilemma_id: string; choice: string }
          if (choice !== 'A' && choice !== 'B') return

          const ownKey = `${dilemma_id}:${choice}`
          const pendingOwn = ownVotes.current.get(ownKey) ?? 0
          if (pendingOwn > 0) {
            ownVotes.current.set(ownKey, pendingOwn - 1)
            return
          }

          if (!seededIds.current.has(dilemma_id)) return

          setVotes((prev) => {
            const current = prev[dilemma_id]
            if (!current) return prev
            return {
              ...prev,
              [dilemma_id]: {
                choiceA: current.choiceA + (choice === 'A' ? 1 : 0),
                choiceB: current.choiceB + (choice === 'B' ? 1 : 0),
              },
            }
          })
          setRecentlyUpdated((prev) => ({ ...prev, [dilemma_id]: choice }))
        }
      )

    channel.subscribe((status) => {
      if (closed) return
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
      } else {
        closeChannel(true)
        startPolling()
      }
    })

    return () => {
      stopPolling()
      closeChannel(false)
    }
  }, [backendReachable])

  return { votes, isConnected, recentlyUpdated, clearUpdated, seedVotes, expectOwnVote, cancelOwnVote }
}
