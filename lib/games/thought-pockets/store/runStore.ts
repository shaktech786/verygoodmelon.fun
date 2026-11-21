import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { RunState, School } from '@/types/thought-pockets'
import { newRun } from '../engine/run'

const RUN_VERSION = 2

interface RunStore {
  run: RunState | null
  start: (school: School, seed: number) => void
  abandon: () => void
  act: (action: (run: RunState) => RunState) => void
}

/**
 * The whole run, battle included, is one plain value saved after every action,
 * so a reload resumes at exactly the same moment, mid-turn plays and all.
 */
export const useRunStore = create<RunStore>()(
  persist(
    (set) => ({
      run: null,
      start: (school, seed) => set({ run: newRun(school, seed) }),
      abandon: () => set({ run: null }),
      act: (action) =>
        set((state) => {
          if (!state.run) return state
          const run = action(state.run)
          if (run === state.run) return state
          useInsightStore.getState().record(run)
          return { run }
        }),
    }),
    {
      name: 'thought-pockets-run',
      version: RUN_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ run: state.run }),
      migrate: () => ({ run: null }),
    },
  ),
)

interface InsightStore {
  beaten: string[]
  finishedWith: School[]
  tutorialDone: boolean
  record: (run: RunState) => void
}

/** What carries across runs: the insights you have earned and whether you have seen the first-fight hints. */
export const useInsightStore = create<InsightStore>()(
  persist(
    (set) => ({
      beaten: [],
      finishedWith: [],
      tutorialDone: false,
      record: (run) =>
        set((state) => {
          const fresh = run.beaten.filter((id) => !state.beaten.includes(id))
          const finished = run.screen === 'victory' && !state.finishedWith.includes(run.school)
          const tutorialDone = state.tutorialDone || run.beaten.length > 0
          if (fresh.length === 0 && !finished && tutorialDone === state.tutorialDone) return state
          return {
            beaten: [...state.beaten, ...fresh],
            finishedWith: finished ? [...state.finishedWith, run.school] : state.finishedWith,
            tutorialDone,
          }
        }),
    }),
    {
      name: 'thought-pockets-insights',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ beaten: state.beaten, finishedWith: state.finishedWith, tutorialDone: state.tutorialDone }),
    },
  ),
)
