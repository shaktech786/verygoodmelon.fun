import { describe, expect, it } from 'vitest'
import { createBattle } from '@/lib/games/thought-pockets/engine/battle'
import { ENEMIES, OPENERS, SHORT_WALK_GUESTS, SHORT_WALK_PROBLEMS } from '@/lib/games/thought-pockets/data/enemies'
import { DIFFICULTY_BANDS, SCHOOLS, schoolDifficulty } from '@/lib/games/thought-pockets/data/schools'
import { CARDS } from '@/lib/games/thought-pockets/data/cards'
import { RELICS } from '@/lib/games/thought-pockets/data/relics'
import { MAX_RIGOR } from '@/lib/games/thought-pockets/data/pace'
import { Difficulty, Mode, RunLength, School } from '@/types/thought-pockets'
import { AWARE_HABITS, BotConfig, HABITS, RunRecord, careful, firstTimer, leftToRight, newcomer, planning, playRun, uiDriver } from './bots'

// Seeded, so the numbers are exact for a given RUNS. Set TP_SIM_RUNS for a fuller report.
const RUNS = Number(process.env.TP_SIM_RUNS ?? 100)
const SIM_TIMEOUT = 600_000
const LONGEST_FIGHT = 25

// The planners stand for players past the first-fight hints, so their walks open with a fight the seed draws.
const CONFIGS: Record<string, BotConfig> = {
  naive: { turn: leftToRight, draft: 'first', habits: 'naive' },
  newcomer: { turn: newcomer, draft: 'first', habits: 'newcomer' },
  'first-timer': { turn: firstTimer, draft: 'first', habits: 'casual' },
  careful: { turn: careful, draft: 'first', habits: 'casual' },
  'old-ui-driver': { turn: uiDriver, draft: 'first', habits: 'casual' },
  planner: { turn: planning, draft: 'archetype', habits: 'careful', teach: false },
  'planner-skip-all': { turn: planning, draft: 'skip', habits: 'careful', teach: false },
}
/** The reviewers' blowout: an Empiricist who plans every turn and holds Bookends from the start. */
const BOOKENDS_EXPERT: BotConfig = { ...CONFIGS.planner, startRelics: ['bookends'] }
/** A newcomer past the first fight's hints, on a Short walk that opens with a drawn fight. */
const DRAWN_NEWCOMER: BotConfig = { ...CONFIGS.newcomer, teach: false }
/**
 * Gentle should still resist an expert: a planning deck takes at least this many turns over the Long walk. It was 27 while a
 * Gentle bias's halfway mark threw away what it stopped; now that the stopped damage comes back as Unsettle a turn later,
 * an Empiricist planner's median is 25.5 (26 with Bookends), and every bias still takes it at least two rounds.
 */
const EXPERT_LONG_WALK_TURNS = 25
/** Labels are checked at every Rigorous level with this many runs per school and policy. */
const LEVEL_RUNS = Math.max(20, Math.round(RUNS / 2))

function pct(n: number, d: number): string {
  return d === 0 ? '-' : `${Math.round((100 * n) / d)}%`
}

function avg(values: number[]): string {
  return values.length === 0 ? '-' : (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function runMany(school: School, config: BotConfig, mode: Mode, rigor?: number, length: RunLength = 'long', count = RUNS): RunRecord[] {
  return Array.from({ length: count }, (_, i) => playRun(school, 1000 + i, config, undefined, mode, rigor, length))
}

const RIGOROUS = ['naive', 'first-timer', 'careful', 'planner', 'planner-skip-all']
const SHORT = ['newcomer', 'first-timer', 'careful', 'planner']
/** The site's rule is a game finished in under ten minutes; a newcomer's Short walk is counted in turns of about 25 seconds. */
const SHORT_WALK_TURNS = 25
const DIFFICULTY_ORDER: Difficulty[] = ['Easy', 'Medium', 'Hard']
/** The top of the ladder before levels 6 and 7 were added, kept in the report for comparison. */
const OLD_TOP = 5
/** How far a measured win rate may sit outside its label's band before the label is called wrong. */
const BAND_SLACK = 0.05

/** The card a deck added most often beyond its starting cards; ties go to the rarer card. */
function signatureCard(deck: string[], starting: string[]): string | null {
  const added = [...deck]
  for (const id of starting) {
    const i = added.indexOf(id)
    if (i >= 0) added.splice(i, 1)
  }
  const rank = { rare: 3, uncommon: 2, common: 1, starter: 0, doubt: -1 }
  const counts = new Map<string, number>()
  added.filter((id) => id !== 'doubt').forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1))
  const rarity = (id: string) => rank[CARDS.find((c) => c.id === id)?.rarity ?? 'doubt']
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || rarity(b[0]) - rarity(a[0]) || a[0].localeCompare(b[0]))[0]?.[0] ?? null
}

describe('simulation', () => {
  const results = new Map<string, RunRecord[]>()
  for (const school of SCHOOLS) {
    for (const [name, config] of Object.entries(CONFIGS)) {
      results.set(`${school.id}/${name}`, runMany(school.id, config, 'gentle'))
      if (SHORT.includes(name)) results.set(`${school.id}/${name} short`, runMany(school.id, config, 'gentle', undefined, 'short'))
      if (RIGOROUS.includes(name)) {
        results.set(`${school.id}/${name} rigorous`, runMany(school.id, config, 'rigorous'))
        results.set(`${school.id}/${name} rigorous ${MAX_RIGOR}`, runMany(school.id, config, 'rigorous', MAX_RIGOR))
        if (name === 'planner') results.set(`${school.id}/${name} rigorous ${OLD_TOP}`, runMany(school.id, config, 'rigorous', OLD_TOP))
      }
    }
    results.set(`${school.id}/newcomer drawn short`, runMany(school.id, DRAWN_NEWCOMER, 'gentle', undefined, 'short'))
    for (let level = 1; level <= MAX_RIGOR; level++) {
      for (const name of ['careful', 'planner']) results.set(`${school.id}/${name} level ${level}`, runMany(school.id, CONFIGS[name], 'rigorous', level, 'long', LEVEL_RUNS))
    }
  }
  results.set('empiricist/planner bookends', runMany('empiricist', BOOKENDS_EXPERT, 'gentle'))

  it('reports school x policy outcomes and pacing', { timeout: SIM_TIMEOUT }, () => {
    const lines = ['school/policy | win | reach floor 2 | avg turns per fight | median turns per fight | median run turns | turns n/e/b | median boss turns | full-health fights | gold left | top killer']
    for (const [key, runs] of results) {
      const fights = runs.flatMap((r) => r.fights)
      const byTier = (tier: string) => avg(fights.filter((f) => f.tier === tier && f.won).map((f) => f.turns))
      const killers = new Map<string, number>()
      runs.forEach((r) => r.defeatedBy && killers.set(r.defeatedBy, (killers.get(r.defeatedBy) ?? 0) + 1))
      const top = [...killers.entries()].sort((a, b) => b[1] - a[1])[0]
      lines.push(
        `${key} | ${pct(runs.filter((r) => r.won).length, runs.length)} | ${pct(runs.filter((r) => r.won || r.floor > 1).length, runs.length)} | ${avg(fights.map((f) => f.turns))} | ${median(fights.map((f) => f.turns))} | ${median(runs.map((r) => r.turns))} | ${byTier('normal')}/${byTier('elite')}/${byTier('boss')} | ${median(fights.filter((f) => f.tier === 'boss' && f.won).map((f) => f.turns))} | ${pct(fights.filter((f) => f.fullHealth).length, fights.length)} | ${avg(runs.map((r) => r.goldLeft))} | ${top ? `${top[0]} (${top[1]})` : '-'}`,
      )
    }
    for (const [key, runs] of results) {
      if (!key.endsWith(' short')) continue
      const left = runs.filter(won).map((r) => r.resolveLeft)
      lines.push(`${key}: Resolve left when won median ${median(left)}, lowest ${Math.min(...left)}`)
    }
    console.log(lines.join('\n'))
    const all = [...results.values()].flat()
    expect(Math.max(...all.map((r) => r.longestFight)), 'no fight drags on: a long one tires the bias out').toBeLessThanOrEqual(LONGEST_FIGHT)
  })

  const rate = (keys: string[], test: (r: RunRecord) => boolean) => {
    const runs = keys.flatMap((key) => results.get(key) ?? [])
    return runs.filter(test).length / runs.length
  }
  const won = (r: RunRecord) => r.won
  const reachedFloorTwo = (r: RunRecord) => r.won || r.floor > 1
  const easy = SCHOOLS.filter((s) => s.difficulty.gentle === 'Easy')

  it('lets a newcomer on an Easy school win often and almost always see floor 2', { timeout: SIM_TIMEOUT }, () => {
    expect(easy.length).toBeGreaterThan(0)
    for (const school of easy) {
      expect(rate([`${school.id}/first-timer`], won), `${school.id} first-timer wins`).toBeGreaterThanOrEqual(0.5)
      expect(rate([`${school.id}/first-timer`], reachedFloorTwo), `${school.id} first-timer reaches floor 2`).toBeGreaterThanOrEqual(0.85)
      expect(rate([`${school.id}/careful`], won), `${school.id} careful wins`).toBeGreaterThanOrEqual(0.75)
    }
  })

  // Gentle forgives playing left to right (a rest before every problem, Reconsider at half Resolve), so there the gap shows in wins and in time; in Rigorous it must stay wide.
  it('keeps choices mattering: careful play wins more, in far fewer turns, and in Rigorous by a wide margin', { timeout: SIM_TIMEOUT }, () => {
    const all = (policy: string) => SCHOOLS.map((s) => `${s.id}/${policy}`)
    const turns = (policy: string) => median(all(policy).flatMap((key) => results.get(key) ?? []).map((r) => r.turns))
    console.log(
      `win rates: naive ${pct(rate(all('naive'), won) * 100, 100)}, first-timer ${pct(rate(all('first-timer'), won) * 100, 100)}, careful ${pct(rate(all('careful'), won) * 100, 100)}, planner ${pct(rate(all('planner'), won) * 100, 100)}; median run turns naive ${turns('naive')}, careful ${turns('careful')}; Rigorous naive ${pct(rate(all('naive rigorous'), won) * 100, 100)}, careful ${pct(rate(all('careful rigorous'), won) * 100, 100)}`,
    )
    expect(rate(all('careful'), won) - rate(all('naive'), won)).toBeGreaterThan(0.1)
    expect(rate(all('planner'), won) - rate(all('naive'), won)).toBeGreaterThan(0.1)
    // 1.25, down from 1.3: a first walk's second fight is now the Unsettle lesson (28 Resolve, no halfway mark), which a left-to-right
    // route meets far more often than a careful one, so the naive route got about a turn shorter (45 against careful's 35).
    expect(turns('naive')).toBeGreaterThanOrEqual(1.25 * turns('careful'))
    expect(rate(all('careful rigorous'), won) - rate(all('naive rigorous'), won)).toBeGreaterThan(0.3)
  })

  it('rigorous mode is a real test: planning beats careful play, which beats a newcomer', { timeout: SIM_TIMEOUT }, () => {
    const all = (policy: string) => SCHOOLS.map((s) => `${s.id}/${policy} rigorous`)
    const [newcomer, steady, planned] = ['first-timer', 'careful', 'planner'].map((p) => rate(all(p), won))
    const top = (policy: string) => rate(SCHOOLS.map((s) => `${s.id}/${policy} rigorous ${MAX_RIGOR}`), won)
    console.log(`rigorous win rates: first-timer ${pct(newcomer * 100, 100)}, careful ${pct(steady * 100, 100)}, planner ${pct(planned * 100, 100)}; at level ${MAX_RIGOR}: careful ${pct(top('careful') * 100, 100)}, planner ${pct(top('planner') * 100, 100)}`)
    expect(planned).toBeLessThan(0.95)
    expect(planned - steady).toBeGreaterThan(0.1)
    expect(steady - newcomer).toBeGreaterThan(0.3)
  })

  it('careful play wins at least half the default Rigorous runs, and no single opponent ends more than a fifth of them', { timeout: SIM_TIMEOUT }, () => {
    const runs = SCHOOLS.flatMap((s) => results.get(`${s.id}/careful rigorous`) ?? [])
    expect(runs.filter(won).length / runs.length).toBeGreaterThanOrEqual(0.5)
    for (const enemy of ENEMIES) expect(runs.filter((r) => r.defeatedBy === enemy.id).length / runs.length, enemy.id).toBeLessThanOrEqual(0.2)
  })

  it(`the top Rigorous level is genuinely hard: a planner that peeks at its next draw wins 25-50%`, { timeout: SIM_TIMEOUT }, () => {
    const top = rate(SCHOOLS.map((s) => `${s.id}/planner rigorous ${MAX_RIGOR}`), won)
    const before = rate(SCHOOLS.map((s) => `${s.id}/planner rigorous ${OLD_TOP}`), won)
    console.log(`planner at level ${OLD_TOP}: ${pct(before * 100, 100)}; at level ${MAX_RIGOR}: ${pct(top * 100, 100)}`)
    expect(top).toBeGreaterThanOrEqual(0.25)
    expect(top).toBeLessThanOrEqual(0.5)
  })

  it('philosophical problems are real fights: a planning deck needs a median of four to six turns for each, in Gentle and at the top level', { timeout: SIM_TIMEOUT }, () => {
    for (const policy of ['planner', `planner rigorous ${MAX_RIGOR}`]) {
      const fights = SCHOOLS.flatMap((s) => results.get(`${s.id}/${policy}`) ?? []).flatMap((r) => r.fights)
      for (const boss of ENEMIES.filter((e) => e.tier === 'boss')) {
        const turns = median(fights.filter((f) => f.enemyId === boss.id && f.won).map((f) => f.turns))
        expect(turns, `${policy}: ${boss.id}`).toBeGreaterThanOrEqual(4)
        expect(turns, `${policy}: ${boss.id}`).toBeLessThanOrEqual(6)
      }
    }
  })

  it(`a Short walk fits one sitting: a Gentle newcomer needs a median of at most ${SHORT_WALK_TURNS} turns and almost always finishes`, { timeout: SIM_TIMEOUT }, () => {
    for (const school of SCHOOLS) {
      for (const policy of ['newcomer', 'first-timer']) {
        const runs = results.get(`${school.id}/${policy} short`) ?? []
        expect(median(runs.map((r) => r.turns)), `${school.id} ${policy}`).toBeLessThanOrEqual(SHORT_WALK_TURNS)
        expect(rate([`${school.id}/${policy} short`], won), `${school.id} ${policy}`).toBeGreaterThanOrEqual(0.9)
        expect(runs.every((r) => r.fights.every((f) => f.floor === 1))).toBe(true)
      }
    }
  })

  it('Gentle fights keep moving for a newcomer: a median of at most 7 turns a fight, and 7 for a philosophical problem', { timeout: SIM_TIMEOUT }, () => {
    for (const school of SCHOOLS) {
      const fights = (results.get(`${school.id}/newcomer`) ?? []).flatMap((r) => r.fights)
      expect(median(fights.map((f) => f.turns)), school.id).toBeLessThanOrEqual(7)
      expect(median(fights.filter((f) => f.tier === 'boss').map((f) => f.turns)), school.id).toBeLessThanOrEqual(7)
    }
  })

  it('in Gentle each school states its difficulty, and the labels follow the win rates', { timeout: SIM_TIMEOUT }, () => {
    const rows = SCHOOLS.map((s) => ({ id: s.id, label: schoolDifficulty(s, 'gentle', 0), win: rate([`${s.id}/newcomer`, `${s.id}/first-timer`], won) }))
    console.log(`gentle difficulty: ${rows.map((r) => `${r.id} ${r.label} ${pct(r.win * 100, 100)}`).join(', ')}`)
    for (const easier of rows) {
      for (const harder of rows) {
        if (DIFFICULTY_ORDER.indexOf(easier.label) < DIFFICULTY_ORDER.indexOf(harder.label)) {
          expect(easier.win, `gentle: ${easier.id} (${easier.label}) vs ${harder.id} (${harder.label})`).toBeGreaterThan(harder.win)
        }
      }
    }
  })

  // A careful player and a planner, pooled: Easy is a walk they usually finish, Hard one they usually do not.
  it('at every Rigorous level each school is labelled by how often careful and planning players finish it', { timeout: SIM_TIMEOUT }, () => {
    const lines: string[] = []
    for (let level = 1; level <= MAX_RIGOR; level++) {
      const rows = SCHOOLS.map((s) => ({ s, win: rate([`${s.id}/careful level ${level}`, `${s.id}/planner level ${level}`], won) }))
      lines.push(`level ${level}: ${rows.map(({ s, win }) => `${s.id} ${schoolDifficulty(s, 'rigorous', level)} ${pct(win * 100, 100)}`).join(', ')}`)
      for (const { s, win } of rows) {
        const label = schoolDifficulty(s, 'rigorous', level)
        const band = DIFFICULTY_BANDS[label]
        expect(win, `${s.id} at Rigorous ${level} is labelled ${label}`).toBeGreaterThanOrEqual(band.min - BAND_SLACK)
        expect(win, `${s.id} at Rigorous ${level} is labelled ${label}`).toBeLessThan(band.max + BAND_SLACK)
      }
    }
    console.log(lines.join('\n'))
    expect(new Set(SCHOOLS.map((s) => schoolDifficulty(s, 'rigorous', 3))).size + new Set(SCHOOLS.map((s) => schoolDifficulty(s, 'rigorous', MAX_RIGOR))).size).toBeGreaterThan(2)
  })

  it(`Gentle resists an expert: a planning deck needs at least ${EXPERT_LONG_WALK_TURNS} turns for the Long walk, even an Empiricist holding Bookends`, { timeout: SIM_TIMEOUT }, () => {
    const turns = (key: string) => median((results.get(key) ?? []).map((r) => r.turns))
    console.log(`planner Gentle Long walk median turns: ${SCHOOLS.map((s) => `${s.id} ${turns(`${s.id}/planner`)}`).join(', ')}; Empiricist with Bookends ${turns('empiricist/planner bookends')}`)
    for (const school of SCHOOLS) expect(turns(`${school.id}/planner`), school.id).toBeGreaterThanOrEqual(EXPERT_LONG_WALK_TURNS)
    expect(turns('empiricist/planner bookends')).toBeGreaterThanOrEqual(EXPERT_LONG_WALK_TURNS)
    expect(rate(['empiricist/planner bookends'], won)).toBeGreaterThanOrEqual(0.95)
  })

  it('newcomers still finish Gentle walks: a first-timer wins at least 80% of Long walks and a newcomer at least 78%, for every school', { timeout: SIM_TIMEOUT }, () => {
    for (const school of SCHOOLS) {
      expect(rate([`${school.id}/first-timer`], won), `${school.id} first-timer`).toBeGreaterThanOrEqual(0.8)
      expect(rate([`${school.id}/newcomer`], won), `${school.id} newcomer`).toBeGreaterThanOrEqual(0.78)
    }
  })

  it('walks vary: every opening fight and every problem that can end a Short walk is met, and a newcomer finishes each', { timeout: SIM_TIMEOUT }, () => {
    const runs = SCHOOLS.flatMap((s) => [...(results.get(`${s.id}/newcomer drawn short`) ?? []), ...(results.get(`${s.id}/newcomer short`) ?? [])])
    const fights = runs.flatMap((r) => r.fights)
    const openers = new Set(runs.map((r) => r.fights[0]?.enemyId))
    expect([...openers].sort()).toEqual([...OPENERS].sort())
    const lines: string[] = []
    for (const id of SHORT_WALK_PROBLEMS) {
      const met = fights.filter((f) => f.enemyId === id)
      lines.push(`${id}: met ${met.length}, won ${pct(met.filter((f) => f.won).length, met.length)}, median turns ${median(met.filter((f) => f.won).map((f) => f.turns))}`)
      expect(met.length, id).toBeGreaterThan(0)
      expect(met.filter((f) => f.won).length / met.length, id).toBeGreaterThanOrEqual(id in SHORT_WALK_GUESTS ? 0.9 : 0.85)
    }
    console.log(lines.join('\n'))
    for (const school of SCHOOLS) expect(rate([`${school.id}/newcomer drawn short`], won), school.id).toBeGreaterThanOrEqual(0.9)
  })

  it('no relic is ever offered once it can no longer do anything on the walk', { timeout: SIM_TIMEOUT }, () => {
    const all = [...results.values()].flat()
    expect(all.flatMap((r) => r.deadOffers)).toEqual([])
  })

  // At the default Rigorous level a planner that peeks at its next draw wins about 95% with the starter deck alone, so the top level is where cards can show their worth.
  it('card rewards are worth taking: drafting beats skipping every card for every school at the top Rigorous level', { timeout: SIM_TIMEOUT }, () => {
    for (const school of SCHOOLS) {
      const drafted = rate([`${school.id}/planner rigorous ${MAX_RIGOR}`], won)
      const skipped = rate([`${school.id}/planner-skip-all rigorous ${MAX_RIGOR}`], won)
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

  it('reports how many turns each philosophical problem lasts', { timeout: SIM_TIMEOUT }, () => {
    const bosses = ENEMIES.filter((e) => e.tier === 'boss')
    const lines = ['policy | ' + bosses.map((b) => `${b.id} turns when won (share of its fights lost)`).join(' | ')]
    for (const policy of ['newcomer', 'first-timer', 'careful', 'planner', 'careful rigorous', `planner rigorous ${OLD_TOP}`, `planner rigorous ${MAX_RIGOR}`]) {
      const fights = SCHOOLS.flatMap((s) => results.get(`${s.id}/${policy}`) ?? []).flatMap((r) => r.fights)
      const cell = (id: string) => {
        const met = fights.filter((f) => f.enemyId === id)
        return `${avg(met.filter((f) => f.won).map((f) => f.turns))} (${pct(met.filter((f) => !f.won).length, met.length)})`
      }
      lines.push(`${policy} | ${bosses.map((b) => cell(b.id)).join(' | ')}`)
    }
    console.log(lines.join('\n'))
    expect(lines.length).toBeGreaterThan(1)
  })

  it('reports archetype diversity: the card each winning planner deck took most', { timeout: SIM_TIMEOUT }, () => {
    const lines = ['school | winning decks | distinct signature cards | most common signature (share) | decks with a rare | runs offered each school rare']
    for (const school of SCHOOLS) {
      const winners = (results.get(`${school.id}/planner`) ?? []).filter((r) => r.won)
      const signatures = winners.map((r) => signatureCard(r.deck, school.deck)).filter((id): id is string => id !== null)
      const counts = new Map<string, number>()
      signatures.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1))
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
      const withRare = winners.filter((r) => r.deck.some((id) => CARDS.find((c) => c.id === id)?.rarity === 'rare')).length
      const runs = results.get(`${school.id}/planner`) ?? []
      const rares = CARDS.filter((c) => c.rarity === 'rare' && c.school === school.id).map((c) => `${c.id} ${pct(runs.filter((r) => r.offered.includes(c.id)).length, runs.length)}`)
      lines.push(`${school.id} | ${winners.length} | ${counts.size} | ${top ? `${top[0]} (${pct(top[1], signatures.length)})` : '-'} | ${pct(withRare, winners.length)} | ${rares.join(', ')}`)
    }
    console.log(lines.join('\n'))
    expect(lines.length).toBe(SCHOOLS.length + 1)
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
        for (let seed = 0; seed < 24; seed++) {
          let battle = createBattle({ enemyId: enemy.id, deck: deck(enemy.floor), resolve: 60, maxResolve: 60, relics: [], school: 'empiricist', rng: seed + 1, rigor: 0, known: false })
          while (battle.outcome === 'ongoing') battle = policy(battle)
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
