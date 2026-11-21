import type { Capsule, Outcome } from './capsules'

/** Jars are drawn at this scale on a shelf, in the shelf picture's own units. */
export const SHELF_JAR_SCALE = 0.75
/** The 80x72 jar drawing's centre and the line its glass stands on. */
const JAR_CENTRE = 40
const JAR_BASE = 66
const SLOT = 64
const MARGIN = 14
const MIN_WIDTH = 220

export interface ShelfSlot {
  outcome: Outcome
  /** Where the 80x72 jar drawing is placed, already scaled by SHELF_JAR_SCALE. */
  x: number
  y: number
}

export interface ShelfLayout {
  width: number
  height: number
  plankY: number
  slots: ShelfSlot[]
}

/**
 * Lays out jars left to right, oldest first, centred on a plank. The picture is at least
 * MIN_WIDTH wide so a lone jar never looms, and `headroom` adds space above for a jar to arrive from.
 */
export function shelfLayout(outcomes: readonly Outcome[], headroom = 0): ShelfLayout {
  const width = Math.max(MIN_WIDTH, outcomes.length * SLOT + MARGIN * 2)
  const plankY = headroom + 48
  const first = width / 2 - ((outcomes.length - 1) * SLOT) / 2
  return {
    width,
    height: plankY + 8,
    plankY,
    slots: outcomes.map((outcome, i) => ({
      outcome,
      x: first + i * SLOT - JAR_CENTRE * SHELF_JAR_SCALE,
      y: plankY - JAR_BASE * SHELF_JAR_SCALE,
    })),
  }
}

/** Oldest first, newest last, at most `limit`: the order jars stand on the shelf. */
export function shelfOutcomes(openedNewestFirst: readonly Capsule[], limit: number): Outcome[] {
  const outcomes: Outcome[] = []
  for (const capsule of openedNewestFirst) {
    if (outcomes.length === limit) break
    if (capsule.opening) outcomes.push(capsule.opening.outcome)
  }
  return outcomes.reverse()
}
