import type { PlayStyle } from './types'

const STYLE_WORD: Record<PlayStyle, string> = {
  gentle: 'QUIET',
  explorer: 'WANDERING',
  collector: 'GATHERING',
  bold: 'BRIGHT',
}

const STYLE_TAGLINE: Record<PlayStyle, string> = {
  gentle: 'A game for someone who let the good things come to them.',
  explorer: 'A game for someone who wanted to see every corner.',
  collector: 'A game for someone who noticed every small light.',
  bold: 'A game for someone who met the shadows halfway.',
}

const COLLECTIBLE_WORD: Record<string, string> = { stars: 'STARS', pulse_gems: 'GEMS' }
const COMPANION_WORD: Record<string, string> = { chasers: 'SHADOWS', sweepers: 'TIDES' }

/** Used when no name comes back from the server. */
export function fallbackName(mechanicIds: string[], style: PlayStyle): string {
  const collectible = mechanicIds.map(id => COLLECTIBLE_WORD[id]).find(Boolean) ?? 'LIGHTS'
  const companion = mechanicIds.map(id => COMPANION_WORD[id]).find(Boolean)
  return [STYLE_WORD[style], collectible, companion && `& ${companion}`].filter(Boolean).join(' ')
}

export function fallbackTagline(style: PlayStyle): string {
  return STYLE_TAGLINE[style]
}

/** The closing thought: the game changed six times without asking, and the player kept playing. */
export function reflection({ transformed, nudges }: { transformed: number; nudges: number }): string {
  const opening = 'Six rules arrived without asking.'
  if (transformed > 0) {
    return `${opening} You turned ${transformed} ${transformed === 1 ? 'shadow into a star' : 'shadows into stars'}.`
  }
  if (nudges > 0) {
    return `${opening} You were nudged ${nudges} ${nudges === 1 ? 'time' : 'times'} and kept going.`
  }
  return `${opening} You met each one as it came.`
}
