import {
  ArgumentPreview,
  Ask,
  BattleCore,
  BattleState,
  CardDef,
  CardInstance,
  CardType,
  DamageStep,
  EnemyMove,
  EnemyRule,
  RelicId,
  RoundReport,
  School,
  StepView,
} from '@/types/thought-pockets'
import { isDoubt, resolveCard } from '../data/cards'
import { CONCLUSION_TIMES, EMPIRICIST_EVIDENCE_TIMES, FOOTNOTES_TIMES, timesWord } from '../data/conclusion'
import {
  ARROW_MIN,
  BURIDAN_CHARGE,
  BURIDAN_GUARD,
  DISMISS_CARDS,
  INDUCTION_BONUS,
  MEANING_ANSWER,
  MOTIVATED_CARDS,
  STOP_LINES,
  SORITES_CAP,
  STATUS_QUO_MAX_GUARD,
  TUTORIAL_ENEMY,
  getEnemyDef,
  overflowUnsettle,
  ruleTextAt,
} from '../data/enemies'
import { RIGOR, RIGOROUS_ATTACK, RIGOROUS_HEALTH, SHORT_WALK_BOSS, TIRING } from '../data/pace'
import { roll, rollInt, shuffle } from './rng'

export const FOCUS_PER_TURN = 3
export const HAND_SIZE = 5
export const MAX_HAND = 10

export const DOUBT_WEIGHT = 4
const OVERCONFIDENT_BONUS = 4
const SKEPTIC_BONUS = 2
const BANDWAGON_GROWTH = 1
export const COMPOSURE_GUARD = 2
export const WORRY_STONE_GUARD = 3
export const OCKHAM_MULTIPLIER = 0.5
export const MARGINALIA_WEIGHT = 2
export const LONG_VIEW_MAX = 2
export const HOURGLASS_FOCUS = 2
export const SECOND_OPINION_DRAW = 2
export const STOIC_CAP = 12
export const SEED_UNSETTLE = 4
export const FOOTNOTES_CARDS = 4
export const KNOWN_UNSETTLE = 4
export const SUNDIAL_FOCUS = 1
export const BOOKENDS_DRAW = 1
export const STILL_WATER_GUARD = 6

export interface BattleSetup {
  enemyId: string
  deck: CardInstance[]
  resolve: number
  maxResolve: number
  relics: RelicId[]
  school: School
  rng: number
  /** 0 in Gentle; the Rigorous level otherwise. */
  rigor: number
  /** You have beaten this bias in an earlier run. */
  known: boolean
  /** The problem that ends a Short walk, which holds nothing back. */
  lastOfShortWalk?: boolean
}

export interface Incoming {
  perHit: number
  hits: number
  total: number
  afterGuard: number
}

function has(core: BattleCore, relic: RelicId): boolean {
  return core.relics.includes(relic)
}

function strip(battle: BattleState): BattleCore {
  const { undo: _undo, ...core } = battle
  return core
}

function inSecondPhase(core: BattleCore): boolean {
  return core.enemy.phase === 2 && getEnemyDef(core.enemy.id).phase2 !== undefined
}

/** The rules in force right now: a boss past half Resolve plays by its changed rule, and a stubborn bias on a high Rigorous level adds a second. */
export function enemyRules(core: BattleCore): EnemyRule[] {
  const def = getEnemyDef(core.enemy.id)
  const main = inSecondPhase(core) && def.phase2 ? def.phase2.rule : def.rule
  return core.enemy.secondRule && def.secondRule ? [main, def.secondRule.rule] : [main]
}

function hasRule(core: BattleCore, rule: EnemyRule): boolean {
  return enemyRules(core).includes(rule)
}

export function enemyRuleText(core: BattleCore): string {
  const def = getEnemyDef(core.enemy.id)
  const main = inSecondPhase(core) && def.phase2 ? def.phase2.ruleText : ruleTextAt(def, core.rigor)
  return core.enemy.secondRule && def.secondRule ? `${main} ${def.secondRule.ruleText}` : main
}

/** Where a philosophical problem changes; until it has, no round can take it lower. */
export function phaseThreshold(core: BattleCore): number | null {
  return getEnemyDef(core.enemy.id).phase2 && core.enemy.phase === 1 ? Math.floor(core.enemy.maxHealth / 2) : null
}

/** Where a philosophical problem stops this round: the next of its stop lines below where it stands. */
export function stopLine(core: BattleCore): number | null {
  if (!getEnemyDef(core.enemy.id).phase2) return null
  const lines = STOP_LINES.map((share) => Math.floor(core.enemy.maxHealth * share)).filter((line) => line < core.enemy.health)
  return lines.length > 0 ? Math.max(...lines) : null
}

function enemyMoves(core: BattleCore): EnemyMove[] {
  const def = getEnemyDef(core.enemy.id)
  return inSecondPhase(core) && def.phase2 ? def.phase2.moves : def.moves
}

export function currentMove(core: BattleCore): EnemyMove {
  const moves = enemyMoves(core)
  return moves[core.enemy.moveIndex % moves.length]
}

function bigMove(core: BattleCore): EnemyMove | null {
  const gamble = getEnemyDef(core.enemy.id).gamble
  return gamble ? { attack: gamble.attack } : null
}

/** Cards still in hand that a bias can count against you: everything but Doubts. */
function cardsLeft(core: BattleCore): number {
  return core.hand.filter((c) => !isDoubt(c)).length
}

/** How much stronger each hit of a charging Buridan's Ass is, for the hand as it stands. */
export function chargeBonus(core: BattleCore): number {
  return hasRule(core, 'buridan_charge') ? BURIDAN_CHARGE * cardsLeft(core) : 0
}

/** The extra Unsettle a long fight adds at the start of this turn. */
export function tiringUnsettle(core: BattleCore): number {
  return core.turn >= core.tiresFrom ? TIRING.step * (core.turn - core.tiresFrom + 1) : 0
}

function attackAgainst(core: BattleCore, move: EnemyMove, guard: number, enemyHealth: number, strength: number): Incoming {
  if (!move.attack) return { perHit: 0, hits: 0, total: 0, afterGuard: 0 }
  const overconfident = hasRule(core, 'overconfident') && enemyHealth * 2 > core.enemy.maxHealth
  const perHit = move.attack + strength + (overconfident ? OVERCONFIDENT_BONUS : 0)
  const hits = move.hits ?? 1
  const total = perHit * hits
  let afterGuard = Math.max(0, total - guard)
  if (has(core, 'stoic_pebble')) afterGuard = Math.min(afterGuard, STOIC_CAP)
  return { perHit, hits, total, afterGuard }
}

/** What the enemy's shown intent would cost you if you had this much Guard. */
export function incomingDamage(core: BattleCore, guard: number): Incoming {
  return attackAgainst(core, currentMove(core), guard, core.enemy.health, core.enemy.strength + chargeBonus(core))
}

/** The big attack a gambling bias might make instead, as it would land with no Guard. */
export function riskDamage(core: BattleCore): Incoming | null {
  const move = bigMove(core)
  return move ? attackAgainst(core, move, 0, core.enemy.health, core.enemy.strength) : null
}

function drawCards(core: BattleCore, count: number): BattleCore {
  let { hand, drawPile, discardPile, rng } = core
  for (let i = 0; i < count; i++) {
    if (hand.length >= MAX_HAND) break
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break
      const reshuffled = shuffle(discardPile, rng)
      drawPile = reshuffled.items
      rng = reshuffled.rng
      discardPile = []
    }
    hand = [...hand, drawPile[0]]
    drawPile = drawPile.slice(1)
  }
  return { ...core, hand, drawPile, discardPile, rng }
}

function startTurn(core: BattleCore): BattleCore {
  const turn = core.turn + 1
  const hourglass = has(core, 'hourglass') && turn % 3 === 0 ? HOURGLASS_FOCUS : 0
  const quiet = has(core, 'second_opinion') && !currentMove(core).attack ? SECOND_OPINION_DRAW : 0
  let next: BattleCore = {
    ...core,
    turn,
    focus: FOCUS_PER_TURN + core.carriedFocus + hourglass + (has(core, 'sundial') ? (currentMove(core).attack ? SUNDIAL_FOCUS : -SUNDIAL_FOCUS) : 0),
    carriedFocus: 0,
    firstLogicDiscountUsed: false,
    played: [],
    player: { ...core.player, guard: 0 },
  }
  next = { ...next, enemy: { ...next.enemy, unsettle: next.enemy.unsettle + tiringUnsettle(next) } }
  const gamble = getEnemyDef(core.enemy.id).gamble
  if (gamble) {
    const r = roll(next.rng)
    next = { ...next, rng: r.rng, enemy: { ...next.enemy, gambleHit: r.value < gamble.chance } }
  }
  return drawCards(next, HAND_SIZE + quiet - (has(core, 'bookends') ? BOOKENDS_DRAW : 0))
}

/** The first fight opens with one Evidence, one Logic and one Guard in hand, so every basic idea is there to try. */
function teachingOrder(cards: CardInstance[]): CardInstance[] {
  const front: CardInstance[] = []
  for (const type of ['evidence', 'logic', 'guard']) {
    const found = cards.find((c) => !front.includes(c) && resolveCard(c).type === type)
    if (found) front.push(found)
  }
  return [...front, ...cards.filter((c) => !front.includes(c))]
}

export function createBattle(setup: BattleSetup): BattleState {
  const def = getEnemyDef(setup.enemyId)
  const shuffled = shuffle(setup.deck, setup.rng)
  if (setup.enemyId === TUTORIAL_ENEMY) shuffled.items = teachingOrder(shuffled.items)
  const health = Math.round(def.health * (setup.rigor >= RIGOR.tougher ? RIGOROUS_HEALTH : 1) * (setup.lastOfShortWalk ? SHORT_WALK_BOSS.health : 1))
  const strength =
    (setup.rigor >= RIGOR.harder ? RIGOROUS_ATTACK : 0) +
    (setup.rigor >= RIGOR.bossesHarder && def.tier !== 'normal' ? RIGOROUS_ATTACK : 0) +
    (setup.lastOfShortWalk ? SHORT_WALK_BOSS.attack : 0)
  const core: BattleCore = {
    enemy: {
      id: def.id,
      health,
      maxHealth: health,
      guard: setup.relics.includes('still_water') ? STILL_WATER_GUARD : 0,
      strength,
      unsettle: (setup.relics.includes('seed_of_doubt') ? SEED_UNSETTLE : 0) + (setup.known ? KNOWN_UNSETTLE : 0),
      moveIndex: 0,
      seen: [],
      phase: 1,
      gambleHit: false,
      misses: 0,
      secondRule: setup.rigor >= RIGOR.secondRule && def.secondRule !== undefined,
      shaken: 0,
    },
    player: { resolve: setup.resolve, maxResolve: setup.maxResolve, guard: 0 },
    relics: setup.relics,
    school: setup.school,
    rigor: setup.rigor,
    turn: 0,
    focus: 0,
    hand: [],
    drawPile: shuffled.items,
    discardPile: [],
    played: [],
    exhausted: [],
    lastingMultiplier: 0,
    evidencePlayed: 0,
    lastingRestore: 0,
    unsettleLasts: false,
    firstLogicDiscountUsed: false,
    carriedWeight: 0,
    carriedFocus: 0,
    lastConclusionType: null,
    piercedOnce: false,
    tiresFrom: setup.rigor === 0 ? TIRING.gentle : TIRING.rigorous,
    nextUid: setup.deck.reduce((max, c) => Math.max(max, c.uid), 0) + 1,
    rng: shuffled.rng,
    outcome: 'ongoing',
    lastRound: null,
  }
  return { ...startTurn(core), undo: [] }
}

function logicIsFree(core: BattleCore, def: CardDef): boolean {
  return core.school === 'rationalist' && def.type === 'logic' && !core.firstLogicDiscountUsed
}

export function cardCost(core: BattleCore, instance: CardInstance): number {
  const def = resolveCard(instance)
  return logicIsFree(core, def) ? 0 : def.cost
}

export function canPlay(core: BattleCore, uid: number): boolean {
  if (core.outcome !== 'ongoing') return false
  const instance = core.hand.find((c) => c.uid === uid)
  if (!instance || isDoubt(instance)) return false
  return cardCost(core, instance) <= core.focus
}

export function playCard(battle: BattleState, uid: number): BattleState {
  if (!canPlay(battle, uid)) return battle
  const snapshot = strip(battle)
  const instance = battle.hand.find((c) => c.uid === uid) as CardInstance
  const def = resolveCard(instance)
  let core: BattleCore = {
    ...snapshot,
    hand: snapshot.hand.filter((c) => c.uid !== uid),
    played: [...snapshot.played, instance],
    focus: snapshot.focus - cardCost(snapshot, instance) + (def.focus ?? 0),
    carriedFocus: snapshot.carriedFocus + (def.nextTurnFocus ?? 0),
    lastingMultiplier: snapshot.lastingMultiplier + (def.lastingMultiplier ?? 0),
    lastingRestore: snapshot.lastingRestore + (def.lastingRestore ?? 0),
    unsettleLasts: snapshot.unsettleLasts || Boolean(def.unsettleLasts),
    firstLogicDiscountUsed: snapshot.firstLogicDiscountUsed || logicIsFree(snapshot, def),
    player: {
      ...snapshot.player,
      resolve: Math.min(snapshot.player.maxResolve, snapshot.player.resolve + (def.restore ?? 0)),
    },
  }
  if (def.draw) core = drawCards(core, def.draw)
  for (let i = 0; i < (def.addDoubt ?? 0); i++) {
    core = { ...core, hand: [...core.hand, { uid: core.nextUid, cardId: 'doubt', upgraded: false, temporary: true }], nextUid: core.nextUid + 1 }
  }
  return { ...core, undo: [...battle.undo, snapshot] }
}

export function undoPlay(battle: BattleState): BattleState {
  const previous = battle.undo.at(-1)
  if (!previous) return battle
  return { ...previous, undo: battle.undo.slice(0, -1) }
}

function conclusionIndex(core: BattleCore): number {
  if (core.played.length === 0) return -1
  return hasRule(core, 'anchoring') ? 0 : core.played.length - 1
}

/** With Bookends, the card at the other end of an argument of two or more cards is a Conclusion too. */
function bookendIndex(core: BattleCore): number {
  if (!has(core, 'bookends') || core.played.length < 2) return -1
  return conclusionIndex(core) === 0 ? core.played.length - 1 : 0
}

/** How many times a Conclusion of this type counts for this school, before cards and relics change it. */
export function conclusionTimes(school: School, type: CardType): number {
  return school === 'empiricist' && type === 'evidence' ? EMPIRICIST_EVIDENCE_TIMES : CONCLUSION_TIMES
}

/** What the rest of the argument, your hand and the fight so far give the cards that count them. */
interface Context {
  evidenceCount: number
  doubts: number
  lowResolve: boolean
  earlierEvidence: number
  unsettle: number
  missingResolve: number
  cardGuard: number
}

function cardWeight(def: CardDef, ctx: Context): number {
  return (
    (def.weight ?? 0) +
    (def.weightPerOtherEvidence ?? 0) * (ctx.evidenceCount - 1) +
    (ctx.lowResolve ? def.weightIfLowResolve ?? 0 : 0) +
    (def.weightPerDoubtInHand ?? 0) * ctx.doubts +
    (def.weightPerEarlierEvidence ?? 0) * ctx.earlierEvidence +
    (def.weightPerUnsettle ?? 0) * ctx.unsettle +
    Math.floor((def.weightPerMissingResolve ?? 0) * ctx.missingResolve) +
    Math.floor((def.weightPerGuard ?? 0) * ctx.cardGuard)
  )
}

function cardGuard(def: CardDef, evidenceCount: number, doubts: number): number {
  return (def.guard ?? 0) + (def.guardPerEvidence ?? 0) * evidenceCount + (def.guardPerDoubtInHand ?? 0) * doubts
}

function cardUnsettle(def: CardDef, cards: number, school: School): number {
  const unsettle = (def.unsettle ?? 0) + (def.unsettlePerCard ?? 0) * cards
  return unsettle > 0 && school === 'skeptic' ? unsettle + SKEPTIC_BONUS : unsettle
}

const ASK_NAMES: Record<Ask, string> = { evidence: 'an Evidence card', logic: 'a Logic card', guard: 'a Guard card' }

function longViewCarry(core: BattleCore): number {
  return has(core, 'long_view') ? Math.min(LONG_VIEW_MAX, core.focus) : 0
}

export function previewArgument(core: BattleCore): ArgumentPreview {
  const defs = core.played.map(resolveCard)
  const evidenceCount = defs.filter((d) => d.type === 'evidence').length
  const logicCount = defs.filter((d) => d.type === 'logic').length
  const guardCards = defs.filter((d) => d.type === 'guard').length
  const doubts = core.hand.filter(isDoubt).length
  const unsettleCards = defs.map((d) => cardUnsettle(d, defs.length, core.school))
  const ctx: Context = {
    evidenceCount,
    doubts,
    lowResolve: core.player.resolve * 2 <= core.player.maxResolve,
    earlierEvidence: core.evidencePlayed,
    unsettle: core.enemy.unsettle + unsettleCards.reduce((a, b) => a + b, 0),
    missingResolve: core.player.maxResolve - core.player.resolve,
    cardGuard: defs.reduce((sum, d) => sum + cardGuard(d, evidenceCount, doubts), 0),
  }
  const conclusion = conclusionIndex(core)
  const bookend = bookendIndex(core)
  const conclusionBonus = defs.reduce((sum, d) => sum + (d.conclusionBonus ?? 0), 0)

  let haloIndex = -1
  if (hasRule(core, 'halo')) {
    let best = -1
    defs.forEach((def, i) => {
      if (def.type !== 'evidence') return
      const weight = cardWeight(def, ctx)
      if (weight > best) {
        best = weight
        haloIndex = i
      }
    })
  }

  const seenNames = new Set<string>()
  let growth = 0
  let conclusionEmpty = false
  let conclusionCount = 0
  const steps: StepView[] = defs.map((def, i) => {
    const notes: string[] = []
    const isEvidence = def.type === 'evidence'
    let weight = cardWeight(def, ctx)
    if (def.type === 'guard' && has(core, 'marginalia')) {
      weight += MARGINALIA_WEIGHT
      notes.push(`Marginalia +${MARGINALIA_WEIGHT}`)
    }
    let multiplier =
      (def.multiplier ?? 0) +
      (def.multiplierPerEvidence ?? 0) * evidenceCount +
      (def.multiplierPerOtherLogic ?? 0) * (logicCount - 1) +
      (def.multiplierPerEarlierCard ?? 0) * i +
      (def.multiplierPerDoubtInHand ?? 0) * doubts +
      (def.multiplierPerGuardCard ?? 0) * guardCards
    const guard = cardGuard(def, evidenceCount, doubts)

    if (hasRule(core, 'confirmation') && isEvidence && core.enemy.seen.includes(core.played[i].cardId)) {
      weight = Math.floor(weight / 2)
      notes.push('Already seen: half')
    }
    if (hasRule(core, 'halo') && isEvidence && i !== haloIndex) {
      weight = Math.floor(weight / 2)
      notes.push('Outshone: half')
    }
    if (hasRule(core, 'bandwagon')) {
      if (seenNames.has(def.id)) {
        growth += BANDWAGON_GROWTH
        notes.push('Repeated: its attacks +1')
      }
      seenNames.add(def.id)
    }

    const isConclusion = i === conclusion || i === bookend
    let times = 1
    if (isConclusion) {
      const label = i === conclusion ? 'Conclusion' : 'Bookend Conclusion'
      let count = def.conclusionTimes ?? conclusionTimes(core.school, def.type)
      if (has(core, 'footnotes') && defs.length >= FOOTNOTES_CARDS) count = Math.max(count, FOOTNOTES_TIMES)
      count += conclusionBonus
      if (i === conclusion) conclusionCount = count
      if (weight === 0 && multiplier === 0) {
        if (i === conclusion) conclusionEmpty = true
        notes.push(`${label}: nothing to count ${timesWord(count)}`)
      } else {
        times = count
        weight *= times
        multiplier *= times
        notes.push(`${label}: counts ${timesWord(times)}`)
      }
    }
    return { uid: core.played[i].uid, name: def.name, type: def.type, weight, multiplier, guard, unsettle: unsettleCards[i], conclusion: isConclusion, times, notes }
  })

  const doubtWeight = core.school === 'absurdist' ? doubts * DOUBT_WEIGHT : 0
  const weight = core.carriedWeight + doubtWeight + steps.reduce((sum, s) => sum + s.weight, 0)
  let multiplier = 1 + core.lastingMultiplier + steps.reduce((sum, s) => sum + s.multiplier, 0)
  const modifiers: string[] = []
  if (has(core, 'ockhams_razor') && defs.length === 2) {
    multiplier += OCKHAM_MULTIPLIER
    modifiers.push(`Ockham's Razor: +${OCKHAM_MULTIPLIER} Multiplier`)
  }

  const product = Math.floor(weight * multiplier + 1e-9)
  const chain: DamageStep[] = []
  let value = product
  const move = currentMove(core)
  if (hasRule(core, 'meaning') && move.asks) {
    if (move.asks.every((type) => defs.some((d) => d.type === type))) {
      value += MEANING_ANSWER
      chain.push({ kind: 'answer', text: `You answered its question: +${MEANING_ANSWER}`, short: 'answered', after: value })
    } else {
      chain.push({ kind: 'answer', text: `Not answered: include ${move.asks.map((type) => ASK_NAMES[type]).join(' and ')} for +${MEANING_ANSWER}`, short: 'not answered', after: value })
    }
  }
  if (hasRule(core, 'induction') && conclusion >= 0 && core.lastConclusionType && defs[conclusion].type !== core.lastConclusionType) {
    value = Math.floor(value * INDUCTION_BONUS)
    const bonus = `+${Math.round((INDUCTION_BONUS - 1) * 100)}%`
    chain.push({ kind: 'induction', text: `A different Conclusion from last turn: ${bonus}`, short: bonus, after: value })
  }
  const raw = value

  const pierce = defs.some((d) => d.pierce) || (has(core, 'lantern') && !core.piercedOnce)
  const blocked = pierce ? 0 : Math.min(core.enemy.guard, value)
  if (blocked > 0) {
    value -= blocked
    chain.push({ kind: 'guard', text: `Its Guard absorbs ${blocked}`, short: 'its Guard', after: value })
  }
  const arrowMin = core.rigor === 0 ? ARROW_MIN.gentle : ARROW_MIN.rigorous
  if (hasRule(core, 'arrow') && value > 0 && value < arrowMin) {
    value = 0
    chain.push({ kind: 'arrow', text: `Under ${arrowMin}: the arrow does not move`, short: `under ${arrowMin}`, after: value })
  }
  let grains = 0
  if (hasRule(core, 'sorites') && value > SORITES_CAP) {
    grains = overflowUnsettle(value - SORITES_CAP)
    value = SORITES_CAP
    chain.push({ kind: 'cap', text: `Capped at ${SORITES_CAP}${grains > 0 ? `: the rest shakes it, Shaken +${grains}` : ''}`, short: `cap ${SORITES_CAP}`, after: value })
  }
  const line = stopLine(core)
  const room = line !== null ? core.enemy.health - line : null
  let spill = 0
  if (line !== null && room !== null && value > room) {
    const extra = value - room
    spill = overflowUnsettle(extra, grains)
    value = room
    const shakes = `Your extra ${extra} shakes it${spill > 0 ? `: Shaken +${spill}` : ''}`
    if (line === phaseThreshold(core)) chain.push({ kind: 'half', text: `It stops at ${line} and changes. ${shakes}`, short: 'stops at half', after: value })
    else chain.push({ kind: 'line', text: `It stops at ${line}, three quarters of its Resolve. ${shakes}`, short: 'stops at 3/4', after: value })
  }
  const damage = value
  const explained = (hasRule(core, 'motivated') && defs.length < MOTIVATED_CARDS) || (hasRule(core, 'dismisses') && defs.length < DISMISS_CARDS)
  const healedBack = explained ? Math.floor(damage / 2) : 0
  const selfLoss = hasRule(core, 'backfire') && damage > 0 ? defs.length : 0

  const focusCarried = longViewCarry(core)
  const heldFocus = core.focus - focusCarried
  const composure = heldFocus * COMPOSURE_GUARD + (heldFocus > 0 && has(core, 'worry_stone') ? WORRY_STONE_GUARD : 0)
  const guard = steps.reduce((sum, s) => sum + s.guard, 0) + composure
  const unsettle = steps.reduce((sum, s) => sum + s.unsettle, 0)
  const shaken = grains + spill
  const postpone = defs.some((d) => d.postpone)

  const healthAfterArgument = Math.max(0, core.enemy.health - damage + healedBack)
  const argumentFinishes = healthAfterArgument === 0
  const unsettleRoom = line !== null ? Math.max(0, healthAfterArgument - line) : healthAfterArgument
  const unsettleTick = argumentFinishes ? 0 : Math.min(core.enemy.unsettle + unsettle, unsettleRoom)
  const enemyFalls = argumentFinishes ? 'argument' : healthAfterArgument - unsettleTick <= 0 ? 'unsettle' : null
  const threshold = phaseThreshold(core)
  const changes = enemyFalls === null && threshold !== null && healthAfterArgument - unsettleTick <= threshold
  const released = changes ? core.enemy.shaken + shaken : 0
  const acts = !postpone && enemyFalls === null
  const healthWhenActing = healthAfterArgument - unsettleTick
  const strength = core.enemy.strength + growth + chargeBonus(core)
  const incoming = acts ? attackAgainst(core, move, guard, healthWhenActing, strength) : null
  let ruleGuard = 0
  let ruleGuardNote: string | null = null
  if (acts && hasRule(core, 'buridan')) {
    const left = cardsLeft(core)
    ruleGuard = BURIDAN_GUARD * left
    ruleGuardNote = `${left} ${left === 1 ? 'card' : 'cards'} left in your hand: it gains ${ruleGuard} Guard`
  }
  if (acts && hasRule(core, 'newcomb')) {
    ruleGuard = Math.floor(damage / 2)
    ruleGuardNote = `It predicted this: half your ${damage} damage becomes ${ruleGuard} Guard`
  }
  if (acts && hasRule(core, 'newcomb_caution')) {
    ruleGuard = Math.floor(guard / 2)
    ruleGuardNote = `It reads your caution: half your ${guard} Guard becomes ${ruleGuard} Guard for it`
  }
  if (ruleGuard === 0) ruleGuardNote = null
  const big = acts ? bigMove(core) : null
  const gamble = getEnemyDef(core.enemy.id).gamble
  const riskHit = big ? attackAgainst(core, big, guard, healthWhenActing, strength) : null

  return {
    steps,
    carriedWeight: core.carriedWeight,
    doubtWeight,
    weight,
    multiplier,
    product,
    raw,
    modifiers,
    chain,
    pierce,
    enemyGuard: core.enemy.guard,
    blocked,
    damage,
    healedBack,
    selfLoss,
    guard,
    composure,
    heldFocus,
    focusCarried,
    unsettle,
    unsettleTick,
    enemyFalls,
    conclusionEmpty,
    conclusionCount,
    shaken,
    released,
    ruleGuard,
    ruleGuardNote,
    lastingMultiplier: core.lastingMultiplier,
    postpone,
    growth,
    incoming: incoming?.total ?? 0,
    incomingAfterGuard: incoming?.afterGuard ?? 0,
    risk: riskHit && gamble ? { total: riskHit.total, afterGuard: riskHit.afterGuard, chance: gamble.chance } : null,
  }
}

function addDoubtsToDrawPile(core: BattleCore, count: number): BattleCore {
  let next = core
  for (let i = 0; i < count; i++) {
    const position = rollInt(next.rng, 0, next.drawPile.length)
    const doubt: CardInstance = { uid: next.nextUid, cardId: 'doubt', upgraded: false, temporary: true }
    const drawPile = [...next.drawPile.slice(0, position.value), doubt, ...next.drawPile.slice(position.value)]
    next = { ...next, drawPile, rng: position.rng, nextUid: next.nextUid + 1 }
  }
  return next
}

/**
 * A round, in order: your argument lands, Unsettle takes its toll and halves, then the bias acts.
 * A bias that falls before it acts never acts, and a win always leaves you at least 1 Resolve.
 */
export function endTurn(battle: BattleState): BattleState {
  if (battle.outcome !== 'ongoing') return battle
  const core = strip(battle)
  const preview = previewArgument(core)
  const def = getEnemyDef(core.enemy.id)
  const conclusion = conclusionIndex(core)
  const playedDefs = core.played.map(resolveCard)
  const keeps = (c: CardInstance) => Boolean(resolveCard(c).retain)
  const once = (c: CardInstance) => Boolean(resolveCard(c).exhaust)

  const report: RoundReport = {
    turn: core.turn,
    steps: preview.steps,
    carriedWeight: preview.carriedWeight,
    doubtWeight: preview.doubtWeight,
    lastingMultiplier: preview.lastingMultiplier,
    weight: preview.weight,
    multiplier: preview.multiplier,
    product: preview.product,
    modifiers: preview.modifiers,
    chain: preview.chain,
    raw: preview.raw,
    guardBroken: preview.blocked > 0 && preview.blocked === preview.enemyGuard,
    blocked: preview.blocked,
    damage: preview.damage,
    healedBack: preview.healedBack,
    selfLoss: preview.selfLoss,
    postponed: preview.postpone,
    enemyAttack: 0,
    enemyBlocked: 0,
    playerLoss: 0,
    enemyGuardGained: 0,
    unsettleLoss: preview.unsettleTick,
    doubtsAdded: 0,
    growth: preview.growth,
    phaseChanged: false,
    gamble: null,
    restored: 0,
    shaken: preview.shaken,
    released: 0,
    ruleGuard: preview.ruleGuard,
    ruleGuardNote: preview.ruleGuardNote,
  }

  const unsettle = core.enemy.unsettle + preview.unsettle
  const enemy = {
    ...core.enemy,
    guard: core.enemy.guard - preview.blocked,
    health: Math.max(0, core.enemy.health - preview.damage + preview.healedBack) - preview.unsettleTick,
    strength: core.enemy.strength + preview.growth,
    unsettle: preview.enemyFalls === 'argument' || core.unsettleLasts || has(core, 'still_water') ? unsettle : Math.floor(unsettle / 2),
    shaken: core.enemy.shaken + preview.shaken,
    seen: [...new Set([...core.enemy.seen, ...playedDefs.filter((d) => d.type === 'evidence').map((d) => d.id)])],
  }
  const player = { ...core.player, resolve: Math.max(0, core.player.resolve - preview.selfLoss), guard: preview.guard }

  let next: BattleCore = {
    ...core,
    enemy,
    player,
    hand: core.hand.filter(keeps),
    played: [],
    discardPile: [...core.discardPile, ...core.hand.filter((c) => !keeps(c)), ...core.played.filter((c) => !once(c))],
    exhausted: [...core.exhausted, ...core.played.filter(once)],
    carriedWeight: 0,
    carriedFocus: core.carriedFocus + longViewCarry(core),
    lastConclusionType: conclusion >= 0 ? playedDefs[conclusion].type : null,
    piercedOnce: core.piercedOnce || preview.weight > 0,
    evidencePlayed: core.evidencePlayed + playedDefs.filter((d) => d.type === 'evidence').length,
  }

  const won = (state: BattleCore): BattleState => ({
    ...state,
    player: { ...state.player, resolve: Math.max(1, state.player.resolve) },
    outcome: 'won',
    lastRound: report,
    undo: [],
  })
  if (enemy.health <= 0) return won(next)
  if (player.resolve <= 0) return { ...next, outcome: 'lost', lastRound: report, undo: [] }

  if (!preview.postpone) {
    const gambled = def.gamble !== undefined && core.enemy.gambleHit
    const move = gambled ? (bigMove(core) as EnemyMove) : currentMove(next)
    const actingEnemy = { ...next.enemy }
    if (!hasRule(core, 'status_quo')) actingEnemy.guard = 0
    const actingPlayer = { ...next.player }
    if (move.attack) {
      const hit = attackAgainst(next, move, actingPlayer.guard, actingEnemy.health, actingEnemy.strength + chargeBonus(core))
      report.enemyAttack = hit.total
      report.enemyBlocked = Math.min(actingPlayer.guard, hit.total)
      actingPlayer.guard -= report.enemyBlocked
      report.playerLoss = hit.afterGuard
      actingPlayer.resolve = Math.max(0, actingPlayer.resolve - hit.afterGuard)
    }
    const guardBefore = actingEnemy.guard
    actingEnemy.guard += (move.guard ?? 0) + preview.ruleGuard
    if (hasRule(core, 'status_quo')) actingEnemy.guard = Math.min(STATUS_QUO_MAX_GUARD, actingEnemy.guard)
    report.enemyGuardGained = Math.max(0, actingEnemy.guard - guardBefore)
    if (def.gamble) {
      report.gamble = gambled ? 'hit' : 'miss'
      actingEnemy.misses = gambled ? 0 : actingEnemy.misses + 1
    }
    if (hasRule(core, 'grows')) actingEnemy.strength += def.growth ?? 0
    actingEnemy.moveIndex += 1
    next = { ...next, enemy: actingEnemy, player: actingPlayer }
    if (move.addDoubt) {
      next = addDoubtsToDrawPile(next, move.addDoubt)
      report.doubtsAdded = move.addDoubt
    }
  }

  if (next.lastingRestore > 0 && report.playerLoss + report.selfLoss === 0) {
    const resolve = Math.min(next.player.maxResolve, next.player.resolve + next.lastingRestore)
    report.restored = resolve - next.player.resolve
    next = { ...next, player: { ...next.player, resolve } }
  }

  if (next.school === 'pragmatist') next = { ...next, carriedWeight: next.player.guard }

  if (def.phase2 && next.enemy.phase === 1 && next.enemy.health * 2 <= next.enemy.maxHealth) {
    report.released = next.enemy.shaken
    const { shaken } = next.enemy
    next = { ...next, enemy: { ...next.enemy, phase: 2, moveIndex: 0, health: Math.max(0, next.enemy.health - shaken), unsettle: next.enemy.unsettle + Math.floor(shaken / 2), shaken: 0 } }
    report.phaseChanged = true
  }

  if (next.player.resolve <= 0) return { ...next, outcome: 'lost', lastRound: report, undo: [] }
  if (next.enemy.health <= 0) return won(next)

  return { ...startTurn({ ...next, lastRound: report }), undo: [] }
}
