import { GROUND_TOP, categoryOf, growthFactor, type Plant, type PlantType, type Season, type TimeOfDay } from '@/lib/games/calm-garden/garden'
import { gardenSummary, numberWord } from '@/lib/games/calm-garden/describe'
import { petalColour } from '@/lib/games/calm-garden/colours'
import type { VisitorKind } from '@/lib/games/calm-garden/moments'
import { KEEPSAKE_WIDTH, PIXEL, framedKeepsake, hashString, keepsakeDay, keepsakeFileName, seededRandom, type KeepsakeOp, type KeepsakePlan } from './plan'

type Hex = `#${string}`

/** The picture side of the postcard, in keepsake units. */
export const VIEW = { left: 120, top: 232, width: KEEPSAKE_WIDTH - 240, height: 600 }
const HORIZON = VIEW.top + VIEW.height * GROUND_TOP

// The garden's own colours at the end of a sit, so the postcard looks like the place someone sat in.
const SKY: Record<TimeOfDay, [Hex, Hex]> = {
  morning: ['#a8d8f0', '#fff1d6'],
  day: ['#f2a86a', '#ffe1b0'],
  evening: ['#2e2a5a', '#d9806a'],
  night: ['#10112c', '#2a3768'],
}
const GROUND: Record<TimeOfDay, [Hex, Hex, Hex]> = {
  morning: ['#a3cf8a', '#7fb36a', '#5a9450'],
  day: ['#c2b462', '#9a9a4c', '#6f7a3a'],
  evening: ['#4f6a52', '#3c5642', '#2a3f30'],
  night: ['#35604a', '#2a5040', '#1c3a2c'],
}
const CANOPY: Record<Season, Hex> = { spring: '#5fbf8a', summer: '#40916c', autumn: '#d98e3b', winter: '#6f8f7a' }
// The canopy's colours taken deeper, so the season's name reads in cream on the stamp.
const STAMP: Record<Season, Hex> = { spring: '#2d6a4f', summer: '#1a4d2e', autumn: '#8f4a12', winter: '#3f5a4c' }
// Tulips and poppies take the colour the garden gave them; the rest are always the same colour there too
const PETAL: Partial<Record<PlantType, Hex>> = { daisy: '#f4f1ea', lavender: '#c792ea', sunflower: '#f2a83b' }

const LIGHT_WORDS: Record<TimeOfDay, string> = {
  morning: 'morning light',
  day: 'late afternoon gold',
  evening: 'dusk',
  night: 'moonlight',
}

export interface GardenerKeepsakeInput {
  plants: readonly Plant[]
  season: Season
  timeOfDay: TimeOfDay
  /** Visiting by the end of the sit. */
  visitors: number
  visitorKind: VisitorKind
  /** The line someone was left with after sitting. */
  line: string
  day: Date
}

function mix(a: Hex, b: Hex, k: number): Hex {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  const out = [0, 1, 2].map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * k).toString(16).padStart(2, '0'))
  return `#${out.join('')}`
}

function land(timeOfDay: TimeOfDay): KeepsakeOp[] {
  const [skyTop, skyLow] = SKY[timeOfDay]
  const ops: KeepsakeOp[] = []
  const bands = 10
  const skyH = HORIZON - VIEW.top
  for (let i = 0; i < bands; i++) {
    ops.push({ kind: 'rect', x: VIEW.left, y: VIEW.top + (skyH * i) / bands, w: VIEW.width, h: skyH / bands + PIXEL, ink: mix(skyTop, skyLow, i / (bands - 1)) })
  }
  const orbX = VIEW.left + VIEW.width * 0.2
  const orbY = VIEW.top + skyH * 0.42
  ops.push({ kind: 'disc', x: orbX, y: orbY, r: 34, ink: timeOfDay === 'night' ? '#f4f1de' : '#fff3c4', alpha: timeOfDay === 'night' ? 1 : 0.9 })
  if (timeOfDay === 'night') {
    const random = seededRandom(7)
    for (let i = 0; i < 14; i++) {
      ops.push({ kind: 'rect', x: VIEW.left + 30 + random() * (VIEW.width - 60), y: VIEW.top + 20 + random() * (skyH - 60), w: 6, h: 6, ink: '#fff6d8', alpha: 0.5 + random() * 0.5 })
    }
  }
  const grounds = GROUND[timeOfDay]
  const groundH = VIEW.top + VIEW.height - HORIZON
  grounds.forEach((ink, i) => {
    ops.push({ kind: 'rect', x: VIEW.left, y: HORIZON + (groundH * i) / 3, w: VIEW.width, h: groundH / 3 + PIXEL, ink })
  })
  return ops
}

function plantOps(plant: Plant, season: Season, now: number): KeepsakeOp[] {
  // The same place across the picture as in the garden itself
  const x = VIEW.left + plant.x * VIEW.width
  const y = VIEW.top + plant.y * VIEW.height
  const depth = (plant.y - GROUND_TOP) / (1 - GROUND_TOP)
  const s = (1.2 + depth * 1.2) * Math.max(0.6, plant.scale) * growthFactor(plant, now)
  const stem: Hex = '#2d6a4f'
  switch (categoryOf(plant.type)) {
    case 'flower':
      return [
        { kind: 'rect', x: x - 3 * s, y: y - 40 * s, w: 6 * s, h: 40 * s, ink: stem },
        { kind: 'disc', x, y: y - 44 * s, r: 14 * s, ink: PETAL[plant.type] ?? petalColour(plant.colorSeed) },
        { kind: 'disc', x, y: y - 44 * s, r: 5 * s, ink: plant.type === 'sunflower' ? '#5c3d2e' : '#f7d35c' },
      ]
    case 'tree': {
      const canopy = CANOPY[season]
      if (plant.type === 'pine') {
        return [
          { kind: 'rect', x: x - 6 * s, y: y - 30 * s, w: 12 * s, h: 30 * s, ink: '#6b4f36' },
          { kind: 'poly', points: [[x, y - 150 * s], [x + 48 * s, y - 24 * s], [x - 48 * s, y - 24 * s]], ink: season === 'autumn' ? '#2d6a4f' : canopy },
        ]
      }
      return [
        { kind: 'rect', x: x - 8 * s, y: y - 70 * s, w: 16 * s, h: 70 * s, ink: '#6b4f36' },
        plant.type === 'willow'
          ? { kind: 'ellipse', x, y: y - 84 * s, rx: 50 * s, ry: 60 * s, angle: 0, ink: canopy }
          : { kind: 'disc', x, y: y - 96 * s, r: 52 * s, ink: canopy },
      ]
    }
    case 'stone':
      return plant.type === 'crystal'
        ? [{ kind: 'poly', points: [[x, y - 40 * s], [x + 14 * s, y - 10 * s], [x, y], [x - 14 * s, y - 10 * s]], ink: '#9fd8e6' }]
        : [{ kind: 'ellipse', x, y: y - 8 * s, rx: (plant.type === 'flat-stone' ? 26 : 18) * s, ry: (plant.type === 'flat-stone' ? 8 : 14) * s, angle: 0, ink: '#9e9e9e' }]
    case 'mushroom':
      return [
        { kind: 'rect', x: x - 4 * s, y: y - 20 * s, w: 8 * s, h: 20 * s, ink: '#f5e6d3' },
        { kind: 'ellipse', x, y: y - 22 * s, rx: 18 * s, ry: 10 * s, angle: 0, ink: plant.colorSeed > 0.5 ? '#e63946' : '#c792ea' },
      ]
    case 'bush': {
      const ops: KeepsakeOp[] = [{ kind: 'ellipse', x, y: y - 22 * s, rx: 36 * s, ry: 24 * s, angle: 0, ink: season === 'autumn' ? '#7f9a46' : '#40916c' }]
      if (plant.type === 'berry-bush') {
        for (const [ox, oy] of [[-14, -26], [8, -32], [16, -18], [-4, -14]]) ops.push({ kind: 'disc', x: x + ox * s, y: y + oy * s, r: 4 * s, ink: '#c62f3c' })
      }
      return ops
    }
  }
}

function visitorOps(count: number, kind: VisitorKind, seed: number): KeepsakeOp[] {
  const random = seededRandom(seed)
  const ops: KeepsakeOp[] = []
  for (let i = 0; i < count; i++) {
    const x = VIEW.left + VIEW.width * (0.12 + ((i + random() * 0.6) / Math.max(1, count)) * 0.76)
    const y = HORIZON - 40 + random() * (VIEW.height * 0.4)
    if (kind === 'firefly') {
      ops.push({ kind: 'disc', x, y, r: 16, ink: '#fff6b0', alpha: 0.35 }, { kind: 'disc', x, y, r: 6, ink: '#fff6b0' })
    } else {
      const wing: Hex = i % 2 ? '#f7b267' : '#d4a5f5'
      ops.push(
        { kind: 'ellipse', x: x - 9, y, rx: 10, ry: 14, angle: -0.4, ink: wing },
        { kind: 'ellipse', x: x + 9, y, rx: 10, ry: 14, angle: 0.4, ink: wing },
        { kind: 'rect', x: x - 2, y: y - 10, w: 4, h: 20, ink: '#3a2a1e' },
      )
    }
  }
  return ops
}

/** A stamp in the corner of the picture, naming the season. */
function stamp(season: Season): KeepsakeOp[] {
  const w = 120
  const h = 140
  const x = VIEW.left + VIEW.width - w - 24
  const y = VIEW.top + 24
  return [
    { kind: 'rect', x: x - 6, y: y - 6, w: w + 12, h: h + 12, ink: '#fbf7f0' },
    { kind: 'rect', x, y, w, h, ink: STAMP[season] },
    { kind: 'text', x: x + w / 2, y: y + h / 2 + 10, text: season.toUpperCase(), size: 24, ink: '#fbf7f0', font: 'sans', align: 'center', weight: 700 },
  ]
}

/** A postcard of someone's own garden after they sat with it: its season, its light, and who came. */
export function gardenerKeepsake({ plants, season, timeOfDay, visitors, visitorKind, line, day }: GardenerKeepsakeInput): KeepsakePlan {
  const now = day.getTime()
  const seed = hashString(plants.map((p) => p.id).join('|'))
  // Further plants first, so nearer ones stand in front.
  const ordered = [...plants].sort((a, b) => a.y - b.y)
  const art: KeepsakeOp[] = [
    { kind: 'rect', x: VIEW.left + 14, y: VIEW.top + 14, w: VIEW.width, h: VIEW.height, ink: 'line' },
    ...land(timeOfDay),
    ...ordered.flatMap((plant) => plantOps(plant, season, now)),
    ...visitorOps(visitors, visitorKind, seed),
    ...stamp(season),
    { kind: 'rect', x: VIEW.left + 60, y: VIEW.top + VIEW.height + 72, w: VIEW.width - 120, h: 3, ink: 'line' },
    {
      kind: 'text',
      x: KEEPSAKE_WIDTH / 2,
      y: VIEW.top + VIEW.height + 130,
      text: line,
      size: 36,
      ink: 'ink',
      font: 'hand',
      align: 'center',
      maxWidth: VIEW.width - 40,
      lineHeight: 52,
      maxLines: 6,
    },
  ]

  const who = visitors === 0 ? 'no visitors, only quiet' : `${visitors === 1 ? 'a' : numberWord(visitors)} ${visitorKind === 'butterfly' ? (visitors === 1 ? 'butterfly' : 'butterflies') : visitors === 1 ? 'firefly' : 'fireflies'} among the plants`
  const alt = `A postcard of your ${season} garden in ${LIGHT_WORDS[timeOfDay]}: ${gardenSummary(plants)}, with ${who}. A stamp in the corner says ${season}. Written beneath: “${line}”`

  return framedKeepsake({
    title: 'The Gardener',
    subtitle: keepsakeDay(day),
    art,
    alt,
    text: line,
    fileName: keepsakeFileName('The Gardener', day),
  })
}
