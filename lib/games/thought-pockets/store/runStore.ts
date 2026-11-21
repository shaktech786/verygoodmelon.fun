import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { Mode, RunLength, RunState, School } from '@/types/thought-pockets'
import { RUN_VERSION, migrateRun, newRun, opensNextLevel } from '../engine/run'

interface RunStore {
  run: RunState | null
  start: (school: School, seed: number, mode: Mode, rigor: number, length: RunLength) => void
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
      start: (school, seed, mode, rigor, length) => set({ run: newRun(school, seed, mode, useInsightStore.getState().beaten, rigor, length) }),
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
      migrate: (persisted, version) => ({
        run: typeof persisted === 'object' && persisted !== null && 'run' in persisted ? migrateRun(persisted.run, version) : null,
      }),
    },
  ),
)

interface InsightStore {
  beaten: string[]
  finishedWith: School[]
  tutorialDone: boolean
  /** The highest Rigorous level won on a Long walk; the next one up is open. */
  rigorWon: number
  record: (run: RunState) => void
}

/** What carries across runs: the insights you have earned and whether you have seen the first-fight hints. */
export const useInsightStore = create<InsightStore>()(
  persist(
    (set) => ({
      beaten: [],
      finishedWith: [],
      tutorialDone: false,
      rigorWon: 0,
      record: (run) =>
        set((state) => {
          const fresh = run.beaten.filter((id) => !state.beaten.includes(id))
          const victory = run.screen === 'victory'
          const finished = victory && !state.finishedWith.includes(run.school)
          const tutorialDone = state.tutorialDone || run.beaten.length > 0
          const rigorWon = opensNextLevel(run) ? Math.max(state.rigorWon, run.rigor) : state.rigorWon
          if (fresh.length === 0 && !finished && tutorialDone === state.tutorialDone && rigorWon === state.rigorWon) return state
          return {
            beaten: [...state.beaten, ...fresh],
            finishedWith: finished ? [...state.finishedWith, run.school] : state.finishedWith,
            tutorialDone,
            rigorWon,
          }
        }),
    }),
    {
      name: 'thought-pockets-insights',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ beaten: state.beaten, finishedWith: state.finishedWith, tutorialDone: state.tutorialDone, rigorWon: state.rigorWon }),
    },
  ),
)
