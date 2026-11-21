/** Parting words the visitor chose to keep, stored only on their device. */
export const KEPT_LINES_KEY = 'sage_keptLines'

/** Enough to revisit, small enough that the shelf never becomes a chore. */
export const MAX_KEPT_LINES = 60

export interface KeptLine {
  id: string
  text: string
  thinkerId: string
  thinkerName: string
  /** Calendar day it was kept, YYYY-MM-DD. */
  keptOn: string
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

export function parseKeptLines(raw: string | null): KeptLine[] {
  if (!raw) return []
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(value)) return []
  return value.flatMap((item): KeptLine[] => {
    if (typeof item !== 'object' || item === null) return []
    const { id, text, thinkerId, thinkerName, keptOn } = item as Record<string, unknown>
    if (!isText(id) || !isText(text) || !isText(thinkerId) || !isText(thinkerName)) return []
    return [{ id, text, thinkerId, thinkerName, keptOn: typeof keptOn === 'string' ? keptOn : '' }]
  })
}

export function isKept(lines: readonly KeptLine[], thinkerId: string, text: string): boolean {
  return lines.some(line => line.thinkerId === thinkerId && line.text === text)
}

/** Newest first; the same words from the same thinker are kept once. */
export function keepLine(lines: readonly KeptLine[], line: KeptLine): KeptLine[] {
  if (isKept(lines, line.thinkerId, line.text)) return [...lines]
  return [line, ...lines].slice(0, MAX_KEPT_LINES)
}

export function removeLine(lines: readonly KeptLine[], id: string): KeptLine[] {
  return lines.filter(line => line.id !== id)
}

export function loadKeptLines(): KeptLine[] {
  try {
    return parseKeptLines(localStorage.getItem(KEPT_LINES_KEY))
  } catch {
    return []
  }
}

/** False when the device would not store it (private mode, full storage); the visit carries on either way. */
export function saveKeptLines(lines: readonly KeptLine[]): boolean {
  try {
    if (lines.length === 0) localStorage.removeItem(KEPT_LINES_KEY)
    else localStorage.setItem(KEPT_LINES_KEY, JSON.stringify(lines))
    return true
  } catch {
    return false
  }
}
