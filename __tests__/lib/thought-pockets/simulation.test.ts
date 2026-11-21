import { describe, expect, it } from 'vitest'
import { createBattle, MAX_TURNS } from '@/lib/games/thought-pockets/engine/battle'
import { ENEMIES } from '@/lib/games/thought-pockets/data/enemies'
import { SCHOOLS } from '@/lib/games/thought-pockets/data/schools'
import { CARDS } from '@/lib/games/thought-pockets/data/cards'
import { RELICS } from '@/lib/games/thought-pockets/data/relics'
import { Mode, School } from '@/types/thought-pockets'
import { AWARE_HABITS, BotConfig, HABITS, RunRecord, careful, firstTimer, leftToRight, planning, playRun, uiDriver } from './bots'

// Seeded, so the numbers are exact for a given RUNS. Set TP_SIM_RUNS for a fuller report.
const RUNS = Number(process.env.TP_SIM_RUNS ?? 40)
const SIM_TIMEOUT = 600_000

const CONFIGS: Record<string, BotConfig> = {
  naive: { turn: leftToRight, draft: 'first', habits: 'naive' },
  'first-timer': { turn: firstTimer, draft: 'first', habits: 'casual' },
  careful: { turn: careful, draft: 'first', habits: 'casual' },
  'old-ui-driver': { turn: uiDriver, draft: 'first', habits: 'casual' },
  planner: { turn: planning, draft: 'archetype', habits: 'careful' },
  'planner-skip-all': { turn: planning, draft: 'skip', habits: 'careful' },
}

function pct(n: number, d: number): string {
  return d === 0 ? '-' : `${Math.round((100 * n) / d)}%`
}

function avg(values: number[]): string {
  return values.length === 0 ? '-' : (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
}

function runMany(school: School, config: BotConfig, mode: Mode): RunRecord[] {
  return Array.from({ length: RUNS }, (_, i) => playRun(school, 1000 + i, config, undefined, mode))
}

const RIGOROUS = ['first-timer', 'careful', 'planner', 'planner-skip-all']

describe('simulation', () => {
  const results = new Map<string, RunRecord[]>()
  for (const school of SCHOOLS) {
    for (const [name, config] of Object.entries(CONFIGS)) {
      results.set(`${school.id}/${name}`, runMany(school.id, config, 'gentle'))
      if (RIGOROUS.includes(name)) results.set(`${school.id}/${name} rigorous`, runMany(school.id, config, 'rigorous'))
    }
  }

  it('reports school x policy outcomes and pacing', { timeout: SIM_TIMEOUT }, () => {
    const lines = ['school/policy | win | reach floor 2 | avg turns per fight | turns n/e/b | full-health fights | top killer']
    for (const [key, runs] of results) {
      const fights = runs.flatMap((r) => r.fights)
      const byTier = (tier: string) => avg(fights.filter((f) => f.tier === tier && f.won).map((f) => f.turns))
      const killers = new Map<string, number>()
      runs.forEach((r) => r.defeatedBy && killers.set(r.defeatedBy, (killers.get(r.defeatedBy) ?? 0) + 1))
      const top = [...killers.entries()].sort((a, b) => b[1] - a[1])[0]
      lines.push(
        `${key} | ${pct(runs.filter((r) => r.won).length, runs.length)} | ${pct(runs.filter((r) => r.won || r.floor > 1).length, runs.length)} | ${avg(fights.map((f) => f.turns))} | ${byTier('normal')}/${byTier('elite')}/${byTier('boss')} | ${pct(fights.filter((f) => f.fullHealth).length, fights.length)} | ${top ? `${top[0]} (${top[1]})` : '-'}`,
      )
    }
    console.log(lines.join('\n'))
    const all = [...results.values()].flat()
    expect(all.some((r) => r.hitTurnCap)).toBe(false)
  })

  const rate = (keys: string[], test: (r: RunRecord) => boolean) => {
    const runs = keys.flatMap((key) => results.get(key) ?? [])
    return runs.filter(test).length / runs.length
  }
  const won = (r: RunRecord) => r.won
  const reachedFloorTwo = (r: RunRecord) => r.won || r.floor > 1
  const easy = SCHOOLS.filter((s) => s.difficulty === 'Easy')

  it('lets a newcomer on an Easy school win often and almost always see floor 2', { timeout: SIM_TIMEOUT }, () => {
    expect(easy.length).toBeGreaterThan(0)
    for (const school of easy) {
      expect(rate([`${school.id}/first-timer`], won), `${school.id} first-timer wins`).toBeGreaterThanOrEqual(0.5)
      expect(rate([`${school.id}/first-timer`], reachedFloorTwo), `${school.id} first-timer reaches floor 2`).toBeGreaterThanOrEqual(0.85)
      expect(rate([`${school.id}/careful`], won), `${school.id} careful wins`).toBeGreaterThanOrEqual(0.75)
    }
  })

  it('keeps choices mattering: careful play and planning beat playing left to right by a wide margin', { timeout: SIM_TIMEOUT }, () => {
    const all = (policy: string) => SCHOOLS.map((s) => `${s.id}/${policy}`)
    console.log(
      `win rates: naive ${pct(rate(all('naive'), won) * 100, 100)}, first-timer ${pct(rate(all('first-timer'), won) * 100, 100)}, careful ${pct(rate(all('careful'), won) * 100, 100)}, planner ${pct(rate(all('planner'), won) * 100, 100)}`,
    )
    expect(rate(all('careful'), won) - rate(all('naive'), won)).toBeGreaterThan(0.3)
    expect(rate(all('planner'), won) - rate(all('naive'), won)).toBeGreaterThan(0.3)
  })

  it('rigorous mode is a real test: planning beats careful play, which beats a newcomer', { timeout: SIM_TIMEOUT }, () => {
    const all = (policy: string) => SCHOOLS.map((s) => `${s.id}/${policy} rigorous`)
    const [newcomer, steady, planned] = ['first-timer', 'careful', 'planner'].map((p) => rate(all(p), won))
    console.log(`rigorous win rates: first-timer ${pct(newcomer * 100, 100)}, careful ${pct(steady * 100, 100)}, planner ${pct(planned * 100, 100)}`)
    expect(planned).toBeLessThan(0.95)
    expect(planned - steady).toBeGreaterThan(0.1)
    expect(steady - newcomer).toBeGreaterThan(0.3)
  })

  it('card rewards are worth taking: drafting beats skipping every card for every school', { timeout: SIM_TIMEOUT }, () => {
    for (const school of SCHOOLS) {
      const drafted = rate([`${school.id}/planner rigorous`], won)
      const skipped = rate([`${school.id}/planner-skip-all rigorous`], won)
      expect(drafted, `${school.id}: drafted ${drafted} vs skipped ${skipped}`).toBeGreaterThan(skipped)
    }
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

  it('reports, per enemy, what reading its rule is worth over the best rule-blind habit', { timeout: SIM_TIMEOUT }, () => {
    const policies = [...HABITS, ...AWARE_HABITS]
    const deck = (floor: number) => {
      const extra = floor === 1 ? [] : floor === 2 ? ['statistic', 'modus_ponens', 'burden_of_proof'] : ['statistic', 'modus_ponens', 'burden_of_proof', 'field_study', 'syllogism']
      return [...SCHOOLS[0].deck, ...extra].map((cardId, i) => ({ uid: i + 1, cardId, upgraded: false }))
    }
    const lines = ['enemy | ' + policies.map(([n]) => n).join(' | ') + ' | best blind | best aware | reading the rule saves (Resolve per fight)']
    const savings: number[] = []
    for (const enemy of ENEMIES) {
      const costs = policies.map(([, policy]) => {
        const losses: number[] = []
        for (let seed = 0; seed < 12; seed++) {
          let battle = createBattle({ enemyId: enemy.id, deck: deck(enemy.floor), resolve: 60, maxResolve: 60, relics: [], school: 'empiricist', rng: seed + 1, mode: 'gentle', known: false })
          while (battle.outcome === 'ongoing' && battle.turn <= MAX_TURNS) battle = policy(battle)
          losses.push(battle.outcome === 'won' ? 60 - battle.player.resolve : 80)
        }
        return losses.reduce((a, b) => a + b, 0) / losses.length
      })
      const blind = costs.slice(0, HABITS.length)
      const aware = costs.slice(HABITS.length)
      const blindIndex = blind.indexOf(Math.min(...blind))
      const awareIndex = aware.indexOf(Math.min(...aware))
      const saved = blind[blindIndex] - aware[awareIndex]
      savings.push(saved)
      lines.push(`${enemy.id} | ${costs.map((c) => c.toFixed(1)).join(' | ')} | ${HABITS[blindIndex][0]} | ${AWARE_HABITS[awareIndex][0]} | ${saved.toFixed(1)}`)
    }
    console.log(lines.join('\n'))
    expect(savings.filter((s) => s > 0).length).toBeGreaterThan(ENEMIES.length / 2)
  })

})
