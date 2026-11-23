import type { FoundBy, PlayStyle } from './types'
import { isMovement } from './plan'
import { listed, shortName, togetherThen } from './rules'

/**
 * How a run ended, from what the player chose and how they played:
 * - still: every crossroads was rested through, so the field kept its quiet
 * - bloom: the player chose the bloom, and the run ended bright
 * - kept: as many clues were let be as were chosen
 * - wandering / gathering / resting: how most of the chosen clues were opened
 */
export type EndingKind = 'still' | 'bloom' | 'kept' | 'wandering' | 'gathering' | 'resting'

export interface RunStory {
  /** Every rule opened, in order, movement included. */
  mechanicIds: readonly string[]
  /** Clues rested past at a crossroads, now asleep in the field. */
  letBe: readonly string[]
  /** How each clue was opened, the closing circle included. */
  foundBy: readonly FoundBy[]
  style: PlayStyle
  transformed: number
  /** Times a shadow bumped the orb. */
  bumps: number
  /** Times a tide carried the orb along. */
  carries: number
}

function chosenRules(run: Pick<RunStory, 'mechanicIds'>): string[] {
  return run.mechanicIds.filter(id => !isMovement(id))
}

export function endingKind(run: RunStory): EndingKind {
  const chosen = chosenRules(run)
  if (chosen.length === 0) return 'still'
  if (chosen.includes('score_rush')) return 'bloom'
  if (run.letBe.length >= chosen.length) return 'kept'
  const ways = { went: 0, gathered: 0, rested: 0 }
  for (const way of run.foundBy) ways[way]++
  if (run.style === 'explorer' || (ways.went >= ways.gathered && ways.went >= ways.rested)) return 'wandering'
  return ways.gathered >= ways.rested ? 'gathering' : 'resting'
}

const COLLECTIBLE_WORD: Record<string, string> = { stars: 'STARS', pulse_gems: 'GEMS' }
const RULE_WORD: Record<string, string> = {
  chasers: 'SHADOWS',
  sweepers: 'TIDES',
  blaster: 'LANTERNS',
  phase_dash: 'GLIDES',
  combo_chain: 'RHYTHMS',
  gravity_well: 'GENTLE PULL',
}
const ANY_WORD: Record<string, string> = { ...COLLECTIBLE_WORD, ...RULE_WORD, score_rush: 'BLOOMS' }

const KIND_WORD: Record<Exclude<EndingKind, 'still' | 'bloom'>, string> = {
  kept: 'HALF-KEPT',
  wandering: 'WANDERING',
  gathering: 'GATHERING',
  resting: 'QUIET',
}

/** Used when no name comes back from the server. Drawn from the ending and the rules this run chose. */
export function fallbackName(run: RunStory): string {
  const kind = endingKind(run)
  const chosen = chosenRules(run)
  if (kind === 'still') {
    const asleep = run.letBe.map(id => ANY_WORD[id]).filter(Boolean)
    return asleep.length ? `SLEEPING ${asleep.slice(0, 2).join(' & ')}` : 'THE STILL FIELD'
  }
  const collectible = chosen.map(id => COLLECTIBLE_WORD[id]).find(Boolean) ?? 'LIGHTS'
  if (kind === 'bloom') {
    const first = chosen.map(id => RULE_WORD[id]).find(Boolean)
    return first ? `${collectible} & ${first} IN BLOOM` : `${collectible} IN BLOOM`
  }
  const first = chosen.map(id => RULE_WORD[id]).find(Boolean)
  return [KIND_WORD[kind], collectible, first && `& ${first}`].filter(Boolean).join(' ')
}

const RULE_SCENE: Record<string, string> = {
  chasers: 'among the wandering shadows',
  sweepers: 'as the tides came and went',
  blaster: 'by lantern light',
  phase_dash: 'in quick, quiet glides',
  combo_chain: 'in an easy rhythm',
  gravity_well: 'in the gentle pull',
}

function lightsOf(ids: readonly string[]): string {
  return ids.includes('pulse_gems') && !ids.includes('stars') ? 'gems' : 'stars'
}

/**
 * Used when no tagline comes back from the server. Built from this run's own choices and how it
 * was played, never from how much was gathered, so it reads as a portrait rather than a tally.
 */
export function fallbackTagline(run: RunStory): string {
  const kind = endingKind(run)
  const lights = lightsOf(run.mechanicIds)
  const deed: Record<EndingKind, string> = {
    still: 'let every clue sleep and kept the field quiet',
    bloom: `chose the bloom and let the ${lights} glow at once`,
    kept: 'took a little and let the rest be',
    wandering: run.transformed > 0 ? 'turned shadows into light' : `roamed the whole field and found ${lights}`,
    gathering: `gathered ${lights}, one small light at a time`,
    resting: `let the ${lights} drift their way`,
  }
  const scene = kind === 'still' ? undefined : [...run.mechanicIds].reverse().map(id => RULE_SCENE[id]).find(Boolean)
  return `A game for someone who ${deed[kind]}${scene ? ` ${scene}` : ''}.`
}

const OPENING: Record<EndingKind, string> = {
  still: 'You let every clue be. They are still out there, asleep, and the field kept its quiet for you.',
  bloom: 'You chose the bloom, and everything you had gathered glowed at once.',
  kept: 'You took a little and let the rest sleep. The field remembers both.',
  wandering: 'You went looking, and the game grew wherever you went.',
  gathering: 'You gathered, and each light you took helped the next thing open.',
  resting: 'You waited, and the game grew around you in its own time.',
}

/**
 * The closing thought: what kind of ending this was, the rules the player chose and what they
 * made together, and what was let be. Only what happened is told, never how often, so nothing
 * reads as a score.
 */
export function reflection(run: RunStory): string {
  const kind = endingKind(run)
  const chosen = chosenRules(run)
  const lines = [OPENING[kind]]
  if (chosen.length > 0) lines.push(`You chose ${chosen.map(shortName).join(', then ')}.`)
  const together = togetherThen(chosen)
  if (together.length > 0) lines.push(`Together, ${listed(together.slice(0, 2))}.`)
  else if (run.transformed > 0) lines.push('You turned shadows into stars.')
  if (run.letBe.length > 0 && kind !== 'still') lines.push(`You let ${listed(run.letBe.map(shortName))} sleep.`)
  if (run.bumps > 0 && !together.some(t => /shadow/.test(t))) lines.push('A shadow bumped into you, and nothing was lost.')
  if (run.carries > 0 && !together.some(t => /tide/.test(t))) lines.push('A tide carried you along.')
  if (kind !== 'still' && kind !== 'bloom' && chosen.length <= 2) lines.push('You ended it while it was still small.')
  return lines.join(' ')
}
