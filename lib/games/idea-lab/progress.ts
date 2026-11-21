import type { Concept } from './concepts'
import { WORKS } from './golds'

export interface LabProgress {
  /** Index into WORKS. */
  work: number
  triesSinceGold: number
  /** 0 riddle only, 1 plainer clue, 2 ingredients. Only ever rises within a Work. */
  hintLevel: number
}

export const DEFAULT_PROGRESS: LabProgress = { work: 0, triesSinceGold: 0, hintLevel: 0 }

/** Combinations without a new gold before the plainer clue, then the ingredients, appear. */
export const HINT_AFTER_TRIES = [5, 12] as const

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0

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
  const { work, triesSinceGold, hintLevel } = value as Record<string, unknown>
  if (!isCount(work) || work >= WORKS.length || !isCount(triesSinceGold) || !isCount(hintLevel) || hintLevel > 2) {
    return DEFAULT_PROGRESS
  }
  return { work, triesSinceGold, hintLevel }
}

export function afterCombination(progress: LabProgress, foundGold: boolean): LabProgress {
  if (foundGold) return { ...progress, triesSinceGold: 0 }
  const triesSinceGold = progress.triesSinceGold + 1
  const earned = HINT_AFTER_TRIES.filter(threshold => triesSinceGold >= threshold).length
  return { ...progress, triesSinceGold, hintLevel: Math.max(progress.hintLevel, earned) }
}

export function beginNextWork(progress: LabProgress): LabProgress {
  return { work: Math.min(progress.work + 1, WORKS.length - 1), triesSinceGold: 0, hintLevel: 0 }
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
