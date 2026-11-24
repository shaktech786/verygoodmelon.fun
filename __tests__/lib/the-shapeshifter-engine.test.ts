import { describe, it, expect } from 'vitest'
import {
  createState, update, activateMechanic, getProfileSummary, advanceWave,
} from '@/app/games/the-mutation/engine/engine'
import type { Entity, GameState } from '@/app/games/the-mutation/engine/types'

const STEP = 1 / 60

function run(s: GameState, seconds: number) {
  for (let t = 0; t < seconds; t += STEP) update(s, STEP)
}

function place(s: GameState, type: Entity['type'], x: number, y: number, vx = 0, vy = 0): Entity {
  const e: Entity = { id: s.nextId++, type, x, y, vx, vy, size: type === 'sweeper' ? 10 : 8, alpha: 1, active: true, age: 0, hp: 1 }
  s.entities.push(e)
  return e
}

function withMechanics(...ids: string[]): GameState {
  const s = createState()
  for (const id of ids) activateMechanic(s, id, {})
  return s
}

const count = (s: GameState, type: Entity['type']) => s.entities.filter((e) => e.active && e.type === type).length

describe('The Shapeshifter engine', () => {
  it('touching a shadow never costs light: it only nudges the orb away', () => {
    const s = withMechanics('arrow_keys', 'chasers')
    s.score = 100
    s.spawnTimers.chasers = -999
    place(s, 'chaser', s.px + 6, s.py)
    const startX = s.px

    run(s, 0.5)

    expect(s.score).toBeGreaterThanOrEqual(100)
    expect(s.px).toBeLessThan(startX - 10)
    expect(s.bumps).toBe(1)
    expect(s.carries).toBe(0)
  })

  it('a tide carries the orb along with it and costs nothing', () => {
    const s = withMechanics('arrow_keys', 'sweepers')
    s.score = 50
    s.spawnTimers.sweepers = -999
    place(s, 'sweeper', s.px - 4, 0, 120, 0)
    const startX = s.px

    run(s, 0.4)

    expect(s.score).toBeGreaterThanOrEqual(50)
    expect(s.px).toBeGreaterThan(startX + 10)
    expect(s.carries).toBe(1)
    expect(s.bumps).toBe(0)
  })

  it('light sent from the orb turns a shadow into a star', () => {
    const s = withMechanics('arrow_keys', 'chasers', 'blaster')
    s.spawnTimers.chasers = -999
    place(s, 'chaser', s.px + 120, s.py)
    s.mx = s.px + 200
    s.my = s.py
    s.keys.add(' ')

    run(s, 0.6)

    expect(count(s, 'chaser')).toBe(0)
    expect(s.transformed).toBe(1)
    expect(s.entities.some((e) => e.type === 'star')).toBe(true)
  })

  it('gliding through a shadow turns it into a star too', () => {
    const s = withMechanics('arrow_keys', 'chasers', 'phase_dash')
    s.spawnTimers.chasers = -999
    place(s, 'chaser', s.px + 4, s.py)
    s.keys.add(' ')

    run(s, 0.1)

    expect(count(s, 'chaser')).toBe(0)
    expect(s.transformed).toBe(1)
    expect(s.bumps).toBe(0)
  })

  it('the bloom turns every shadow and tide into light and lets no new ones in', () => {
    const s = withMechanics('arrow_keys', 'stars', 'chasers', 'sweepers')
    place(s, 'chaser', 40, 40)
    place(s, 'chaser', 600, 400)
    place(s, 'sweeper', 100, 0, 120, 0)

    activateMechanic(s, 'score_rush', {})
    expect(count(s, 'chaser')).toBe(0)
    expect(count(s, 'sweeper')).toBe(0)
    expect(count(s, 'star')).toBeGreaterThanOrEqual(2)

    run(s, 6)
    expect(count(s, 'chaser')).toBe(0)
    expect(count(s, 'sweeper')).toBe(0)
    expect(s.multiplier).toBe(3)
    // The bloom's bonus does not run out on a clock of its own
    run(s, 60)
    expect(s.multiplier).toBe(3)
  })

  it('a pause never lowers the glow: it lasts the whole run', () => {
    const s = withMechanics('arrow_keys', 'stars', 'combo_chain')
    s.combo = 6
    place(s, 'star', s.px, s.py)
    run(s, STEP)
    expect(s.combo).toBe(7)
    expect(s.multiplier).toBe(3)

    run(s, 30)

    // Lights may keep arriving and adding to it, but nothing is ever taken away
    expect(s.combo).toBeGreaterThanOrEqual(7)
    expect(s.multiplier).toBeGreaterThanOrEqual(3)
  })

  it('a long rhythm tops out at a modest glow instead of compounding without limit', () => {
    const s = withMechanics('arrow_keys', 'stars', 'combo_chain', 'score_rush')
    s.combo = 60
    place(s, 'star', s.px, s.py)
    run(s, STEP)

    expect(s.multiplier).toBe(12)
  })

  it('pulse gems glow long enough to reach without hurrying', () => {
    const s = withMechanics('arrow_keys', 'pulse_gems')
    const gem = place(s, 'gem', 100, 100)
    let glowing = 0
    for (let t = 0; t < 4; t += STEP) {
      update(s, STEP)
      if (gem.alpha >= 0.4) glowing += STEP
    }
    expect(glowing).toBeGreaterThan(2)
    expect(glowing).toBeLessThan(3.5)
  })

  it('shadows wander on their own way instead of chasing the orb', () => {
    const s = withMechanics('arrow_keys', 'chasers')
    s.spawnTimers.chasers = -999
    const shadow = place(s, 'chaser', s.px + 150, s.py, 30, 0)

    run(s, 3)

    expect(Math.hypot(shadow.x - s.px, shadow.y - s.py)).toBeGreaterThan(190)
  })

  it('new shadows drift slowly', () => {
    const s = withMechanics('arrow_keys', 'chasers')
    run(s, 12)
    const shadows = s.entities.filter((e) => e.type === 'chaser')
    expect(shadows.length).toBeGreaterThan(0)
    for (const e of shadows) expect(Math.hypot(e.vx, e.vy)).toBeLessThanOrEqual(40)
  })

  it('light gathers any star it reaches, so the lantern is useful before any shadow arrives', () => {
    const s = withMechanics('arrow_keys', 'stars', 'blaster')
    s.spawnTimers.stars = -999
    place(s, 'star', s.px + 120, s.py).age = 2
    s.mx = s.px + 200
    s.my = s.py
    s.keys.add(' ')

    run(s, 0.6)

    expect(s.collectTotal).toBe(1)
    expect(count(s, 'star')).toBe(0)
  })

  it('can be laid out tall for a phone, keeping everything inside the taller field', () => {
    const s = createState(480, 720)
    for (const id of ['arrow_keys', 'stars', 'chasers']) activateMechanic(s, id, {})
    expect([s.w, s.h, s.px, s.py]).toEqual([480, 720, 240, 360])
    run(s, 20)
    for (const e of s.entities.filter((e) => e.type === 'star')) {
      expect(e.x).toBeLessThanOrEqual(480)
      expect(e.y).toBeLessThanOrEqual(720)
    }
  })

  it('a player who stays still through every hazard ends with at least the light they had', () => {
    const s = withMechanics('arrow_keys', 'stars', 'chasers', 'sweepers')
    s.score = 30

    run(s, 30)

    expect(s.score).toBeGreaterThanOrEqual(30)
    expect(getProfileSummary(s).playStyle).toBe('gentle')
  })
})

describe('The Shapeshifter rules change each other', () => {
  it('a tide carries the stars it passes over along with it', () => {
    const s = withMechanics('arrow_keys', 'stars', 'sweepers')
    s.spawnTimers.stars = -999
    s.spawnTimers.sweepers = -999
    const star = place(s, 'star', 100, 100)
    place(s, 'sweeper', 100, 0, 100, 0)
    run(s, 0.3)
    expect(star.x).toBeGreaterThan(115)
  })

  it('without a tide, a star stays where it is', () => {
    const s = withMechanics('arrow_keys', 'stars')
    s.spawnTimers.stars = -999
    const star = place(s, 'star', 100, 100)
    run(s, 0.3)
    expect(Math.abs(star.x - 100)).toBeLessThan(1)
  })

  it('with the gentle pull, a shadow that reaches the orb becomes a star instead of nudging it', () => {
    const s = withMechanics('arrow_keys', 'chasers', 'gravity_well')
    s.spawnTimers.chasers = -999
    place(s, 'chaser', s.px + 6, s.py)
    run(s, 0.1)
    expect(s.transformed).toBe(1)
    expect(s.bumps).toBe(0)
  })

  it('the gentle pull holds the orb steadier in a tide', () => {
    const carried = (...ids: string[]) => {
      const s = withMechanics('arrow_keys', 'sweepers', ...ids)
      s.spawnTimers.sweepers = -999
      place(s, 'sweeper', s.px - 4, 0, 120, 0)
      const startX = s.px
      run(s, 0.4)
      return s.px - startX
    }
    expect(carried('gravity_well')).toBeLessThan(carried() * 0.6)
    expect(carried('gravity_well')).toBeGreaterThan(0)
  })

  it('with a rhythm, riding a tide makes the glow grow', () => {
    const s = withMechanics('arrow_keys', 'sweepers', 'combo_chain')
    s.spawnTimers.sweepers = -999
    place(s, 'sweeper', s.px - 4, 0, 120, 0)
    run(s, 0.2)
    expect(s.combo).toBe(1)
  })

  it('light sent into a tide settles there as a star', () => {
    const s = withMechanics('arrow_keys', 'sweepers', 'blaster')
    s.spawnTimers.sweepers = -999
    place(s, 'sweeper', s.px + 100, 0, 0.001, 0)
    s.mx = s.px + 300
    s.my = s.py
    s.keys.add(' ')
    run(s, 0.35)
    s.keys.clear()
    expect(s.entities.some((e) => e.type === 'star' && Math.abs(e.x - (s.px + 100)) < 20)).toBe(true)
  })
})

describe('The Shapeshifter path', () => {
  it('begins where the orb rests, before any rule', () => {
    expect(createState(480, 720).path).toEqual([{ x: 240, y: 360, wave: 0 }])
  })

  it('follows the orb as it moves, marked with the wave it moved in', () => {
    const s = withMechanics('arrow_keys')
    s.wave = 1
    s.keys.add('ArrowRight')
    run(s, 0.6)
    const moved = s.path.filter((p) => p.wave === 1)
    expect(moved.length).toBeGreaterThan(3)
    expect(moved[moved.length - 1].x).toBeGreaterThan(s.w / 2 + 40)
    for (let i = 1; i < moved.length; i++) expect(moved[i].x).toBeGreaterThanOrEqual(moved[i - 1].x)
  })

  it('notes each new wave even when the orb stays still, so every rule has a place on the path', () => {
    const s = createState()
    for (let wave = 1; wave <= 6; wave++) {
      advanceWave(s)
      run(s, 0.1)
    }
    expect(s.path.map((p) => p.wave)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(new Set(s.path.map((p) => `${p.x},${p.y}`)).size).toBe(1)
  })

  it('stays a modest size on a long, busy run and keeps the start of every wave', () => {
    const s = withMechanics('mouse_follow')
    // No clues grow here: a clue the sweeping orb happened to open would start a wave of its own
    s.quietUntil = Infinity
    for (let wave = 1; wave <= 6; wave++) {
      advanceWave(s)
      for (let i = 0; i < 400; i++) {
        s.mx = i % 2 ? 40 : s.w - 40
        s.my = (i * 37) % s.h
        run(s, 0.15)
      }
    }
    expect(s.path.length).toBeLessThanOrEqual(1200)
    expect(new Set(s.path.map((p) => p.wave))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6]))
    const waves = s.path.map((p) => p.wave)
    expect(waves).toEqual([...waves].sort((a, b) => a - b))
  })
})
