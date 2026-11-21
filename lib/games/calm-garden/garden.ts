/**
 * The Gardener: the garden itself, independent of how it is drawn.
 * Positions are normalised 0..1 across the meadow; y below GROUND_TOP is sky.
 */

export const STORAGE_KEY = 'verygoodmelon:calm-garden'

/** Normalised y of the drawn horizon. Planting starts here; above it is sky. */
export const GROUND_TOP = 0.33

export type PlantCategory = 'flower' | 'tree' | 'stone' | 'mushroom' | 'bush'

export const PLANT_VARIANTS = [
  { category: 'flower', id: 'daisy', label: 'Daisy', plural: 'daisies' },
  { category: 'flower', id: 'tulip', label: 'Tulip', plural: 'tulips' },
  { category: 'flower', id: 'poppy', label: 'Poppy', plural: 'poppies' },
  { category: 'flower', id: 'lavender', label: 'Lavender', plural: 'lavender plants' },
  { category: 'flower', id: 'sunflower', label: 'Sunflower', plural: 'sunflowers' },
  { category: 'tree', id: 'oak', label: 'Oak Tree', plural: 'oak trees' },
  { category: 'tree', id: 'pine', label: 'Pine Tree', plural: 'pine trees' },
  { category: 'tree', id: 'willow', label: 'Willow', plural: 'willows' },
  { category: 'stone', id: 'round-stone', label: 'Round Stone', plural: 'round stones' },
  { category: 'stone', id: 'flat-stone', label: 'Flat Stone', plural: 'flat stones' },
  { category: 'stone', id: 'crystal', label: 'Crystal', plural: 'crystals' },
  { category: 'mushroom', id: 'toadstool', label: 'Toadstool', plural: 'toadstools' },
  { category: 'mushroom', id: 'cluster', label: 'Mushroom Cluster', plural: 'mushroom clusters' },
  { category: 'bush', id: 'round-bush', label: 'Round Bush', plural: 'round bushes' },
  { category: 'bush', id: 'berry-bush', label: 'Berry Bush', plural: 'berry bushes' },
] as const satisfies readonly { category: PlantCategory; id: string; label: string; plural: string }[]

export type PlantVariant = (typeof PLANT_VARIANTS)[number]
export type PlantType = PlantVariant['id']

export const PLANT_TYPES: readonly PlantType[] = PLANT_VARIANTS.map((v) => v.id)

export function isPlantType(value: unknown): value is PlantType {
  return typeof value === 'string' && (PLANT_TYPES as readonly string[]).includes(value)
}

export function variantOf(type: PlantType): PlantVariant {
  return PLANT_VARIANTS.find((v) => v.id === type) ?? PLANT_VARIANTS[0]
}

export function categoryOf(type: PlantType): PlantCategory {
  return variantOf(type).category
}

export interface Plant {
  id: string
  type: PlantType
  x: number
  y: number
  scale: number
  colorSeed: number
  phase: number
  plantedAt: number
  /** Came up by itself between visits. */
  selfSown?: true
}

export interface Garden {
  version: 2
  plants: Plant[]
  lastVisit: number
}

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export function timeOfDayAt(date: Date): TimeOfDay {
  const hour = date.getHours()
  if (hour >= 5 && hour < 9) return 'morning'
  if (hour >= 9 && hour < 17) return 'day'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

export function seasonAt(date: Date, southern = false): Season {
  const month = (date.getMonth() + (southern ? 6 : 0)) % 12
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

// Time zones whose people live mostly south of the equator, outside the tropics where
// seasons are felt as the calendar says. Anything unlisted is treated as northern.
const SOUTHERN_ZONES = /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham|Norfolk)$|^America\/(Argentina\/.+|Buenos_Aires|Sao_Paulo|Montevideo|Santiago|Punta_Arenas|Asuncion)$|^Africa\/(Johannesburg|Maseru|Mbabane|Windhoek|Gaborone|Maputo|Harare|Lusaka)$|^Indian\/(Mauritius|Reunion|Antananarivo)$/

export function isSouthernTimeZone(timeZone: string): boolean {
  return SOUTHERN_ZONES.test(timeZone)
}

const HOUR = 3_600_000
const DAY = 24 * HOUR
const MAX_PLANTS = 400
const MAX_SELF_SOWN = 4
const DAYS_TO_GROW = 4
const GROWTH: Record<PlantCategory, number> = { tree: 0.35, bush: 0.2, flower: 0.15, mushroom: 0.12, stone: 0 }
const GREW: Record<PlantCategory, string> = {
  tree: 'grew a little taller',
  bush: 'filled out a little',
  flower: 'opened a little wider',
  mushroom: 'came up a little more',
  stone: '',
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function isLiving(type: PlantType): boolean {
  return categoryOf(type) !== 'stone'
}

export function livingCount(plants: readonly Plant[]): number {
  return plants.filter((p) => isLiving(p.type)).length
}

/** Flowers and berries are what butterflies (and, at night, fireflies) come for. */
export function visitorHosts(plants: readonly Plant[]): Plant[] {
  return plants.filter((p) => categoryOf(p.type) === 'flower' || p.type === 'berry-bush')
}

export function visitorCount(plants: readonly Plant[], sitting: boolean): number {
  const hosts = visitorHosts(plants).length
  if (!sitting) return Math.min(3, Math.floor(hosts / 3))
  if (livingCount(plants) === 0) return 0
  if (hosts === 0) return 1
  return Math.min(5, Math.floor(hosts / 3) + 2)
}

/** How much bigger a plant has grown since it went in; full size after a few days. */
export function growthFactor(plant: Plant, now: number): number {
  const days = Math.max(0, now - plant.plantedAt) / DAY
  return 1 + GROWTH[categoryOf(plant.type)] * Math.min(1, days / DAYS_TO_GROW)
}

export function createPlant(type: PlantType, x: number, y: number, now: number, rand: () => number): Plant {
  return {
    id: `${now.toString(36)}-${Math.floor(rand() * 1e6).toString(36)}`,
    type,
    x: clamp(x, 0, 1),
    y: clamp(y, GROUND_TOP, 1),
    scale: 0.85 + rand() * 0.3,
    colorSeed: rand(),
    phase: rand() * Math.PI * 2,
    plantedAt: now,
  }
}

export function emptyGarden(now: number): Garden {
  return { version: 2, plants: [], lastVisit: now }
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function readPlant(raw: unknown, now: number): Plant | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  // Version 1 stored the whole variant object; version 2 stores only its id.
  const type = r.type ?? (r.variant as { id?: unknown } | undefined)?.id
  if (!isPlantType(type) || !finite(r.x) || !finite(r.y)) return null
  const plantedAt = finite(r.plantedAt) ? r.plantedAt : finite(r.placedAt) ? r.placedAt : 0
  return {
    id: typeof r.id === 'string' ? r.id.slice(0, 40) : `${type}-${r.x}-${r.y}`,
    type,
    x: clamp(r.x, 0, 1),
    y: clamp(r.y, GROUND_TOP, 1),
    scale: finite(r.scale) ? clamp(r.scale, 0.5, 1.5) : 1,
    colorSeed: finite(r.colorSeed) ? clamp(r.colorSeed, 0, 0.999) : 0.5,
    phase: finite(r.phase) ? r.phase : 0,
    plantedAt: plantedAt > 0 ? Math.min(plantedAt, now) : now,
    ...(r.selfSown === true ? { selfSown: true as const } : {}),
  }
}

export function loadGarden(raw: string | null, now: number): Garden {
  let data: unknown
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }
  if (!data || typeof data !== 'object') return emptyGarden(now)
  const d = data as Record<string, unknown>
  const list = Array.isArray(d.plants) ? d.plants : Array.isArray(d.elements) ? d.elements : null
  if (!list) return emptyGarden(now)

  const plants = list.slice(0, MAX_PLANTS).flatMap((p) => readPlant(p, now) ?? [])
  // Version 1 kept no visit time, so a migrated garden counts as visited just now.
  const lastVisit = d.version === 2 && finite(d.lastVisit) ? Math.min(d.lastVisit, now) : now
  return { version: 2, plants, lastVisit }
}

/** When the oldest thing still in the garden went in. */
export function plantedSince(plants: readonly Plant[], now: number): number {
  return plants.reduce((first, p) => Math.min(first, p.plantedAt), now)
}

/**
 * Opening the garden again after a while: plants have grown, and after a night
 * away a flower may have seeded itself. Returns a short note about what changed.
 */
export function returnToGarden(garden: Garden, now: number, rand: () => number): { garden: Garden; note: string | null } {
  const away = now - garden.lastVisit
  const next: Garden = { ...garden, lastVisit: now }
  if (away < 6 * HOUR || livingCount(garden.plants) === 0) return { garden: next, note: null }

  const changes: string[] = []
  let grower: Plant | null = null
  let most = 0.02
  for (const p of garden.plants) {
    const grew = growthFactor(p, now) - growthFactor(p, garden.lastVisit)
    if (grew > most) {
      most = grew
      grower = p
    }
  }
  if (grower) changes.push(`your ${variantOf(grower.type).label.toLowerCase()} ${GREW[categoryOf(grower.type)]}`)

  const flowers = garden.plants.filter((p) => categoryOf(p.type) === 'flower')
  const selfSown = garden.plants.filter((p) => p.selfSown).length
  if (away >= 12 * HOUR && flowers.length >= 2 && selfSown < MAX_SELF_SOWN) {
    const parent = flowers[Math.min(flowers.length - 1, Math.floor(rand() * flowers.length))]
    next.plants = [
      ...garden.plants,
      {
        ...parent,
        id: `sown-${now.toString(36)}`,
        x: clamp(parent.x + (rand() - 0.5) * 0.14, 0.04, 0.96),
        y: clamp(parent.y + (rand() - 0.5) * 0.08, GROUND_TOP + 0.03, 0.97),
        scale: parent.scale * 0.9,
        phase: parent.phase + 1.3,
        plantedAt: garden.lastVisit + away / 2,
        selfSown: true,
      },
    ]
    changes.push(`a new ${variantOf(parent.type).label.toLowerCase()} came up on its own`)
  }

  return { garden: next, note: changes.length ? `While you were away, ${changes.join(' and ')}.` : null }
}
