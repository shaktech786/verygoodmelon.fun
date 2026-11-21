import { describe, it, expect } from 'vitest'
import { buildSuggestionPrompt, parseSuggestion, parseSuggestionReply, repeatsLastPlant, settleSpot, suggestLocally, type PlantSpot } from '@/lib/games/calm-garden/suggest'
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

  it('never suggests the kind of plant just placed, whatever the seed', () => {
    const justLavender = [spot('daisy', 0.3, 0.7), spot('oak', 0.5, 0.45), spot('lavender', 0.5, 0.88)]
    const justDaisy = [spot('lavender', 0.4, 0.88), spot('daisy', 0.6, 0.7)]
    for (let seed = 0; seed < 1; seed += 0.05) {
      for (const plants of [justLavender, justDaisy, [spot('poppy', 0.5, 0.7)]]) {
        const s = suggestLocally(plants, seed)
        expect(s.type).not.toBe(plants[plants.length - 1].type)
        expect(repeatsLastPlant(s, plants)).toBe(false)
        expect(s.line).not.toMatch(new RegExp(plants[plants.length - 1].type))
      }
    }
  })

  it('knows a repeat when it sees one: the same kind, or the very same spot', () => {
    const plants = [spot('oak', 0.3, 0.5), spot('lavender', 0.5, 0.88)]
    expect(repeatsLastPlant(spot('lavender', 0.1, 0.6), plants)).toBe(true)
    expect(repeatsLastPlant(spot('daisy', 0.51, 0.88), plants)).toBe(true)
    expect(repeatsLastPlant(spot('oak', 0.8, 0.6), plants)).toBe(false)
    expect(repeatsLastPlant(spot('oak', 0.8, 0.6), [])).toBe(false)
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
  })

  it('only speaks of visitors that come to this garden: butterflies and fireflies', () => {
    const ok = { type: 'lavender', x: 0.5, y: 0.8, line: 'Butterflies love lavender, and fireflies like the dusk.' }
    expect(parseSuggestion(ok)).not.toBeNull()
    for (const line of ['The bees would love lavender here.', 'A bee or two would visit.', 'Birds could nest in an oak.', 'A hummingbird likes poppies.']) {
      expect(parseSuggestion({ ...ok, line }), line).toBeNull()
    }
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

  it('names only the visitors the garden really has', () => {
    const prompt = buildSuggestionPrompt([spot('daisy', 0.2, 0.8)], 'spring')
    expect(prompt).toContain('butterflies')
    expect(prompt).toContain('fireflies')
    expect(prompt).toMatch(/never mention any other animal/i)
  })

  it('tells the gardener what was just planted, and not to offer it again', () => {
    const prompt = buildSuggestionPrompt([spot('oak', 0.3, 0.5), spot('lavender', 0.5, 0.88)], 'summer')
    expect(prompt).toContain('They have just planted the last one, a lavender. Do not suggest another lavender or that same spot')
  })

  it('keeps the prompt small however big the garden gets', () => {
    const many = Array.from({ length: 120 }, (_, i) => spot('daisy', (i % 10) / 10, 0.5))
    expect(buildSuggestionPrompt(many, 'summer').match(/^- daisy/gm)?.length).toBe(40)
  })
})

describe('the time of day in a suggestion', () => {
  const at = (line: string) => ({ type: 'lavender', x: 0.5, y: 0.8, line })

  it.each([
    ['night', 'Your daisies would bring the afternoon butterflies.'],
    ['night', 'A sunflower would catch the morning sun.'],
    ['evening', 'Plant it where the midday sun falls.'],
    ['day', 'Fireflies would gather here tonight.'],
    ['morning', 'Lavender glows by moonlight.'],
  ] as const)('at %s, refuses %j', (timeOfDay, line) => {
    expect(parseSuggestion(at(line), timeOfDay)).toBeNull()
  })

  it.each([
    ['night', 'Your daisies would like some lavender beside them.'],
    ['day', 'Butterflies love lavender. Some near the front would bring them closer.'],
    ['evening', 'Fireflies like the shade under your oak tree.'],
  ] as const)('at %s, keeps %j', (timeOfDay, line) => {
    expect(parseSuggestion(at(line), timeOfDay)).not.toBeNull()
  })

  it('names the time of day in the prompt', () => {
    expect(buildSuggestionPrompt([spot('daisy', 0.2, 0.8)], 'autumn', 'night')).toContain('It is night where they are.')
  })
})
