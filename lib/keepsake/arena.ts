import { EMBLEM_NAMES, EMBLEM_ROWS, type EmblemId } from '@/lib/games/arena-pairings'
import { KEEPSAKE_WIDTH, framedKeepsake, keepsakeDay, keepsakeFileName, type Ink, type KeepsakeOp, type KeepsakePlan } from './plan'

// The two voices keep the stage's own colours and sides, so the picture matches the page it came from.
const VOICE_INKS: readonly [Ink, Ink] = ['voiceA', 'voiceB']
const PANEL = { top: 230, size: 300, gap: 120 }
const CELL = 24

export interface ArenaKeepsakeInput {
  first: string
  second: string
  topic: string
  question: string
  /** The pairing's two pictures, or null for a pairing written by hand. */
  emblems: readonly [EmblemId, EmblemId] | null
  day: Date
}

function panelLeft(side: 0 | 1): number {
  const total = PANEL.size * 2 + PANEL.gap
  return (KEEPSAKE_WIDTH - total) / 2 + side * (PANEL.size + PANEL.gap)
}

function emblem(id: EmblemId, left: number, ink: Ink): KeepsakeOp[] {
  const inset = (PANEL.size - CELL * 10) / 2
  return EMBLEM_ROWS[id].flatMap((row, y) =>
    Array.from(row).flatMap((cell, x) =>
      cell === 'X' ? [{ kind: 'rect' as const, x: left + inset + x * CELL, y: PANEL.top + inset + y * CELL, w: CELL, h: CELL, ink }] : [],
    ),
  )
}

/** A round mark for the first voice and a diamond for the second, as the stage marks them, when no pictures were chosen. */
function marker(side: 0 | 1, left: number, ink: Ink): KeepsakeOp {
  const cx = left + PANEL.size / 2
  const cy = PANEL.top + PANEL.size / 2
  const r = 84
  return side === 0
    ? { kind: 'disc', x: cx, y: cy, r, ink }
    : { kind: 'poly', points: [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], ink }
}

/**
 * The pairing's two pictures facing each other over the question they talked about, with the
 * one question the closing offered to take away. No winner and no scores: just who met, and what is left to think about.
 */
export function arenaKeepsake({ first, second, topic, question, emblems, day }: ArenaKeepsakeInput): KeepsakePlan {
  const names = [first, second] as const
  const art: KeepsakeOp[] = []
  for (const side of [0, 1] as const) {
    const left = panelLeft(side)
    const ink = VOICE_INKS[side]
    art.push({ kind: 'rect', x: left, y: PANEL.top, w: PANEL.size, h: PANEL.size, ink: 'paperDeep' })
    art.push(...(emblems ? emblem(emblems[side], left, ink) : [marker(side, left, ink)]))
    art.push({
      kind: 'text', x: left + PANEL.size / 2, y: PANEL.top + PANEL.size + 56, text: names[side], size: 34, ink: 'ink',
      font: 'sans', align: 'center', weight: 600, maxWidth: PANEL.size + 80, maxLines: 2, lineHeight: 42,
    })
  }
  art.push(
    { kind: 'text', x: KEEPSAKE_WIDTH / 2, y: PANEL.top + PANEL.size / 2 + 18, text: '&', size: 52, ink: 'inkSoft', font: 'serif', align: 'center' },
    {
      kind: 'text', x: KEEPSAKE_WIDTH / 2, y: 740, text: `“${topic}”`, size: 34, ink: 'inkSoft', font: 'serif', align: 'center',
      italic: true, maxWidth: 860, lineHeight: 46, maxLines: 2,
    },
    { kind: 'rect', x: KEEPSAKE_WIDTH / 2 - 60, y: 836, w: 120, h: 6, ink: 'line' },
    { kind: 'text', x: KEEPSAKE_WIDTH / 2, y: 918, text: 'TO TAKE WITH YOU', size: 26, ink: 'inkSoft', font: 'sans', align: 'center', weight: 600 },
    {
      kind: 'text', x: KEEPSAKE_WIDTH / 2, y: 990, text: question, size: 44, ink: 'ink', font: 'serif', align: 'center',
      italic: true, maxWidth: 860, lineHeight: 60, maxLines: 4,
    },
  )

  const pictures = emblems
    ? `${first}, shown as ${EMBLEM_NAMES[emblems[0]]}, and ${second}, shown as ${EMBLEM_NAMES[emblems[1]]}`
    : `${first}, shown as a round mark, and ${second}, shown as a diamond`
  return framedKeepsake({
    title: 'The Arena',
    subtitle: keepsakeDay(day),
    art,
    alt: `Two pictures side by side: ${pictures}, who talked about “${topic}”. Beneath them, to take with you: “${question}”`,
    text: `${first} & ${second}\n“${topic}”\n\nTo take with you:\n${question}`,
    fileName: keepsakeFileName('The Arena', day),
  })
}
