export type School = 'empiricist' | 'pragmatist' | 'rationalist' | 'skeptic' | 'absurdist'

export type Mode = 'gentle' | 'rigorous'

/** A Short walk is the first floor and its problem; a Long walk is all three floors. */
export type RunLength = 'short' | 'long'

export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface SchoolDef {
  id: School
  name: string
  /** How hard the school is at each pace, checked against the simulation. */
  difficulty: Record<Mode, Difficulty>
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
  /** Weight for each Evidence played in earlier turns of this fight. */
  weightPerEarlierEvidence?: number
  /** While in the argument, the Conclusion counts this many more times. */
  conclusionBonus?: number
  guardPerEvidence?: number
  /** Weight for each point of Guard the argument's cards give, rounded down. */
  weightPerGuard?: number
  /** For the rest of the fight, Resolve restored after each round in which you lose none. */
  lastingRestore?: number
  multiplierPerEarlierCard?: number
  multiplierPerDoubtInHand?: number
  /** For the rest of the fight, the enemy's Unsettle no longer halves. */
  unsettleLasts?: boolean
  weightPerUnsettle?: number
  /** Weight for each point of Resolve you are missing, rounded down. */
  weightPerMissingResolve?: number
  guardPerDoubtInHand?: number
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
  | 'arrow'
  | 'buridan'
  | 'buridan_charge'
  | 'newcomb'
  | 'newcomb_caution'

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
  /** Its rule in Gentle pace, where it is milder, when that differs. */
  gentleRuleText?: string
  /** How much its attacks grow each time it acts, under the grows rule. */
  growth?: number
  /** A stubborn bias's extra rule at the higher Rigorous levels. */
  secondRule?: { rule: EnemyRule; ruleText: string }
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
  /** Plays by its second rule as well as its first. */
  secondRule: boolean
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
  /** How many times this step counted: more than 1 only for a Conclusion with something to count. */
  times: number
  notes: string[]
}

/** One thing that happens to the argument after Weight × Multiplier, in the order the engine applies it. */
export interface DamageStep {
  kind: 'answer' | 'induction' | 'pierce' | 'guard' | 'arrow' | 'cap' | 'half' | 'line'
  text: string
  /** The same step in two or three words, for the End turn button. */
  short: string
  /** The damage after this step. */
  after: number
}

export interface ArgumentPreview {
  steps: StepView[]
  carriedWeight: number
  doubtWeight: number
  weight: number
  multiplier: number
  product: number
  raw: number
  /** What changed the Multiplier from outside the cards. */
  modifiers: string[]
  chain: DamageStep[]
  pierce: boolean
  enemyGuard: number
  blocked: number
  damage: number
  healedBack: number
  selfLoss: number
  guard: number
  composure: number
  /** Focus left unspent that becomes Guard (Focus The Long View carries is not counted). */
  heldFocus: number
  /** Unspent Focus The Long View carries to next turn instead. */
  focusCarried: number
  unsettle: number
  /** What Unsettle takes before it acts, after this argument lands. */
  unsettleTick: number
  enemyFalls: 'argument' | 'unsettle' | null
  /** The Conclusion has no Weight or Multiplier, so counting it again adds nothing. */
  conclusionEmpty: boolean
  /** How many times the Conclusion counts, or would have counted had it brought anything. */
  conclusionCount: number
  /** Unsettle the bias takes on from damage past its half-Resolve line, felt next round. */
  spill: number
  /** Guard the bias will raise when it acts because of its rule and what you did. */
  ruleGuard: number
  ruleGuardNote: string | null
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
  chain: DamageStep[]
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
  /** Resolve restored at the end of the round by a lasting effect. */
  restored: number
  spill: number
  ruleGuard: number
  ruleGuardNote: string | null
}

export interface BattleCore {
  enemy: EnemyState
  player: PlayerState
  relics: RelicId[]
  school: School
  /** 0 in Gentle; the Rigorous level otherwise. */
  rigor: number
  turn: number
  focus: number
  hand: CardInstance[]
  drawPile: CardInstance[]
  discardPile: CardInstance[]
  played: CardInstance[]
  exhausted: CardInstance[]
  lastingMultiplier: number
  /** Evidence cards played in earlier turns of this fight. */
  evidencePlayed: number
  lastingRestore: number
  unsettleLasts: boolean
  firstLogicDiscountUsed: boolean
  carriedWeight: number
  carriedFocus: number
  lastConclusionType: CardType | null
  piercedOnce: boolean
  /** The turn from which a long fight wears the bias down. */
  tiresFrom: number
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
  version: 7
  seed: number
  rng: number
  school: School
  mode: Mode
  length: RunLength
  /** 0 in Gentle; in Rigorous, the level from 1 to MAX_RIGOR, each adding one constraint. */
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
  /** The round that was lost, so the defeat can say what happened. */
  defeatRound: RoundReport | null
  beaten: string[]
  stats: RunStats
}
