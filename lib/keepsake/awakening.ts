import { KEEPSAKE_WIDTH, MARGIN, framedKeepsake, hashString, keepsakeDay, keepsakeFileName, mix, ramp, seededRandom, type Ink, type KeepsakeOp, type KeepsakePlan } from './plan'

// A sunrise and a kitchen table look the same whichever theme the page is in: they are printed in the glass inks, the dark palette on either paper.
const DAWN: readonly Ink[] = [
  mix('glass-dusk', 0.3, 'glass-well'),
  mix('glass-dusk', 0.6, 'glass-well'),
  mix('glass-flesh', 0.5, 'glass-dusk'),
  mix('glass-clay', 0.8, 'glass-ink'),
  mix('glass-brass', 0.55, 'glass-ink'),
]
const SKY_BANDS = 9
const SUN: Ink = mix('glass-ink', 0.45, 'glass-brass')
const SUN_GLOW: Ink = 'glass-brass'
const HILL_FAR: Ink = mix('glass-moss', 0.42, 'glass-well')
const HILL_NEAR: Ink = mix('glass-rind', 0.34, 'glass-well')
const WOOD: Ink = mix('glass-clay', 0.5, 'glass-well')
const WOOD_GRAIN: Ink = mix('glass-clay', 0.32, 'glass-well')
const NOTE: Ink = 'glass-ink'
const NOTE_SHADOW: Ink = 'glass-well'
const TAPE: Ink = mix('glass-brass', 0.6, 'glass-ink')
const NOTE_INK: Ink = 'glass-well'
const NOTE_INK_SOFT: Ink = mix('glass-well', 0.7, 'glass-ink')
const MUG: Ink = 'glass-ink'
const MUG_RIM: Ink = mix('glass-clay', 0.35, 'glass-ink')
const COFFEE: Ink = mix('glass-clay', 0.4, 'glass-well')
const MORNING: Ink = 'glass-ink'

const SCENE = { left: MARGIN, right: KEEPSAKE_WIDTH - MARGIN, top: 216, horizon: 660, tableTop: 760, bottom: 1176 }
const NOTE_X = { left: 204, right: 836 }
const NOTE_PADDING = 44
const NOTE_LINES = 5
// An average Atkinson letter, space included, is a little over half its size wide
const GLYPH_WIDTH = 0.54

interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

/** Smaller writing for a longer plan, so the whole of it fits the note. */
export function noteSize(note: string): number {
  if (note.length <= 40) return 50
  if (note.length <= 80) return 42
  return 34
}

function sky(seed: number): KeepsakeOp[] {
  const width = SCENE.right - SCENE.left
  const band = (SCENE.tableTop - SCENE.top) / SKY_BANDS
  // Each band reaches into the next, so no seam shows once they are snapped to the pixel grid
  const ops: KeepsakeOp[] = Array.from({ length: SKY_BANDS }, (_, i) => ({
    kind: 'rect' as const,
    x: SCENE.left,
    y: SCENE.top + Math.round(band * i),
    w: width,
    h: Math.ceil(band) + 12,
    ink: ramp(DAWN, i / (SKY_BANDS - 1)),
  }))
  const random = seededRandom(seed)
  // The last few stars, fading as the light comes
  for (let i = 0; i < 9; i++) {
    ops.push({ kind: 'disc', x: SCENE.left + 30 + random() * (width - 60), y: SCENE.top + 20 + random() * band * 2.2, r: 3, ink: 'glass-ink', alpha: 0.3 + random() * 0.4 })
  }
  const cx = KEEPSAKE_WIDTH / 2
  ops.push(
    { kind: 'disc', x: cx, y: SCENE.horizon, r: 230, ink: SUN_GLOW, alpha: 0.16 },
    { kind: 'disc', x: cx, y: SCENE.horizon, r: 150, ink: SUN_GLOW, alpha: 0.3 },
    { kind: 'disc', x: cx, y: SCENE.horizon, r: 92, ink: SUN },
    {
      kind: 'poly',
      points: [[SCENE.left, 650], [240, 610], [420, 632], [560, 660], [760, 620], [900, 600], [SCENE.right, 624], [SCENE.right, SCENE.tableTop], [SCENE.left, SCENE.tableTop]],
      ink: HILL_FAR,
    },
    {
      kind: 'poly',
      points: [[SCENE.left, 704], [200, 680], [380, 698], [600, 722], [820, 688], [SCENE.right, 700], [SCENE.right, SCENE.tableTop], [SCENE.left, SCENE.tableTop]],
      ink: HILL_NEAR,
    },
  )
  return ops
}

function table(note: Box): KeepsakeOp[] {
  const width = SCENE.right - SCENE.left
  const ops: KeepsakeOp[] = [{ kind: 'rect', x: SCENE.left, y: SCENE.tableTop, w: width, h: SCENE.bottom - SCENE.tableTop, ink: WOOD }]
  for (const y of [SCENE.tableTop, 900, 1040]) ops.push({ kind: 'rect', x: SCENE.left, y, w: width, h: 6, ink: WOOD_GRAIN })
  ops.push(
    { kind: 'rect', x: note.left + 10, y: note.top + 12, w: note.right - note.left, h: note.bottom - note.top, ink: NOTE_SHADOW, alpha: 0.45 },
    { kind: 'rect', x: note.left, y: note.top, w: note.right - note.left, h: note.bottom - note.top, ink: NOTE },
    { kind: 'poly', points: [[462, note.top - 18], [578, note.top - 24], [582, note.top + 18], [466, note.top + 24]], ink: TAPE, alpha: 0.85 },
    // A cup of something warm, seen from above
    { kind: 'disc', x: 916, y: 1100, r: 62, ink: MUG_RIM },
    { kind: 'disc', x: 916, y: 1100, r: 52, ink: MUG },
    { kind: 'disc', x: 916, y: 1100, r: 40, ink: COFFEE },
    { kind: 'rect', x: 964, y: 1088, w: 30, h: 24, ink: MUG_RIM },
  )
  return ops
}

export interface AwakeningKeepsakeInput {
  /** The one small thing the player woke up with. */
  note: string
  day: Date
}

/** Roughly how many lines the note will wrap to, so the paper is only as tall as the writing. */
export function noteLines(note: string, size: number): number {
  const perLine = Math.max(1, Math.floor((NOTE_X.right - NOTE_X.left - NOTE_PADDING * 2) / (size * GLYPH_WIDTH)))
  return Math.min(NOTE_LINES, Math.max(1, Math.ceil(note.length / perLine)))
}

export function awakeningKeepsake({ note, day }: AwakeningKeepsakeInput): KeepsakePlan {
  const plan = note.trim()
  const size = noteSize(plan)
  const lineHeight = Math.round(size * 1.3)
  const height = Math.max(220, 72 + Math.round(size * 1.15) + (noteLines(plan, size) - 1) * lineHeight + 64)
  const top = Math.max(SCENE.tableTop + 48, Math.round((SCENE.tableTop + SCENE.bottom - height) / 2))
  const box: Box = { ...NOTE_X, top, bottom: top + height }
  const art: KeepsakeOp[] = [
    ...sky(hashString(plan)),
    ...table(box),
    { kind: 'text', x: KEEPSAKE_WIDTH / 2, y: 320, text: 'Good morning', size: 56, ink: MORNING, font: 'display', align: 'center' },
    { kind: 'text', x: box.left + NOTE_PADDING, y: box.top + 64, text: 'For tomorrow', size: 30, ink: NOTE_INK_SOFT, font: 'display' },
    {
      kind: 'text',
      x: box.left + NOTE_PADDING,
      y: box.top + 72 + Math.round(size * 1.15),
      text: plan,
      size,
      ink: NOTE_INK,
      font: 'sans',
      maxWidth: NOTE_X.right - NOTE_X.left - NOTE_PADDING * 2,
      lineHeight,
      maxLines: NOTE_LINES,
    },
  ]

  return framedKeepsake({
    title: 'The Awakening',
    subtitle: keepsakeDay(day),
    art,
    alt: `The sun rising over green hills, and below it a handwritten note on a kitchen table, beside a cup of coffee. The note says: For tomorrow, “${plan}”`,
    text: `Good morning.\n\nFor tomorrow: ${plan}`,
    fileName: keepsakeFileName('The Awakening', day),
  })
}
