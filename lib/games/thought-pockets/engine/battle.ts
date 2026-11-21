import {
  ArgumentPreview,
  BattleCore,
  BattleState,
  CardDef,
  CardInstance,
  EnemyMove,
  Mode,
  RelicId,
  RoundReport,
  School,
  StepView,
} from '@/types/thought-pockets'
import { isDoubt, resolveCard } from '../data/cards'
import { TUTORIAL_ENEMY, getEnemyDef } from '../data/enemies'
import { rollInt, shuffle } from './rng'

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
export const COMPOSURE_GUARD = 3
const WORRY_STONE_GUARD = 3
const MARGINALIA_WEIGHT = 2
const LONG_VIEW_MAX = 2
const HOURGLASS_FOCUS = 2
const SECOND_OPINION_DRAW = 2
const STOIC_CAP = 12
const SEED_UNSETTLE = 2
const FOOTNOTES_CARDS = 4
export const KNOWN_UNSETTLE = 2
export const RIGOROUS_HEALTH = 1.25
export const RIGOROUS_ATTACK = 2

export interface BattleSetup {
  enemyId: string
  deck: CardInstance[]
  resolve: number
  maxResolve: number
  relics: RelicId[]
  school: School
  rng: number
  mode: Mode
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

export function currentMove(core: BattleCore): EnemyMove {
  const moves = getEnemyDef(core.enemy.id).moves
  return moves[core.enemy.moveIndex % moves.length]
}

function attackAgainst(core: BattleCore, guard: number, enemyHealth: number, strength: number): Incoming {
  const move = currentMove(core)
  if (!move.attack) return { perHit: 0, hits: 0, total: 0, afterGuard: 0 }
  const rule = getEnemyDef(core.enemy.id).rule
  const overconfident = rule === 'overconfident' && enemyHealth * 2 > core.enemy.maxHealth
  const perHit = move.attack + strength + (overconfident ? OVERCONFIDENT_BONUS : 0)
  const hits = move.hits ?? 1
  const total = perHit * hits
  let afterGuard = Math.max(0, total - guard)
  if (has(core, 'stoic_pebble')) afterGuard = Math.min(afterGuard, STOIC_CAP)
  return { perHit, hits, total, afterGuard }
}

/** What the enemy's current intent would cost you if you had this much Guard. */
export function incomingDamage(core: BattleCore, guard: number): Incoming {
  return attackAgainst(core, guard, core.enemy.health, core.enemy.strength)
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
  const next: BattleCore = {
    ...core,
    turn,
    focus: FOCUS_PER_TURN + core.carriedFocus + hourglass,
    carriedFocus: 0,
    firstLogicDiscountUsed: false,
    played: [],
    player: { ...core.player, guard: 0 },
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
  const rigorous = setup.mode === 'rigorous'
  const health = rigorous ? Math.round(def.health * RIGOROUS_HEALTH) : def.health
  const core: BattleCore = {
    enemy: {
      id: def.id,
      health,
      maxHealth: health,
      guard: 0,
      strength: rigorous ? RIGOROUS_ATTACK : 0,
      unsettle: (setup.relics.includes('seed_of_doubt') ? SEED_UNSETTLE : 0) + (setup.known ? KNOWN_UNSETTLE : 0),
      moveIndex: 0,
      seen: [],
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
  return getEnemyDef(core.enemy.id).rule === 'anchoring' ? 0 : core.played.length - 1
}

function baseEvidenceWeight(def: CardDef, evidenceCount: number, doubts: number, lowResolve: boolean): number {
  return (
    (def.weight ?? 0) +
    (def.weightPerOtherEvidence ?? 0) * (evidenceCount - 1) +
    (lowResolve ? def.weightIfLowResolve ?? 0 : 0) +
    (def.weightPerDoubtInHand ?? 0) * doubts
  )
}

export function previewArgument(core: BattleCore): ArgumentPreview {
  const enemyDef = getEnemyDef(core.enemy.id)
  const rule = enemyDef.rule
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
  const steps: StepView[] = defs.map((def, i) => {
    const notes: string[] = []
    const isEvidence = def.type === 'evidence'
    let weight = isEvidence ? baseEvidenceWeight(def, evidenceCount, doubts, lowResolve) : def.weight ?? 0
    if (def.type === 'guard' && has(core, 'marginalia')) {
      weight += MARGINALIA_WEIGHT
      notes.push('Marginalia +2')
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
      let times = def.conclusionTimes ?? (core.school === 'empiricist' && isEvidence ? 3 : 2)
      if (has(core, 'footnotes') && defs.length >= FOOTNOTES_CARDS) times = Math.max(times, 3)
      weight *= times
      multiplier *= times
      notes.push(times === 2 ? 'Conclusion: counts twice' : `Conclusion: counts ${times} times`)
    }
    return { uid: core.played[i].uid, name: def.name, type: def.type, weight, multiplier, guard, unsettle, conclusion: isConclusion, notes }
  })

  const doubtWeight = core.school === 'absurdist' ? doubts * DOUBT_WEIGHT : 0
  const weight = core.carriedWeight + doubtWeight + steps.reduce((sum, s) => sum + s.weight, 0)
  let multiplier = 1 + steps.reduce((sum, s) => sum + s.multiplier, 0)
  const modifiers: string[] = []
  if (has(core, 'ockhams_razor') && defs.length === 2) {
    multiplier += 1
    modifiers.push("Ockham's Razor: +1 Multiplier")
  }

  const product = Math.floor(weight * multiplier + 1e-9)
  let raw = product
  const move = currentMove(core)
  if (rule === 'meaning' && move.asks) {
    if (defs.some((d) => d.type === move.asks)) {
      raw *= 2
      modifiers.push('You answered its question: double')
    } else {
      modifiers.push(`Not answered: include ${move.asks === 'guard' ? 'a Guard' : move.asks === 'logic' ? 'a Logic' : 'an Evidence'} card to double`)
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

  const composure = core.focus * (COMPOSURE_GUARD + (has(core, 'worry_stone') ? WORRY_STONE_GUARD : 0))
  const guard = steps.reduce((sum, s) => sum + s.guard, 0) + composure
  const unsettle = steps.reduce((sum, s) => sum + s.unsettle, 0) + grains
  const postpone = defs.some((d) => d.postpone)

  const enemyHealthAfter = Math.max(0, core.enemy.health - damage + healedBack)
  const incoming = postpone
    ? { total: 0, afterGuard: 0 }
    : attackAgainst(core, guard, enemyHealthAfter, core.enemy.strength + growth)

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
    postpone,
    growth,
    incoming: incoming.total,
    incomingAfterGuard: incoming.afterGuard,
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

export function endTurn(battle: BattleState): BattleState {
  if (battle.outcome !== 'ongoing') return battle
  const core = strip(battle)
  const preview = previewArgument(core)
  const enemyDef = getEnemyDef(core.enemy.id)
  const conclusion = conclusionIndex(core)
  const playedDefs = core.played.map(resolveCard)

  const enemy = {
    ...core.enemy,
    guard: core.enemy.guard - preview.blocked,
    health: Math.max(0, core.enemy.health - preview.damage + preview.healedBack),
    strength: core.enemy.strength + preview.growth,
    unsettle: core.enemy.unsettle + preview.unsettle,
    seen: [...new Set([...core.enemy.seen, ...playedDefs.filter((d) => d.type === 'evidence').map((d) => d.id)])],
  }
  const player = { ...core.player, resolve: Math.max(0, core.player.resolve - preview.selfLoss), guard: preview.guard }

  const report: RoundReport = {
    turn: core.turn,
    steps: preview.steps,
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
    unsettleLoss: 0,
    doubtsAdded: 0,
    growth: preview.growth,
  }

  let next: BattleCore = {
    ...core,
    enemy,
    player,
    hand: [],
    played: [],
    discardPile: [...core.discardPile, ...core.hand, ...core.played],
    carriedWeight: 0,
    carriedFocus: has(core, 'long_view') ? Math.min(LONG_VIEW_MAX, core.focus) : 0,
    lastConclusionType: conclusion >= 0 ? playedDefs[conclusion].type : null,
    piercedOnce: true,
  }

  if (enemy.health <= 0) return { ...next, outcome: 'won', lastRound: report, undo: [] }
  if (player.resolve <= 0) return { ...next, outcome: 'lost', lastRound: report, undo: [] }

  if (!preview.postpone) {
    const move = currentMove(next)
    const actingEnemy = { ...next.enemy }
    if (enemyDef.rule !== 'status_quo') actingEnemy.guard = 0
    const actingPlayer = { ...next.player }
    if (move.attack) {
      const hit = attackAgainst(next, actingPlayer.guard, actingEnemy.health, actingEnemy.strength)
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
    if (enemyDef.rule === 'grows') actingEnemy.strength += GROWTH_PER_ACTION
    actingEnemy.moveIndex += 1
    next = { ...next, enemy: actingEnemy, player: actingPlayer }
    if (move.addDoubt) {
      next = addDoubtsToDrawPile(next, move.addDoubt)
      report.doubtsAdded = move.addDoubt
    }
  }

  if (next.school === 'pragmatist') next = { ...next, carriedWeight: next.player.guard }

  report.unsettleLoss = Math.min(next.enemy.unsettle, next.enemy.health)
  next = { ...next, enemy: { ...next.enemy, health: next.enemy.health - report.unsettleLoss } }

  if (next.enemy.health <= 0) return { ...next, outcome: 'won', lastRound: report, undo: [] }
  if (next.player.resolve <= 0 || core.turn >= MAX_TURNS) return { ...next, outcome: 'lost', lastRound: report, undo: [] }

  return { ...startTurn({ ...next, lastRound: report }), undo: [] }
}
