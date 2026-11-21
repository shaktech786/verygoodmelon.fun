export type School = 'empiricist' | 'pragmatist' | 'rationalist' | 'skeptic' | 'absurdist'

export type Mode = 'gentle' | 'rigorous'

export interface SchoolDef {
  id: School
  name: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tagline: string
  passive: string
  deck: string[]
}

export type CardType = 'evidence' | 'logic' | 'guard' | 'rhetoric' | 'doubt'
export type CardRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'doubt'

export interface CardEffects {
  cost: number
  weight?: number
  multiplier?: number
  guard?: number
  unsettle?: number
  draw?: number
  focus?: number
  restore?: number
  addDoubt?: number
  pierce?: boolean
  postpone?: boolean
  weightPerOtherEvidence?: number
  multiplierPerOtherLogic?: number
  multiplierPerEvidence?: number
  weightPerDoubtInHand?: number
  weightIfLowResolve?: number
  unsettlePerCard?: number
  conclusionTimes?: number
  /** Stays in hand at the end of the turn. */
  retain?: boolean
  /** Leaves the deck for the rest of the fight once played. */
  exhaust?: boolean
  lastingMultiplier?: number
  nextTurnFocus?: number
}

export interface CardDef extends CardEffects {
  id: string
  name: string
  type: CardType
  rarity: CardRarity
  school?: School
  flavor: string
  upgrade?: Partial<CardEffects>
}

export interface CardInstance {
  uid: number
  cardId: string
  upgraded: boolean
  temporary?: boolean
}

export type RelicId =
  | 'ockhams_razor'
  | 'marginalia'
  | 'footnotes'
  | 'worry_stone'
  | 'hourglass'
  | 'lantern'
  | 'seed_of_doubt'
  | 'stoic_pebble'
  | 'pocket_notebook'
  | 'library_card'
  | 'tea_flask'
  | 'second_opinion'
  | 'long_view'

export interface RelicDef {
  id: RelicId
  name: string
  text: string
  flavor: string
}

export type EnemyTier = 'normal' | 'elite' | 'boss'

export type EnemyRule =
  | 'none'
  | 'grows'
  | 'overconfident'
  | 'confirmation'
  | 'anchoring'
  | 'bandwagon'
  | 'backfire'
  | 'induction'
  | 'sorites'
  | 'status_quo'
  | 'halo'
  | 'motivated'
  | 'meaning'
  | 'gambler'

export type Ask = 'evidence' | 'logic' | 'guard'

export interface EnemyMove {
  attack?: number
  hits?: number
  guard?: number
  addDoubt?: number
  /** Every type named must be in your argument for it to count double. */
  asks?: Ask[]
}

/** What a boss becomes once it falls to half Resolve. */
export interface EnemyPhase {
  rule: EnemyRule
  ruleText: string
  /** What it says as it changes. */
  shift: string
  moves: EnemyMove[]
}

export interface EnemyDef {
  id: string
  name: string
  tier: EnemyTier
  floor: 1 | 2 | 3
  health: number
  rule: EnemyRule
  ruleText: string
  intro: string
  insight: string
  moves: EnemyMove[]
  phase2?: EnemyPhase
  /** Each round, this chance that its action becomes one big attack instead. */
  gamble?: { chance: number; attack: number }
}

export interface EnemyState {
  id: string
  health: number
  maxHealth: number
  guard: number
  strength: number
  unsettle: number
  moveIndex: number
  seen: string[]
  phase: 1 | 2
  /** Rolled at the start of each round and never shown: whether a gamble comes off this round. */
  gambleHit: boolean
  /** Rounds in a row without its big hit. */
  misses: number
}

export interface PlayerState {
  resolve: number
  maxResolve: number
  guard: number
}

export type BattleOutcome = 'ongoing' | 'won' | 'lost'

export interface StepView {
  uid: number
  name: string
  type: CardType
  weight: number
  multiplier: number
  guard: number
  unsettle: number
  conclusion: boolean
  notes: string[]
}

export interface ArgumentPreview {
  steps: StepView[]
  carriedWeight: number
  doubtWeight: number
  weight: number
  multiplier: number
  product: number
  raw: number
  modifiers: string[]
  pierce: boolean
  enemyGuard: number
  blocked: number
  damage: number
  healedBack: number
  selfLoss: number
  guard: number
  composure: number
  unsettle: number
  /** What Unsettle takes before it acts, after this argument lands. */
  unsettleTick: number
  enemyFalls: 'argument' | 'unsettle' | null
  /** The Conclusion has no Weight or Multiplier, so counting it twice adds nothing. */
  conclusionEmpty: boolean
  lastingMultiplier: number
  postpone: boolean
  growth: number
  incoming: number
  incomingAfterGuard: number
  /** For a bias that gambles: the big attack it might make instead. */
  risk: { total: number; afterGuard: number; chance: number } | null
}

export interface RoundReport {
  turn: number
  steps: StepView[]
  /** Weight that came from outside the cards: leftover Guard and Doubts in hand. */
  carriedWeight: number
  doubtWeight: number
  lastingMultiplier: number
  weight: number
  multiplier: number
  product: number
  modifiers: string[]
  raw: number
  guardBroken: boolean
  blocked: number
  damage: number
  healedBack: number
  selfLoss: number
  postponed: boolean
  enemyAttack: number
  enemyBlocked: number
  playerLoss: number
  enemyGuardGained: number
  unsettleLoss: number
  doubtsAdded: number
  growth: number
  phaseChanged: boolean
  gamble: 'hit' | 'miss' | null
}

export interface BattleCore {
  enemy: EnemyState
  player: PlayerState
  relics: RelicId[]
  school: School
  turn: number
  focus: number
  hand: CardInstance[]
  drawPile: CardInstance[]
  discardPile: CardInstance[]
  played: CardInstance[]
  exhausted: CardInstance[]
  lastingMultiplier: number
  firstLogicDiscountUsed: boolean
  carriedWeight: number
  carriedFocus: number
  lastConclusionType: CardType | null
  piercedOnce: boolean
  nextUid: number
  rng: number
  outcome: BattleOutcome
  lastRound: RoundReport | null
}

export interface BattleState extends BattleCore {
  undo: BattleCore[]
}

export type NodeType = 'battle' | 'elite' | 'rest' | 'shop' | 'event' | 'treasure' | 'boss'

export interface MapNode {
  id: string
  type: NodeType
  row: number
  lane: number
  lanes: number
  next: string[]
  enemyId?: string
}

export type EventId =
  | 'lecture'
  | 'library'
  | 'bookseller'
  | 'old_friend'
  | 'mirror'
  | 'cafe'
  | 'archive'
  | 'loud_certainty'
  | 'study_group'
  | 'the_question'

export interface EventState {
  eventId: EventId
  relicOffer: RelicId | null
  cardOffer: string[]
  result: string | null
}

export type DeckPickPurpose = 'upgrade' | 'remove' | 'copy'

export interface RewardState {
  source: 'battle' | 'elite' | 'boss' | 'treasure'
  gold: number
  cardChoices: string[]
  cardTaken: boolean
  relicChoices: RelicId[]
  relicTaken: boolean
  /** The round that won the fight, so the reward screen can replay the winning argument. */
  finalRound: RoundReport | null
}

export interface ShopState {
  cards: { cardId: string; price: number; sold: boolean }[]
  relics: { relicId: RelicId; price: number; sold: boolean }[]
  removePrice: number
  removed: boolean
  teaPrice: number
  teaTaken: boolean
}

export type Screen =
  | 'map'
  | 'battle'
  | 'reward'
  | 'shop'
  | 'rest'
  | 'event'
  | 'victory'
  | 'defeat'

export interface RunStats {
  turns: number
  fights: number
  nodes: number
  /** The most damage one argument dealt. */
  best: number
}

export interface RunState {
  version: 4
  seed: number
  rng: number
  school: School
  mode: Mode
  /** 0 in Gentle; in Rigorous, the level from 1 to 5, each adding one constraint. */
  rigor: number
  reconsiders: number
  known: string[]
  floor: 1 | 2 | 3
  map: MapNode[]
  position: string | null
  visited: string[]
  resolve: number
  maxResolve: number
  gold: number
  deck: CardInstance[]
  nextUid: number
  relics: RelicId[]
  removals: number
  screen: Screen
  battle: BattleState | null
  reward: RewardState | null
  shop: ShopState | null
  event: EventState | null
  /** Encounters met this run, so they do not repeat while others are left. */
  eventsSeen: EventId[]
  pick: DeckPickPurpose | null
  defeatedBy: string | null
  beaten: string[]
  stats: RunStats
}
