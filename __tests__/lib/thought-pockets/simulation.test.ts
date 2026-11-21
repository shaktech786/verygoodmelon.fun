import { describe, expect, it } from 'vitest'
import { createBattle, MAX_TURNS } from '@/lib/games/thought-pockets/engine/battle'
import { ENEMIES } from '@/lib/games/thought-pockets/data/enemies'
import { SCHOOLS } from '@/lib/games/thought-pockets/data/schools'
import { CARDS } from '@/lib/games/thought-pockets/data/cards'
import { RELICS } from '@/lib/games/thought-pockets/data/relics'
import { School } from '@/types/thought-pockets'
import { BotConfig, HABITS, RunRecord, leftToRight, planning, playRun } from './bots'

// Set TP_SIM_RUNS for a fuller report; the default keeps the suite quick.
const RUNS = Number(process.env.TP_SIM_RUNS ?? 16)
const SIM_TIMEOUT = 600_000

const CONFIGS: Record<string, BotConfig> = {
  naive: { turn: leftToRight, draft: 'first', careful: false },
  planner: { turn: planning, draft: 'archetype', careful: true },
  'planner-skip-all': { turn: planning, draft: 'skip', careful: true },
}

function pct(n: number, d: number): string {
  return d === 0 ? '-' : `${Math.round((100 * n) / d)}%`
}

function avg(values: number[]): string {
  return values.length === 0 ? '-' : (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
}

function runMany(school: School, config: BotConfig): RunRecord[] {
  return Array.from({ length: RUNS }, (_, i) => playRun(school, 1000 + i, config))
}

describe('simulation', () => {
  const results = new Map<string, RunRecord[]>()
  for (const school of SCHOOLS) {
    for (const [name, config] of Object.entries(CONFIGS)) results.set(`${school.id}/${name}`, runMany(school.id, config))
  }

  it('reports school x policy outcomes and pacing', { timeout: SIM_TIMEOUT }, () => {
    const lines = ['school/policy | win | avg nodes | turns n/e/b | full-health fights | died on floor 1 | top killer']
    for (const [key, runs] of results) {
      const fights = runs.flatMap((r) => r.fights)
      const byTier = (tier: string) => avg(fights.filter((f) => f.tier === tier && f.won).map((f) => f.turns))
      const killers = new Map<string, number>()
      runs.forEach((r) => r.defeatedBy && killers.set(r.defeatedBy, (killers.get(r.defeatedBy) ?? 0) + 1))
      const top = [...killers.entries()].sort((a, b) => b[1] - a[1])[0]
      lines.push(
        `${key} | ${pct(runs.filter((r) => r.won).length, runs.length)} | ${avg(runs.map((r) => r.nodes))} | ${byTier('normal')}/${byTier('elite')}/${byTier('boss')} | ${pct(fights.filter((f) => f.fullHealth).length, fights.length)} | ${pct(runs.filter((r) => !r.won && r.floor === 1).length, runs.length)} | ${top ? `${top[0]} (${top[1]})` : '-'}`,
      )
    }
    console.log(lines.join('\n'))
    const all = [...results.values()].flat()
    expect(all.some((r) => r.hitTurnCap)).toBe(false)
  })

  it('planning beats playing left to right by a wide margin', { timeout: SIM_TIMEOUT }, () => {
    const rate = (policy: string) => {
      const runs = SCHOOLS.flatMap((s) => results.get(`${s.id}/${policy}`) ?? [])
      return runs.filter((r) => r.won).length / runs.length
    }
    const naiveFloorOne = SCHOOLS.flatMap((s) => results.get(`${s.id}/naive`) ?? [])
    console.log(`decision gap: planner ${pct(rate('planner') * 100, 100)} vs naive ${pct(rate('naive') * 100, 100)}; naive clears floor 1 in ${pct(naiveFloorOne.filter((r) => r.floor > 1 || r.won).length, naiveFloorOne.length)}`)
    expect(rate('planner') - rate('naive')).toBeGreaterThan(0.3)
    expect(naiveFloorOne.some((r) => r.floor > 1 || r.won)).toBe(true)
  })

  it('reports card and relic correlation with winning', { timeout: SIM_TIMEOUT }, () => {
    const runs = SCHOOLS.flatMap((s) => results.get(`${s.id}/planner`) ?? [])
    const base = runs.filter((r) => r.won).length / runs.length
    const lines = [`baseline planner win ${pct(base * 100, 100)}`]
    for (const card of CARDS.filter((c) => c.rarity !== 'starter' && c.rarity !== 'doubt')) {
      const withCard = runs.filter((r) => r.deck.includes(card.id))
      if (withCard.length === 0) {
        lines.push(`${card.id}: never taken`)
        continue
      }
      lines.push(`${card.id}: in ${withCard.length} decks, win ${pct(withCard.filter((r) => r.won).length, withCard.length)}`)
    }
    for (const relic of RELICS) {
      const withRelic = runs.filter((r) => r.relics.includes(relic.id))
      lines.push(`relic ${relic.id}: in ${withRelic.length} runs, win ${pct(withRelic.filter((r) => r.won).length, withRelic.length)}`)
    }
    console.log(lines.join('\n'))
    expect(runs.length).toBeGreaterThan(0)
  })

  it('reports which rule-blind habit is best against each enemy', { timeout: SIM_TIMEOUT }, () => {
    const policies = HABITS
    const deck = (floor: number) => {
      const extra = floor === 1 ? [] : floor === 2 ? ['statistic', 'modus_ponens', 'burden_of_proof'] : ['statistic', 'modus_ponens', 'burden_of_proof', 'field_study', 'syllogism']
      return [...SCHOOLS[0].deck, ...extra].map((cardId, i) => ({ uid: i + 1, cardId, upgraded: false }))
    }
    const lines = ['enemy | ' + policies.map(([n]) => `${n} lost`).join(' | ') + ' | best']
    const bests = new Set<string>()
    for (const enemy of ENEMIES) {
      const costs = policies.map(([, policy]) => {
        const losses: number[] = []
        for (let seed = 0; seed < 12; seed++) {
          let battle = createBattle({ enemyId: enemy.id, deck: deck(enemy.floor), resolve: 60, maxResolve: 60, relics: [], school: 'empiricist', rng: seed + 1 })
          while (battle.outcome === 'ongoing' && battle.turn <= MAX_TURNS) battle = policy(battle)
          losses.push(battle.outcome === 'won' ? 60 - battle.player.resolve : 80)
        }
        return losses.reduce((a, b) => a + b, 0) / losses.length
      })
      const bestIndex = costs.indexOf(Math.min(...costs))
      bests.add(policies[bestIndex][0])
      lines.push(`${enemy.id} | ${costs.map((c) => c.toFixed(1)).join(' | ')} | ${policies[bestIndex][0]}`)
    }
    console.log(lines.join('\n'))
    expect(bests.size).toBeGreaterThan(1)
  })
})
