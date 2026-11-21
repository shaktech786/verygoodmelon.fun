import { describe, it, expect } from 'vitest'
import { buildSuggestionPrompt, parseSuggestion, parseSuggestionReply, settleSpot, suggestLocally, type PlantSpot } from '@/lib/games/calm-garden/suggest'
import { GROUND_TOP, PLANT_TYPES } from '@/lib/games/calm-garden/garden'

const spot = (type: PlantSpot['type'], x: number, y: number): PlantSpot => ({ type, x, y })

describe('a suggestion that answers what was planted', () => {
  it('offers the first flower to a garden with none', () => {
    const s = suggestLocally([spot('oak', 0.5, 0.5), spot('round-stone', 0.3, 0.8), spot('pine', 0.7, 0.5)], 0)
    expect(['poppy', 'tulip', 'daisy']).toContain(s.type)
    expect(s.line).toMatch(/^Your (oak|pine) tree could use some color at its feet\. A (poppy|tulip|daisy), maybe\?$/)
  })

  it('keeps a lopsided garden company on its empty side', () => {
    const left = [spot('daisy', 0.1, 0.6), spot('tulip', 0.2, 0.7), spot('oak', 0.3, 0.5), spot('poppy', 0.15, 0.8)]
    const s = suggestLocally(left, 0)
    expect(s.x).toBeGreaterThan(0.55)
    expect(s.line).toBe('Everything has gathered on the left. A round bush on the right would keep it company.')
  })

  it('gives shade to flowers that have none, from behind them', () => {
    const daisies = [spot('daisy', 0.3, 0.75), spot('daisy', 0.5, 0.8), spot('daisy', 0.7, 0.75)]
    const s = suggestLocally(daisies, 0)
    expect(s.type).toBe('willow')
    expect(s.y).toBeLessThan(0.75)
    expect(s.y).toBeGreaterThan(GROUND_TOP)
    expect(s.line).toBe('Your three daisies have no shade yet. A willow behind them would give some.')
    // The other tree it may offer takes "an".
    const oak = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45].map((seed) => suggestLocally(daisies, seed)).find((x) => x.type === 'oak')
    expect(oak?.line).toBe('Your three daisies have no shade yet. An oak tree behind them would give some.')
  })

  it('then somewhere to sit near the flowers', () => {
    const plants = [spot('daisy', 0.3, 0.7), spot('poppy', 0.5, 0.75), spot('tulip', 0.7, 0.7), spot('oak', 0.5, 0.45)]
    const s = suggestLocally(plants, 0)
    expect(s.type).toBe('flat-stone')
    expect(s.y).toBeGreaterThan(0.75)
    expect(s.line).toBe('There is nowhere to sit near your flowers yet. A flat stone would do.')
  })

  it('always lands on open grass inside the garden', () => {
    const crowded = Array.from({ length: 60 }, (_, i) => spot(PLANT_TYPES[i % PLANT_TYPES.length], (i % 10) / 10 + 0.05, 0.4 + Math.floor(i / 10) * 0.1))
    for (const seed of [0, 0.25, 0.5, 0.99]) {
      const s = suggestLocally(crowded, seed)
      expect(s.x).toBeGreaterThanOrEqual(0.05)
      expect(s.x).toBeLessThanOrEqual(0.95)
      expect(s.y).toBeGreaterThan(GROUND_TOP)
      expect(s.y).toBeLessThanOrEqual(0.95)
      expect(s.line.split(' ').length).toBeLessThanOrEqual(18)
    }
  })
})

describe('reading a suggestion back', () => {
  it('accepts a well-formed reply, tidying the numbers and the words', () => {
    expect(parseSuggestionReply('Sure: {"type": "pine", "x": 0.912, "y": 0.36, "line": "  \\"Your poppies   would like a tall friend.\\" "}')).toEqual({
      type: 'pine', x: 0.91, y: 0.4, line: 'Your poppies would like a tall friend.',
    })
  })

  it('speaks of plants by their names, not their ids', () => {
    const s = parseSuggestion({ type: 'berry-bush', x: 0.3, y: 0.6, line: 'Those pines would love a berry-bush and a flat-stone nearby.' })
    expect(s?.line).toBe('Those pines would love a berry bush and a flat stone nearby.')
  })

  it('moves a suggestion off a plant it would sit on, keeping open ones where they are', () => {
    const plants = [spot('flat-stone', 0.5, 0.85), spot('oak', 0.6, 0.5)]
    const onTop = settleSpot({ type: 'flat-stone', x: 0.52, y: 0.85, line: 'Somewhere to sit.' }, plants)
    expect(Math.min(...plants.map((p) => Math.hypot((onTop.x - p.x) * 1.5, onTop.y - p.y)))).toBeGreaterThanOrEqual(0.07)
    expect(Math.abs(onTop.x - 0.52)).toBeLessThanOrEqual(0.12)
    const open = { type: 'pine' as const, x: 0.2, y: 0.6, line: 'Somewhere to sit.' }
    expect(settleSpot(open, plants)).toBe(open)
  })

  it('rejects anything it cannot trust', () => {
    const ok = { type: 'pine', x: 0.5, y: 0.6, line: 'Your poppies would like a tall friend.' }
    expect(parseSuggestion(ok)).not.toBeNull()
    for (const bad of [
      null, 'pine', { ...ok, type: 'dragon' }, { ...ok, x: 'left' }, { ...ok, y: 1.4 }, { ...ok, x: Number.NaN },
      { ...ok, line: '' }, { ...ok, line: 'Ok.' }, { ...ok, line: 'x'.repeat(200) },
      { ...ok, line: 'As an AI, I suggest a pine.' }, { ...ok, line: 'Generating a pine for you.' }, { ...ok, line: 'See <b>this</b>' },
      { ...ok, line: 'More at https://example.com today' },
    ]) {
      expect(parseSuggestion(bad)).toBeNull()
    }
    expect(parseSuggestionReply('no json here')).toBeNull()
    expect(parseSuggestionReply('{"type": "pine", "x": 0.5,')).toBeNull()
  })
})

describe('asking for a suggestion', () => {
  it('describes each plant in words and offers only real plants', () => {
    const prompt = buildSuggestionPrompt([spot('daisy', 0.2, 0.8), spot('oak', 0.5, 0.5)], 'autumn')
    expect(prompt).toContain('- daisy: near the front, on the left (x 0.20, y 0.80)')
    expect(prompt).toContain('- oak tree: in the very middle (x 0.50, y 0.50)')
    expect(prompt).toContain('autumn')
    for (const type of PLANT_TYPES) expect(prompt).toContain(type)
    expect(prompt).toContain('berry-bush (berry bush)')
  })

  it('keeps the prompt small however big the garden gets', () => {
    const many = Array.from({ length: 120 }, (_, i) => spot('daisy', (i % 10) / 10, 0.5))
    expect(buildSuggestionPrompt(many, 'summer').match(/^- daisy/gm)?.length).toBe(40)
  })
})
