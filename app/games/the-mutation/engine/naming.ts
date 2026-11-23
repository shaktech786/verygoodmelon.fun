import type { FoundBy, PlayStyle } from './types'

const STYLE_WORD: Record<PlayStyle, string> = {
  gentle: 'QUIET',
  explorer: 'WANDERING',
  collector: 'GATHERING',
  bold: 'BRIGHT',
}

const RULE_SCENE: Record<string, string> = {
  chasers: 'among the wandering shadows',
  sweepers: 'as the tides came and went',
  blaster: 'by lantern light',
  phase_dash: 'in quick, quiet glides',
  combo_chain: 'in an easy rhythm',
  gravity_well: 'in the gentle pull',
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

/** Used when no name comes back from the server. The third rule to arrive varies from run to run. */
export function fallbackName(mechanicIds: string[], style: PlayStyle): string {
  const collectible = mechanicIds.map(id => COLLECTIBLE_WORD[id]).find(Boolean) ?? 'LIGHTS'
  const third = mechanicIds.map(id => RULE_WORD[id]).find(Boolean)
  return [STYLE_WORD[style], collectible, third && `& ${third}`].filter(Boolean).join(' ')
}

export interface RunPicture {
  mechanicIds: string[]
  style: PlayStyle
  transformed: number
}

/**
 * Used when no tagline comes back from the server. Built from this run's own rules and how it was
 * played, never from how much was gathered, so it reads as a portrait rather than a tally.
 */
export function fallbackTagline({ mechanicIds, style, transformed }: RunPicture): string {
  const lights = mechanicIds.includes('pulse_gems') && !mechanicIds.includes('stars') ? 'gems' : 'stars'
  const deed =
    style === 'bold' && transformed > 0
      ? 'turned shadows into light'
      : style === 'explorer'
        ? `roamed the whole field and found ${lights}`
        : style === 'collector'
          ? `gathered ${lights}, one small light at a time`
          : `let the ${lights} drift their way`
  const scene = [...mechanicIds].reverse().map((id) => RULE_SCENE[id]).find(Boolean)
  return `A game for someone who ${deed}${scene ? ` ${scene}` : ''}.`
}

export interface RunEvents {
  transformed: number
  /** Times a shadow bumped the orb. */
  bumps: number
  /** Times a tide carried the orb along. */
  carries: number
  /** How each clue was opened, the closing circle included. */
  foundBy: readonly FoundBy[]
}

const FOUND_ONE_WAY: Record<FoundBy, string> = {
  went: 'You went looking, and found every one.',
  gathered: 'Each one opened while you gathered light.',
  rested: 'Each one grew while you simply rested.',
}

const FOUND_SOME: Record<FoundBy, string> = {
  went: 'some you went looking for',
  gathered: 'some opened while you gathered light',
  rested: 'some grew while you rested',
}

function howFound(foundBy: readonly FoundBy[]): string {
  const kinds = (['went', 'gathered', 'rested'] as const).filter((k) => foundBy.includes(k))
  if (kinds.length === 0) return 'You found them.'
  if (kinds.length === 1) return FOUND_ONE_WAY[kinds[0]]
  const parts = kinds.map((k) => FOUND_SOME[k])
  const line = `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}.`
  return line[0].toUpperCase() + line.slice(1)
}

/**
 * The closing thought: nobody told the player the rules, and how they found them is told back.
 * Only what happened is told, never how often, so nothing reads as a score.
 */
export function reflection({ transformed, bumps, carries, foundBy }: RunEvents): string {
  const lines = ['Nobody told you the rules.', howFound(foundBy)]
  if (transformed > 0) lines.push(transformed === 1 ? 'You turned a shadow into a star.' : 'You turned shadows into stars.')
  if (bumps > 0) lines.push('A shadow bumped into you, and nothing was lost.')
  if (carries > 0) lines.push('A tide carried you along.')
  if (lines.length === 2) lines.push('Nothing was lost along the way.')
  return lines.join(' ')
}
