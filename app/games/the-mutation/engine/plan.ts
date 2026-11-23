import { CIRCLE_AFTER, ENDING, MAX_FORKS, MECHANIC_OPTIONS, OFFER_SIZE, type MechanicCategory } from './types'

const CATEGORIES = Object.keys(MECHANIC_OPTIONS) as MechanicCategory[]
const LIGHTS = MECHANIC_OPTIONS.collectible
const BLOOM = 'score_rush'
// The bloom gathers up what a run already has, so it waits until there is something to gather
const BLOOM_AFTER = 2

export function categoryOf(id: string): MechanicCategory | null {
  return CATEGORIES.find(c => MECHANIC_OPTIONS[c].includes(id)) ?? null
}

export function isMovement(id: string): boolean {
  return categoryOf(id) === 'movement'
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))]
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The one clue before the orb can move. Touch players can only use the follow control. */
export function movementFor(random: () => number, touch: boolean): string {
  return touch ? 'mouse_follow' : pick(MECHANIC_OPTIONS.movement, random)
}

export interface RunSoFar {
  /** Every rule opened so far, in order, movement included. */
  chosen: readonly string[]
  /** Clues rested past; they sleep in the field and are not offered again. */
  asleep: readonly string[]
  /** Crossroads passed. */
  forks: number
}

/**
 * The clues for the next crossroads. A run holds one rule of each kind, so choosing tides means
 * the shadows never come. Until something to gather has arrived, both lights are offered side by
 * side. Later the quiet circle joins in, so the player also chooses when the game ends.
 */
export function offerClues(run: RunSoFar, random: () => number): string[] {
  const rules = run.chosen.filter(id => !isMovement(id))
  if (run.forks >= MAX_FORKS || rules.includes(BLOOM)) return [ENDING]
  const taken = new Set(run.chosen.map(categoryOf))
  const pool = CATEGORIES.flatMap(c => (taken.has(c) || c === 'movement' ? [] : MECHANIC_OPTIONS[c]))
    .filter(id => !run.asleep.includes(id) && (id !== BLOOM || rules.length >= BLOOM_AFTER))
  if (pool.length === 0) return [ENDING]

  const withCircle = run.forks >= CIRCLE_AFTER
  const room = withCircle ? OFFER_SIZE - 1 : OFFER_SIZE
  const picks: string[] = []
  if (!rules.some(id => LIGHTS.includes(id))) picks.push(...shuffled(pool.filter(id => LIGHTS.includes(id)), random))
  // Fill the rest with kinds not yet on offer, so each crossroads is a real choice between different things
  const rest = shuffled(pool.filter(id => !picks.includes(id)), random)
  for (const id of rest) {
    if (picks.length < room && !picks.some(p => categoryOf(p) === categoryOf(id))) picks.push(id)
  }
  for (const id of rest) {
    if (picks.length < room && !picks.includes(id)) picks.push(id)
  }
  return withCircle ? [...picks.slice(0, room), ENDING] : picks.slice(0, room)
}
