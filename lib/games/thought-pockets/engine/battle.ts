import {
  ArgumentPreview,
  Ask,
  BattleCore,
  BattleState,
  CardDef,
  CardInstance,
  EnemyMove,
  EnemyRule,
  RelicId,
  RoundReport,
  School,
  StepView,
} from '@/types/thought-pockets'
import { isDoubt, resolveCard } from '../data/cards'
import { TUTORIAL_ENEMY, getEnemyDef } from '../data/enemies'
import { RIGOR, RIGOROUS_ATTACK, RIGOROUS_HEALTH } from '../data/pace'
import { roll, rollInt, shuffle } from './rng'

export const FOCUS_PER_TURN = 3
export const HAND_SIZE = 5
export const MAX_HAND = 10
export const MAX_TURNS = 30

const DOUBT_WEIGHT = 3
const OVERCONFIDENT_BONUS = 4
const SKEPTIC_BONUS = 2
const INDUCTION_BONUS = 1.5
const MOTIVATED_CARDS = 3
const GROWTH_PER_ACTION = 2
const BANDWAGON_GROWTH = 1
export const SORITES_CAP = 15
const SORITES_GRAIN = 5
export const COMPOSURE_GUARD = 2
export const WORRY_STONE_GUARD = 3
export const MARGINALIA_WEIGHT = 2
export const LONG_VIEW_MAX = 2
export const HOURGLASS_FOCUS = 2
export const SECOND_OPINION_DRAW = 2
export const STOIC_CAP = 12
export const SEED_UNSETTLE = 4
export const FOOTNOTES_CARDS = 4
export const KNOWN_UNSETTLE = 4

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

/** The rule in force right now: a boss past half Resolve plays by its second rule. */
export function enemyRule(core: BattleCore): EnemyRule {
  const def = getEnemyDef(core.enemy.id)
  return inSecondPhase(core) && def.phase2 ? def.phase2.rule : def.rule
}

export function enemyRuleText(core: BattleCore): string {
  const def = getEnemyDef(core.enemy.id)
  return inSecondPhase(core) && def.phase2 ? def.phase2.ruleText : def.ruleText
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

function attackAgainst(core: BattleCore, move: EnemyMove, guard: number, enemyHealth: number, strength: number): Incoming {
  if (!move.attack) return { perHit: 0, hits: 0, total: 0, afterGuard: 0 }
  const overconfident = enemyRule(core) === 'overconfident' && enemyHealth * 2 > core.enemy.maxHealth
  const perHit = move.attack + strength + (overconfident ? OVERCONFIDENT_BONUS : 0)
  const hits = move.hits ?? 1
  const total = perHit * hits
  let afterGuard = Math.max(0, total - guard)
  if (has(core, 'stoic_pebble')) afterGuard = Math.min(afterGuard, STOIC_CAP)
  return { perHit, hits, total, afterGuard }
}

/** What the enemy's shown intent would cost you if you had this much Guard. */
export function incomingDamage(core: BattleCore, guard: number): Incoming {
  return attackAgainst(core, currentMove(core), guard, core.enemy.health, core.enemy.strength)
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
    focus: FOCUS_PER_TURN + core.carriedFocus + hourglass,
    carriedFocus: 0,
    firstLogicDiscountUsed: false,
    played: [],
    player: { ...core.player, guard: 0 },
  }
  const gamble = getEnemyDef(core.enemy.id).gamble
  if (gamble) {
    const r = roll(next.rng)
    next = { ...next, rng: r.rng, enemy: { ...next.enemy, gambleHit: r.value < gamble.chance } }
  }
  return drawCards(next, HAND_SIZE + quiet)
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
  const health = setup.rigor >= RIGOR.tougher ? Math.round(def.health * RIGOROUS_HEALTH) : def.health
  const strength =
    (setup.rigor >= RIGOR.harder ? RIGOROUS_ATTACK : 0) + (setup.rigor >= RIGOR.bossesHarder && def.tier !== 'normal' ? RIGOROUS_ATTACK : 0)
  const core: BattleCore = {
    enemy: {
      id: def.id,
      health,
      maxHealth: health,
      guard: 0,
      strength,
      unsettle: (setup.relics.includes('seed_of_doubt') ? SEED_UNSETTLE : 0) + (setup.known ? KNOWN_UNSETTLE : 0),
      moveIndex: 0,
      seen: [],
      phase: 1,
      gambleHit: false,
      misses: 0,
    },
    player: { resolve: setup.resolve, maxResolve: setup.maxResolve, guard: 0 },
    relics: setup.relics,
    school: setup.school,
    turn: 0,
    focus: 0,
    hand: [],
    drawPile: shuffled.items,
    discardPile: [],
    played: [],
    exhausted: [],
    lastingMultiplier: 0,
    firstLogicDiscountUsed: false,
    carriedWeight: 0,
    carriedFocus: 0,
    lastConclusionType: null,
    piercedOnce: false,
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
  return enemyRule(core) === 'anchoring' ? 0 : core.played.length - 1
}

function baseEvidenceWeight(def: CardDef, evidenceCount: number, doubts: number, lowResolve: boolean): number {
  return (
    (def.weight ?? 0) +
    (def.weightPerOtherEvidence ?? 0) * (evidenceCount - 1) +
    (lowResolve ? def.weightIfLowResolve ?? 0 : 0) +
    (def.weightPerDoubtInHand ?? 0) * doubts
  )
}

const ASK_NAMES: Record<Ask, string> = { evidence: 'an Evidence card', logic: 'a Logic card', guard: 'a Guard card' }

function longViewCarry(core: BattleCore): number {
  return has(core, 'long_view') ? Math.min(LONG_VIEW_MAX, core.focus) : 0
}

export function previewArgument(core: BattleCore): ArgumentPreview {
  const rule = enemyRule(core)
  const defs = core.played.map(resolveCard)
  const evidenceCount = defs.filter((d) => d.type === 'evidence').length
  const logicCount = defs.filter((d) => d.type === 'logic').length
  const doubts = core.hand.filter(isDoubt).length
  const lowResolve = core.player.resolve * 2 <= core.player.maxResolve
  const conclusion = conclusionIndex(core)

  let haloIndex = -1
  if (rule === 'halo') {
    let best = -1
    defs.forEach((def, i) => {
      if (def.type !== 'evidence') return
      const weight = baseEvidenceWeight(def, evidenceCount, doubts, lowResolve)
      if (weight > best) {
        best = weight
        haloIndex = i
      }
    })
  }

  const seenNames = new Set<string>()
  let growth = 0
  let conclusionEmpty = false
  const steps: StepView[] = defs.map((def, i) => {
    const notes: string[] = []
    const isEvidence = def.type === 'evidence'
    let weight = isEvidence ? baseEvidenceWeight(def, evidenceCount, doubts, lowResolve) : def.weight ?? 0
    if (def.type === 'guard' && has(core, 'marginalia')) {
      weight += MARGINALIA_WEIGHT
      notes.push(`Marginalia +${MARGINALIA_WEIGHT}`)
    }
    let multiplier =
      (def.multiplier ?? 0) +
      (def.multiplierPerEvidence ?? 0) * evidenceCount +
      (def.multiplierPerOtherLogic ?? 0) * (logicCount - 1)
    const guard = def.guard ?? 0
    let unsettle = (def.unsettle ?? 0) + (def.unsettlePerCard ?? 0) * defs.length
    if (unsettle > 0 && core.school === 'skeptic') unsettle += SKEPTIC_BONUS

    if (rule === 'confirmation' && isEvidence && core.enemy.seen.includes(core.played[i].cardId)) {
      weight = Math.floor(weight / 2)
      notes.push('Already seen: half')
    }
    if (rule === 'halo' && isEvidence && i !== haloIndex) {
      weight = Math.floor(weight / 2)
      notes.push('Outshone: half')
    }
    if (rule === 'bandwagon') {
      if (seenNames.has(def.id)) {
        growth += BANDWAGON_GROWTH
        notes.push('Repeated: its attacks +1')
      }
      seenNames.add(def.id)
    }

    const isConclusion = i === conclusion
    if (isConclusion) {
      if (weight === 0 && multiplier === 0) {
        conclusionEmpty = true
        notes.push('Conclusion: nothing to double')
      } else {
        let times = def.conclusionTimes ?? (core.school === 'empiricist' && isEvidence ? 3 : 2)
        if (has(core, 'footnotes') && defs.length >= FOOTNOTES_CARDS) times = Math.max(times, 3)
        weight *= times
        multiplier *= times
        notes.push(times === 2 ? 'Conclusion: counts twice' : `Conclusion: counts ${times} times`)
      }
    }
    return { uid: core.played[i].uid, name: def.name, type: def.type, weight, multiplier, guard, unsettle, conclusion: isConclusion, notes }
  })

  const doubtWeight = core.school === 'absurdist' ? doubts * DOUBT_WEIGHT : 0
  const weight = core.carriedWeight + doubtWeight + steps.reduce((sum, s) => sum + s.weight, 0)
  let multiplier = 1 + core.lastingMultiplier + steps.reduce((sum, s) => sum + s.multiplier, 0)
  const modifiers: string[] = []
  if (has(core, 'ockhams_razor') && defs.length === 2) {
    multiplier += 1
    modifiers.push("Ockham's Razor: +1 Multiplier")
  }

  const product = Math.floor(weight * multiplier + 1e-9)
  let raw = product
  const move = currentMove(core)
  if (rule === 'meaning' && move.asks) {
    if (move.asks.every((type) => defs.some((d) => d.type === type))) {
      raw *= 2
      modifiers.push('You answered its question: double')
    } else {
      modifiers.push(`Not answered: include ${move.asks.map((type) => ASK_NAMES[type]).join(' and ')} to double`)
    }
  }
  if (rule === 'induction' && conclusion >= 0 && core.lastConclusionType && defs[conclusion].type !== core.lastConclusionType) {
    raw = Math.floor(raw * INDUCTION_BONUS)
    modifiers.push('A different Conclusion from last turn: +50%')
  }

  const pierce = defs.some((d) => d.pierce) || (has(core, 'lantern') && !core.piercedOnce)
  const blocked = pierce ? 0 : Math.min(core.enemy.guard, raw)
  let damage = raw - blocked
  let grains = 0
  if (rule === 'sorites' && damage > SORITES_CAP) {
    grains = Math.floor((damage - SORITES_CAP) / SORITES_GRAIN)
    damage = SORITES_CAP
    modifiers.push(`Capped at ${SORITES_CAP}${grains > 0 ? `, the rest becomes Unsettle ${grains}` : ''}`)
  }
  const healedBack = rule === 'motivated' && defs.length < MOTIVATED_CARDS ? Math.floor(damage / 2) : 0
  if (healedBack > 0) modifiers.push('Fewer than 3 cards: it explains half away')
  const selfLoss = rule === 'backfire' && damage > 0 ? defs.length : 0

  const composure = (core.focus - longViewCarry(core)) * (COMPOSURE_GUARD + (has(core, 'worry_stone') ? WORRY_STONE_GUARD : 0))
  const guard = steps.reduce((sum, s) => sum + s.guard, 0) + composure
  const unsettle = steps.reduce((sum, s) => sum + s.unsettle, 0) + grains
  const postpone = defs.some((d) => d.postpone)

  const healthAfterArgument = Math.max(0, core.enemy.health - damage + healedBack)
  const argumentFinishes = healthAfterArgument === 0
  const unsettleTick = argumentFinishes ? 0 : Math.min(core.enemy.unsettle + unsettle, healthAfterArgument)
  const enemyFalls = argumentFinishes ? 'argument' : healthAfterArgument - unsettleTick <= 0 ? 'unsettle' : null
  const acts = !postpone && enemyFalls === null
  const healthWhenActing = healthAfterArgument - unsettleTick
  const strength = core.enemy.strength + growth
  const incoming = acts ? attackAgainst(core, move, guard, healthWhenActing, strength) : null
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
    pierce,
    enemyGuard: core.enemy.guard,
    blocked,
    damage,
    healedBack,
    selfLoss,
    guard,
    composure,
    unsettle,
    unsettleTick,
    enemyFalls,
    conclusionEmpty,
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
  const rule = enemyRule(core)
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
  }

  const unsettle = core.enemy.unsettle + preview.unsettle
  const enemy = {
    ...core.enemy,
    guard: core.enemy.guard - preview.blocked,
    health: Math.max(0, core.enemy.health - preview.damage + preview.healedBack) - preview.unsettleTick,
    strength: core.enemy.strength + preview.growth,
    unsettle: preview.enemyFalls === 'argument' ? unsettle : Math.floor(unsettle / 2),
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
    piercedOnce: true,
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
    if (rule !== 'status_quo') actingEnemy.guard = 0
    const actingPlayer = { ...next.player }
    if (move.attack) {
      const hit = attackAgainst(next, move, actingPlayer.guard, actingEnemy.health, actingEnemy.strength)
      report.enemyAttack = hit.total
      report.enemyBlocked = Math.min(actingPlayer.guard, hit.total)
      actingPlayer.guard -= report.enemyBlocked
      report.playerLoss = hit.afterGuard
      actingPlayer.resolve = Math.max(0, actingPlayer.resolve - hit.afterGuard)
    }
    if (move.guard) {
      actingEnemy.guard += move.guard
      report.enemyGuardGained = move.guard
    }
    if (def.gamble) {
      report.gamble = gambled ? 'hit' : 'miss'
      actingEnemy.misses = gambled ? 0 : actingEnemy.misses + 1
    }
    if (rule === 'grows') actingEnemy.strength += GROWTH_PER_ACTION
    actingEnemy.moveIndex += 1
    next = { ...next, enemy: actingEnemy, player: actingPlayer }
    if (move.addDoubt) {
      next = addDoubtsToDrawPile(next, move.addDoubt)
      report.doubtsAdded = move.addDoubt
    }
  }

  if (next.school === 'pragmatist') next = { ...next, carriedWeight: next.player.guard }

  if (def.phase2 && next.enemy.phase === 1 && next.enemy.health * 2 <= next.enemy.maxHealth) {
    next = { ...next, enemy: { ...next.enemy, phase: 2, moveIndex: 0 } }
    report.phaseChanged = true
  }

  if (next.player.resolve <= 0 || core.turn >= MAX_TURNS) return { ...next, outcome: 'lost', lastRound: report, undo: [] }

  return { ...startTurn({ ...next, lastRound: report }), undo: [] }
}
