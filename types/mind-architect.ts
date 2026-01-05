/**
 * Mind Architect - Complete Type Definitions
 * A roguelike deckbuilder where you construct arguments from mental models
 */

// =============================================================================
// SCHOOLS OF THOUGHT
// =============================================================================

export type School = 'rationalist' | 'empiricist' | 'pragmatist' | 'skeptic' | 'absurdist'

export interface SchoolConfig {
  id: School
  name: string
  description: string
  startingRelic: string
  startingCards: string[]
  passive: {
    name: string
    description: string
    effect: SchoolEffect
  }
}

export interface SchoolEffect {
  type: 'multiplier_bonus' | 'draw_bonus' | 'coherence_bonus' | 'tp_bonus' | 'special'
  value?: number
  condition?: string
}

// =============================================================================
// CARD SYSTEM
// =============================================================================

export type CardType = 'evidence' | 'logic' | 'framework' | 'meta' | 'flaw'
export type CardRarity = 'starter' | 'common' | 'uncommon' | 'rare'

export interface Card {
  id: string
  name: string
  type: CardType
  cost: number
  rarity: CardRarity

  // Stats (type-dependent)
  weight?: number           // For evidence cards - base damage
  multiplier?: number       // For logic cards - damage multiplier

  // Effects
  effect?: CardEffect

  // Text
  description: string
  flavorText?: string

  // Upgrades
  upgraded: boolean
  upgradeEffect?: Partial<Card>

  // Special properties
  innate?: boolean          // Starts in hand
  retain?: boolean          // Doesn't discard at end of turn
  exhaust?: boolean         // Removed from deck after play
  ethereal?: boolean        // Exhausts if not played

  // School affinity
  school?: School

  // Contradiction tracking
  contradicts?: string[]    // Card IDs this contradicts
}

export interface CardEffect {
  type: CardEffectType
  value?: number
  target?: 'self' | 'enemy' | 'card' | 'all' | 'random'
  condition?: EffectCondition
  chain?: CardEffect        // For multi-step effects
}

export type CardEffectType =
  | 'damage'
  | 'draw'
  | 'discard'
  | 'heal'
  | 'shield'
  | 'buff'
  | 'debuff'
  | 'weight_bonus'
  | 'multiplier_bonus'
  | 'copy'
  | 'transform'
  | 'exhaust_card'
  | 'gain_tp'
  | 'reduce_cost'
  | 'chain_bonus'
  | 'socratic'             // Special "Why?" chain effect
  | 'synthesis'            // Combines contradictions
  | 'steelman'             // Copies enemy ability
  | 'special'              // Custom boss/relic mechanics

export interface EffectCondition {
  type: 'card_count' | 'card_type' | 'coherence' | 'enemy_hp' | 'turn' | 'chain_length'
  operator: '>' | '<' | '=' | '>=' | '<='
  value: number | string
}

// =============================================================================
// ENEMY SYSTEM
// =============================================================================

export type EnemyTier = 'basic' | 'elite' | 'boss'
export type IntentType = 'attack' | 'defend' | 'buff' | 'debuff' | 'special' | 'unknown'

export interface Enemy {
  id: string
  name: string
  tier: EnemyTier
  floor: number            // Which floor this enemy appears on (1, 2, 3)

  // Stats
  maxHP: number
  currentHP: number

  // Resistances (reduces damage from specific sources)
  resistances: {
    evidence?: number
    logic?: number
    framework?: number
  }

  // AI Pattern
  pattern: AttackPattern[]
  currentPatternIndex: number

  // Status
  statusEffects: StatusEffect[]
  shield: number

  // Flavor
  description: string
  dialogue: EnemyDialogue

  // Weakness for bonus rewards
  weakness?: CardType

  // Visual
  portrait?: string
}

export interface AttackPattern {
  intent: IntentType
  damage?: number
  effect?: EnemyEffect
  description: string
  weight?: number          // For weighted random selection
  condition?: PatternCondition
}

export interface PatternCondition {
  type: 'hp_below' | 'hp_above' | 'turn' | 'player_cards' | 'status'
  value: number | string
}

export interface EnemyEffect {
  type: EnemyEffectType
  value?: number
  duration?: number
  target?: 'self' | 'player'
}

export type EnemyEffectType =
  | 'shield'
  | 'strength'             // Increases attack damage
  | 'resistance'           // Reduces incoming damage
  | 'vulnerable'           // Takes more damage (debuff on player)
  | 'weak'                 // Deals less damage (debuff on player)
  | 'lock_card'            // Prevents playing a random card
  | 'add_flaw'             // Shuffles a flaw into player's deck
  | 'drain_tp'             // Reduces player TP
  | 'scaling'              // Damage increases each turn
  | 'regenerate'           // Heals each turn
  | 'reflect'              // Returns portion of damage
  | 'enrage'               // Powers up at low HP

export interface EnemyDialogue {
  intro: string[]
  attack: string[]
  hurt: string[]
  lowHP: string[]
  victory: string[]
  defeat: string[]
}

export interface StatusEffect {
  id: string
  name: string
  type: 'buff' | 'debuff'
  value: number
  duration: number         // -1 for permanent
  icon: string
}

// =============================================================================
// BOSS SYSTEM
// =============================================================================

export interface Boss extends Enemy {
  tier: 'boss'

  // Multi-phase fights
  phases: BossPhase[]
  currentPhase: number

  // Special mechanics
  specialMechanic?: BossMechanic

  // Rewards
  rewards: BossReward
}

export interface BossPhase {
  name: string
  hpThreshold: number      // Phase changes when HP drops below this
  pattern: AttackPattern[]
  dialogue: string
  newEffects?: StatusEffect[]
}

export interface BossMechanic {
  name: string
  description: string
  trigger: 'turn_start' | 'turn_end' | 'damage_taken' | 'card_played'
  effect: CardEffect
}

export interface BossReward {
  gold: number
  cards: number            // Number of card choices
  relic: boolean           // Guaranteed relic drop
  insight: number          // Meta-progression currency
}

// =============================================================================
// RELIC SYSTEM
// =============================================================================

export type RelicRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'boss' | 'shop'

export interface Relic {
  id: string
  name: string
  description: string
  rarity: RelicRarity

  // Effect
  effect: RelicEffect

  // Visual
  icon: string

  // Source info
  school?: School          // School-specific relics
  boss?: string            // Boss that drops this
}

export interface RelicEffect {
  type: RelicEffectType
  value?: number
  trigger?: RelicTrigger
  condition?: EffectCondition
}

export type RelicEffectType =
  | 'max_coherence'
  | 'starting_tp'
  | 'draw'
  | 'multiplier_bonus'
  | 'weight_bonus'
  | 'gold_bonus'
  | 'heal_on_kill'
  | 'damage_reduction'
  | 'chain_bonus'
  | 'card_cost_reduction'
  | 'upgrade_random'
  | 'special'

export type RelicTrigger =
  | 'battle_start'
  | 'turn_start'
  | 'turn_end'
  | 'play_card'
  | 'kill_enemy'
  | 'take_damage'
  | 'rest'
  | 'shop_enter'
  | 'passive'

// =============================================================================
// MAP SYSTEM
// =============================================================================

export type NodeType = 'battle' | 'elite' | 'rest' | 'shop' | 'mystery' | 'treasure' | 'boss'

export interface MapNode {
  id: string
  type: NodeType
  x: number                // 0-1 position
  y: number                // Row number
  connections: string[]    // IDs of connected nodes
  visited: boolean
  available: boolean       // Can be selected

  // Content
  enemyId?: string
  eventId?: string

  // Visual state
  revealed: boolean
}

export interface GameMap {
  floor: number
  nodes: MapNode[]
  currentNodeId: string | null
  seed: number
}

// =============================================================================
// EVENT SYSTEM
// =============================================================================

export interface GameEvent {
  id: string
  name: string
  description: string

  // Choices
  choices: EventChoice[]

  // Requirements
  requirements?: EventRequirement[]

  // Visual
  image?: string
}

export interface EventChoice {
  id: string
  text: string
  outcome: EventOutcome
  requirements?: EventRequirement[]
  cost?: EventCost
}

export interface EventOutcome {
  type: 'reward' | 'damage' | 'heal' | 'card' | 'relic' | 'gold' | 'fight' | 'special'
  value?: number | string
  description: string
}

export interface EventRequirement {
  type: 'gold' | 'coherence' | 'card' | 'relic' | 'school'
  value: number | string
}

export interface EventCost {
  type: 'gold' | 'coherence' | 'card' | 'maxCoherence'
  value: number
}

// =============================================================================
// GAME STATE
// =============================================================================

export interface GameState {
  // Run info
  runId: string
  school: School
  seed: number

  // Progression
  currentFloor: number
  map: GameMap

  // Player stats
  coherence: number
  maxCoherence: number
  gold: number

  // Deck
  deck: Card[]
  relics: Relic[]

  // Meta
  turnCount: number
  enemiesDefeated: number
  bossesDefeated: number

  // Current screen
  screen: GameScreen

  // Settings
  settings: GameSettings
}

export type GameScreen =
  | 'menu'
  | 'school_select'
  | 'map'
  | 'battle'
  | 'reward'
  | 'shop'
  | 'rest'
  | 'event'
  | 'victory'
  | 'defeat'
  | 'deck_view'
  | 'relic_view'

export interface GameSettings {
  soundEnabled: boolean
  musicEnabled: boolean
  reducedMotion: boolean
  autoEndTurn: boolean
  confirmEndTurn: boolean
  showDamageNumbers: boolean
}

// =============================================================================
// BATTLE STATE
// =============================================================================

export interface BattleState {
  // Enemy
  enemy: Enemy | Boss | null

  // Turn
  turn: number
  phase: 'player' | 'enemy' | 'animating'

  // Resources
  thoughtPoints: number
  maxThoughtPoints: number

  // Cards
  hand: Card[]
  drawPile: Card[]
  discardPile: Card[]
  exhaustPile: Card[]
  playArea: Card[]

  // Damage calculation
  currentDamage: DamageBreakdown | null

  // Status
  playerStatusEffects: StatusEffect[]

  // History (for undo)
  history: BattleAction[]
  canUndo: boolean

  // Animation queue
  animationQueue: BattleAnimation[]
}

export interface DamageBreakdown {
  totalWeight: number
  totalMultiplier: number
  chainBonus: number
  relicBonuses: number
  resistanceReduction: number
  finalDamage: number

  // Breakdown details
  weightSources: { card: string; value: number }[]
  multiplierSources: { card: string; value: number }[]
  bonusSources: { source: string; value: number }[]
}

export interface BattleAction {
  type: 'play_card' | 'end_turn' | 'use_item'
  cardIndex?: number
  timestamp: number
  stateBefore: Partial<BattleState>
}

export interface BattleAnimation {
  type: 'damage' | 'heal' | 'draw' | 'discard' | 'play' | 'enemy_attack' | 'status' | 'defeat'
  value?: number
  target?: 'player' | 'enemy'
  cardId?: string
  duration: number
}

// =============================================================================
// META PROGRESSION
// =============================================================================

export interface MetaProgression {
  // Currency
  insights: number

  // Unlocks
  unlockedSchools: School[]
  unlockedCards: string[]
  unlockedRelics: string[]

  // Stats
  totalRuns: number
  totalWins: number
  totalDeaths: number
  enemiesDefeated: number
  bossesDefeated: number

  // Achievements
  achievements: Achievement[]

  // Best scores
  bestDamage: number
  longestChain: number
  fastestWin: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  unlocked: boolean
  unlockedAt?: number
  progress?: number
  maxProgress?: number
}

// =============================================================================
// UI TYPES
// =============================================================================

export interface TooltipData {
  title: string
  description: string
  stats?: { label: string; value: string }[]
  keywords?: { term: string; definition: string }[]
}

export interface CardPosition {
  x: number
  y: number
  rotation: number
  scale: number
  zIndex: number
}
