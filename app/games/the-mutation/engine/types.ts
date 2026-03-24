// ========================================
// CASCADE — Types & Constants
// ========================================

export const GAME_W = 640
export const GAME_H = 480

export const COLORS = {
  bg: '#080810',
  grid: '#0e0e20',
  player: '#00ff88',
  playerGlow: 'rgba(0,255,136,0.3)',
  star: '#ffd700',
  starGlow: 'rgba(255,215,0,0.3)',
  gem: '#00ccff',
  gemGlow: 'rgba(0,204,255,0.3)',
  enemy: '#ff3366',
  enemyGlow: 'rgba(255,51,102,0.3)',
  sweeper: '#ff6600',
  sweeperGlow: 'rgba(255,102,0,0.3)',
  bullet: '#00ffff',
  shield: '#9966ff',
  dash: '#ffffff',
  text: '#ffffff',
  textDim: '#556677',
  accent: '#ff00ff',
  combo: ['#ffffff', '#ffd700', '#ff8800', '#ff00ff', '#00ffff'],
} as const

// Wave timing: [duration in seconds, score threshold to advance]
// Whichever condition is met first triggers the next mutation
export const WAVE_DURATION = [10, 20, 22, 25, 28, 30, 25] as const
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

// Default mechanic params (used when AI doesn't customize)
export const DEFAULT_PARAMS: Record<string, Record<string, number>> = {
  arrow_keys:   { speed: 220 },
  mouse_follow: { responsiveness: 3.5 },
  stars:        { spawnRate: 1.5, value: 10 },
  pulse_gems:   { spawnRate: 2.0, pulseSpeed: 2.0, value: 15 },
  chasers:      { spawnRate: 4.0, speed: 65, maxCount: 6 },
  sweepers:     { spawnRate: 3.5, speed: 120 },
  blaster:      { fireRate: 0.3, bulletSpeed: 400, bulletSize: 4 },
  phase_dash:   { cooldown: 2.0, duration: 0.2, speedMult: 3.5 },
  combo_chain:  { decayTime: 2.0, hitsPerLevel: 3 },
  gravity_well: { range: 90, strength: 160 },
  score_rush:   { duration: 25, spawnMult: 3, scoreMult: 3 },
}

// --- Entity ---

export interface Entity {
  id: number
  type: 'star' | 'gem' | 'chaser' | 'sweeper' | 'bullet'
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
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
  color: string
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
  shieldCharges: number
  shieldRechargeTimer: number
  dashCD: number
  dashActive: boolean
  dashDuration: number
  comboTimer: number
  rushTimer: number
  rushActive: boolean

  // Effects
  shake: number

  // Input
  keys: Set<string>
  mx: number
  my: number
  mDown: boolean
  clickThisFrame: boolean

  // Player profile
  moveDistTotal: number
  collectTotal: number
  killTotal: number
  hitsTaken: number
  clickTotal: number
  moveBias: [number, number, number, number] // L R U D

  // Spawn timers
  spawnTimers: Record<string, number>
  totalTime: number

  // Mutation history
  mutations: MutationRecord[]
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
  controlHint?: string
  gameName?: string
  tagline?: string
}

export interface ProfileSummary {
  playStyle: 'aggressive' | 'cautious' | 'explorer' | 'collector'
  clickRate: number
  moveDistance: number
  collectRate: number
  killRate: number
  hitRate: number
  preferredDirection: string
  score: number
  wave: number
  activeMechanics: string[]
}
