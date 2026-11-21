import { MOMENT_TITLES, joinNaturally, type Heard, type MomentRecord } from '@/lib/games/patient-one/today'
import { KEEPSAKE_WIDTH, framedKeepsake, hashString, keepsakeDay, keepsakeFileName, seededRandom, type KeepsakeOp, type KeepsakePlan } from './plan'

/**
 * A keepsake of one moment from The Patient One: the eight settled seeds in a row, and
 * whatever the player noticed in that moment, set quietly beneath them.
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
        { kind: 'poly', points: [[x - 26, y - 8], [x - 14, y - 30], [x + 16, y - 30], [x + 30, y - 8]], ink: 'blue' },
        { kind: 'rect', x: x - 46, y: y - 10, w: 92, h: 30, ink: 'blue' },
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
        { kind: 'line', points: [[x + dx + 12, y - 36 + i * 8], [x + dx - 8, y + 30 + i * 8]], ink: 'blue', width: 7, alpha: 0.8 },
      ])
    case 'Voices':
      return [
        { kind: 'disc', x: x - 16, y: y - 8, r: 28, ink: 'teal' },
        { kind: 'poly', points: [[x - 34, y + 10], [x - 40, y + 34], [x - 16, y + 18]], ink: 'teal' },
        { kind: 'disc', x: x + 26, y: y + 14, r: 22, ink: 'gold' },
        { kind: 'poly', points: [[x + 38, y + 26], [x + 46, y + 44], [x + 26, y + 34]], ink: 'gold' },
      ]
    case 'A hum or fan':
      return [
        ...[0, 1, 2].map((k): KeepsakeOp => {
          const a = (k * 2 * Math.PI) / 3 - Math.PI / 2
          return { kind: 'ellipse', x: x + Math.cos(a) * 22, y: y + Math.sin(a) * 22, rx: 12, ry: 24, angle: a + Math.PI / 2, ink: 'purple' }
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
        ...[60, 44, 28].map((r, i): KeepsakeOp => ({ kind: 'disc', x: MID, y: 640, r, ink: i % 2 === 0 ? 'line' : 'paper' })),
        { kind: 'disc', x: MID, y: 640, r: 10, ink: 'inkSoft' },
        text(840, 'A minute of listening to what was already here.', 44, { italic: true, lineHeight: 58, maxLines: 3 }),
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
        ops.push(
          { kind: 'ellipse', x: MID, y: y - 58, rx: 5, ry: 9, angle: 0, ink: 'flesh', alpha: 0.7 },
          text(y, thing, 40, { lineHeight: 50, maxLines: 2 }),
        )
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

export interface PatientKeepsakeInput {
  record: MomentRecord
}

export function patientOneKeepsake({ record }: PatientKeepsakeInput): KeepsakePlan {
  const day = new Date(record.at)
  const title = MOMENT_TITLES[record.id]
  const hero = record.id === 'watch'
  const bedY = hero ? 480 : 400
  const bedWidth = hero ? 760 : 560
  const seeds = seedRow(record.key, bedY - (hero ? 40 : 22), bedWidth - 60, hero ? 34 : 22)
  const content = momentContent(record)

  const art = centred([
    { kind: 'text', x: MID, y: 290, text: title, size: 36, ink: 'ink', font: 'sans', align: 'center', weight: 600 },
    ...seedOps(seeds, bedY, bedWidth),
    ...content.ops,
  ])

  const alt = `Eight seeds resting in a row${hero ? ', settled while you stayed still' : ''}, for ${title}. ${content.words.join(' ')}`
  return framedKeepsake({
    title: 'The Patient One',
    subtitle: keepsakeDay(day),
    art,
    alt,
    text: [`${title}, ${keepsakeDay(day)}`, '', ...content.words].join('\n'),
    fileName: keepsakeFileName(`The Patient One ${title}`, day),
  })
}
