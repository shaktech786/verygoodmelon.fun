import { School, SchoolDef } from '@/types/thought-pockets'

const CORE = ['observation', 'observation', 'observation', 'observation', 'caveat', 'caveat', 'caveat']

export const SCHOOLS: SchoolDef[] = [
  {
    id: 'empiricist',
    name: 'Empiricist',
    difficulty: 'Easy',
    tagline: 'Pile up Evidence until the Weight is undeniable.',
    passive: 'When your Conclusion is Evidence, it counts three times instead of twice.',
    deck: [...CORE, 'therefore', 'statistic', 'corroboration'],
  },
  {
    id: 'pragmatist',
    name: 'Pragmatist',
    difficulty: 'Easy',
    tagline: 'Defend well, then turn the defence into a point.',
    passive: 'Guard you still have after the enemy acts becomes Weight in your next argument.',
    deck: [...CORE, 'therefore', 'therefore', 'measured_reply'],
  },
  {
    id: 'rationalist',
    name: 'Rationalist',
    difficulty: 'Medium',
    tagline: 'Few facts, many inferences. Stack the Multiplier.',
    passive: 'The first Logic card you play each turn costs 0 Focus.',
    deck: [...CORE, 'therefore', 'modus_ponens', 'anecdote'],
  },
  {
    id: 'absurdist',
    name: 'Absurdist',
    difficulty: 'Medium',
    tagline: 'Your deck starts with Doubt. Carry it anyway.',
    passive: 'Each Doubt in your hand adds 4 Weight to your argument.',
    deck: ['observation', 'observation', 'observation', 'observation', 'caveat', 'caveat', 'therefore', 'therefore', 'amor_fati', 'doubt', 'doubt'],
  },
  {
    id: 'skeptic',
    name: 'Skeptic',
    difficulty: 'Hard',
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
