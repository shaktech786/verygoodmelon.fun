import { describe, it, expect } from 'vitest'
import { fallbackRule } from '@/app/games/the-mutation/engine/rules'
import { MECHANIC_OPTIONS } from '@/app/games/the-mutation/engine/types'

const words = (id: string, active: string[]) => {
  const rule = fallbackRule(id, active)
  return `${rule.title} ${rule.description} ${rule.flavorText}`.toLowerCase()
}

describe('The Shapeshifter offline rule texts', () => {
  it('has a title, a line and a kind word for every rule', () => {
    for (const id of Object.values(MECHANIC_OPTIONS).flat()) {
      const rule = fallbackRule(id, [])
      expect(rule.mechanicId).toBe(id)
      expect(rule.title).toMatch(/^[A-Z ]+$/)
      expect(rule.description.length).toBeGreaterThan(0)
      expect(rule.flavorText.length).toBeGreaterThan(0)
    }
  })

  it('never mentions shadows in a run that has none', () => {
    const tidesRun = ['mouse_follow', 'stars', 'sweepers']
    for (const id of ['blaster', 'phase_dash', 'score_rush', 'combo_chain', 'gravity_well']) {
      expect(words(id, tidesRun), id).not.toMatch(/shadow/)
    }
    expect(words('blaster', ['arrow_keys', 'stars'])).not.toMatch(/shadow/)
  })

  it('tells a run with shadows what the light does to them', () => {
    const shadowRun = ['arrow_keys', 'stars', 'chasers']
    expect(words('blaster', shadowRun)).toMatch(/shadows into stars/)
    expect(words('phase_dash', shadowRun)).toMatch(/shadow/)
    expect(words('score_rush', shadowRun)).toMatch(/every shadow turns to light/)
  })

  it('says what the bloom does to the tides when the tides are what the run has', () => {
    expect(words('score_rush', ['mouse_follow', 'stars', 'sweepers'])).toMatch(/tides/)
  })

  it('names what the run gathers, stars or gems', () => {
    expect(words('blaster', ['arrow_keys', 'pulse_gems'])).toMatch(/gems/)
    expect(words('blaster', ['arrow_keys', 'pulse_gems'])).not.toMatch(/stars/)
    expect(words('score_rush', ['arrow_keys', 'pulse_gems'])).toMatch(/gems come thick/)
  })
})
