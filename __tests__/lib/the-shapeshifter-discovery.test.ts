import { describe, it, expect } from 'vitest'
import {
  createState, update, activateMechanic, plantSeed, isGameComplete, placeInWords,
} from '@/app/games/the-mutation/engine/engine'
import { ENDING, type DiscoveryEvent, type GameState } from '@/app/games/the-mutation/engine/types'
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

/** A player who can move, with the next clue planted some way off. */
function withClue(id: string, ...active: string[]): GameState {
  const s = createState()
  for (const m of ['arrow_keys', ...active]) activateMechanic(s, m, {})
  s.wave = 1 + active.length
  plantSeed(s, id)
  drain(s)
  return s
}

describe('The Shapeshifter discovery', () => {
  it('asks for a clue, never a rule: resting alone changes nothing until a clue is planted', () => {
    const s = createState()
    run(s, 4)
    expect(types(drain(s))).toEqual(['clue-wanted'])
    run(s, 30)
    expect(drain(s)).toEqual([])
    expect(s.activeMechanics).toEqual([])
  })

  it('pulsing the still orb brings the first clue sooner than waiting does', () => {
    const s = createState()
    for (let i = 0; i < 3; i++) {
      s.clickThisFrame = true
      s.mx = s.px
      s.my = s.py
      update(s, STEP)
    }
    expect(types(drain(s))).toEqual(['clue-wanted'])
  })

  it('plants the first clue close by, where the still orb can watch it, and says where it is', () => {
    const s = createState()
    plantSeed(s, 'arrow_keys')
    const [event] = drain(s)
    expect(event).toEqual({ type: 'planted', id: 'arrow_keys', place: 'close to your orb' })
    expect(Math.hypot((s.seed?.x ?? 0) - s.px, (s.seed?.y ?? 0) - s.py)).toBeLessThan(110)
    expect(s.activeMechanics).toEqual([])
  })

  it('a clue planted once the orb can move grows well away from it', () => {
    const s = withClue('stars')
    expect(Math.hypot((s.seed?.x ?? 0) - s.px, (s.seed?.y ?? 0) - s.py)).toBeGreaterThanOrEqual(140)
    expect(placeInWords(s, s.px - 200, s.py - 200)).toBe('above and to the left of your orb')
    expect(placeInWords(s, s.px + 200, s.py)).toBe('to the right of your orb')
  })

  it('resting opens a clue in its own time: the rest path always moves the game on', () => {
    const s = withClue('stars')
    run(s, 5)
    expect(s.activeMechanics).not.toContain('stars')
    expect(s.seed?.growth ?? 0).toBeGreaterThan(0.6)

    run(s, 2.5)
    expect(s.seed).toBeNull()
    expect(s.activeMechanics).toContain('stars')
    expect(s.foundBy).toEqual(['rested'])
    expect(drain(s)).toEqual([{ type: 'opened', id: 'stars', by: 'rested' }])
  })

  it('a pulse-only first wave also opens by resting, so a player who does nothing still gets to move', () => {
    const s = createState()
    plantSeed(s, 'arrow_keys')
    run(s, 8)
    expect(s.activeMechanics).toEqual(['arrow_keys'])
    expect(s.wave).toBe(1)
  })

  it('a player who keeps moving and never rests or gathers still sees the clue open, just slowly', () => {
    const s = withClue('chasers')
    // Steer in a small square well away from the clue
    s.seed!.x = 40
    s.seed!.y = 40
    run(s, 10, (st) => {
      st.keys.clear()
      st.keys.add(Math.floor(st.totalTime) % 2 ? 'ArrowRight' : 'ArrowLeft')
    })
    expect(s.seed).not.toBeNull()
    run(s, 40, (st) => {
      st.keys.clear()
      st.keys.add(Math.floor(st.totalTime) % 2 ? 'ArrowRight' : 'ArrowLeft')
    })
    expect(s.activeMechanics).toContain('chasers')
  })

  it('going to the clue opens it at once', () => {
    const s = withClue('pulse_gems')
    s.px = s.seed!.x - 10
    s.py = s.seed!.y
    run(s, STEP)
    expect(s.activeMechanics).toContain('pulse_gems')
    expect(s.foundBy).toEqual(['went'])
  })

  it('gathering light helps it grow, and is remembered as how it was found', () => {
    const s = withClue('chasers', 'stars')
    s.spawnTimers.stars = -999
    s.seed!.x = 40
    s.seed!.y = 40
    for (let i = 0; i < 5; i++) {
      s.entities.push({ id: s.nextId++, type: 'star', x: s.px, y: s.py, vx: 0, vy: 0, size: 8, alpha: 1, active: true, age: 0, hp: 0 })
      update(s, STEP)
    }
    expect(s.activeMechanics).toContain('chasers')
    expect(s.foundBy).toEqual(['gathered'])
  })

  it('light sent from the lantern opens a clue it reaches', () => {
    const s = withClue('combo_chain', 'blaster')
    s.seed!.x = s.px + 150
    s.seed!.y = s.py
    s.mx = s.px + 300
    s.my = s.py
    s.keys.add(' ')
    run(s, 0.6)
    expect(s.activeMechanics).toContain('combo_chain')
    expect(s.foundBy).toEqual(['went'])
  })

  it('the first of what a rule brings comes out of the clue itself', () => {
    const s = withClue('stars')
    const { x, y } = s.seed!
    s.px = x - 10
    s.py = y
    s.spawnTimers.stars = -999
    run(s, STEP)
    expect(s.entities.some((e) => e.type === 'star' && Math.hypot(e.x - x, e.y - y) < 2)).toBe(true)
  })

  it('names a rule only once it has been felt', () => {
    const s = withClue('stars')
    s.seed!.growth = 1
    s.spawnTimers.stars = -999
    run(s, STEP)
    drain(s)
    run(s, 2)
    expect(types(drain(s))).toEqual([])

    s.entities.push({ id: s.nextId++, type: 'star', x: s.px, y: s.py, vx: 0, vy: 0, size: 8, alpha: 1, active: true, age: 0, hp: 0 })
    run(s, STEP * 2)
    expect(drain(s)).toEqual([{ type: 'felt', id: 'stars' }])
    expect(s.unnamed).toBeNull()
  })

  it('a resting player gets a quiet hint first, then the name, then a pause before anything new grows', () => {
    const s = withClue('blaster')
    s.seed!.growth = 1
    run(s, STEP)
    drain(s)

    run(s, 5.1)
    expect(drain(s)).toEqual([{ type: 'hint', id: 'blaster' }])
    run(s, 9)
    expect(drain(s)).toEqual([{ type: 'felt', id: 'blaster' }])
    run(s, 3)
    expect(drain(s)).toEqual([])
    run(s, 1.5)
    expect(types(drain(s))).toEqual(['clue-wanted'])
  })

  it('after all six rules the game plants its own closing circle, and resting there finishes it', () => {
    const s = createState()
    for (const id of ['arrow_keys', 'stars', 'chasers', 'blaster', 'combo_chain', 'score_rush']) activateMechanic(s, id, {})
    s.wave = 6
    run(s, 13)
    const planted = drain(s).find((e) => e.type === 'planted')
    expect(planted).toMatchObject({ type: 'planted', id: ENDING })
    expect(isGameComplete(s)).toBe(false)

    run(s, 8)
    expect(isGameComplete(s)).toBe(true)
    expect(s.foundBy).toEqual(['rested'])
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
