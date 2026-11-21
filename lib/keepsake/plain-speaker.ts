import { KEEPSAKE_WIDTH, framedKeepsake, keepsakeDay, keepsakeFileName, semicircle, type KeepsakeOp, type KeepsakePlan } from './plan'

const CARD = { left: 132, right: KEEPSAKE_WIDTH - 132, top: 236, bottom: 1150 }
const CARD_W = CARD.right - CARD.left
const TEXT_W = CARD_W - 120
const BAND_STRIPE = 14
const SCENE_FLOOR = CARD.bottom - 58
/** Room for the words between the green bar and the little scene at the foot of the card. */
const LINE_FLOOR = SCENE_FLOOR - 150

export interface PlainSpeakerKeepsakeInput {
  /** The one line to carry in. */
  line: string
  /** Their first sentence, when it is not the line itself. */
  begin: string | null
  day: Date
}

/** Roughly how many lines a text wraps to: a character is about half as wide as the type is tall. */
function estimatedLines(text: string, size: number, width: number): number {
  return Math.max(1, Math.ceil((text.length * size * 0.5) / width))
}

/** The largest calm size at which the line still fits the card. */
export function lineSize(line: string, room: number): number {
  for (const size of [64, 56, 48, 42, 36, 32]) {
    if (estimatedLines(line, size, TEXT_W) * size * 1.3 <= room) return size
  }
  return 28
}

function envoyAndDoor(): KeepsakeOp[] {
  const floor = SCENE_FLOOR
  const melonX = CARD.left + 150
  const doorX = CARD.right - 190
  const doorTop = floor - 118
  return [
    { kind: 'rect', x: CARD.left + 60, y: floor, w: CARD_W - 120, h: 6, ink: 'line' },
    { kind: 'rect', x: melonX - 16, y: floor - 36, w: 6, h: 36, ink: 'ink' },
    { kind: 'rect', x: melonX + 10, y: floor - 36, w: 6, h: 36, ink: 'ink' },
    { kind: 'poly', points: semicircle(melonX, floor - 78, 42), ink: 'rind' },
    { kind: 'poly', points: semicircle(melonX, floor - 78, 36), ink: 'rindLight' },
    { kind: 'poly', points: semicircle(melonX, floor - 78, 30), ink: 'flesh' },
    { kind: 'disc', x: melonX - 12, y: floor - 64, r: 3, ink: 'seed' },
    { kind: 'disc', x: melonX + 12, y: floor - 64, r: 3, ink: 'seed' },
    { kind: 'rect', x: melonX + 40, y: floor - 70, w: 30, h: 24, ink: 'paper' },
    { kind: 'rect', x: melonX + 46, y: floor - 63, w: 18, h: 3, ink: 'inkSoft' },
    { kind: 'rect', x: melonX + 46, y: floor - 55, w: 12, h: 3, ink: 'inkSoft' },
    // A door left just ajar, warm light at the gap.
    { kind: 'rect', x: doorX - 8, y: doorTop - 8, w: 92, h: 126, ink: 'rind' },
    { kind: 'rect', x: doorX, y: doorTop, w: 76, h: 118, ink: 'gold' },
    { kind: 'rect', x: doorX, y: doorTop, w: 62, h: 118, ink: 'rind' },
    { kind: 'rect', x: doorX + 6, y: doorTop + 8, w: 50, h: 102, ink: 'rindLight', alpha: 0.45 },
    { kind: 'rect', x: doorX + 50, y: doorTop + 58, w: 6, h: 10, ink: 'paper' },
    { kind: 'poly', points: [[doorX + 62, floor + 6], [doorX + 76, floor + 6], [doorX + 96, floor + 30], [doorX + 66, floor + 30]], ink: 'gold', alpha: 0.4 },
  ]
}

/** A pocket card: their first sentence on the green bar, the line to carry beneath it. */
export function plainSpeakerKeepsake({ line, begin, day }: PlainSpeakerKeepsakeInput): KeepsakePlan {
  const cx = KEEPSAKE_WIDTH / 2
  const beginSize = 36
  const beginLines = begin ? Math.min(4, estimatedLines(`“${begin}”`, beginSize, TEXT_W)) : 0
  const bandH = begin ? 104 + beginLines * 48 : 92
  const bandBottom = CARD.top + bandH

  const art: KeepsakeOp[] = [
    { kind: 'rect', x: CARD.left + 14, y: CARD.top + 14, w: CARD_W, h: CARD.bottom - CARD.top, ink: 'line' },
    { kind: 'rect', x: CARD.left, y: CARD.top, w: CARD_W, h: CARD.bottom - CARD.top, ink: 'paperDeep' },
    { kind: 'rect', x: CARD.left, y: CARD.top, w: CARD_W, h: bandH, ink: 'rind' },
    { kind: 'rect', x: CARD.left, y: bandBottom, w: CARD_W, h: BAND_STRIPE, ink: 'rindLight' },
    {
      kind: 'text',
      x: cx,
      y: CARD.top + 56,
      text: begin ? 'BEGIN WITH' : 'ONE LINE TO CARRY IN',
      size: 24,
      ink: 'paper',
      font: 'sans',
      align: 'center',
      weight: 700,
    },
  ]
  if (begin) {
    art.push({
      kind: 'text',
      x: cx,
      y: CARD.top + 112,
      text: `“${begin}”`,
      size: beginSize,
      ink: 'paper',
      font: 'serif',
      italic: true,
      align: 'center',
      maxWidth: TEXT_W,
      lineHeight: 48,
      maxLines: 4,
    })
  }

  const roomTop = bandBottom + BAND_STRIPE + 70
  const room = LINE_FLOOR - roomTop
  const size = lineSize(line, room)
  const lineHeight = Math.round(size * 1.3)
  const maxLines = Math.max(1, Math.floor(room / lineHeight))
  const lines = Math.min(maxLines, estimatedLines(line, size, TEXT_W))
  const y = roomTop + (room - lines * lineHeight) / 2 + size
  art.push(
    { kind: 'text', x: cx, y, text: line, size, ink: 'ink', font: 'sans', align: 'center', weight: 600, maxWidth: TEXT_W, lineHeight, maxLines },
    ...envoyAndDoor(),
  )

  const alt = begin
    ? `A pocket card with a green bar across the top. On the bar: begin with “${begin}”. Beneath it, the line to carry in: ${line} At the foot of the card, a small melon holding a note stands near a door left just ajar.`
    : `A pocket card with a green bar across the top, and the line to carry in: ${line} At the foot of the card, a small melon holding a note stands near a door left just ajar.`
  const text = begin ? `Begin with: “${begin}”\n\n${line}` : line

  return framedKeepsake({
    title: 'The Plain Speaker',
    subtitle: keepsakeDay(day),
    art,
    alt,
    text,
    fileName: keepsakeFileName('The Plain Speaker', day),
  })
}
