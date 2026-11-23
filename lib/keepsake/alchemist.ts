import type { Letter } from '@/lib/games/idea-lab/golds'
import { KEEPSAKE_WIDTH, framedKeepsake, keepsakeDay, keepsakeFileName, type KeepsakeOp, type KeepsakePlan } from './plan'

/** A little taller than the other keepsakes, so all seven golds fit with what each one means. */
export const ALCHEMIST_HEIGHT = 1580
const SHEET = { left: 120, right: KEEPSAKE_WIDTH - 120, top: 220, bottom: ALCHEMIST_HEIGHT - 170 }
const ROWS = { top: 420, height: 124 }
const TEXT_LEFT = 250
const TEXT_WIDTH = SHEET.right - 60 - TEXT_LEFT

/** A gold coin of the kind the alchemists hoped for, beside each gold found. */
function coin(x: number, y: number): KeepsakeOp[] {
  return [
    { kind: 'disc', x, y, r: 22, ink: 'gold' },
    { kind: 'disc', x: x - 6, y: y - 6, r: 7, ink: 'paper', alpha: 0.55 },
  ]
}

export interface AlchemistKeepsakeInput {
  letter: Letter
  day: Date
}

/** The letter a Work ends with, as a sheet to keep: each gold in the order it was found, and what it means. */
export function alchemistKeepsake({ letter, day }: AlchemistKeepsakeInput): KeepsakePlan {
  const cx = KEEPSAKE_WIDTH / 2
  const art: KeepsakeOp[] = [
    { kind: 'rect', x: SHEET.left + 12, y: SHEET.top + 12, w: SHEET.right - SHEET.left, h: SHEET.bottom - SHEET.top, ink: 'line' },
    { kind: 'rect', x: SHEET.left, y: SHEET.top, w: SHEET.right - SHEET.left, h: SHEET.bottom - SHEET.top, ink: 'paperDeep' },
    { kind: 'text', x: cx, y: SHEET.top + 100, text: letter.title, size: 56, ink: 'ink', font: 'serif', align: 'center', weight: 600 },
    { kind: 'rect', x: cx - 70, y: SHEET.top + 136, w: 140, h: 6, ink: 'gold' },
  ]
  letter.lines.forEach((line, i) => {
    const y = ROWS.top + i * ROWS.height
    art.push(
      ...coin(SHEET.left + 82, y - 12),
      { kind: 'text', x: TEXT_LEFT, y, text: line.gold, size: 38, ink: 'ink', font: 'sans', weight: 600 },
      {
        kind: 'text', x: TEXT_LEFT, y: y + 42, text: `…${line.meaning}`, size: 26, ink: 'inkSoft', font: 'serif', italic: true,
        maxWidth: TEXT_WIDTH, lineHeight: 32, maxLines: 2,
      },
    )
  })
  const farewell = letter.closing[letter.closing.length - 1]
  art.push({
    kind: 'text', x: cx, y: ROWS.top + 7 * ROWS.height + 20, text: farewell, size: 30, ink: 'ink', font: 'hand', align: 'center',
    maxWidth: SHEET.right - SHEET.left - 120, lineHeight: 40, maxLines: 2,
  })

  const golds = letter.lines.map((line) => line.gold)
  return framedKeepsake({
    title: 'The Alchemist',
    subtitle: keepsakeDay(day),
    art,
    alt: `A letter titled ${letter.title}, with a gold coin beside each gold you found, in the order you found them: ${golds.join(', ')}. Each is followed by what it means. At the foot: “${farewell}”`,
    text: [letter.title, '', letter.opening, '', ...letter.lines.map((line) => line.text), '', ...letter.closing].join('\n'),
    fileName: keepsakeFileName('The Alchemist', day),
    height: ALCHEMIST_HEIGHT,
  })
}
