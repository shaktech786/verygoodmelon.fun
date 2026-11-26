import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { Mode, RunLength, RunState, School } from '@/types/thought-pockets'
import { RUN_VERSION, migrateRun, newRun, opensNextLevel } from '../engine/run'
import { ALL_LESSONS, Lesson } from '../engine/lessons'
import { INSIGHT_KEY, RUN_KEY } from './keys'

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
      start: (school, seed, mode, rigor, length) => {
        const { beaten, tutorialDone } = useInsightStore.getState()
        set({ run: newRun(school, seed, mode, beaten, rigor, length, !tutorialDone) })
      },
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
      name: RUN_KEY,
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
  /** The ideas beyond the first fight's basics that have been explained to you once. */
  seen: Lesson[]
  record: (run: RunState) => void
  learn: (lesson: Lesson) => void
}

/** What carries across runs: the insights you have earned, whether you have seen the first-fight hints, and which ideas have been explained. */
export const useInsightStore = create<InsightStore>()(
  persist(
    (set) => ({
      beaten: [],
      finishedWith: [],
      tutorialDone: false,
      rigorWon: 0,
      seen: [],
      learn: (lesson) => set((state) => (state.seen.includes(lesson) ? state : { seen: [...state.seen, lesson] })),
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
      name: INSIGHT_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ beaten: state.beaten, finishedWith: state.finishedWith, tutorialDone: state.tutorialDone, rigorWon: state.rigorWon, seen: state.seen }),
      // Before ideas were explained one at a time, anyone who had finished a walk had already met them all.
      migrate: (persisted) => {
        const saved = (typeof persisted === 'object' && persisted !== null ? persisted : {}) as Partial<InsightStore>
        const finished = (saved.finishedWith?.length ?? 0) > 0 || (saved.rigorWon ?? 0) > 0
        return { ...saved, seen: finished ? ALL_LESSONS : [] } as InsightStore
      },
    },
  ),
)
