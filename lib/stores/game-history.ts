/**
 * Game History Store
 *
 * Tracks which games a user has visited and for how long.
 * Persisted to localStorage — no account required.
 */

import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { ALL_GAMES } from '@/lib/games/config'

/** Enough history for suggestions; older visits are dropped so storage never fills up. */
export const MAX_VISITS = 200

// Full or blocked storage must never break a game page; history just stays in memory.
const forgivingLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value)
    } catch {}
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {}
  },
}

export interface GameVisit {
  gameId: string
  visitedAt: string // ISO timestamp
  duration: number // seconds spent (approximate)
}

interface GameHistoryState {
  visits: GameVisit[]
  recordVisit: (gameId: string) => void
  recordDuration: (gameId: string, seconds: number) => void
  getVisitCount: (gameId: string) => number
  getMostPlayed: () => string[]
  getNeverPlayed: () => string[]
  getLastPlayed: () => string | null
  clearHistory: () => void
}

export const useGameHistory = create<GameHistoryState>()(
  persist(
    (set, get) => ({
      visits: [],

      recordVisit: (gameId: string) => {
        set((state) => ({
          visits: [
            ...state.visits,
            {
              gameId,
              visitedAt: new Date().toISOString(),
              duration: 0,
            },
          ].slice(-MAX_VISITS),
        }))
      },

      recordDuration: (gameId: string, seconds: number) => {
        set((state) => {
          // Find the latest visit for this game and update its duration
          const visits = [...state.visits]
          for (let i = visits.length - 1; i >= 0; i--) {
            if (visits[i].gameId === gameId) {
              visits[i] = { ...visits[i], duration: seconds }
              break
            }
          }
          return { visits }
        })
      },

      getVisitCount: (gameId: string) => {
        return get().visits.filter((v) => v.gameId === gameId).length
      },

      getMostPlayed: () => {
        const visits = get().visits
        const counts = new Map<string, number>()
        for (const v of visits) {
          counts.set(v.gameId, (counts.get(v.gameId) ?? 0) + 1)
        }
        return [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([gameId]) => gameId)
      },

      getNeverPlayed: () => {
        const visits = get().visits
        const visitedIds = new Set(visits.map((v) => v.gameId))
        return ALL_GAMES.filter((g) => !visitedIds.has(g.id)).map((g) => g.id)
      },

      getLastPlayed: () => {
        const visits = get().visits
        if (visits.length === 0) return null
        return visits[visits.length - 1].gameId
      },

      clearHistory: () => {
        set({ visits: [] })
      },
    }),
    {
      name: 'verygoodmelon:game-history',
      storage: createJSONStorage(() => forgivingLocalStorage),
    }
  )
)
