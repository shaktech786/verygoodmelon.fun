// ========================================
// THE SHAPESHIFTER — Types & Constants
// ========================================

import type { Tint } from './palette'

export const GAME_W = 640
export const GAME_H = 480

// The first clue appears after this many seconds of rest, or this many pulses of the still orb
export const FIRST_CLUE_AFTER = 3
// After the orb can move, each crossroads offers up to this many clues, and the player goes to one.
export const OFFER_SIZE = 3
// Once this many crossroads have passed, the quiet circle that ends the game is one of the clues offered
export const CIRCLE_AFTER = 3
// After this many, only the circle is left
export const MAX_FORKS = 5

export const MECHANIC_CATEGORIES = [
  'movement',
  'collectible',
  'threat',
  'power',
  'modifier',
  'climax',
] as const

export type MechanicCategory = (typeof MECHANIC_CATEGORIES)[number]

export const MECHANIC_OPTIONS: Record<MechanicCategory, readonly string[]> = {
  movement:    ['arrow_keys', 'mouse_follow'],
  collectible: ['stars', 'pulse_gems'],
  threat:      ['chasers', 'sweepers'],
  power:       ['blaster', 'phase_dash'],
  modifier:    ['combo_chain', 'gravity_well'],
  climax:      ['score_rush'],
}

export const DEFAULT_PARAMS: Record<string, Record<string, number>> = {
  arrow_keys:   { speed: 220 },
  mouse_follow: { responsiveness: 3.5 },
  stars:        { spawnRate: 1.5, value: 10 },
  pulse_gems:   { spawnRate: 2.0, pulseSpeed: 0.6, value: 15 },
  chasers:      { spawnRate: 4.0, speed: 32, maxCount: 5 },
  sweepers:     { spawnRate: 4.5, speed: 100 },
  blaster:      { fireRate: 0.3, bulletSpeed: 400, bulletSize: 4 },
  phase_dash:   { cooldown: 1.5, duration: 0.2, speedMult: 3.5 },
  combo_chain:  { hitsPerLevel: 3 },
  gravity_well: { range: 90, strength: 160 },
  score_rush:   { spawnMult: 3, scoreMult: 3 },
}

// --- Entity ---
// Internal names predate the calmer framing: a chaser is a "shadow", a sweeper a "tide",
// a bullet "light", score_rush "the bloom".

export interface Entity {
  id: number
  type: 'star' | 'gem' | 'chaser' | 'sweeper' | 'bullet'
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  active: boolean
  age: number
  hp: number
}

// --- Particle ---

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  tint: Tint
  alpha: number
  life: number
  maxLife: number
}

// --- Game State ---

export interface GameState {
  w: number
  h: number

  // Player
  px: number
  py: number
  pvx: number
  pvy: number
  /** Push from a shadow's nudge or a tide's current, applied on top of any movement rule. */
  driftX: number
  driftY: number
  pSize: number
  pBaseSize: number
  pTrail: Array<{ x: number; y: number; alpha: number }>
  invTimer: number

  // Entities
  entities: Entity[]
  particles: Particle[]
  nextId: number

  // Score
  score: number
  combo: number
  multiplier: number

  // Wave tracking
  wave: number
  waveTime: number
  waveScoreStart: number
  activeMechanics: string[]
  mechanicParams: Record<string, Record<string, number>>

  // Mechanic-specific state
  shootCD: number
  dashCD: number
  dashActive: boolean
  dashDuration: number
  rushActive: boolean

  // Input
  keys: Set<string>
  mx: number
  my: number
  mDown: boolean
  clickThisFrame: boolean

  // Player profile
  moveDistTotal: number
  collectTotal: number
  transformed: number
  bumps: number
  carries: number
  clickTotal: number
  moveBias: [number, number, number, number] // L R U D

  // Spawn timers
  spawnTimers: Record<string, number>
  totalTime: number

  /** Where the orb went, and which wave it was in, for the finale's picture of the run. */
  path: PathPoint[]

  // Discovery: each rule first shows as a small clue in the field, opens through play, and is named once felt
  /** Touch players only ever learn the follow control. */
  touch: boolean
  /** The clues growing now: one before the orb can move, then a few at each crossroads to choose between. */
  seeds: Seed[]
  /** Clues the player rested past instead of choosing; they stay in the field, asleep. */
  sleeping: Sleeping[]
  /** Crossroads passed, whether a clue was chosen or all were let be. */
  forks: number
  /** Rest gathered at the current crossroads; at 1 its clues settle and sleep. */
  stillness: number
  settlingTold: boolean
  /** The clue the orb is beside, so a screen reader hears it once. */
  beside: string | null
  /** The rule that opened but that the player has not felt yet. */
  unnamed: Unnamed | null
  /** No new clue before this moment, so a rule's name is heard before anything else grows. */
  quietUntil: number
  foundBy: FoundBy[]
  /** Lights sent and glides taken, so a power rule can tell it has been used. */
  sent: number
  glides: number
  finished: boolean
  /** Drained by the canvas every frame. */
  events: DiscoveryEvent[]
}

/** The rule a clue grows into, or the quiet circle that ends the game. */
export const ENDING = 'ending'

export interface Seed {
  id: string
  x: number
  y: number
  /** 0 when planted; it opens at 1. */
  growth: number
  age: number
  byNear: number
  byRest: number
  byGather: number
}

export type FoundBy = 'went' | 'gathered' | 'rested'

export interface Sleeping {
  id: string
  x: number
  y: number
}

export interface CluePlace {
  id: string
  place: string
}

export interface Unnamed {
  id: string
  hinted: boolean
  at: { move: number; collect: number; bumps: number; carries: number; transformed: number; sent: number; glides: number }
}

export type DiscoveryEvent =
  | { type: 'planted'; clues: CluePlace[] }
  | { type: 'opened'; id: string; by: FoundBy; passed: string[] }
  | { type: 'settling' }
  | { type: 'let-be'; ids: string[] }
  | { type: 'beside'; id: string }
  | { type: 'hint'; id: string }
  | { type: 'felt'; id: string }

export interface PathPoint {
  x: number
  y: number
  /** 0 before any rule; wave n follows the nth rule to arrive. */
  wave: number
}

export interface MutationRecord {
  id: string
  title: string
  description: string
  flavorText: string
}

// --- Mutation API ---

export interface MutationResult {
  mechanicId: string
  params: Record<string, number>
  title: string
  description: string
  flavorText: string
}

export type PlayStyle = 'gentle' | 'explorer' | 'collector' | 'bold'

export interface ProfileSummary {
  playStyle: PlayStyle
  clickRate: number
  moveDistance: number
  collectRate: number
  transformRate: number
  preferredDirection: string
  score: number
  wave: number
  activeMechanics: string[]
}
