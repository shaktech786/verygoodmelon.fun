/**
 * The Gardener's suggestions: one plant, one spot and one short line that
 * answers what the person has already planted. The local rules here are both
 * the server's fallback and the client's, so a suggestion never fails visibly.
 */

import { describeArea, describePlace, joinWords, nameOf, numberWord, withArticle } from './describe'
import { GROUND_TOP, PLANT_TYPES, categoryOf, isPlantType, variantOf, type Plant, type PlantType, type Season } from './garden'

export interface PlantSpot {
  type: PlantType
  x: number
  y: number
}

export interface Suggestion extends PlantSpot {
  line: string
}

const X_MIN = 0.05
const X_MAX = 0.95
const Y_MIN = 0.4
const Y_MAX = 0.95
const LINE_MIN = 8
const LINE_MAX = 120
const PROMPT_PLANTS = 40

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round2 = (v: number) => Math.round(v * 100) / 100
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Small deterministic generator so a seed always gives the same suggestion.
function seeded(seed: number): () => number {
  let s = Math.floor(seed * 2 ** 31) || 1
  return () => {
    s = (s * 48271) % 2147483647
    return s / 2147483647
  }
}

/** The most open spot inside a box, preferring points near its center. */
function openSpot(plants: readonly PlantSpot[], box: { x0: number; x1: number; y0: number; y1: number }, rand: () => number) {
  const x0 = clamp(box.x0, X_MIN, X_MAX)
  const x1 = clamp(box.x1, x0, X_MAX)
  const y0 = clamp(box.y0, Y_MIN, Y_MAX)
  const y1 = clamp(box.y1, y0, Y_MAX)
  let best = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }
  let bestRoom = -Infinity
  for (let i = 0; i < 24; i++) {
    const x = x0 + rand() * (x1 - x0)
    const y = y0 + rand() * (y1 - y0)
    const room = plants.reduce((min, p) => Math.min(min, Math.hypot((x - p.x) * 1.5, y - p.y)), 1)
    if (room > bestRoom) {
      bestRoom = room
      best = { x, y }
    }
  }
  return { x: round2(best.x), y: round2(best.y) }
}

function around(x: number, y: number, rx: number, ry: number) {
  return { x0: x - rx, x1: x + rx, y0: y - ry, y1: y + ry }
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

function flowersPhrase(flowers: readonly PlantSpot[]): string {
  const type = flowers[0].type
  return flowers.every((f) => f.type === type) ? `${numberWord(flowers.length)} ${variantOf(type).plural}` : 'flowers'
}

/** A thoughtful suggestion from simple rules, chosen by what is planted. */
export function suggestLocally(plants: readonly PlantSpot[], seed: number): Suggestion {
  const rand = seeded(seed)
  const of = (c: string) => plants.filter((p) => categoryOf(p.type) === c)
  const flowers = of('flower')
  const trees = of('tree')
  const left = plants.filter((p) => p.x < 0.45).length
  const right = plants.filter((p) => p.x > 0.55).length
  const lopsided = (side: number, other: number) => plants.length >= 4 && other === 0 && side >= plants.length * 0.75
  const leaning = lopsided(left, right) ? 'left' : lopsided(right, left) ? 'right' : null
  const ideas: (() => Suggestion)[] = []

  if (flowers.length === 0) {
    ideas.push(() => {
      const type = (['poppy', 'tulip', 'daisy'] as const)[Math.floor(rand() * 3)]
      const tree = trees[0]
      const at = tree ? openSpot(plants, around(tree.x, tree.y + 0.1, 0.1, 0.05), rand) : openSpot(plants, { x0: 0.2, x1: 0.8, y0: 0.6, y1: 0.85 }, rand)
      const line = tree
        ? `Your ${nameOf(tree.type)} could use some color at its feet. ${capital(withArticle(nameOf(type)))}, maybe?`
        : `Nothing here flowers yet. ${capital(withArticle(nameOf(type)))} would be the first.`
      return { type, ...at, line }
    })
  }
  if (leaning) {
    ideas.push(() => {
      const type: PlantType = trees.length ? 'round-bush' : 'pine'
      const other = leaning === 'left' ? 'right' : 'left'
      const at = openSpot(plants, other === 'right' ? { x0: 0.6, x1: 0.92, y0: 0.5, y1: 0.85 } : { x0: 0.08, x1: 0.4, y0: 0.5, y1: 0.85 }, rand)
      return { type, ...at, line: `Everything has gathered on the ${leaning}. ${capital(withArticle(nameOf(type)))} on the ${other} would keep it company.` }
    })
  }
  if (flowers.length >= 3 && trees.length === 0) {
    ideas.push(() => {
      const type: PlantType = rand() < 0.5 ? 'willow' : 'oak'
      const y = Math.min(...flowers.map((f) => f.y)) - 0.12
      const at = openSpot(plants, around(mean(flowers.map((f) => f.x)), y, 0.08, 0.03), rand)
      return { type, ...at, line: `Your ${flowersPhrase(flowers)} have no shade yet. ${capital(withArticle(nameOf(type)))} behind them would give some.` }
    })
  }
  if (flowers.length >= 3 && !plants.some((p) => p.type === 'flat-stone' || p.type === 'round-stone')) {
    ideas.push(() => {
      const y = Math.max(...flowers.map((f) => f.y)) + 0.08
      const at = openSpot(plants, around(mean(flowers.map((f) => f.x)), y, 0.1, 0.02), rand)
      return { type: 'flat-stone', ...at, line: `There is nowhere to sit near your ${flowersPhrase(flowers)} yet. A flat stone would do.` }
    })
  }
  if (trees.length > 0 && of('mushroom').length === 0) {
    ideas.push(() => {
      const tree = trees[Math.floor(rand() * trees.length)]
      const at = openSpot(plants, around(tree.x, tree.y + 0.04, 0.07, 0.02), rand)
      return { type: 'toadstool', ...at, line: `Toadstools like the shade under your ${nameOf(tree.type)}.` }
    })
  }
  if (flowers.length > 0 && !plants.some((p) => p.type === 'lavender')) {
    ideas.push(() => {
      const at = openSpot(plants, { x0: 0.15, x1: 0.85, y0: 0.8, y1: 0.93 }, rand)
      return { type: 'lavender', ...at, line: 'Butterflies love lavender. Some near the front would bring them closer.' }
    })
  }
  ideas.push(() => {
    const flowerTypes = PLANT_TYPES.filter((t) => categoryOf(t) === 'flower')
    const type = [...flowerTypes].sort((a, b) => plants.filter((p) => p.type === a).length - plants.filter((p) => p.type === b).length)[0]
    const at = openSpot(plants, { x0: X_MIN, x1: X_MAX, y0: Y_MIN, y1: Y_MAX }, rand)
    return { type, ...at, line: `There is a quiet patch ${describeArea(at.x, at.y)}. ${capital(withArticle(nameOf(type)))} would fill it gently.` }
  })

  const pick = Math.floor(clamp(seed, 0, 0.999) * Math.min(2, ideas.length))
  return ideas[pick]()
}

const UNTRUSTED_LINE = /\b(ai|a\.i\.|assistant|language model|model|generat\w*|algorithm\w*|prompt)\b|<|>|https?:|www\./i
// Butterflies and fireflies are the garden's only visitors; a line promising others would not come true.
const ABSENT_VISITORS = /\b(bees?|bumblebees?|birds?|hummingbirds?|robins?|squirrels?|rabbits?|hedgehogs?|frogs?|deer|ladybirds?|ladybugs?|moths?|wasps?)\b/i

/** Validates a suggestion from outside this module (the route reply, or the model's JSON). */
export function parseSuggestion(value: unknown): Suggestion | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (!isPlantType(v.type) || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.line !== 'string') return null
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || v.x < 0 || v.x > 1 || v.y < 0 || v.y > 1) return null
  const line = v.line
    .trim()
    .replace(/^["'“‘]+|["'”’]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(round|flat|berry)-(stone|bush)\b/gi, '$1 $2')
    .trim()
  if (line.length < LINE_MIN || line.length > LINE_MAX || UNTRUSTED_LINE.test(line) || ABSENT_VISITORS.test(line)) return null
  return { type: v.type, x: round2(clamp(v.x, X_MIN, X_MAX)), y: round2(clamp(v.y, Y_MIN, Y_MAX)), line }
}

/** Moves a suggestion that would sit on top of a plant to open ground nearby. */
export function settleSpot(suggestion: Suggestion, plants: readonly PlantSpot[]): Suggestion {
  const crowded = plants.some((p) => Math.hypot((suggestion.x - p.x) * 1.5, suggestion.y - p.y) < 0.07)
  if (!crowded) return suggestion
  return { ...suggestion, ...openSpot(plants, around(suggestion.x, suggestion.y, 0.12, 0.08), seeded(0.37)) }
}

export function parseSuggestionReply(text: string): Suggestion | null {
  const json = text.match(/\{[^{}]*\}/)
  if (!json) return null
  try {
    return parseSuggestion(JSON.parse(json[0]))
  } catch {
    return null
  }
}

export function buildSuggestionPrompt(plants: readonly PlantSpot[], season: Season): string {
  const recent = plants.slice(-PROMPT_PLANTS)
  const asPlants: Plant[] = recent.map((p, i) => ({ ...p, id: String(i), scale: 1, colorSeed: 0, phase: 0, plantedAt: 0 }))
  const lines = asPlants.map((p) => `- ${nameOf(p.type)}: ${describePlace(p, asPlants)} (x ${p.x.toFixed(2)}, y ${p.y.toFixed(2)})`)

  return `You are an old, kind gardener looking over someone's shoulder at the small meadow garden they are planting. It is ${season}.

What they have planted so far, oldest first:
${lines.join('\n')}

Suggest ONE thing to add, chosen because of something they planted: shade for flowers, somewhere to sit, company for an empty side, something for the butterflies, a quiet gap that wants filling, or a plant that likes to grow near one of theirs.
The only creatures that visit this garden are butterflies by day and fireflies at night. Never mention any other animal, such as bees or birds.

Plant types you may choose (id, then its name to use in your line): ${joinWords(PLANT_TYPES.map((t) => `${t} (${nameOf(t)})`))}.
Coordinates: x runs from 0.05 (left) to 0.95 (right); y runs from ${Y_MIN} (the back, near the horizon at ${GROUND_TOP}) to ${Y_MAX} (the front). Choose open ground near the plant your line is about, leaving room: at least 0.08 away from every plant.

Reply with only JSON: {"type": "plant-type", "x": 0.5, "y": 0.7, "line": "..."}
The line is one or two short sentences, at most 16 words, speaking to them as "you": name something they planted and why the new plant suits it. Plain, warm words. No exclamation marks. Never mention balance, composition, design, suggestions or yourself.`
}
