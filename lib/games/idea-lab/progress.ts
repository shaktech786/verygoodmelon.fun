import type { Concept } from './concepts'
import { WORKS } from './golds'

export interface LabProgress {
  /** Index into WORKS. */
  work: number
  /** Combinations since the last gold or the last clue. */
  triesSinceClue: number
  /** One per gold of this Work, in shelf order: 0 riddle only, 1 plainer clue, 2 ingredients. Only ever rises within a Work. */
  hints: number[]
}

export const MAX_HINT = 2

const noHints = (work: number) => WORKS[work].map(() => 0)

export const DEFAULT_PROGRESS: LabProgress = { work: 0, triesSinceClue: 0, hints: noHints(0) }

/** Combinations without a new gold before the next riddle grows one step plainer. */
export const HINT_AFTER_TRIES = 5

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0
const isHint = (value: unknown): value is number => isCount(value) && value <= MAX_HINT

function readJson(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function parseProgress(raw: string | null): LabProgress {
  const value = readJson(raw)
  if (typeof value !== 'object' || value === null) return DEFAULT_PROGRESS
  const { work, triesSinceClue, hints, hintLevel } = value as Record<string, unknown>
  if (!isCount(work) || work >= WORKS.length) return DEFAULT_PROGRESS

  if (Array.isArray(hints)) {
    if (!isCount(triesSinceClue) || hints.length !== WORKS[work].length || !hints.every(isHint)) return DEFAULT_PROGRESS
    return { work, triesSinceClue, hints }
  }

  // Saves from when one clue level covered every riddle: whatever the player has already seen stays shown.
  if (!isHint(hintLevel)) return DEFAULT_PROGRESS
  return { work, triesSinceClue: 0, hints: WORKS[work].map(() => hintLevel) }
}

/**
 * Every settled combination counts as a try; a new gold restarts the count. After enough tries the oldest
 * unsolved riddle grows one step plainer, so clues surface one at a time instead of all at once.
 */
export function afterCombination(
  progress: LabProgress,
  foundGold: boolean,
  solved: readonly boolean[],
): { progress: LabProgress; clued: number | null } {
  if (foundGold) return { progress: { ...progress, triesSinceClue: 0 }, clued: null }
  const triesSinceClue = progress.triesSinceClue + 1
  const target = triesSinceClue >= HINT_AFTER_TRIES
    ? progress.hints.findIndex((level, index) => !solved[index] && level < MAX_HINT)
    : -1
  if (target < 0) return { progress: { ...progress, triesSinceClue }, clued: null }
  const hints = progress.hints.map((level, index) => (index === target ? level + 1 : level))
  return { progress: { ...progress, triesSinceClue: 0, hints }, clued: target }
}

export function beginNextWork(progress: LabProgress): LabProgress {
  const work = Math.min(progress.work + 1, WORKS.length - 1)
  return { work, triesSinceClue: 0, hints: noHints(work) }
}

export function parseDiscoveries(raw: string | null): Concept[] {
  const value = readJson(raw)
  if (!Array.isArray(value)) return []
  return value
    .filter((c): c is Concept =>
      typeof c === 'object' && c !== null && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.emoji === 'string')
    .map(({ id, name, emoji, description }) => (typeof description === 'string' ? { id, name, emoji, description } : { id, name, emoji }))
}

export function parseCombinations(raw: string | null): Record<string, string> {
  const value = readJson(raw)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
}
