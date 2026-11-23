import { describe, it, expect } from 'vitest'
import {
  createState, update, activateMechanic, plantClues, isGameComplete, placeInWords, cluePlaces,
} from '@/app/games/the-mutation/engine/engine'
import { ENDING, type DiscoveryEvent, type GameState, type Seed } from '@/app/games/the-mutation/engine/types'
import { discovery, hintFor } from '@/app/games/the-mutation/engine/rules'

const STEP = 1 / 60

function run(s: GameState, seconds: number, each?: (s: GameState) => void) {
  for (let t = 0; t < seconds; t += STEP) {
    each?.(s)
    update(s, STEP)
  }
}

function drain(s: GameState): DiscoveryEvent[] {
  return s.events.splice(0)
}

function types(events: DiscoveryEvent[]): string[] {
  return events.map((e) => e.type)
}

/** A player who can move, with these clues planted some way off. */
function withClues(ids: string[], ...active: string[]): GameState {
  const s = createState()
  for (const m of ['arrow_keys', ...active]) activateMechanic(s, m, {})
  s.wave = 1 + active.length
  plantClues(s, ids)
  drain(s)
  return s
}

function seedOf(s: GameState, id: string): Seed {
  const seed = s.seeds.find((z) => z.id === id)
  if (!seed) throw new Error(`no ${id} clue`)
  return seed
}

/** Walks the orb onto a clue, the way a player choosing it would. */
function goTo(s: GameState, id: string) {
  const seed = seedOf(s, id)
  s.px = seed.x - 10
  s.py = seed.y
  update(s, STEP)
}

describe('The Shapeshifter discovery', () => {
  it('the first clue is how to move, and it grows by itself after a short rest', () => {
    const s = createState()
    run(s, 3.2)
    const [planted] = drain(s)
    expect(planted.type).toBe('planted')
    expect(s.seeds.map((z) => z.id)).toEqual([expect.stringMatching(/^(arrow_keys|mouse_follow)$/)])
    run(s, 7.2)
    expect(s.activeMechanics).toHaveLength(1)
    expect(s.foundBy).toEqual(['rested'])
  })

  it('touch players are only ever offered the follow control', () => {
    const s = createState(480, 720, true)
    run(s, 3.2)
    expect(s.seeds.map((z) => z.id)).toEqual(['mouse_follow'])
  })

  it('pulsing the still orb brings the first clue sooner than waiting does', () => {
    const s = createState()
    for (let i = 0; i < 3; i++) {
      s.clickThisFrame = true
      s.mx = s.px
      s.my = s.py
      update(s, STEP)
    }
    expect(types(drain(s))).toEqual(['planted'])
  })

  it('plants the first clue close by, where the still orb can watch it, and says where it is', () => {
    const s = createState()
    plantClues(s, ['arrow_keys'])
    expect(drain(s)).toEqual([{ type: 'planted', clues: [{ id: 'arrow_keys', place: 'close to your orb' }] }])
    expect(Math.hypot(s.seeds[0].x - s.px, s.seeds[0].y - s.py)).toBeLessThan(110)
    expect(s.activeMechanics).toEqual([])
  })

  it('once the orb can move, a crossroads of clues grows, well apart and away from the orb', () => {
    const s = createState()
    activateMechanic(s, 'arrow_keys', {})
    run(s, 0.1)
    const [planted] = drain(s)
    if (planted.type !== 'planted') throw new Error('expected a crossroads')
    expect(planted.clues).toHaveLength(3)
    expect(planted.clues.map((c) => c.id)).toEqual(expect.arrayContaining(['stars', 'pulse_gems']))
    for (const seed of s.seeds) expect(Math.hypot(seed.x - s.px, seed.y - s.py)).toBeGreaterThanOrEqual(140)
    for (const a of s.seeds) for (const b of s.seeds) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(150)
    expect(placeInWords(s, s.px - 200, s.py - 200)).toBe('above and to the left of your orb')
    expect(placeInWords(s, s.px + 200, s.py)).toBe('to the right of your orb')
    expect(cluePlaces(s).map((c) => c.id)).toEqual(planted.clues.map((c) => c.id))
  })

  it('the clue the player goes to is the one that opens; the others fade', () => {
    const s = withClues(['stars', 'chasers', 'blaster'])
    goTo(s, 'chasers')
    expect(s.activeMechanics).toEqual(['arrow_keys', 'chasers'])
    expect(s.seeds).toEqual([])
    expect(s.forks).toBe(1)
    expect(drain(s)).toEqual([{ type: 'opened', id: 'chasers', by: 'went', passed: ['stars', 'blaster'] }])
  })

  it('two players at the same crossroads end up with different rules', () => {
    const a = withClues(['stars', 'pulse_gems', 'sweepers'])
    const b = withClues(['stars', 'pulse_gems', 'sweepers'])
    goTo(a, 'pulse_gems')
    goTo(b, 'sweepers')
    expect(a.activeMechanics).not.toEqual(b.activeMechanics)
  })

  it('coming near a clue opens it within a couple of seconds, and a screen reader hears the orb is beside it', () => {
    const s = withClues(['pulse_gems', 'chasers'])
    const seed = seedOf(s, 'pulse_gems')
    s.px = seed.x - 60
    s.py = seed.y
    run(s, 1)
    expect(s.activeMechanics).not.toContain('pulse_gems')
    expect(drain(s)).toEqual([{ type: 'beside', id: 'pulse_gems' }])
    run(s, 0.4)
    expect(s.activeMechanics).toContain('pulse_gems')
    expect(s.foundBy).toEqual(['went'])
  })

  it('resting at a crossroads chooses nothing: the clues settle and sleep, and the game moves on', () => {
    const s = withClues(['stars', 'pulse_gems', 'chasers'])
    run(s, 5)
    expect(types(drain(s))).toEqual(['settling'])
    expect(s.activeMechanics).toEqual(['arrow_keys'])
    run(s, 7.5)
    expect(drain(s)).toEqual([{ type: 'let-be', ids: ['stars', 'pulse_gems', 'chasers'] }])
    expect(s.seeds).toEqual([])
    expect(s.sleeping.map((z) => z.id)).toEqual(['stars', 'pulse_gems', 'chasers'])
    expect(s.forks).toBe(1)
    expect(s.activeMechanics).toEqual(['arrow_keys'])

    // After a short quiet the next crossroads grows, never offering what was let be
    run(s, 6.5)
    expect(types(drain(s))).toEqual(['planted'])
    for (const seed of s.seeds) expect(['stars', 'pulse_gems', 'chasers']).not.toContain(seed.id)
  })

  it('moving lets the stillness ebb, so a short pause between moves never lets clues go', () => {
    const s = withClues(['stars', 'pulse_gems', 'chasers'])
    // Well to the sides, so walking up and down the middle never reaches one
    s.seeds.forEach((seed, i) => { seed.x = i % 2 ? 600 : 40; seed.y = 60 + i * 150 })
    for (let i = 0; i < 6; i++) {
      run(s, 3)
      run(s, 3, (st) => { st.keys.clear(); st.keys.add(i % 2 ? 'ArrowUp' : 'ArrowDown') })
      s.keys.clear()
      run(s, 0.3)
    }
    expect(s.sleeping).toEqual([])
    expect(s.seeds).toHaveLength(3)
  })

  it('nothing opens on a clock: a player who keeps moving away from the clues keeps them waiting', () => {
    const s = withClues(['chasers', 'sweepers'])
    for (const seed of s.seeds) { seed.x = 600; seed.y = 440 }
    s.px = 60
    s.py = 60
    run(s, 120, (st) => {
      st.keys.clear()
      st.keys.add(Math.floor(st.totalTime) % 2 ? 'ArrowRight' : 'ArrowLeft')
      st.px = Math.min(st.px, 200)
    })
    expect(s.seeds).toHaveLength(2)
    expect(s.activeMechanics).toEqual(['arrow_keys'])
  })

  it('gathering light helps the nearest clue grow, and is remembered as how it was found', () => {
    const s = withClues(['chasers', 'blaster'], 'stars')
    s.spawnTimers.stars = -999
    seedOf(s, 'chasers').x = s.px + 150
    seedOf(s, 'chasers').y = s.py
    seedOf(s, 'blaster').x = 40
    seedOf(s, 'blaster').y = 40
    for (let i = 0; i < 5; i++) {
      s.entities.push({ id: s.nextId++, type: 'star', x: s.px, y: s.py, vx: 0, vy: 0, size: 8, alpha: 1, active: true, age: 0, hp: 0 })
      update(s, STEP)
    }
    expect(s.activeMechanics).toContain('chasers')
    expect(s.activeMechanics).not.toContain('blaster')
    expect(s.foundBy).toEqual(['gathered'])
  })

  it('light sent from the lantern opens the clue it reaches', () => {
    const s = withClues(['combo_chain', 'chasers'], 'blaster')
    seedOf(s, 'combo_chain').x = s.px + 150
    seedOf(s, 'combo_chain').y = s.py
    seedOf(s, 'chasers').x = 40
    seedOf(s, 'chasers').y = 40
    s.mx = s.px + 300
    s.my = s.py
    s.keys.add(' ')
    run(s, 0.6)
    expect(s.activeMechanics).toContain('combo_chain')
    expect(s.foundBy).toEqual(['went'])
  })

  it('the first of what a rule brings comes out of the clue itself', () => {
    const s = withClues(['stars', 'chasers'])
    const { x, y } = seedOf(s, 'stars')
    s.spawnTimers.stars = -999
    goTo(s, 'stars')
    expect(s.entities.some((e) => e.type === 'star' && Math.hypot(e.x - x, e.y - y) < 2)).toBe(true)
  })

  it('names a rule only once it has been felt', () => {
    const s = withClues(['stars', 'chasers'])
    s.spawnTimers.stars = -999
    goTo(s, 'stars')
    drain(s)
    s.px = 600
    s.py = 400
    run(s, 2)
    expect(types(drain(s))).toEqual([])

    s.entities.push({ id: s.nextId++, type: 'star', x: s.px, y: s.py, vx: 0, vy: 0, size: 8, alpha: 1, active: true, age: 0, hp: 0 })
    run(s, STEP * 2)
    expect(drain(s)).toEqual([{ type: 'felt', id: 'stars' }])
    expect(s.unnamed).toBeNull()
  })

  it('a resting player gets a quiet hint first, then the name, then a pause before the next crossroads', () => {
    const s = withClues(['blaster', 'chasers'], 'stars')
    s.spawnTimers.stars = -999
    goTo(s, 'blaster')
    drain(s)

    run(s, 5.1)
    expect(drain(s)).toEqual([{ type: 'hint', id: 'blaster' }])
    run(s, 9)
    expect(drain(s)).toEqual([{ type: 'felt', id: 'blaster' }])
    run(s, 5)
    expect(drain(s)).toEqual([])
    run(s, 1.5)
    expect(types(drain(s))).toEqual(['planted'])
  })

  it('once the circle is among the clues, resting finishes the game instead of letting them sleep', () => {
    const s = withClues(['blaster', ENDING], 'stars', 'combo_chain', 'gravity_well')
    run(s, 12.5)
    expect(isGameComplete(s)).toBe(true)
    expect(s.sleeping).toEqual([])
    expect(s.foundBy).toEqual(['rested'])
  })

  it('going to the circle ends the game whenever the player chooses', () => {
    const s = withClues(['blaster', 'sweepers', ENDING], 'stars', 'chasers', 'combo_chain')
    goTo(s, ENDING)
    expect(isGameComplete(s)).toBe(true)
    expect(s.activeMechanics).not.toContain('blaster')
  })

  it('a player who only rests reaches a gentle ending of their own, with every crossroads asleep', () => {
    const s = createState()
    run(s, 240)
    expect(isGameComplete(s)).toBe(true)
    expect(s.activeMechanics).toHaveLength(1)
    expect(s.sleeping.length).toBeGreaterThanOrEqual(6)
    expect(s.foundBy).toEqual(['rested', 'rested'])
  })

  it('every rule has a clue, a plain change and a hint, and touch players get their own words', () => {
    for (const id of ['arrow_keys', 'mouse_follow', 'stars', 'pulse_gems', 'chasers', 'sweepers', 'blaster', 'phase_dash', 'combo_chain', 'gravity_well', 'score_rush']) {
      const d = discovery(id)
      expect(d.clue).toBeTruthy()
      expect(d.change).toBeTruthy()
      expect(d.hint).toBeTruthy()
      expect(`${d.clue} ${d.change} ${d.hint}`).not.toMatch(/\bAI\b/)
    }
    expect(hintFor('blaster', true)).toBe('Keep a finger down to send light.')
    expect(hintFor('blaster', false)).toBe('Hold Space or click to send light.')
  })
})
