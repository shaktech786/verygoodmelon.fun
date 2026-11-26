import { mixOklab } from '@/lib/design/color'
import { getInks, readInkState, type InkContrast, type InkTheme, type Inks } from '@/lib/design/inks'
import type { Sense } from '@/lib/design/tokens'
import { PIXEL, hashString, seededRandom, type Font, type Ink, type KeepsakeOp, type KeepsakePlan } from './plan'

export type KeepsakeTheme = InkTheme

/** Everything a keepsake's colours depend on: the page's palette, the dark palette for glass scenes, and whether to print plain. */
export interface KeepsakeLook {
  inks: Inks
  /** The dark palette at the same sense and contrast, for `glass-` inks. */
  glass: Inks
  theme: KeepsakeTheme
  /** Quiet and high contrast print flat: no grain and no misregistration. */
  plain: boolean
}

export function lookFor(theme: KeepsakeTheme, sense: Sense = 'gentle', contrast: InkContrast = 'normal'): KeepsakeLook {
  return { inks: getInks(theme, sense, contrast), glass: getInks('dark', sense, contrast), theme, plain: sense === 'quiet' || contrast !== 'normal' }
}

/** The look the page is showing now. */
export function currentKeepsakeLook(): KeepsakeLook {
  const { theme, sense, contrast } = readInkState()
  return lookFor(theme, sense, contrast)
}

const GLASS = 'glass-'

export function inkColour(ink: Ink, look: KeepsakeLook): string {
  if (typeof ink !== 'string') return mixOklab(inkColour(ink[0], look), ink[1], inkColour(ink[2], look))
  return ink.startsWith(GLASS) ? look.glass[ink.slice(GLASS.length) as keyof Inks] : look.inks[ink as keyof Inks]
}

/** Grain strength, in levels of 255: about the 4% the site's own paper takes. */
const GRAIN = 7

function family(variable: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  return value ? `${value}, ${fallback}` : fallback
}

// Canvas cannot read CSS variables in a font, so the families next/font made are read from the page and borrowed.
function fontFamily(font: Font): string {
  const sans = family('--font-atkinson', 'system-ui, sans-serif')
  return font === 'display' ? family('--font-bricolage', sans) : sans
}

/** Asks for both faces now, so a canvas drawn straight away does not fall back; draw again once this resolves. */
export async function loadKeepsakeFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  await Promise.all([`400 32px ${fontFamily('sans')}`, `700 32px ${fontFamily('display')}`].map((face) => document.fonts.load(face))).catch(() => {})
  await document.fonts.ready.catch(() => {})
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

type TextOp = Extract<KeepsakeOp, { kind: 'text' }>
type ShapeOp = Exclude<KeepsakeOp, { kind: 'text' }>

function drawShape(ctx: CanvasRenderingContext2D, op: ShapeOp, look: KeepsakeLook) {
  const s = 1 / PIXEL
  ctx.globalAlpha = op.alpha ?? 1
  ctx.globalCompositeOperation = op.b ? (look.theme === 'dark' ? 'screen' : 'multiply') : 'source-over'
  ctx.fillStyle = inkColour(op.ink, look)
  ctx.strokeStyle = ctx.fillStyle
  // The second ink lands one art pixel out of register, as a second pass through a press does
  const shift = op.b && !look.plain ? 1 : 0
  ctx.save()
  if (op.clip) {
    ctx.beginPath()
    ctx.rect(Math.round(op.clip.x * s), Math.round(op.clip.y * s), Math.round(op.clip.w * s), Math.round(op.clip.h * s))
    ctx.clip()
  }
  ctx.setTransform(1, 0, 0, 1, shift, shift)
  switch (op.kind) {
    case 'rect':
      ctx.fillRect(Math.round(op.x * s), Math.round(op.y * s), Math.max(1, Math.round(op.w * s)), Math.max(1, Math.round(op.h * s)))
      break
    case 'disc':
      ctx.beginPath()
      ctx.arc(op.x * s, op.y * s, Math.max(0.6, op.r * s), 0, Math.PI * 2)
      ctx.fill()
      break
    case 'ellipse':
      ctx.beginPath()
      ctx.ellipse(op.x * s, op.y * s, Math.max(0.5, op.rx * s), Math.max(0.5, op.ry * s), op.angle, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'poly':
      if (op.points.length < 3) break
      ctx.beginPath()
      op.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * s, y * s) : ctx.lineTo(x * s, y * s)))
      ctx.closePath()
      ctx.fill()
      break
    case 'line':
      if (op.points.length < 2) break
      ctx.lineWidth = Math.max(1, op.width * s)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      op.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * s, y * s) : ctx.lineTo(x * s, y * s)))
      ctx.stroke()
  }
  ctx.restore()
}

function weightOf(op: TextOp): number {
  return op.font === 'display' ? Math.max(600, op.weight ?? 700) : (op.weight ?? 400)
}

/** The lines a text op sets, as the canvas wraps them. */
function lay(ctx: CanvasRenderingContext2D, op: TextOp): string[] {
  ctx.font = `${weightOf(op)} ${op.size}px ${fontFamily(op.font)}`
  ctx.textBaseline = 'alphabetic'
  let lines = op.maxWidth ? wrapLines((line) => ctx.measureText(line).width, op.text, op.maxWidth) : op.text.split('\n')
  if (op.maxLines && lines.length > op.maxLines) {
    lines = lines.slice(0, op.maxLines)
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[\s.,;:]+$/, '')}…`
  }
  return lines
}

function drawText(ctx: CanvasRenderingContext2D, op: TextOp, look: KeepsakeLook) {
  const lines = lay(ctx, op)
  ctx.globalAlpha = op.alpha ?? 1
  ctx.fillStyle = inkColour(op.ink, look)
  ctx.textAlign = op.align ?? 'left'
  ctx.textBaseline = 'alphabetic'
  const lineHeight = op.lineHeight ?? op.size * 1.35
  lines.forEach((line, i) => ctx.fillText(line, op.x, op.y + i * lineHeight))
}

interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

/** Where a text op's words land: each line as the canvas measures it, ascenders and descenders included, plus one art pixel all round. */
function wordsBox(ctx: CanvasRenderingContext2D, op: TextOp): Box {
  const lines = lay(ctx, op)
  const lineHeight = op.lineHeight ?? op.size * 1.35
  const box: Box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  lines.forEach((line, i) => {
    const m = ctx.measureText(line)
    const left = op.align === 'center' ? op.x - m.width / 2 : op.align === 'right' ? op.x - m.width : op.x
    const baseline = op.y + i * lineHeight
    box.left = Math.min(box.left, left - PIXEL)
    box.right = Math.max(box.right, left + m.width + PIXEL)
    box.top = Math.min(box.top, baseline - m.actualBoundingBoxAscent - PIXEL)
    box.bottom = Math.max(box.bottom, baseline + m.actualBoundingBoxDescent + PIXEL)
  })
  return box
}

/** A seeded speckle on the art grid, a pixel at a time, left off wherever words will sit. */
function grain(art: CanvasRenderingContext2D, width: number, height: number, clear: Box[], seed: number) {
  const image = art.getImageData(0, 0, width, height)
  const random = seededRandom(seed)
  const covered = new Uint8Array(width * height)
  for (const box of clear) {
    const [x0, x1] = [Math.max(0, Math.floor(box.left / PIXEL)), Math.min(width - 1, Math.ceil(box.right / PIXEL))]
    const [y0, y1] = [Math.max(0, Math.floor(box.top / PIXEL)), Math.min(height - 1, Math.ceil(box.bottom / PIXEL))]
    for (let y = y0; y <= y1; y++) covered.fill(1, y * width + x0, y * width + x1 + 1)
  }
  for (let i = 0; i < width * height; i++) {
    const shift = Math.round((random() - 0.5) * 2 * GRAIN)
    if (covered[i]) continue
    for (let c = 0; c < 3; c++) image.data[i * 4 + c] = Math.min(255, Math.max(0, image.data[i * 4 + c] + shift))
  }
  art.putImageData(image, 0, 0)
}

/**
 * Draws a plan onto a canvas: shapes onto a grid one art pixel per cell, the second ink overprinted a pixel
 * out of register and a seeded grain over the whole of it but the words, scaled up without smoothing; then the
 * words on top at full resolution.
 */
export function renderKeepsake(canvas: HTMLCanvasElement, plan: KeepsakePlan, look: KeepsakeLook) {
  canvas.width = plan.width
  canvas.height = plan.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const art = document.createElement('canvas')
  art.width = Math.ceil(plan.width / PIXEL)
  art.height = Math.ceil(plan.height / PIXEL)
  const artCtx = art.getContext('2d', { willReadFrequently: true })
  if (!artCtx) return
  for (const op of plan.ops) if (op.kind !== 'text') drawShape(artCtx, op, look)
  artCtx.globalAlpha = 1
  if (!look.plain) {
    const words = plan.ops.filter((op): op is TextOp => op.kind === 'text').map((op) => wordsBox(ctx, op))
    grain(artCtx, art.width, art.height, words, hashString(plan.fileName))
  }
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(art, 0, 0, art.width * PIXEL, art.height * PIXEL)
  for (const op of plan.ops) if (op.kind === 'text') drawText(ctx, op, look)
  ctx.globalAlpha = 1
}
