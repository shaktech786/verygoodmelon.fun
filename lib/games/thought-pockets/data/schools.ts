import { Difficulty, Mode, School, SchoolDef } from '@/types/thought-pockets'
import { DOUBT_WEIGHT } from '../engine/battle'
import { CONCLUSION_TIMES, EMPIRICIST_EVIDENCE_TIMES, timesWord } from './conclusion'

const CORE = ['observation', 'observation', 'observation', 'observation', 'caveat', 'caveat', 'caveat']

export const SCHOOLS: SchoolDef[] = [
  {
    id: 'empiricist',
    name: 'Empiricist',
    difficulty: { gentle: 'Easy', rigorous: ['Easy', 'Easy', 'Easy', 'Easy', 'Medium', 'Medium', 'Hard'] },
    tagline: 'Pile up Evidence until the Weight is undeniable.',
    passive: `When your Conclusion is Evidence, it counts ${timesWord(EMPIRICIST_EVIDENCE_TIMES)} instead of ${timesWord(CONCLUSION_TIMES)}.`,
    deck: [...CORE, 'therefore', 'statistic', 'corroboration'],
  },
  {
    id: 'pragmatist',
    name: 'Pragmatist',
    difficulty: { gentle: 'Easy', rigorous: ['Easy', 'Easy', 'Easy', 'Easy', 'Medium', 'Hard', 'Hard'] },
    tagline: 'Defend well, then turn the defence into a point.',
    passive: 'Guard you still have after the enemy acts becomes Weight in your next argument.',
    deck: [...CORE, 'steelman', 'measured_reply', 'measured_reply'],
  },
  {
    id: 'rationalist',
    name: 'Rationalist',
    difficulty: { gentle: 'Easy', rigorous: ['Easy', 'Easy', 'Easy', 'Easy', 'Medium', 'Hard', 'Hard'] },
    tagline: 'Few facts, many inferences. Stack the Multiplier.',
    passive: 'The first Logic card you play each turn costs 0 Focus.',
    deck: [...CORE, 'therefore', 'modus_ponens', 'anecdote'],
  },
  {
    id: 'absurdist',
    name: 'Absurdist',
    difficulty: { gentle: 'Medium', rigorous: ['Easy', 'Easy', 'Medium', 'Medium', 'Hard', 'Hard', 'Hard'] },
    tagline: 'Your deck starts with Doubt. Carry it anyway.',
    passive: `Each Doubt in your hand adds ${DOUBT_WEIGHT} Weight to your argument.`,
    deck: ['observation', 'observation', 'observation', 'observation', 'caveat', 'caveat', 'therefore', 'therefore', 'amor_fati', 'doubt', 'doubt'],
  },
  {
    id: 'skeptic',
    name: 'Skeptic',
    difficulty: { gentle: 'Easy', rigorous: ['Easy', 'Easy', 'Easy', 'Medium', 'Hard', 'Hard', 'Hard'] },
    tagline: 'Keep asking questions and let the doubt do the work.',
    passive: 'Whenever you Unsettle, Unsettle 2 more.',
    deck: [...CORE, 'therefore', 'why', 'probing_question'],
  },
]

export function getSchoolDef(school: School): SchoolDef {
  const def = SCHOOLS.find((candidate) => candidate.id === school)
  if (!def) throw new Error(`Unknown school: ${school}`)
  return def
}

/** What each label means at a Rigorous level: how often a careful player and a planner, pooled, finish the Long walk. */
export const DIFFICULTY_BANDS: Record<Difficulty, { min: number; max: number }> = {
  Easy: { min: 0.7, max: 1.01 },
  Medium: { min: 0.4, max: 0.7 },
  Hard: { min: 0, max: 0.4 },
}

/** How hard a school is at this pace and, in Rigorous, at this level. */
export function schoolDifficulty(school: SchoolDef, mode: Mode, level: number): Difficulty {
  return mode === 'gentle' ? school.difficulty.gentle : school.difficulty.rigorous[level - 1]
}
