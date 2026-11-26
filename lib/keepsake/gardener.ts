import { GROUND_TOP, categoryOf, growthFactor, type Plant, type PlantType, type Season, type TimeOfDay } from '@/lib/games/calm-garden/garden'
import { gardenSummary, numberWord } from '@/lib/games/calm-garden/describe'
import { pickBySeed } from '@/lib/games/calm-garden/colours'
import type { VisitorKind } from '@/lib/games/calm-garden/moments'
import { KEEPSAKE_WIDTH, PIXEL, framedKeepsake, hashString, keepsakeDay, keepsakeFileName, mix, seededRandom, type Ink, type KeepsakeOp, type KeepsakePlan } from './plan'

/** The picture side of the postcard, in keepsake units. */
export const VIEW = { left: 120, top: 232, width: KEEPSAKE_WIDTH - 240, height: 600 }
const HORIZON = VIEW.top + VIEW.height * GROUND_TOP

// The garden is lit the same on either paper, so it is printed in the glass inks: the dark palette's pastels and darks.
const SKY: Record<TimeOfDay, readonly [Ink, Ink]> = {
  morning: [mix('glass-moss', 0.45, 'glass-ink'), mix('glass-brass', 0.3, 'glass-ink')],
  day: [mix('glass-clay', 0.75, 'glass-ink'), mix('glass-brass', 0.5, 'glass-ink')],
  evening: [mix('glass-dusk', 0.3, 'glass-well'), mix('glass-clay', 0.75, 'glass-flesh')],
  night: ['glass-well', mix('glass-dusk', 0.3, 'glass-well')],
}
/** How much of the darkest ink each strip of ground carries, by the hour. */
const SHADE: Record<TimeOfDay, readonly [number, number, number]> = {
  morning: [0.1, 0.2, 0.3],
  day: [0.2, 0.32, 0.44],
  evening: [0.5, 0.58, 0.66],
  night: [0.62, 0.7, 0.78],
}
const LEAF: Ink = mix('glass-rind', 0.65, 'glass-moss')
const CANOPY: Record<Season, Ink> = {
  spring: 'glass-moss',
  summer: mix('glass-rind', 0.7, 'glass-well'),
  autumn: 'glass-clay',
  winter: mix('glass-moss', 0.5, 'glass-ink-soft'),
}
// The canopy's colours taken deeper, so the season's name reads on the stamp.
const STAMP: Record<Season, Ink> = {
  spring: mix('glass-moss', 0.4, 'glass-well'),
  summer: mix('glass-rind', 0.35, 'glass-well'),
  autumn: mix('glass-clay', 0.45, 'glass-well'),
  winter: mix('glass-dusk', 0.4, 'glass-well'),
}
const STEM: Ink = mix('glass-moss', 0.6, 'glass-well')
const WOOD: Ink = mix('glass-clay', 0.5, 'glass-well')
const NIGHT_LIGHT: Ink = 'glass-ink'
// Tulips and poppies take the colour the garden gave them; the rest are always the same colour there too
const PETALS: readonly Ink[] = ['glass-flesh', 'glass-clay', 'glass-brass', 'glass-dusk', 'glass-seed']
const PETAL: Partial<Record<PlantType, Ink>> = { daisy: 'glass-ink', lavender: 'glass-dusk', sunflower: 'glass-brass' }

const FIREFLY: Ink = mix('glass-brass', 0.5, 'glass-ink')

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

function land(timeOfDay: TimeOfDay): KeepsakeOp[] {
  const [skyTop, skyLow] = SKY[timeOfDay]
  const ops: KeepsakeOp[] = []
  const bands = 10
  const skyH = HORIZON - VIEW.top
  for (let i = 0; i < bands; i++) {
    ops.push({ kind: 'rect', x: VIEW.left, y: VIEW.top + (skyH * i) / bands, w: VIEW.width, h: skyH / bands + PIXEL, ink: mix(skyLow, i / (bands - 1), skyTop) })
  }
  const orbX = VIEW.left + VIEW.width * 0.2
  const orbY = VIEW.top + skyH * 0.42
  ops.push({ kind: 'disc', x: orbX, y: orbY, r: 34, ink: timeOfDay === 'night' ? NIGHT_LIGHT : mix('glass-brass', 0.4, 'glass-ink'), alpha: timeOfDay === 'night' ? 1 : 0.9 })
  if (timeOfDay === 'night') {
    const random = seededRandom(7)
    for (let i = 0; i < 14; i++) {
      ops.push({ kind: 'rect', x: VIEW.left + 30 + random() * (VIEW.width - 60), y: VIEW.top + 20 + random() * (skyH - 60), w: 6, h: 6, ink: NIGHT_LIGHT, alpha: 0.5 + random() * 0.5 })
    }
  }
  const groundH = VIEW.top + VIEW.height - HORIZON
  SHADE[timeOfDay].forEach((shade, i) => {
    ops.push({ kind: 'rect', x: VIEW.left, y: HORIZON + (groundH * i) / 3, w: VIEW.width, h: groundH / 3 + PIXEL, ink: mix('glass-well', shade, LEAF) })
  })
  return ops
}

function plantOps(plant: Plant, season: Season, now: number): KeepsakeOp[] {
  // The same place across the picture as in the garden itself
  const x = VIEW.left + plant.x * VIEW.width
  const y = VIEW.top + plant.y * VIEW.height
  const depth = (plant.y - GROUND_TOP) / (1 - GROUND_TOP)
  const s = (1.2 + depth * 1.2) * Math.max(0.6, plant.scale) * growthFactor(plant, now)
  switch (categoryOf(plant.type)) {
    case 'flower':
      return [
        { kind: 'rect', x: x - 3 * s, y: y - 40 * s, w: 6 * s, h: 40 * s, ink: STEM },
        { kind: 'disc', x, y: y - 44 * s, r: 14 * s, ink: PETAL[plant.type] ?? pickBySeed(PETALS, plant.colorSeed) },
        { kind: 'disc', x, y: y - 44 * s, r: 5 * s, ink: plant.type === 'sunflower' ? WOOD : 'glass-brass' },
      ]
    case 'tree': {
      const canopy = CANOPY[season]
      if (plant.type === 'pine') {
        return [
          { kind: 'rect', x: x - 6 * s, y: y - 30 * s, w: 12 * s, h: 30 * s, ink: WOOD },
          { kind: 'poly', points: [[x, y - 150 * s], [x + 48 * s, y - 24 * s], [x - 48 * s, y - 24 * s]], ink: season === 'autumn' ? STEM : canopy },
        ]
      }
      return [
        { kind: 'rect', x: x - 8 * s, y: y - 70 * s, w: 16 * s, h: 70 * s, ink: WOOD },
        plant.type === 'willow'
          ? { kind: 'ellipse', x, y: y - 84 * s, rx: 50 * s, ry: 60 * s, angle: 0, ink: canopy }
          : { kind: 'disc', x, y: y - 96 * s, r: 52 * s, ink: canopy },
      ]
    }
    case 'stone':
      return plant.type === 'crystal'
        ? [{ kind: 'poly', points: [[x, y - 40 * s], [x + 14 * s, y - 10 * s], [x, y], [x - 14 * s, y - 10 * s]], ink: mix('glass-moss', 0.5, 'glass-ink') }]
        : [{ kind: 'ellipse', x, y: y - 8 * s, rx: (plant.type === 'flat-stone' ? 26 : 18) * s, ry: (plant.type === 'flat-stone' ? 8 : 14) * s, angle: 0, ink: 'glass-ink-soft' }]
    case 'mushroom':
      return [
        { kind: 'rect', x: x - 4 * s, y: y - 20 * s, w: 8 * s, h: 20 * s, ink: 'glass-ink' },
        { kind: 'ellipse', x, y: y - 22 * s, rx: 18 * s, ry: 10 * s, angle: 0, ink: plant.colorSeed > 0.5 ? 'glass-flesh' : 'glass-dusk' },
      ]
    case 'bush': {
      const ops: KeepsakeOp[] = [{ kind: 'ellipse', x, y: y - 22 * s, rx: 36 * s, ry: 24 * s, angle: 0, ink: season === 'autumn' ? mix('glass-brass', 0.5, 'glass-rind') : CANOPY.summer }]
      if (plant.type === 'berry-bush') {
        for (const [ox, oy] of [[-14, -26], [8, -32], [16, -18], [-4, -14]]) ops.push({ kind: 'disc', x: x + ox * s, y: y + oy * s, r: 4 * s, ink: 'glass-flesh' })
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
      ops.push({ kind: 'disc', x, y, r: 16, ink: FIREFLY, alpha: 0.35 }, { kind: 'disc', x, y, r: 6, ink: FIREFLY })
    } else {
      const wing: Ink = i % 2 ? 'glass-clay' : 'glass-dusk'
      ops.push(
        { kind: 'ellipse', x: x - 9, y, rx: 10, ry: 14, angle: -0.4, ink: wing },
        { kind: 'ellipse', x: x + 9, y, rx: 10, ry: 14, angle: 0.4, ink: wing },
        { kind: 'rect', x: x - 2, y: y - 10, w: 4, h: 20, ink: 'glass-well' },
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
    { kind: 'rect', x: x - 6, y: y - 6, w: w + 12, h: h + 12, ink: 'glass-ink' },
    { kind: 'rect', x, y, w, h, ink: STAMP[season] },
    { kind: 'text', x: x + w / 2, y: y + h / 2 + 10, text: `${season.charAt(0).toUpperCase()}${season.slice(1)}`, size: 28, ink: 'glass-ink', font: 'display', align: 'center', weight: 700 },
  ]
}

/** A postcard of someone's own garden after they sat with it: its season, its light, and who came. */
export function gardenerKeepsake({ plants, season, timeOfDay, visitors, visitorKind, line, day }: GardenerKeepsakeInput): KeepsakePlan {
  const now = day.getTime()
  const seed = hashString(plants.map((p) => p.id).join('|'))
  // Further plants first, so nearer ones stand in front.
  const ordered = [...plants].sort((a, b) => a.y - b.y)
  const art: KeepsakeOp[] = [
    { kind: 'rect', x: VIEW.left + 14, y: VIEW.top + 14, w: VIEW.width, h: VIEW.height, ink: 'rule', b: true },
    ...land(timeOfDay),
    ...ordered.flatMap((plant) => plantOps(plant, season, now)),
    ...visitorOps(visitors, visitorKind, seed),
    ...stamp(season),
    { kind: 'rect', x: VIEW.left + 60, y: VIEW.top + VIEW.height + 72, w: VIEW.width - 120, h: 3, ink: 'rule' },
    {
      kind: 'text',
      x: KEEPSAKE_WIDTH / 2,
      y: VIEW.top + VIEW.height + 130,
      text: line,
      size: 36,
      ink: 'ink',
      font: 'sans',
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
