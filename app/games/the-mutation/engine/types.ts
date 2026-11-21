// ========================================
// THE SHAPESHIFTER — Types & Constants
// ========================================

import type { Tint } from './palette'

export const GAME_W = 640
export const GAME_H = 480

// Wave timing: [duration in seconds, score threshold to advance]
// Whichever comes first moves the story on; nothing is lost by being slow
// Wave 1 is short on purpose: the orb can only be pulsed, so there is little to do yet
export const WAVE_DURATION = [10, 8, 22, 24, 26, 28, 20] as const
export const WAVE_SCORE    = [10, 60, 150, 300, 500, 700, 999999] as const
export const MAX_WAVES = 7

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
  combo_chain:  { decayTime: 3.0, hitsPerLevel: 3 },
  gravity_well: { range: 90, strength: 160 },
  score_rush:   { duration: 20, spawnMult: 3, scoreMult: 3 },
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
  maxCombo: number
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
  comboTimer: number
  rushTimer: number
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
