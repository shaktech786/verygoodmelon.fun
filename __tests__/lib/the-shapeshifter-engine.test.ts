import { describe, it, expect } from 'vitest'
import {
  createState, update, activateMechanic, getProfileSummary,
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
  })

  it('a lapsed chain steps down one level instead of collapsing to nothing', () => {
    const s = withMechanics('arrow_keys', 'combo_chain')
    s.combo = 7
    s.comboTimer = 0.01

    run(s, 0.05)

    expect(s.combo).toBe(4)
    expect(s.multiplier).toBe(2)
  })

  it('a long rhythm tops out at a modest glow instead of compounding without limit', () => {
    const s = withMechanics('arrow_keys', 'stars', 'combo_chain', 'score_rush')
    s.combo = 60
    s.comboTimer = 3
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
