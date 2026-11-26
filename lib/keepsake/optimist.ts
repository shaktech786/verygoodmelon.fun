import type { Reveal } from '@/lib/games/hope-daily/puzzle'
import { KEEPSAKE_WIDTH, framedKeepsake, keepsakeDay, keepsakeFileName, type KeepsakeOp, type KeepsakePlan } from './plan'

export const CLIPPING = { left: 132, right: KEEPSAKE_WIDTH - 132, top: 236, bottom: 1150 }
const TEXT_W = CLIPPING.right - CLIPPING.left - 120
const STORY_SIZE = 34
const STORY_LINE = 50
const STORY_LINES = 8

export interface OptimistKeepsakeInput {
  reveal: Reveal
  day: Date
}

/** The story with today's word in its gap, as it was written. */
export function storyWithWord(reveal: Reveal): string {
  return reveal.story.flat().map((piece) => piece.text).join('')
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** A paper edge torn in small teeth, from left to right along y. */
function tornEdge(y: number, down: boolean): Array<[number, number]> {
  const points: Array<[number, number]> = []
  const step = 24
  for (let x = CLIPPING.left, i = 0; x <= CLIPPING.right; x += step, i++) points.push([x, y + (i % 2 ? (down ? 10 : -10) : 0)])
  return points
}

/** Today's word, each letter inked over its own slot like the ones it was guessed in. */
function inkedWord(word: string, top: number): KeepsakeOp[] {
  const slot = Math.min(96, Math.floor(TEXT_W / word.length))
  const gap = Math.round(slot * 0.16)
  const width = slot * word.length
  const x0 = KEEPSAKE_WIDTH / 2 - width / 2
  const size = Math.round((slot - gap) * 0.95)
  const ops: KeepsakeOp[] = []
  ;[...word].forEach((letter, i) => {
    const x = x0 + i * slot
    ops.push(
      { kind: 'rect', x: x + gap / 2, y: top + size + 12, w: slot - gap, h: 6, ink: 'rind', b: true },
      { kind: 'text', x: x + slot / 2, y: top + size, text: letter, size, ink: 'rind', font: 'display', align: 'center', weight: 700 },
    )
  })
  return ops
}

/** A newspaper clipping of the day's good news, with the missing word inked into place by hand. */
export function optimistKeepsake({ reveal, day }: OptimistKeepsakeInput): KeepsakePlan {
  const cx = KEEPSAKE_WIDTH / 2
  const story = storyWithWord(reveal)
  const kind = reveal.kind === 'progress' ? 'the world getting better' : 'something hopeful to know'
  const top = CLIPPING.top + 20
  const bottom = CLIPPING.bottom - 10
  const paper: Array<[number, number]> = [...tornEdge(top, false), ...tornEdge(bottom, true).reverse()]

  const art: KeepsakeOp[] = [
    { kind: 'poly', points: paper.map(([x, y]) => [x + 14, y + 14] as [number, number]), ink: 'rule', b: true },
    { kind: 'poly', points: paper, ink: 'sheet' },
    { kind: 'text', x: cx, y: top + 70, text: 'Good news', size: 34, ink: 'ink', font: 'display', align: 'center', weight: 700 },
    { kind: 'rect', x: CLIPPING.left + 60, y: top + 96, w: CLIPPING.right - CLIPPING.left - 120, h: 4, ink: 'ink' },
    {
      kind: 'text',
      x: cx,
      y: top + 140,
      text: `${reveal.category} · ${kind}`,
      size: 26,
      ink: 'rind',
      font: 'sans',
      align: 'center',
      weight: 700,
      maxWidth: TEXT_W,
    },
    ...inkedWord(reveal.word, top + 180),
    {
      kind: 'text',
      x: CLIPPING.left + 60,
      y: top + 380,
      text: story,
      size: STORY_SIZE,
      ink: 'ink',
      font: 'sans',
      maxWidth: TEXT_W,
      lineHeight: STORY_LINE,
      maxLines: STORY_LINES,
    },
    {
      kind: 'text',
      x: cx,
      y: bottom - 110,
      text: reveal.reflection,
      size: 28,
      ink: 'ink-soft',
      font: 'sans',
      align: 'center',
      maxWidth: TEXT_W,
      lineHeight: 38,
      maxLines: 2,
    },
    { kind: 'text', x: cx, y: bottom - 26, text: `Source: ${hostname(reveal.source)}`, size: 22, ink: 'ink-soft', font: 'sans', align: 'center' },
  ]

  const alt = `A newspaper clipping of today’s good news, filed under ${reveal.category}. The missing word, ${reveal.word}, is inked into its place by hand. It reads: “${story}” Beneath it: “${reveal.reflection}”`

  return framedKeepsake({
    title: 'The Optimist',
    subtitle: keepsakeDay(day),
    art,
    alt,
    text: `${story}\n\n${reveal.reflection}\n\nSource: ${reveal.source}`,
    fileName: keepsakeFileName('The Optimist', day),
  })
}
