import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  BOSS_SCHOOL_SLOTS,
  RULE_BENDING_CHOICES,
  RUN_VERSION,
  availableNodes,
  battleAction,
  bossOptions,
  chooseNode,
  holdsNothingBack,
  inOrNearSchool,
  leaveReward,
  migrateRun,
  newRun,
  recoveryOptions,
  restAmount,
  skipCards,
  takeRelic,
} from '@/lib/games/thought-pockets/engine/run'
import { BOOKENDS_DRAW, STILL_WATER_GUARD, SUNDIAL_FOCUS, FOCUS_PER_TURN, HAND_SIZE, createBattle, currentMove, endTurn, playCard, previewArgument } from '@/lib/games/thought-pockets/engine/battle'
import { shopPrice, TEA_HEAL, TEA_PRICE } from '@/lib/games/thought-pockets/engine/economy'
import { CARDS, describeCard, getCardDef, summarizeCard } from '@/lib/games/thought-pockets/data/cards'
import { DISMISS_CARDS, fullRuleText, getEnemyDef, ruleTextAt, slowGroundText } from '@/lib/games/thought-pockets/data/enemies'
import { RELICS } from '@/lib/games/thought-pockets/data/relics'
import { SCHOOLS } from '@/lib/games/thought-pockets/data/schools'
import { RIGOR, SHORT_WALK_BOSS } from '@/lib/games/thought-pockets/data/pace'
import { recoveryLine } from '@/lib/games/thought-pockets/data/mapText'
import { argueLabel } from '@/lib/games/thought-pockets/data/turnText'
import { fitsLabel } from '@/lib/games/thought-pockets/data/synergy'
import { stepWords, walkArgumentText } from '@/lib/games/thought-pockets/data/walkArgument'
import { BattleState, MapNode, RunState, School } from '@/types/thought-pockets'
import { battleWith, card } from './helpers'

function standingBefore(run: RunState, type: MapNode['type']): { run: RunState; node: MapNode } {
  const node = run.map.find((n) => n.type === type) as MapNode
  const before = run.map.find((n) => n.next.includes(node.id)) as MapNode
  return { run: { ...run, position: before.id, visited: [before.id] }, node }
}

/** A run standing where its next step offers exactly these kinds of place. */
function facing(run: RunState, types: MapNode['type'][]): RunState {
  const map = run.map.map((n) => (n.row === 1 ? { ...n, type: types[n.lane] ?? n.type, enemyId: types[n.lane] === 'battle' ? 'sunk_cost' : n.enemyId } : n))
  const start = map.find((n) => n.row === 0) as MapNode
  return { ...run, map: map.map((n) => (n.id === start.id ? { ...n, next: map.filter((m) => m.row === 1).map((m) => m.id) } : n)), position: start.id, visited: [start.id] }
}

function winFight(run: RunState): RunState {
  const battle = run.battle as BattleState
  return battleAction({ ...run, battle: { ...battle, enemy: { ...battle.enemy, health: 0 } } }, endTurn)
}

describe('the low-Resolve warning names only what your next step really offers', () => {
  const base = newRun('empiricist', 701)

  it('with a fight, an encounter and a shop ahead and no gold for tea, it promises nothing it cannot keep', () => {
    const run = { ...facing(base, ['battle', 'event', 'shop']), resolve: 10, gold: 5 }
    expect(availableNodes(run).map((n) => n.type).sort()).toEqual(['battle', 'event', 'shop'])
    expect(recoveryOptions(run)).toEqual([])
    const line = recoveryLine(recoveryOptions(run))
    expect(line).not.toMatch(/\brest\b|tea/)
    expect(line).toContain('unspent Focus becomes Guard')
  })

  it('names the shop’s tea with its real price and what it restores, only when you can afford it', () => {
    const price = shopPrice(TEA_PRICE, 1, [])
    const run = { ...facing(base, ['battle', 'event', 'shop']), resolve: 10, gold: price }
    expect(recoveryOptions(run)).toEqual([{ kind: 'tea', amount: TEA_HEAL, price }])
    expect(recoveryLine(recoveryOptions(run))).toBe(`On your next step, the shop’s tea (${price} gold) restores ${TEA_HEAL}.`)
    expect(recoveryOptions({ ...run, gold: price - 1 })).toEqual([])
    const discounted = { ...run, relics: ['library_card' as const], gold: 100 }
    expect(recoveryOptions(discounted)[0].price).toBe(shopPrice(TEA_PRICE, 1, ['library_card']))
  })

  it('counts a rest only where rests restore Resolve', () => {
    const gentle = { ...facing(base, ['rest', 'event', 'battle']), resolve: 10 }
    expect(recoveryOptions(gentle)).toEqual([{ kind: 'rest', amount: restAmount(gentle), price: 0 }])
    expect(recoveryLine(recoveryOptions(gentle))).toBe(`On your next step, the rest restores ${restAmount(gentle)} Resolve.`)
    const seven = { ...facing(newRun('empiricist', 701, 'rigorous', [], 7), ['rest', 'event', 'shop']), resolve: 10, gold: 0 }
    expect(restAmount(seven)).toBe(0)
    expect(recoveryOptions(seven)).toEqual([])
    const both = { ...facing(base, ['rest', 'shop', 'battle']), resolve: 10, gold: 100 }
    expect(recoveryLine(recoveryOptions(both))).toMatch(/^On your next step, the rest restores \d+ Resolve and the shop’s tea \(\d+ gold\) restores \d+\.$/)
  })
})

describe('the coming Unsettle is always forecast', () => {
  it('holding back says both the Guard it makes and the Unsettle that lands before the bias acts', () => {
    const battle = { ...battleWith({ hand: ['caveat'] }), focus: 3 }
    const shaken = { ...battle, enemy: { ...battle.enemy, unsettle: 4 } }
    const preview = previewArgument(shaken)
    expect(preview.unsettleTick).toBe(4)
    expect(argueLabel(preview)).toBe(`Hold: ${preview.composure} Guard · Unsettle 4`)
    expect(argueLabel(previewArgument({ ...shaken, focus: 0 }))).toBe('No argument · Unsettle 4')
    expect(argueLabel(previewArgument(battle))).toBe(`Hold: ${preview.composure} Guard`)
  })
})

describe('every rule a bias plays by is listed wherever it is described', () => {
  it('from Rigorous 6 the second rule joins the first; below it, only the first', () => {
    for (const enemy of ['confirmation_bias', 'backfire', 'motivated_reasoning'].map(getEnemyDef)) {
      const second = enemy.secondRule?.ruleText as string
      expect(fullRuleText(enemy, RIGOR.secondRule)).toBe(`${ruleTextAt(enemy, RIGOR.secondRule)} ${second}`)
      expect(fullRuleText(enemy, RIGOR.secondRule - 1)).not.toContain(second)
      expect(fullRuleText(enemy, 0)).toBe(`${ruleTextAt(enemy, 0)} ${slowGroundText(Math.floor(enemy.health / 2))}`)
    }
  })

  it('the Backfire Effect’s second rule now only waves off a single card, and says so', () => {
    const backfire = getEnemyDef('backfire')
    expect(backfire.secondRule?.rule).toBe('dismisses')
    expect(DISMISS_CARDS).toBe(2)
    expect(backfire.secondRule?.ruleText).toContain('one-card argument')
    const start = createBattle({ enemyId: 'backfire', deck: [], resolve: 99, maxResolve: 99, relics: [], school: 'skeptic', rng: 1, rigor: RIGOR.secondRule, known: false })
    const hand = { ...start, hand: [card('observation', 300), card('observation', 301)], focus: 3 }
    expect(previewArgument(playCard(hand, 300)).healedBack).toBeGreaterThan(0)
    expect(previewArgument(playCard(playCard(hand, 300), 301)).healedBack).toBe(0)
  })
})

describe('each school has three or four build-around rares', () => {
  it('counts them from the card data', () => {
    for (const school of SCHOOLS) {
      const rares = CARDS.filter((c) => c.rarity === 'rare' && c.school === school.id)
      expect(rares.length, school.id).toBeGreaterThanOrEqual(3)
      expect(rares.length, school.id).toBeLessThanOrEqual(4)
    }
  })

  it('Pragmatic Maxim: +Multiplier for each Guard card in the argument, as its text says', () => {
    const maxim = getCardDef('pragmatic_maxim')
    expect(describeCard(maxim)).toContain(`+${maxim.multiplierPerGuardCard} Multiplier for each Guard card in this argument.`)
    expect(summarizeCard(maxim)).toContain(`+${maxim.multiplierPerGuardCard} Mult per Guard card`)
    const battle = { ...battleWith({ hand: ['caveat', 'caveat', 'observation', 'pragmatic_maxim'], school: 'skeptic' }), focus: 4 }
    const played = [100, 101, 102, 103].reduce((b, uid) => playCard(b, uid), battle)
    const step = previewArgument(played).steps[3]
    expect(step.conclusion).toBe(true)
    expect(step.multiplier).toBe(((maxim.multiplier as number) + (maxim.multiplierPerGuardCard as number) * 2) * step.times)
  })

  it('Uphill Again: draws and adds two Doubts to your hand, and says two', () => {
    const uphill = getCardDef('uphill_again')
    expect(describeCard(uphill)).toContain('Add 2 Doubts to your hand for this fight.')
    expect(summarizeCard(uphill)).toContain('+2 Doubts')
    const battle = { ...battleWith({ hand: ['uphill_again'], school: 'absurdist' }), drawPile: [card('observation', 400)] }
    const after = playCard(battle, 100)
    expect(after.hand.filter((c) => c.cardId === 'doubt')).toHaveLength(2)
    expect(after.hand.some((c) => c.cardId === 'observation')).toBe(true)
    expect(previewArgument(after).doubtWeight).toBeGreaterThan(0)
  })
})

describe('rule-bending relics come from philosophical problems', () => {
  it('a boss offers one familiar relic and two that bend a rule; other rewards and shops never offer those', () => {
    const bending = RELICS.filter((r) => r.ruleBending).map((r) => r.id)
    expect(bending.length).toBeGreaterThan(RULE_BENDING_CHOICES)
    for (let seed = 1; seed <= 12; seed++) {
      const { run, node } = standingBefore(newRun('rationalist', seed), 'boss')
      const reward = winFight(chooseNode(run, node.id)).reward
      expect(reward?.relicChoices.length).toBe(1 + RULE_BENDING_CHOICES)
      expect(reward?.relicChoices.filter((id) => bending.includes(id)), `seed ${seed}`).toHaveLength(RULE_BENDING_CHOICES)
      const { run: before, node: elite } = standingBefore(newRun('rationalist', seed), 'elite')
      expect(winFight(chooseNode(before, elite.id)).reward?.relicChoices.some((id) => bending.includes(id))).toBe(false)
      const { run: shopRun, node: shop } = standingBefore(newRun('rationalist', seed), 'shop')
      expect(chooseNode({ ...shopRun, gold: 999 }, shop.id).shop?.relics.some((r) => bending.includes(r.relicId))).toBe(false)
    }
  })

  it('Sundial: more Focus on turns it attacks, less on turns it does not', () => {
    const deck = Array.from({ length: 12 }, (_, i) => card('observation', i + 1))
    const dial = createBattle({ enemyId: 'sunk_cost', deck, resolve: 60, maxResolve: 60, relics: ['sundial'], school: 'skeptic', rng: 3, rigor: 0, known: false })
    expect(currentMove(dial).attack).toBeGreaterThan(0)
    expect(dial.focus).toBe(FOCUS_PER_TURN + SUNDIAL_FOCUS)
    const quiet = endTurn({ ...dial, hand: [], focus: 0 })
    expect(currentMove(quiet).attack).toBeUndefined()
    expect(quiet.focus).toBe(FOCUS_PER_TURN - SUNDIAL_FOCUS)
    expect(dial.hand).toHaveLength(HAND_SIZE)
    const books = createBattle({ enemyId: 'sunk_cost', deck, resolve: 60, maxResolve: 60, relics: ['bookends'], school: 'skeptic', rng: 3, rigor: 0, known: false })
    expect(books.hand).toHaveLength(HAND_SIZE - BOOKENDS_DRAW)
  })

  it('Bookends: the first card is a Conclusion too, and its text is the rule the preview applies', () => {
    const battle = { ...battleWith({ hand: ['observation', 'therefore', 'observation'], school: 'skeptic', relics: ['bookends'] }), focus: 3 }
    const steps = previewArgument([100, 101, 102].reduce((b, uid) => playCard(b, uid), battle)).steps
    expect(steps.map((s) => s.conclusion)).toEqual([true, false, true])
    expect(steps[0].times).toBe(2)
    expect(steps[0].notes).toContain('Bookend Conclusion: counts twice')
    const one = previewArgument(playCard(battle, 100)).steps
    expect(one.map((s) => s.conclusion)).toEqual([true])
  })

  it('Still Water: Unsettle stops halving, and every enemy starts with Guard', () => {
    const start = createBattle({ enemyId: 'sunk_cost', deck: [], resolve: 60, maxResolve: 99, relics: ['still_water'], school: 'skeptic', rng: 1, rigor: 0, known: false })
    expect(start.enemy.guard).toBe(STILL_WATER_GUARD)
    const after = endTurn({ ...start, hand: [], focus: 0, enemy: { ...start.enemy, unsettle: 6 } })
    expect(after.enemy.unsettle).toBe(6)
    const plain = endTurn({ ...start, relics: [], hand: [], focus: 0, enemy: { ...start.enemy, unsettle: 6 } })
    expect(plain.enemy.unsettle).toBe(3)
  })
})

describe('offered cards say what they fit, computed from the card data', () => {
  const run = (school: School, extra: string[] = [], relics: RunState['relics'] = []): RunState => {
    const fresh = newRun(school, 1)
    return { ...fresh, deck: [...fresh.deck, ...extra.map((id, i) => card(id, 900 + i))], relics }
  }

  it('names the card you own that it feeds, or that feeds it', () => {
    expect(fitsLabel('burden_of_proof', run('rationalist', ['cash_value']))).toBe('Fits your Cash Value')
    expect(fitsLabel('cash_value', run('rationalist', ['burden_of_proof']))).toBe('Fits your Burden of Proof')
    expect(fitsLabel('amor_fati', run('rationalist', ['uphill_again']))).toBe('Fits your Uphill Again')
    expect(fitsLabel('radical_doubt', run('rationalist', ['socratic_method']))).toBe('Fits your Socratic Method')
  })

  it('a starting card is never the partner, since it fits everything', () => {
    expect(fitsLabel('corroboration', run('rationalist'))).toBeNull()
    expect(fitsLabel('statistic', run('rationalist'))).toBeNull()
  })

  it('falls back to a relic, then to the school’s passive', () => {
    expect(fitsLabel('concede', run('rationalist', [], ['marginalia']))).toBe('Fits your Marginalia')
    expect(fitsLabel('uphill_again', run('absurdist'))).toBe('Fits your Absurdist Doubts')
    expect(fitsLabel('corroboration', run('empiricist'))).toBe('Fits your Empiricist Evidence')
    expect(fitsLabel('statistic', run('empiricist'))).toBeNull()
    expect(fitsLabel('burden_of_proof', run('pragmatist'))).toBe('Fits your Pragmatist Guard')
    expect(fitsLabel('doubt', run('absurdist'))).toBeNull()
  })
})

describe('a philosophical problem’s card offers keep to your build', () => {
  it(`at least ${BOSS_SCHOOL_SLOTS} of its cards are your school’s or fit what you own`, () => {
    for (const school of SCHOOLS) {
      for (let seed = 1; seed <= 10; seed++) {
        let run = newRun(school.id, seed)
        for (let floor = 1; floor <= 2; floor++) {
          const { run: ready, node } = standingBefore(run, 'boss')
          const won = winFight(chooseNode(ready, node.id))
          const cards = won.reward?.cardChoices ?? []
          expect(cards.length).toBeGreaterThanOrEqual(3)
          expect(cards.filter((id) => inOrNearSchool(won, id)).length, `${school.id} seed ${seed} floor ${floor}: ${cards}`).toBeGreaterThanOrEqual(BOSS_SCHOOL_SLOTS)
          run = leaveReward(skipCards(takeRelic(won, won.reward?.relicChoices[0] as never)))
        }
      }
    }
  })
})

describe('you choose which of the floor’s two problems to face', () => {
  it('chooseNode at the boss takes either problem, keeps the choice on the map, and ignores anything else', () => {
    const { run, node } = standingBefore(newRun('skeptic', 41), 'boss')
    const [a, b] = bossOptions(run)
    expect([a, b].sort()).toEqual(['problem_of_induction', 'zenos_arrow'])
    for (const choice of [a, b]) {
      const fight = chooseNode(run, node.id, choice)
      expect(fight.battle?.enemy.id).toBe(choice)
      expect(fight.map.find((n) => n.id === node.id)?.enemyId).toBe(choice)
    }
    expect(chooseNode(run, node.id, 'sunk_cost').battle?.enemy.id).toBe(node.enemyId)
    const first = availableNodes(newRun('skeptic', 41))[0]
    expect(chooseNode(newRun('skeptic', 41), first.id, 'zenos_arrow').battle?.enemy.id).toBe(first.enemyId)
  })

  it('the problem that ends a Short walk holds nothing back, by the stated amounts; the Long walk’s does not', () => {
    const shortRun = newRun('skeptic', 41, 'gentle', [], undefined, 'short')
    const short = standingBefore({ ...shortRun, map: shortRun.map.map((n) => (n.type === 'boss' ? { ...n, options: ['problem_of_induction', 'zenos_arrow'] } : n)) }, 'boss')
    const long = standingBefore(newRun('skeptic', 41), 'boss')
    const def = getEnemyDef('zenos_arrow')
    expect(holdsNothingBack(short.run, def.id)).toBe(true)
    expect(holdsNothingBack(long.run, def.id)).toBe(false)
    const shortFight = chooseNode(short.run, short.node.id, def.id).battle as BattleState
    const longFight = chooseNode(long.run, long.node.id, def.id).battle as BattleState
    expect(shortFight.enemy.strength - longFight.enemy.strength).toBe(SHORT_WALK_BOSS.attack)
    expect(shortFight.enemy.maxHealth).toBe(Math.round(def.health * SHORT_WALK_BOSS.health))
    expect(longFight.enemy.maxHealth).toBe(def.health)
  })
})

describe('the argument of the walk', () => {
  it('the run keeps its best round and whom it was against, and the text is built from that round', () => {
    let run = newRun('empiricist', 5)
    run = chooseNode(run, availableNodes(run)[0].id)
    run = battleAction(run, (b) => playCard(b, b.hand[0].uid))
    const enemyId = run.battle?.enemy.id
    run = battleAction(run, endTurn)
    const best = run.bestArgument
    expect(best?.enemyId).toBe(enemyId)
    expect(best?.round.damage).toBe(run.stats.best)
    const text = walkArgumentText(run) as string
    expect(text).toContain(`against ${getEnemyDef(enemyId as string).name}`)
    expect(text).toContain(`Weight ${best?.round.weight} × Multiplier ${best?.round.multiplier} = ${best?.round.product}`)
    expect(text.split('\n').at(-1)).toBe(`${best?.round.damage} damage`)
    for (const step of best?.round.steps ?? []) expect(text).toContain(stepWords(step))
    expect(walkArgumentText(newRun('empiricist', 5))).toBeNull()
  })

  it('a Conclusion reads as a product', () => {
    expect(stepWords({ uid: 1, name: 'Observation', type: 'evidence', weight: 12, multiplier: 0, guard: 0, unsettle: 0, conclusion: true, times: 3, notes: [] })).toBe(
      'Observation (Conclusion ×3: 12 Weight)',
    )
  })
})

describe('saved runs from version 7', () => {
  it('a version 7 save, mid-battle with a played card and a last round, gets a Shaken bank and plays on', () => {
    const saved = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/run-v7.json'), 'utf8'))
    expect(saved.version).toBe(7)
    expect(saved.state.run.battle.lastRound.spill).toBe(0)
    const run = migrateRun(saved.state.run, saved.version) as RunState
    expect(run.version).toBe(RUN_VERSION)
    expect(run.bestArgument).toBeNull()
    expect(run.battle?.enemy.shaken).toBe(0)
    expect(run.battle?.undo.every((core) => core.enemy.shaken === 0)).toBe(true)
    expect(run.battle?.lastRound).toBeNull()
    expect(run.battle?.played).toEqual(saved.state.run.battle.played)
    let next = battleAction(run, endTurn)
    expect(next.battle?.lastRound?.released).toBe(0)
    for (let i = 0; i < 60 && next.screen === 'battle'; i++) next = battleAction(next, endTurn)
    expect(['reward', 'defeat']).toContain(next.screen)
  })
})
