/**
 * The Gardener in words: where a spot is, what is planted, and the line a
 * visitor is left with after sitting. Used for screen readers and suggestions.
 */

import { GROUND_TOP, categoryOf, variantOf, type Plant, type PlantType, type Season } from './garden'

const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const DAY = 86_400_000
// The meadow is drawn about one and a half times wider than it is tall.
const ASPECT = 1.5
const NEAR = 0.2
const BESIDE = 0.02

export function numberWord(n: number): string {
  return NUMBERS[n] ?? String(n)
}

export function nameOf(type: PlantType): string {
  return variantOf(type).label.toLowerCase()
}

export function withArticle(word: string): string {
  return `${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}`
}

export function countOf(n: number, type: PlantType): string {
  if (n === 1) return type === 'lavender' ? 'some lavender' : withArticle(nameOf(type))
  return `${numberWord(n)} ${variantOf(type).plural}`
}

export function joinWords(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "near the front, on the left", "in the very middle", ... */
export function describeArea(x: number, y: number): string {
  const depth = (y - GROUND_TOP) / (1 - GROUND_TOP)
  const row = depth < 0.25 ? 'back' : depth < 0.6 ? 'middle' : 'front'
  const column = x < 0.34 ? 'left' : x < 0.67 ? 'center' : 'right'
  if (row === 'middle' && column === 'center') return 'in the very middle'
  const rowWords = row === 'back' ? 'at the back' : row === 'front' ? 'near the front' : 'in the middle'
  const columnWords = column === 'center' ? 'in the center' : `on the ${column}`
  return `${rowWords}, ${columnWords}`
}

function relationTo(x: number, y: number, others: readonly Plant[]): string | null {
  let nearest: Plant | null = null
  let best = NEAR
  for (const p of others) {
    const d = Math.hypot((x - p.x) * ASPECT, y - p.y)
    if (d < best) {
      best = d
      nearest = p
    }
  }
  if (!nearest) return null
  const ref = nearest
  const sameKind = others.filter((p) => p.type === ref.type).length
  const name = sameKind > 1 ? `one of the ${variantOf(ref.type).plural}` : `the ${nameOf(ref.type)}`
  const dx = (x - ref.x) * ASPECT
  const dy = y - ref.y
  if (best < BESIDE) return `beside ${name}`
  if (Math.abs(dx) > Math.abs(dy)) return `${dx < 0 ? 'just left of' : 'just right of'} ${name}`
  return `${dy < 0 ? 'behind' : 'in front of'} ${name}`
}

/** A full sentence for an empty spot on the meadow, such as the keyboard cursor. */
export function describeSpot(x: number, y: number, plants: readonly Plant[]): string {
  return `${capitalize(describeArea(x, y))}, ${relationTo(x, y, plants) ?? 'on open grass'}.`
}

/** Where a planted thing stands, relative to its neighbours. */
export function describePlace(plant: Plant, plants: readonly Plant[]): string {
  const relation = relationTo(plant.x, plant.y, plants.filter((p) => p.id !== plant.id))
  const area = describeArea(plant.x, plant.y)
  return relation ? `${area}, ${relation}` : area
}

export function gardenSummary(plants: readonly Plant[]): string {
  if (plants.length === 0) return 'nothing yet'
  const counts = new Map<PlantType, number>()
  for (const p of plants) counts.set(p.type, (counts.get(p.type) ?? 0) + 1)
  return joinWords([...counts].map(([type, n]) => countOf(n, type)))
}

function inventory(plants: readonly Plant[]): string {
  const of = (test: (p: Plant) => boolean) => plants.filter(test)
  const flowers = of((p) => categoryOf(p.type) === 'flower').length
  const trees = of((p) => categoryOf(p.type) === 'tree')
  const bushes = of((p) => categoryOf(p.type) === 'bush').length
  const mushrooms = of((p) => categoryOf(p.type) === 'mushroom')
  const stones = of((p) => p.type === 'round-stone' || p.type === 'flat-stone').length
  const crystals = of((p) => p.type === 'crystal').length

  const parts: string[] = []
  if (flowers) parts.push(flowers === 1 ? 'a flower' : `${numberWord(flowers)} flowers`)
  if (trees.length) parts.push(trees.length === 1 ? withArticle(nameOf(trees[0].type)) : `${numberWord(trees.length)} trees`)
  if (bushes) parts.push(bushes === 1 ? 'a bush' : `${numberWord(bushes)} bushes`)
  if (mushrooms.length) parts.push(mushrooms.length === 1 && mushrooms[0].type === 'toadstool' ? 'a toadstool' : 'some mushrooms')
  if (stones) parts.push(stones === 1 ? 'a stone to rest on' : `${numberWord(stones)} stones`)
  if (crystals) parts.push(crystals === 1 ? 'a crystal' : `${numberWord(crystals)} crystals`)
  return joinWords(parts)
}

type VisitorKind = 'butterfly' | 'firefly'

export interface SitMoment {
  plants: readonly Plant[]
  /** Visiting by the end of the sit. */
  visitors: number
  visitorKind: VisitorKind
  /** Already visiting when they sat down; the rest arrived while they sat. */
  before: number
  kindBefore: VisitorKind
  season: Season
  /** When the oldest thing in the garden was planted. */
  since: number
  now: number
}

function some(count: number, kind: VisitorKind): string {
  const plural = kind === 'butterfly' ? 'butterflies' : 'fireflies'
  return count === 1 ? `a ${kind}` : `${numberWord(count)} ${plural}`
}

function visitorsLine({ visitors, visitorKind, before, kindBefore }: SitMoment): string {
  if (visitors === 0) return 'It was quiet, and that was enough.'
  if (before === 0) return `${capitalize(some(visitors, visitorKind))} came while you sat.`
  if (kindBefore !== visitorKind) {
    const earlier = before === 1 ? `The ${kindBefore}` : `The ${kindBefore === 'butterfly' ? 'butterflies' : 'fireflies'}`
    return `${earlier} gave way to ${some(visitors, visitorKind)} as the light went.`
  }
  if (visitors <= before) return `${capitalize(some(visitors, visitorKind))} stayed the whole time.`
  return `${capitalize(some(before, visitorKind))} ${before === 1 ? 'was' : 'were'} here when you sat down, and ${visitors - before === 1 ? 'another' : 'others'} came to join ${before === 1 ? 'it' : 'them'}.`
}

/** The single line someone is left with after sitting with their garden. */
export function sitLine(moment: SitMoment): string {
  const { plants, season, since, now } = moment
  const garden = `${capitalize(withArticle(season))} garden: ${inventory(plants)}.`
  const stayed = visitorsLine(moment)
  const days = Math.floor(Math.max(0, now - since) / DAY)
  const time = days === 0
    ? 'You planted all of it today.'
    : `You have been tending it for ${days === 1 ? 'a day' : `${numberWord(days)} days`}.`
  return `${garden} ${stayed} ${time}`
}
