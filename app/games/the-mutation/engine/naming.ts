import type { PlayStyle } from './types'

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
  gravity_well: 'around the slow orbits',
}

const COLLECTIBLE_WORD: Record<string, string> = { stars: 'STARS', pulse_gems: 'GEMS' }
const RULE_WORD: Record<string, string> = {
  chasers: 'SHADOWS',
  sweepers: 'TIDES',
  blaster: 'LANTERNS',
  phase_dash: 'GLIDES',
  combo_chain: 'RHYTHMS',
  gravity_well: 'ORBITS',
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
  collected: number
  transformed: number
}

/**
 * Used when no tagline comes back from the server. Built from this run's own rules and numbers,
 * so two different runs read differently even when they were played the same way.
 */
export function fallbackTagline({ mechanicIds, style, collected, transformed }: RunPicture): string {
  const gem = mechanicIds.includes('pulse_gems') && !mechanicIds.includes('stars')
  const lights = `${collected} ${gem ? (collected === 1 ? 'gem' : 'gems') : collected === 1 ? 'star' : 'stars'}`
  const deed =
    style === 'bold' && transformed > 0
      ? `turned ${transformed} ${transformed === 1 ? 'shadow' : 'shadows'} into light`
      : style === 'explorer'
        ? `roamed the whole field and found ${lights}`
        : style === 'collector'
          ? `gathered ${lights}, one small light at a time`
          : `let ${lights} drift their way`
  const scene = [...mechanicIds].reverse().map((id) => RULE_SCENE[id]).find(Boolean)
  return `A game for someone who ${deed}${scene ? ` ${scene}` : ''}.`
}

/** The closing thought: the game changed six times without asking, and the player kept playing. */
export function reflection({ transformed, nudges }: { transformed: number; nudges: number }): string {
  const opening = 'Six rules arrived without asking.'
  if (transformed > 0) {
    return `${opening} You turned ${transformed} ${transformed === 1 ? 'shadow into a star' : 'shadows into stars'}.`
  }
  if (nudges > 0) {
    return `${opening} A shadow bumped you ${nudges === 1 ? 'once' : `${nudges} times`}, nothing was lost, and you kept going.`
  }
  return `${opening} You met each one as it came.`
}
