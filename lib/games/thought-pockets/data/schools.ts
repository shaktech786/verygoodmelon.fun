import { School, SchoolDef } from '@/types/thought-pockets'
import { DOUBT_WEIGHT } from '../engine/battle'
import { CONCLUSION_TIMES, EMPIRICIST_EVIDENCE_TIMES, timesWord } from './conclusion'

const CORE = ['observation', 'observation', 'observation', 'observation', 'caveat', 'caveat', 'caveat']

export const SCHOOLS: SchoolDef[] = [
  {
    id: 'empiricist',
    name: 'Empiricist',
    difficulty: 'Easy',
    tagline: 'Pile up Evidence until the Weight is undeniable.',
    passive: `When your Conclusion is Evidence, it counts ${timesWord(EMPIRICIST_EVIDENCE_TIMES)} instead of ${timesWord(CONCLUSION_TIMES)}.`,
    deck: [...CORE, 'therefore', 'statistic', 'corroboration'],
  },
  {
    id: 'pragmatist',
    name: 'Pragmatist',
    difficulty: 'Easy',
    tagline: 'Defend well, then turn the defence into a point.',
    passive: 'Guard you still have after the enemy acts becomes Weight in your next argument.',
    deck: [...CORE, 'steelman', 'measured_reply', 'measured_reply'],
  },
  {
    id: 'rationalist',
    name: 'Rationalist',
    difficulty: 'Hard',
    tagline: 'Few facts, many inferences. Stack the Multiplier.',
    passive: 'The first Logic card you play each turn costs 0 Focus.',
    deck: [...CORE, 'therefore', 'modus_ponens', 'anecdote'],
  },
  {
    id: 'absurdist',
    name: 'Absurdist',
    difficulty: 'Easy',
    tagline: 'Your deck starts with Doubt. Carry it anyway.',
    passive: `Each Doubt in your hand adds ${DOUBT_WEIGHT} Weight to your argument.`,
    deck: ['observation', 'observation', 'observation', 'observation', 'caveat', 'caveat', 'therefore', 'therefore', 'amor_fati', 'doubt', 'doubt'],
  },
  {
    id: 'skeptic',
    name: 'Skeptic',
    difficulty: 'Medium',
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
