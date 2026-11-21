import { DILEMMAS, type ChoiceId } from './dilemmas'

export type Answer = ChoiceId | 'skip'
export type Answers = Record<string, Answer>

const KNOWN_IDS = new Set(DILEMMAS.map((dilemma) => dilemma.id))
const isAnswer = (value: unknown): value is Answer => value === 'A' || value === 'B' || value === 'skip'

/** Answers saved by an earlier set of dilemmas keep only what still applies. */
export function keepKnownAnswers(stored: unknown): Answers {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return {}
  return Object.fromEntries(
    Object.entries(stored).filter(([id, answer]) => KNOWN_IDS.has(id) && isAnswer(answer))
  ) as Answers
}

export function keepKnownIds(stored: unknown): string[] {
  if (!Array.isArray(stored)) return []
  return stored.filter((id): id is string => typeof id === 'string' && KNOWN_IDS.has(id))
}
