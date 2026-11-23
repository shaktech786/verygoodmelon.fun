import { MOMENT_TITLES, joinNaturally, type Heard, type MomentRecord } from '@/lib/games/patient-one/today'
import { KEEPSAKE_WIDTH, framedKeepsake, hashString, keepsakeDay, keepsakeFileName, seededRandom, type KeepsakeOp, type KeepsakePlan } from './plan'

/**
 * A keepsake of one moment from The Patient One: a small picture of that moment (the eight
 * settled seeds only for the moment that had them), and whatever the player noticed in it,
 * set quietly beneath.
 */

const MID = KEEPSAKE_WIDTH / 2
const SEED_COUNT = 8

export interface BedSeed {
  x: number
  y: number
  rx: number
  ry: number
  angle: number
}

/** Eight seeds resting side by side on a bed, each tilted a little its own way. */
export function seedRow(key: string, centreY: number, width: number, size: number): BedSeed[] {
  const random = seededRandom(hashString(key))
  const step = width / SEED_COUNT
  const left = MID - width / 2 + step / 2
  return Array.from({ length: SEED_COUNT }, (_, i) => {
    const lift = random()
    return {
      x: left + i * step + (random() - 0.5) * step * 0.25,
      y: centreY - lift * size * 0.5,
      rx: size * 0.58,
      ry: size,
      angle: ((lift * 60 - 30) * Math.PI) / 180,
    }
  })
}

function seedOps(seeds: BedSeed[], bedY: number, bedWidth: number): KeepsakeOp[] {
  return [
    { kind: 'ellipse', x: MID, y: bedY, rx: bedWidth / 2, ry: 16, angle: 0, ink: 'paperDeep' },
    ...seeds.map((s): KeepsakeOp => ({ kind: 'ellipse', x: s.x, y: s.y, rx: s.rx, ry: s.ry, angle: s.angle, ink: 'ink', alpha: 0.72 })),
  ]
}

/** A tiny picture for each sound, about 100 units across around (x, y). */
export function soundIcon(sound: Heard, x: number, y: number): KeepsakeOp[] {
  switch (sound) {
    case 'Traffic':
      return [
        { kind: 'poly', points: [[x - 26, y - 8], [x - 14, y - 30], [x + 16, y - 30], [x + 30, y - 8]], ink: 'rind' },
        { kind: 'rect', x: x - 46, y: y - 10, w: 92, h: 30, ink: 'rind' },
        { kind: 'disc', x: x - 24, y: y + 22, r: 12, ink: 'ink' },
        { kind: 'disc', x: x + 24, y: y + 22, r: 12, ink: 'ink' },
      ]
    case 'Birds':
      return [
        { kind: 'line', points: [[x - 46, y - 2], [x - 26, y + 14], [x - 6, y - 2]], ink: 'ink', width: 8 },
        { kind: 'line', points: [[x + 6, y - 26], [x + 22, y - 12], [x + 38, y - 26]], ink: 'inkSoft', width: 7 },
      ]
    case 'Wind or rain':
      return [-30, -4, 22].flatMap((dx, i): KeepsakeOp[] => [
        { kind: 'line', points: [[x + dx + 12, y - 36 + i * 8], [x + dx - 8, y + 30 + i * 8]], ink: 'rindLight', width: 7, alpha: 0.8 },
      ])
    case 'Voices':
      return [
        { kind: 'disc', x: x - 16, y: y - 8, r: 28, ink: 'rindLight' },
        { kind: 'poly', points: [[x - 34, y + 10], [x - 40, y + 34], [x - 16, y + 18]], ink: 'rindLight' },
        { kind: 'disc', x: x + 26, y: y + 14, r: 22, ink: 'gold' },
        { kind: 'poly', points: [[x + 38, y + 26], [x + 46, y + 44], [x + 26, y + 34]], ink: 'gold' },
      ]
    case 'A hum or fan':
      return [
        ...[0, 1, 2].map((k): KeepsakeOp => {
          const a = (k * 2 * Math.PI) / 3 - Math.PI / 2
          return { kind: 'ellipse', x: x + Math.cos(a) * 22, y: y + Math.sin(a) * 22, rx: 12, ry: 24, angle: a + Math.PI / 2, ink: 'flesh' }
        }),
        { kind: 'disc', x, y, r: 10, ink: 'ink' },
      ]
    case 'My own breath':
      return [
        {
          kind: 'line',
          points: Array.from({ length: 17 }, (_, i) => [x - 48 + i * 6, y + Math.sin((i / 16) * Math.PI * 2) * 18] as const),
          ink: 'rind',
          width: 8,
        },
      ]
    case 'Almost nothing':
      return [
        { kind: 'disc', x, y, r: 36, ink: 'inkSoft' },
        { kind: 'disc', x, y, r: 29, ink: 'paper' },
      ]
  }
}

function text(y: number, value: string, size: number, extra: Partial<Extract<KeepsakeOp, { kind: 'text' }>> = {}): KeepsakeOp {
  return { kind: 'text', x: MID, y, text: value, size, ink: 'ink', font: 'serif', align: 'center', maxWidth: 840, ...extra }
}

const quiet = { ink: 'inkSoft', font: 'sans' } as const

function listenOps(heard: Heard[]): { ops: KeepsakeOp[]; words: string[] } {
  if (heard.length === 0) {
    return {
      ops: [
        text(640, 'A minute of listening to what was already here.', 44, { italic: true, lineHeight: 58, maxLines: 3 }),
      ],
      words: ['A minute of listening to what was already here.'],
    }
  }
  if (heard[0] === 'Almost nothing') {
    return {
      ops: [
        ...soundIcon('Almost nothing', MID, 640),
        text(800, 'Almost nothing.', 52),
        text(880, 'That kind of quiet is rarer than it sounds.', 36, { italic: true, ...quiet, font: 'serif' }),
      ],
      words: ['Almost nothing.', 'That kind of quiet is rarer than it sounds.'],
    }
  }
  const rows = heard.length > 4 ? [heard.slice(0, Math.ceil(heard.length / 2)), heard.slice(Math.ceil(heard.length / 2))] : [heard]
  const ops: KeepsakeOp[] = []
  rows.forEach((row, r) => {
    const y = (rows.length === 1 ? 640 : 560) + r * 210
    const step = Math.min(220, 860 / row.length)
    row.forEach((sound, i) => {
      const x = MID + (i - (row.length - 1) / 2) * step
      ops.push(...soundIcon(sound, x, y), { kind: 'text', x, y: y + 92, text: sound, size: 26, align: 'center', maxWidth: step - 16, maxLines: 2, lineHeight: 32, ...quiet })
    })
  })
  ops.push(text(rows.length === 1 ? 900 : 1010, 'Most of the day, they go unheard.', 38, { italic: true }))
  return { ops, words: [`I heard ${joinNaturally(heard.map((s) => (s === 'My own breath' ? 'my own breath' : s.toLowerCase())))}.`, 'Most of the day, they go unheard.'] }
}

function momentContent(record: MomentRecord): { ops: KeepsakeOp[]; words: string[] } {
  switch (record.id) {
    case 'watch':
      return {
        ops: [text(640, 'Eight seeds settled while I stayed still.', 40, { italic: true, lineHeight: 58, maxLines: 2 })],
        words: ['Eight seeds settled while I stayed still.'],
      }
    case 'listen':
      return listenOps(record.heard)
    case 'look':
      if (!record.lookedAt) {
        return { ops: [text(700, 'One thing, given a whole minute.', 44, { italic: true, lineHeight: 58, maxLines: 2 })], words: ['One thing, given a whole minute.'] }
      }
      return {
        ops: [
          text(560, 'I gave', 30, quiet),
          text(670, record.lookedAt, 60, { lineHeight: 72, maxLines: 2 }),
          text(820, 'a whole minute.', 40, { italic: true }),
          text(900, 'Most things get a glance.', 30, quiet),
        ],
        words: [`I gave ${record.lookedAt} a whole minute.`, 'Most things get a glance.'],
      }
    case 'reflect':
      if (record.feelings.length === 0) {
        return {
          ops: [text(700, 'A moment noticed, without needing to name it.', 44, { italic: true, lineHeight: 58, maxLines: 3 })],
          words: ['A moment noticed, without needing to name it.'],
        }
      }
      return {
        ops: [
          text(560, 'Right now', 30, quiet),
          text(670, record.feelings.join('  ·  '), 52, { lineHeight: 68, maxLines: 3 }),
          text(820, 'Whatever is here is allowed.', 36, { italic: true }),
        ],
        words: [`Right now: ${joinNaturally(record.feelings.map((w) => w.toLowerCase()))}.`, 'Whatever is here is allowed.'],
      }
    case 'appreciate': {
      if (record.things.length === 0) {
        return {
          ops: [text(700, 'Fifty seconds given to what is good today.', 44, { italic: true, lineHeight: 58, maxLines: 3 })],
          words: ['Fifty seconds given to what is good today.'],
        }
      }
      const gap = 150
      const top = 760 - ((record.things.length - 1) * gap) / 2
      const ops: KeepsakeOp[] = [text(top - 120, 'Today I noticed', 30, quiet)]
      record.things.forEach((thing, i) => {
        const y = top + i * gap
        ops.push(text(y, thing, 40, { lineHeight: 50, maxLines: 2 }))
      })
      return { ops, words: ['Today I noticed', ...record.things] }
    }
  }
}

// Between the date under the title and the site's name at the foot.
const ART_TOP = 200
const ART_BOTTOM = 1200

/** How far down the page an op reaches, top and bottom; wrapped text is estimated from its length. */
export function opExtent(op: KeepsakeOp): [number, number] {
  switch (op.kind) {
    case 'rect':
      return [op.y, op.y + op.h]
    case 'disc':
      return [op.y - op.r, op.y + op.r]
    case 'ellipse':
      return [op.y - Math.max(op.rx, op.ry), op.y + Math.max(op.rx, op.ry)]
    case 'poly':
    case 'line':
      return [Math.min(...op.points.map(([, y]) => y)), Math.max(...op.points.map(([, y]) => y))]
    case 'text': {
      const wrapped = op.maxWidth ? Math.ceil((op.text.length * op.size * 0.5) / op.maxWidth) : 1
      const lines = Math.max(1, Math.min(wrapped, op.maxLines ?? wrapped))
      return [op.y - op.size * 0.8, op.y + (lines - 1) * (op.lineHeight ?? op.size * 1.35) + op.size * 0.25]
    }
  }
}

function shifted(op: KeepsakeOp, dy: number): KeepsakeOp {
  if (op.kind === 'poly' || op.kind === 'line') return { ...op, points: op.points.map(([x, y]) => [x, y + dy] as const) }
  return { ...op, y: op.y + dy }
}

/** Moves the whole block so it sits in the middle of the space between the date and the signature. */
function centred(ops: KeepsakeOp[]): KeepsakeOp[] {
  const extents = ops.map(opExtent)
  const top = Math.min(...extents.map(([t]) => t))
  const bottom = Math.max(...extents.map(([, b]) => b))
  const dy = Math.round((ART_TOP + ART_BOTTOM) / 2 - (top + bottom) / 2)
  return ops.map((op) => shifted(op, dy))
}

const PICTURE_Y = 420
// The sky keeps its own colours in both themes, so a morning never reads as night on dark paper
const DAY_SKY = '#cfe3ee'
const NIGHT_SKY = '#1f2a44'
const GROUND = '#3f7d4f'
const MOON = '#f4ecd2'
const EYE_WHITE = '#f6f1e7'
const PUPIL = '#1a1a1a'

/** Rings of sound reaching a still point from both sides. */
function listenPicture(): KeepsakeOp[] {
  const arc = (r: number, side: 1 | -1): KeepsakeOp => ({
    kind: 'line',
    points: Array.from({ length: 9 }, (_, i) => {
      const a = ((i - 4) / 4) * 0.8
      return [MID + side * Math.cos(a) * r, PICTURE_Y + Math.sin(a) * r] as const
    }),
    ink: 'inkSoft',
    width: 8,
    alpha: 1 - r / 160,
  })
  return [{ kind: 'disc', x: MID, y: PICTURE_Y, r: 12, ink: 'ink' }, ...[40, 75, 110].flatMap((r) => [arc(r, 1), arc(r, -1)])]
}

/** An open eye resting on one thing. */
function lookPicture(): KeepsakeOp[] {
  const lid = (open: number, side: 1 | -1) =>
    Array.from({ length: 17 }, (_, i) => {
      const t = i / 16
      return [MID - 120 + t * 240, PICTURE_Y - side * Math.sin(t * Math.PI) * open] as const
    })
  return [
    { kind: 'poly', points: [...lid(66, 1), ...lid(66, -1).reverse()], ink: 'inkSoft' },
    { kind: 'poly', points: [...lid(56, 1), ...lid(56, -1).reverse()], ink: EYE_WHITE },
    { kind: 'disc', x: MID, y: PICTURE_Y, r: 38, ink: 'rind' },
    { kind: 'disc', x: MID, y: PICTURE_Y, r: 17, ink: PUPIL },
    { kind: 'disc', x: MID + 12, y: PICTURE_Y - 12, r: 6, ink: EYE_WHITE },
  ]
}

type PartOfDay = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night'

function partOfDay(hour: number): PartOfDay {
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 14) return 'midday'
  if (hour >= 14 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 20) return 'evening'
  return 'night'
}

/** The sky at the hour the moment was noticed: the sun along its arc by day, the moon and a few stars by night. */
function skyPicture(at: Date): { ops: KeepsakeOp[]; words: string } {
  const hour = at.getHours() + at.getMinutes() / 60
  const part = partOfDay(hour)
  const [left, top, w, h] = [MID - 220, PICTURE_Y - 90, 440, 180]
  const ground: KeepsakeOp = { kind: 'rect', x: left, y: top + h - 24, w, h: 24, ink: GROUND }
  if (part === 'night') {
    const stars: Array<[number, number]> = [[-150, -50], [-60, -66], [90, -40], [170, -60], [-110, 0]]
    return {
      ops: [
        { kind: 'rect', x: left, y: top, w, h, ink: NIGHT_SKY },
        ...stars.map(([dx, dy]): KeepsakeOp => ({ kind: 'rect', x: MID + dx, y: PICTURE_Y + dy, w: 6, h: 6, ink: MOON })),
        { kind: 'disc', x: MID + 40, y: PICTURE_Y - 20, r: 30, ink: MOON },
        { kind: 'disc', x: MID + 54, y: PICTURE_Y - 30, r: 26, ink: NIGHT_SKY },
        ground,
      ],
      words: 'The night sky as it was, with the moon out',
    }
  }
  const p = Math.min(1, Math.max(0, (hour - 5) / 15))
  return {
    ops: [
      { kind: 'rect', x: left, y: top, w, h, ink: DAY_SKY },
      { kind: 'disc', x: left + 40 + p * (w - 80), y: top + h - 50 - Math.sin(p * Math.PI) * 90, r: 26, ink: 'gold' },
      ground,
    ],
    words: `The ${part} sky as it was, with the sun where it stood`,
  }
}

/** A small sprout for each good thing written down, or one for the time given. */
function sproutPicture(count: number): KeepsakeOp[] {
  const step = 150
  const ops: KeepsakeOp[] = [{ kind: 'ellipse', x: MID, y: PICTURE_Y + 56, rx: 90 + ((count - 1) * step) / 2, ry: 14, angle: 0, ink: 'paperDeep' }]
  for (let i = 0; i < count; i++) {
    const x = MID + (i - (count - 1) / 2) * step
    ops.push(
      { kind: 'line', points: [[x, PICTURE_Y + 54], [x, PICTURE_Y - 20]], ink: 'rind', width: 8 },
      { kind: 'ellipse', x: x - 22, y: PICTURE_Y - 4, rx: 24, ry: 11, angle: -0.5, ink: 'rindLight' },
      { kind: 'ellipse', x: x + 22, y: PICTURE_Y - 22, rx: 24, ry: 11, angle: 0.5, ink: 'rindLight' },
    )
  }
  return ops
}

/** The moment's own picture, and how it is described to someone who cannot see it. */
function momentPicture(record: MomentRecord, title: string): { ops: KeepsakeOp[]; alt: string } {
  switch (record.id) {
    case 'watch': {
      const bedY = 480
      const bedWidth = 760
      return {
        ops: seedOps(seedRow(record.key, bedY - 40, bedWidth - 60, 34), bedY, bedWidth),
        alt: `Eight seeds resting in a row, settled while you stayed still, for ${title}.`,
      }
    }
    case 'listen':
      return { ops: listenPicture(), alt: `Soft rings of sound around a still point, for ${title}.` }
    case 'look':
      return { ops: lookPicture(), alt: `An open eye resting on one thing, for ${title}.` }
    case 'reflect': {
      const sky = skyPicture(new Date(record.at))
      return { ops: sky.ops, alt: `${sky.words}, for ${title}.` }
    }
    case 'appreciate':
      return {
        ops: sproutPicture(Math.max(1, record.things.length)),
        alt: `${record.things.length > 1 ? 'Small green sprouts, one for each good thing you wrote' : 'A small green sprout'}, for ${title}.`,
      }
  }
}

export interface PatientKeepsakeInput {
  record: MomentRecord
}

export function patientOneKeepsake({ record }: PatientKeepsakeInput): KeepsakePlan {
  const day = new Date(record.at)
  const title = MOMENT_TITLES[record.id]
  const picture = momentPicture(record, title)
  const content = momentContent(record)

  const art = centred([
    { kind: 'text', x: MID, y: 290, text: title, size: 36, ink: 'ink', font: 'sans', align: 'center', weight: 600 },
    ...picture.ops,
    ...content.ops,
  ])

  return framedKeepsake({
    title: 'The Patient One',
    subtitle: keepsakeDay(day),
    art,
    alt: `${picture.alt} ${content.words.join(' ')}`,
    text: [`${title}, ${keepsakeDay(day)}`, '', ...content.words].join('\n'),
    fileName: keepsakeFileName(`The Patient One ${title}`, day),
  })
}
