import type { MutationResult } from './types'

export type RuleText = Omit<MutationResult, 'params'>

interface RunSoFar {
  shadows: boolean
  tides: boolean
  /** What this run gathers: "stars" or "gems". */
  lights: string
}

const RULES: Record<string, (run: RunSoFar) => Omit<RuleText, 'mechanicId'>> = {
  arrow_keys: () => ({
    title: 'IT CAN MOVE',
    description: 'Your orb learned to wander.',
    flavorText: 'It had been sitting still for a long time.',
  }),
  mouse_follow: () => ({
    title: 'IT FOLLOWS YOU',
    description: 'Your orb drifts wherever you point.',
    flavorText: 'It seems to like your company.',
  }),
  stars: () => ({
    title: 'STARS ARRIVE',
    description: 'Small stars appear. Gather them as you go.',
    flavorText: 'The dark is being generous today.',
  }),
  pulse_gems: () => ({
    title: 'BREATHING GEMS',
    description: 'Gems glow softly and dim again.',
    flavorText: 'They shine at their own pace.',
  }),
  chasers: () => ({
    title: 'SHY SHADOWS',
    description: 'Little shadows wander through on their own slow paths.',
    flavorText: 'They are only passing by.',
  }),
  sweepers: () => ({
    title: 'TIDES',
    description: 'Slow tides of light sweep across and carry you along.',
    flavorText: 'Sometimes it is easier to float.',
  }),
  blaster: ({ shadows, lights }) => shadows
    ? {
        title: 'A LANTERN',
        description: `Your orb can send out light. It gathers ${lights}, and turns shadows into stars.`,
        flavorText: 'Shadows were only stars that had not been seen yet.',
      }
    : {
        title: 'A LANTERN',
        description: `Your orb can send out light. It gathers ${lights} from afar.`,
        flavorText: 'Some things are easier to reach with a little light.',
      },
  phase_dash: ({ shadows }) => ({
    title: 'GLIDE',
    description: shadows
      ? 'Your orb can glide. Glide through a shadow and it becomes a star.'
      : 'Your orb can glide, quick and light, wherever you point.',
    flavorText: 'Lighter than it looks.',
  }),
  combo_chain: () => ({
    title: 'RHYTHM',
    description: 'Every light you gather makes your glow grow, and it stays.',
    flavorText: 'No rush. Just a rhythm.',
  }),
  gravity_well: () => ({
    title: 'GENTLE PULL',
    description: 'Lights near you drift closer on their own.',
    flavorText: 'Good things find their way to you.',
  }),
  score_rush: ({ shadows, tides, lights }) => ({
    title: 'THE BLOOM',
    description: shadows
      ? `Every shadow turns to light, and the ${lights} come thick and bright.`
      : tides
        ? `The tides grow still, and the ${lights} come thick and bright.`
        : `The ${lights} come thick and bright.`,
    flavorText: 'Everything you met along the way, glowing at once.',
  }),
}

/** The rule's words for when no fresh ones arrive, written for what this run actually has. */
export function fallbackRule(mechanicId: string, active: readonly string[]): RuleText {
  const run: RunSoFar = {
    shadows: active.includes('chasers'),
    tides: active.includes('sweepers'),
    lights: active.includes('pulse_gems') && !active.includes('stars') ? 'gems' : 'stars',
  }
  return { mechanicId, ...RULES[mechanicId](run) }
}

export interface Discovery {
  /** The clue in the field, in plain words, before the rule has a name. */
  clue: string
  /** What changed the moment it opened. */
  change: string
  hint: string
  touchHint?: string
}

const DISCOVERIES: Record<string, Discovery> = {
  arrow_keys: {
    clue: 'a small sign of four arrows',
    change: 'Your orb can move now.',
    hint: 'Arrow keys or WASD to move.',
  },
  mouse_follow: {
    clue: 'a small sign of four arrows',
    change: 'Your orb can move now, toward wherever you point.',
    hint: 'Move the mouse, or use the arrow keys.',
    touchHint: 'Drag your finger to guide the orb.',
  },
  stars: {
    clue: 'a faint star outline',
    change: 'A star came out of it, and more are appearing.',
    hint: 'Touch a star to gather it.',
  },
  pulse_gems: {
    clue: 'a faint gem outline',
    change: 'A gem came out of it, and more are appearing, glowing and dimming slowly.',
    hint: 'Gather one while it shines. There is no hurry.',
  },
  chasers: {
    clue: 'a small sleeping shadow',
    change: 'A little shadow woke up and wandered off. More will pass through.',
    hint: 'A bump only nudges you. Nothing is lost.',
  },
  sweepers: {
    clue: 'a short wavy line',
    change: 'A slow tide of light began to cross the field.',
    hint: 'If one carries you, let it. Nothing is lost.',
  },
  blaster: {
    clue: 'a tiny lantern',
    change: 'Your orb can send out light now.',
    hint: 'Hold Space or click to send light.',
    touchHint: 'Keep a finger down to send light.',
  },
  phase_dash: {
    clue: 'three little wind lines',
    change: 'Your orb can glide now.',
    hint: 'Press Space or click to glide.',
    touchHint: 'Tap to glide.',
  },
  combo_chain: {
    clue: 'two quiet rings',
    change: 'Each light you gather now makes your glow grow.',
    hint: 'Your glow only grows. Rest whenever you like.',
  },
  gravity_well: {
    clue: 'a dashed circle',
    change: 'Lights near your orb now drift toward it.',
    hint: 'No need to chase.',
  },
  score_rush: {
    clue: 'a closed flower bud',
    change: 'The field is in bloom. Lights come thick and bright.',
    hint: 'Gather freely. The field stays in bloom to the very end.',
  },
  ending: {
    clue: 'a small circle of light',
    change: '',
    hint: 'When you are ready, go to the circle, or rest, and your game will finish.',
  },
}

/** A clue's short name for lists: "the tides", "a lantern". Used once a rule is chosen or let be. */
const SHORT: Record<string, string> = {
  stars: 'the stars',
  pulse_gems: 'the breathing gems',
  chasers: 'the shy shadows',
  sweepers: 'the tides',
  blaster: 'a lantern',
  phase_dash: 'the glide',
  combo_chain: 'a rhythm',
  gravity_well: 'the gentle pull',
  score_rush: 'the bloom',
}

export function shortName(id: string): string {
  return SHORT[id] ?? 'a small rule'
}

/** "a, b and c" */
export function listed(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

const LIGHTS = ['stars', 'pulse_gems']

interface Together {
  a: readonly string[]
  b: readonly string[]
  /** Said as the second of the two arrives; left out where the rule's own words already say it. */
  now?: string
  /** Told back in the finale. */
  then: string
}

// Two rules that change each other. {lights} is what this run gathers.
const TOGETHER: readonly Together[] = [
  { a: LIGHTS, b: ['sweepers'], now: 'The tides carry the {lights} along with them.', then: 'your tides carried the {lights} along' },
  { a: ['gravity_well'], b: ['chasers'], now: 'The pull draws shadows in, and any that reach you turn into stars.', then: 'the pull drew shadows in and made them stars' },
  { a: ['gravity_well'], b: ['sweepers'], now: 'The pull holds you steady, so the tides only sway you.', then: 'the pull held you steady in the tides' },
  { a: ['combo_chain'], b: ['sweepers'], now: 'Riding a tide makes your glow grow too.', then: 'riding the tides kept your rhythm' },
  { a: ['blaster'], b: ['sweepers'], now: 'Light sent into a tide settles there as a star.', then: 'your lantern left stars along the tides' },
  { a: ['blaster'], b: ['chasers'], then: 'your lantern turned shadows into stars' },
  { a: ['phase_dash'], b: ['chasers'], then: 'your glides turned shadows into stars' },
  { a: ['score_rush'], b: ['chasers'], then: 'the bloom turned every shadow to light' },
  { a: ['score_rush'], b: ['sweepers'], then: 'the bloom stilled the tides' },
]

function lightsOf(ids: readonly string[]): string {
  return ids.includes('pulse_gems') && !ids.includes('stars') ? 'gems' : 'stars'
}

function joins(pair: Together, id: string, others: readonly string[]): boolean {
  return (pair.a.includes(id) && pair.b.some(o => others.includes(o)))
    || (pair.b.includes(id) && pair.a.some(o => others.includes(o)))
}

/** What a newly opened rule does with the rules already there, in plain words. */
export function togetherNow(id: string, active: readonly string[]): string[] {
  const others = active.filter(o => o !== id)
  const lights = lightsOf(active)
  return TOGETHER.filter(pair => pair.now && joins(pair, id, others)).map(pair => (pair.now ?? '').replace('{lights}', lights))
}

/** Every pair of rules in this run that changed each other, for the finale. */
export function togetherThen(ids: readonly string[]): string[] {
  const lights = lightsOf(ids)
  return TOGETHER
    .filter(pair => pair.a.some(a => ids.includes(a)) && pair.b.some(b => ids.includes(b)))
    .map(pair => pair.then.replace('{lights}', lights))
}

export function discovery(id: string): Discovery {
  return DISCOVERIES[id]
}

export function hintFor(id: string, isTouch: boolean): string {
  const d = DISCOVERIES[id]
  return (isTouch && d.touchHint) || d.hint
}
