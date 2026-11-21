export type School = 'empiricist' | 'pragmatist' | 'rationalist' | 'skeptic' | 'absurdist'

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

export interface EnemyMove {
  attack?: number
  hits?: number
  guard?: number
  addDoubt?: number
  asks?: 'evidence' | 'logic' | 'guard'
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
  unsettle: number
  postpone: boolean
  growth: number
  incoming: number
  incomingAfterGuard: number
}

export interface RoundReport {
  turn: number
  steps: StepView[]
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

export type EventId = 'lecture' | 'library' | 'bookseller' | 'old_friend' | 'mirror'

export interface EventState {
  eventId: EventId
  relicOffer: RelicId | null
  cardOffer: string[]
  result: string | null
}

export type DeckPickPurpose = 'upgrade' | 'remove'

export interface RewardState {
  source: 'battle' | 'elite' | 'boss' | 'treasure'
  gold: number
  cardChoices: string[]
  cardTaken: boolean
  relicChoices: RelicId[]
  relicTaken: boolean
}

export interface ShopState {
  cards: { cardId: string; price: number; sold: boolean }[]
  relics: { relicId: RelicId; price: number; sold: boolean }[]
  removePrice: number
  removed: boolean
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
}

export interface RunState {
  version: 2
  seed: number
  rng: number
  school: School
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
  pick: DeckPickPurpose | null
  defeatedBy: string | null
  beaten: string[]
  stats: RunStats
}
