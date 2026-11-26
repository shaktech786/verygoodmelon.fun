import { mixOklab } from '@/lib/design/color'
import { PALETTES as SEEDPRESS } from '@/lib/design/tokens'
import { ARENA_VOICE_COLOURS } from '@/lib/games/arena-pairings'
import { PIXEL, type Font, type Ink, type KeepsakeOp, type KeepsakePlan } from './plan'

export type KeepsakeTheme = 'light' | 'dark'

type NamedInk = Exclude<Ink, `#${string}`>

// The watermelon itself is one set of colours on every keepsake in both themes, so a melon never turns mint on dark paper.
const MELON = {
  rind: '#1a4d2e',
  rindLight: '#74c69d',
  flesh: '#e63946',
  seed: '#2a211c',
  // Brass, one ochre for both papers: the light and dark brass roles blended toward the light one (about 4:1 on either paper), in place of the old yellow gold.
  gold: mixOklab(SEEDPRESS.light.brass, 0.65, SEEDPRESS.dark.brass),
  // Cream words set on the rind, such as a band of green across a card.
  onRind: '#fbf7f0',
} as const

// Warm paper rather than the page's grey, so a saved keepsake reads as a thing, not a screenshot.
const PALETTES: Record<KeepsakeTheme, Record<NamedInk, string>> = {
  light: {
    paper: '#fbf7f0',
    paperDeep: '#f1eadd',
    ink: '#1a1a1a',
    inkSoft: '#5b6470',
    line: '#e4dccd',
    // Green words and marks on the paper: the rind itself on light paper, a lighter rind on dark.
    rindInk: '#1a4d2e',
    ...MELON,
    voiceA: ARENA_VOICE_COLOURS.light.a,
    voiceB: ARENA_VOICE_COLOURS.light.b,
  },
  dark: {
    paper: '#1f1d1b',
    paperDeep: '#2a2724',
    ink: '#f2eee8',
    inkSoft: '#b9b2a8',
    line: '#3d3934',
    rindInk: '#8fd4ad',
    ...MELON,
    voiceA: ARENA_VOICE_COLOURS.dark.a,
    voiceB: ARENA_VOICE_COLOURS.dark.b,
  },
}

export function inkColour(ink: Ink, theme: KeepsakeTheme): string {
  return ink.startsWith('#') ? ink : PALETTES[theme][ink as NamedInk]
}

const FONTS: Record<Exclude<Font, 'sans'>, string> = {
  serif: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  hand: '"Segoe Print", "Bradley Hand", "Noteworthy", "Comic Sans MS", cursive',
}

function fontFamily(font: Font): string {
  if (font !== 'sans') return FONTS[font]
  // Canvas cannot read CSS variables, so the page's own sans family is borrowed from the body.
  const family = typeof document === 'undefined' ? '' : getComputedStyle(document.body).fontFamily
  return family || 'system-ui, sans-serif'
}

/** Breaks words onto lines no wider than `maxWidth`, as the canvas measures them. */
export function wrapLines(measure: (line: string) => number, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (line && measure(next) > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = next
      }
    }
    lines.push(line)
  }
  return lines
}

function drawShape(ctx: CanvasRenderingContext2D, op: Exclude<KeepsakeOp, { kind: 'text' }>, theme: KeepsakeTheme) {
  const s = 1 / PIXEL
  ctx.globalAlpha = op.alpha ?? 1
  ctx.fillStyle = inkColour(op.ink, theme)
  ctx.strokeStyle = ctx.fillStyle
  switch (op.kind) {
    case 'rect':
      ctx.fillRect(Math.round(op.x * s), Math.round(op.y * s), Math.max(1, Math.round(op.w * s)), Math.max(1, Math.round(op.h * s)))
      return
    case 'disc':
      ctx.beginPath()
      ctx.arc(op.x * s, op.y * s, Math.max(0.6, op.r * s), 0, Math.PI * 2)
      ctx.fill()
      return
    case 'ellipse':
      ctx.beginPath()
      ctx.ellipse(op.x * s, op.y * s, Math.max(0.5, op.rx * s), Math.max(0.5, op.ry * s), op.angle, 0, Math.PI * 2)
      ctx.fill()
      return
    case 'poly':
      if (op.points.length < 3) return
      ctx.beginPath()
      op.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * s, y * s) : ctx.lineTo(x * s, y * s)))
      ctx.closePath()
      ctx.fill()
      return
    case 'line':
      if (op.points.length < 2) return
      ctx.lineWidth = Math.max(1, op.width * s)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      op.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * s, y * s) : ctx.lineTo(x * s, y * s)))
      ctx.stroke()
  }
}

function drawText(ctx: CanvasRenderingContext2D, op: Extract<KeepsakeOp, { kind: 'text' }>, theme: KeepsakeTheme) {
  ctx.globalAlpha = op.alpha ?? 1
  ctx.fillStyle = inkColour(op.ink, theme)
  ctx.font = `${op.italic ? 'italic ' : ''}${op.weight ?? 400} ${op.size}px ${fontFamily(op.font)}`
  ctx.textAlign = op.align ?? 'left'
  ctx.textBaseline = 'alphabetic'
  let lines = op.maxWidth ? wrapLines((line) => ctx.measureText(line).width, op.text, op.maxWidth) : op.text.split('\n')
  if (op.maxLines && lines.length > op.maxLines) {
    lines = lines.slice(0, op.maxLines)
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[\s.,;:]+$/, '')}…`
  }
  const lineHeight = op.lineHeight ?? op.size * 1.35
  lines.forEach((line, i) => ctx.fillText(line, op.x, op.y + i * lineHeight))
}

/**
 * Draws a plan onto a canvas: shapes onto a grid one art pixel per cell, scaled up without
 * smoothing, then the words on top at full resolution.
 */
export function renderKeepsake(canvas: HTMLCanvasElement, plan: KeepsakePlan, theme: KeepsakeTheme) {
  canvas.width = plan.width
  canvas.height = plan.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const art = document.createElement('canvas')
  art.width = Math.ceil(plan.width / PIXEL)
  art.height = Math.ceil(plan.height / PIXEL)
  const artCtx = art.getContext('2d')
  if (!artCtx) return
  for (const op of plan.ops) if (op.kind !== 'text') drawShape(artCtx, op, theme)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(art, 0, 0, art.width * PIXEL, art.height * PIXEL)
  for (const op of plan.ops) if (op.kind === 'text') drawText(ctx, op, theme)
  ctx.globalAlpha = 1
}
