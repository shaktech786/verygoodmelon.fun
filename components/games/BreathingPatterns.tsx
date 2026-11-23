'use client'

import { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/Button'
import { KeyHints } from '@/components/ui/KeyHints'
import { cn } from '@/lib/utils/cn'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { buzz, playTones, useCanBuzz, useSoundAudible, wakeTones, type Tone } from '@/components/games/gentleCues'
import { hushAmbient } from '@/lib/audio/ambient-hush'
import {
  type Breath,
  type BreathPatternId,
  LAST_MELON_KEY,
  PATTERN_NAMES,
  type Seed,
  melonSeeds,
  readLastMelon,
  writeLastMelon,
} from '@/lib/games/breathing-patterns/melon'
import { cutBand, harmonistKeepsake, keepsakeMelon, restingLid } from '@/lib/keepsake/harmonist'
import { KEEPSAKE_HEIGHT, KEEPSAKE_WIDTH } from '@/lib/keepsake/plan'
import { inkColour } from '@/lib/keepsake/render'
import { Keepsake } from '@/components/games/Keepsake'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BreathingPhase {
  label: string
  duration: number // seconds
  fill: number // how full the lungs are when the phase ends, 0..1
}

interface BreathingPattern {
  id: BreathPatternId
  name: string
  description: string
  phases: BreathingPhase[]
}

type SessionState = 'idle' | 'active' | 'paused' | 'complete'
type PhaseKind = 'in' | 'hold' | 'out'
type CheckIn = 'calmer' | 'same' | 'tense'

// ---------------------------------------------------------------------------
// Breathing pattern definitions
// ---------------------------------------------------------------------------

const PATTERNS: BreathingPattern[] = [
  {
    id: 'box',
    name: PATTERN_NAMES['box'],
    description: 'Four equal sides. Steady and grounding.',
    phases: [
      { label: 'Inhale', duration: 4, fill: 1 },
      { label: 'Hold', duration: 4, fill: 1 },
      { label: 'Exhale', duration: 4, fill: 0 },
      { label: 'Hold', duration: 4, fill: 0 },
    ],
  },
  {
    id: '478',
    name: PATTERN_NAMES['478'],
    description: 'A long hold and a longer exhale. Good before sleep.',
    phases: [
      { label: 'Inhale', duration: 4, fill: 1 },
      { label: 'Hold', duration: 7, fill: 1 },
      { label: 'Exhale', duration: 8, fill: 0 },
    ],
  },
  {
    id: 'coherent',
    name: PATTERN_NAMES['coherent'],
    description: 'In and out, evenly. About five breaths a minute.',
    phases: [
      { label: 'Inhale', duration: 5.5, fill: 1 },
      { label: 'Exhale', duration: 5.5, fill: 0 },
    ],
  },
  {
    id: 'sigh',
    name: PATTERN_NAMES['sigh'],
    description: 'Two inhales, one slow exhale. A quick reset.',
    phases: [
      { label: 'Inhale', duration: 1.5, fill: 0.6 },
      { label: 'Inhale deeply', duration: 2.5, fill: 1 },
      { label: 'Exhale slowly', duration: 7, fill: 0 },
    ],
  },
  {
    id: 'free',
    name: PATTERN_NAMES['free'],
    description: 'No guide. Mark each breath at your own pace.',
    phases: [],
  },
]

const LENGTHS: { minutes: number | null; label: string }[] = [
  { minutes: 1, label: '1 min' },
  { minutes: 3, label: '3 min' },
  { minutes: 5, label: '5 min' },
  { minutes: null, label: 'Open' },
]

const CHECK_INS: { id: CheckIn; label: string; reply: string }[] = [
  { id: 'calmer', label: 'Calmer', reply: 'Good. Your body knows the way back here now.' },
  { id: 'same', label: 'About the same', reply: 'That is fine. Calm often arrives a few minutes after the breathing stops.' },
  { id: 'tense', label: 'Still tense', reply: 'Try one minute of the Physiological Sigh. It is the quickest reset we know.' },
]

// With breath tones on, each turn of the breath sounds one note of a C major chord: a rising
// glide to breathe in, a falling one to breathe out, a soft high note to hold. The
// direction alone is enough to follow with eyes closed.
const PHASE_TONES: Record<PhaseKind, Tone[]> = {
  in: [{ hz: 329.63, toHz: 392, seconds: 1.8 }],
  hold: [{ hz: 523.25, seconds: 1.2 }],
  out: [{ hz: 392, toHz: 261.63, seconds: 2.4 }],
}
const MARK_TONE: Tone[] = [{ hz: 523.25, seconds: 1.2 }]
const TONE_LOUDNESS = 0.05
const PHASE_BUZZ: Record<PhaseKind, number[]> = { in: [40], hold: [], out: [40, 100, 40] }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function cycleMsOf(phases: BreathingPhase[]): number {
  return phases.reduce((sum, phase) => sum + phase.duration * 1000, 0)
}

function phaseKind(phases: BreathingPhase[], index: number): PhaseKind {
  const before = phases[(index + phases.length - 1) % phases.length].fill
  const after = phases[index].fill
  if (after > before) return 'in'
  if (after < before) return 'out'
  return 'hold'
}

interface BreathPosition {
  phaseIndex: number
  phaseProgress: number // 0..1 within the current phase
  expansion: number // 0..1 interpolated lung fullness
}

// The whole session is a pure function of elapsed time, so the label, the
// progress bar, the shape and the session clock can never disagree.
function breathPositionAt(phases: BreathingPhase[], elapsedMs: number): BreathPosition {
  const inCycle = Math.max(0, elapsedMs) % cycleMsOf(phases)

  let phaseStart = 0
  let phaseIndex = 0
  while (inCycle >= phaseStart + phases[phaseIndex].duration * 1000) {
    phaseStart += phases[phaseIndex].duration * 1000
    phaseIndex++
  }

  const phase = phases[phaseIndex]
  const previousPhase = phases[(phaseIndex + phases.length - 1) % phases.length]
  const phaseProgress = (inCycle - phaseStart) / (phase.duration * 1000)
  const eased = 0.5 - Math.cos(Math.min(phaseProgress, 1) * Math.PI) / 2

  return {
    phaseIndex,
    phaseProgress,
    expansion: lerp(previousPhase.fill, phase.fill, eased),
  }
}

// Each pattern is drawn as a path with one side per phase: Box Breathing is a
// square, three-phase patterns a triangle, two-phase patterns a circle.
// Vertices run clockwise from the bottom left, so every inhale climbs.
function vertexAt(sides: number, k: number, cx: number, cy: number, r: number): [number, number] {
  const angle = Math.PI / 2 + Math.PI / sides + (k * 2 * Math.PI) / sides
  return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]
}

// The full melon stays inside the shape with room to spare, so it never covers the path being followed:
// a triangle's sides come much closer to its centre than a square's.
export function fullMelonRadius(sides: number, r: number): number {
  const inner = sides === 2 ? r : r * Math.cos(Math.PI / sides)
  return Math.min(r * 0.45, inner * 0.8)
}

function guidePoint(sides: number, phaseIndex: number, t: number, cx: number, cy: number, r: number): [number, number] {
  if (sides === 2) {
    const angle = Math.PI / 2 + (phaseIndex + t) * Math.PI
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]
  }
  const [x1, y1] = vertexAt(sides, phaseIndex, cx, cy, r)
  const [x2, y2] = vertexAt(sides, phaseIndex + 1, cx, cy, r)
  return [lerp(x1, x2, t), lerp(y1, y2, t)]
}

// ---------------------------------------------------------------------------
// Canvas renderer
// ---------------------------------------------------------------------------

interface Palette {
  rind: string
  band: string
  flesh: string
  seed: string
  in: string
  hold: string
  out: string
  faint: string
}

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    rind: v('--melon-green', '#1a4d2e'),
    band: v('--melon-green-light', '#74c69d'),
    flesh: v('--melon-red', '#e63946'),
    seed: '#1a1a1a',
    in: v('--success', '#74c69d'),
    hold: v('--warm', '#f6ad55'),
    // Not red: red is kept for the one main action on a screen.
    out: v('--melon-blue', '#3b82f6'),
    faint: v('--card-border', '#e8e8e8'),
  }
}

const SEED_FADE_MS = 1200

function drawMelon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  palette: Palette,
  seeds: Seed[],
  newestSeedAlpha: number,
) {
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = palette.rind
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2)
  ctx.fillStyle = palette.band
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2)
  ctx.fillStyle = palette.flesh
  ctx.fill()

  ctx.fillStyle = palette.seed
  seeds.forEach((seed, n) => {
    ctx.save()
    ctx.globalAlpha = n === seeds.length - 1 ? newestSeedAlpha : 1
    ctx.translate(cx + seed.x * r, cy + seed.y * r)
    ctx.rotate(seed.angle + Math.PI / 2)
    ctx.beginPath()
    ctx.ellipse(0, 0, r * seed.width, r * seed.length, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
}

function strokeSide(
  ctx: CanvasRenderingContext2D,
  sides: number,
  k: number,
  upTo: number,
  cx: number,
  cy: number,
  r: number,
) {
  ctx.beginPath()
  if (sides === 2) {
    const start = Math.PI / 2 + k * Math.PI
    ctx.arc(cx, cy, r, start, start + upTo * Math.PI)
  } else {
    const [x1, y1] = vertexAt(sides, k, cx, cy, r)
    const [x2, y2] = guidePoint(sides, k, upTo, cx, cy, r)
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
  }
  ctx.stroke()
}

function renderGuided(
  ctx: CanvasRenderingContext2D,
  size: number,
  phases: BreathingPhase[],
  position: BreathPosition,
  palette: Palette,
  seeds: Seed[],
  newestSeedAlpha: number,
) {
  ctx.clearRect(0, 0, size, size)
  const c = size / 2
  const r = size * 0.4
  const sides = phases.length
  const colour = (k: number) => palette[phaseKind(phases, k)]

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // The whole path, quietly, then the part of this phase already travelled.
  ctx.lineWidth = 4
  for (let k = 0; k < sides; k++) {
    ctx.globalAlpha = 0.4
    ctx.strokeStyle = colour(k)
    strokeSide(ctx, sides, k, 1, c, c, r)
  }
  ctx.globalAlpha = 1
  ctx.lineWidth = 5
  ctx.strokeStyle = colour(position.phaseIndex)
  strokeSide(ctx, sides, position.phaseIndex, position.phaseProgress, c, c, r)

  const melonRadius = lerp(r * 0.16, fullMelonRadius(sides, r), position.expansion)
  drawMelon(ctx, c, c, melonRadius, palette, seeds, newestSeedAlpha)

  const [px, py] = guidePoint(sides, position.phaseIndex, position.phaseProgress, c, c, r)
  const halo = ctx.createRadialGradient(px, py, 0, px, py, 18)
  halo.addColorStop(0, colour(position.phaseIndex))
  halo.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalAlpha = 0.35
  ctx.beginPath()
  ctx.arc(px, py, 18, 0, Math.PI * 2)
  ctx.fillStyle = halo
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.arc(px, py, 7, 0, Math.PI * 2)
  ctx.fillStyle = colour(position.phaseIndex)
  ctx.fill()
}

function renderFree(
  ctx: CanvasRenderingContext2D,
  size: number,
  freeBreaths: number[],
  palette: Palette,
  time: number,
  seeds: Seed[],
) {
  ctx.clearRect(0, 0, size, size)
  const c = size / 2

  ctx.strokeStyle = palette.in
  for (const breathTime of freeBreaths) {
    const age = (time - breathTime) / 8000
    if (age > 1) continue
    ctx.globalAlpha = (1 - age) * 0.6
    ctx.lineWidth = Math.max(0.5, 3 - age * 2.5)
    ctx.beginPath()
    ctx.arc(c, c, size * 0.12 + age * size * 0.36, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  const lastBreath = freeBreaths[freeBreaths.length - 1]
  const sinceLast = lastBreath === undefined ? Infinity : (time - lastBreath) / 1000
  const swell = sinceLast < 1.2 ? Math.sin((sinceLast / 1.2) * Math.PI) * 0.25 : 0
  drawMelon(ctx, c, c, size * 0.16 * (1 + swell), palette, seeds, Math.min(1, (sinceLast * 1000) / SEED_FADE_MS))
}

// ---------------------------------------------------------------------------
// Static guide for reduced motion: changes once per phase, never animates.
// ---------------------------------------------------------------------------

const KIND_STROKE: Record<PhaseKind, string> = { in: 'stroke-success', hold: 'stroke-warm', out: 'stroke-[var(--melon-blue)]' }
const KIND_FILL: Record<PhaseKind, string> = { in: 'fill-success', hold: 'fill-warm', out: 'fill-[var(--melon-blue)]' }

function sidePath(sides: number, k: number, c: number, r: number): string {
  if (sides === 2) {
    const [x1, y1] = guidePoint(2, k, 0, c, c, r)
    const [x2, y2] = guidePoint(2, k, 1, c, c, r)
    return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`
  }
  const [x1, y1] = vertexAt(sides, k, c, c, r)
  const [x2, y2] = vertexAt(sides, k + 1, c, c, r)
  return `M${x1} ${y1} L${x2} ${y2}`
}

function MelonSvg({ c, r, breaths }: { c: number; r: number; breaths: Breath[] }) {
  return (
    <g>
      <circle cx={c} cy={c} r={r} className="fill-melon-green" />
      <circle cx={c} cy={c} r={r * 0.88} className="fill-melon-green-light" />
      <circle cx={c} cy={c} r={r * 0.8} className="fill-melon-red" />
      {melonSeeds(breaths).map((seed, n) => {
        const x = c + seed.x * r
        const y = c + seed.y * r
        return (
          <ellipse
            key={n}
            cx={x}
            cy={y}
            rx={r * seed.width}
            ry={r * seed.length}
            fill="#1a1a1a"
            transform={`rotate(${(seed.angle * 180) / Math.PI + 90} ${x} ${y})`}
          />
        )
      })}
    </g>
  )
}

function pointsOf(points: [number, number][]): string {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
}

// The opening covers the picture's already-open melon with the keepsake's own paper until it fades away.
const OPENING_STYLES = `
@keyframes harmonist-cut { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
@keyframes harmonist-lift {
  from { transform: none }
  45% { transform: var(--lid-mid) }
  to { transform: var(--lid-rest) }
}
@keyframes harmonist-shadow { from { opacity: 0 } to { opacity: 0.1 } }
@keyframes harmonist-face-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes harmonist-face-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes harmonist-reveal { from { opacity: 1 } to { opacity: 0 } }
.harmonist-paper { fill: ${inkColour('paper', 'light')} }
:root[data-theme="dark"] .harmonist-paper { fill: ${inkColour('paper', 'dark')} }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .harmonist-paper { fill: ${inkColour('paper', 'dark')} } }
`

// The ending: the melon is cut along the shape the breath followed, and the cut piece lifts
// aside, turning over to show its cut face, and the seeds are there. It plays exactly over the
// picture to keep, drawn from the same geometry, then fades to leave that one picture.
function OpeningMelon({ breaths }: { breaths: Breath[] }) {
  const melon = useMemo(() => keepsakeMelon(breaths), [breaths])
  const [cx, cy] = melon.centre
  const r = melon.radius
  // The game's first drawing of this was 80 units across; its small offsets grow with the melon.
  const k = r / 80
  const lid = pointsOf(melon.cut)
  const resting = restingLid(melon, 18)
  const lifted = [...restingLid(melon), ...resting]
  const left = Math.min(cx - r, ...lifted.map(([x]) => x)) - 12
  const right = Math.max(cx + r, ...lifted.map(([x]) => x)) + 12
  const top = Math.min(cy - r, ...lifted.map(([, y]) => y)) - 12
  const bottom = Math.max(cy + r + 30, ...lifted.map(([, y]) => y)) + 12
  const deg = (melon.lid.angle * 180) / Math.PI
  const rest = `translate(${melon.lid.dx}px, ${melon.lid.dy}px) rotate(${deg}deg)`
  const lidStyle = {
    transformOrigin: `${cx}px ${cy}px`,
    transformBox: 'view-box',
    transform: rest,
    // Half way, the piece is edge-on as it turns over.
    '--lid-mid': `translate(${melon.lid.dx * 0.45}px, ${melon.lid.dy * 0.45 - 12 * k}px) rotate(${deg * 0.45}deg) scale(1.04, 0.12)`,
    '--lid-rest': rest,
    animation: 'harmonist-lift 1.1s cubic-bezier(0.33, 0, 0.2, 1) 0.9s both',
  } as React.CSSProperties

  return (
    <svg
      viewBox={`0 0 ${KEEPSAKE_WIDTH} ${KEEPSAKE_HEIGHT}`}
      className="absolute inset-x-0 top-0 mx-auto w-full max-w-[22rem] h-auto pointer-events-none"
      style={{ animation: 'harmonist-reveal 0.6s ease-in-out 2.4s both' }}
      aria-hidden="true"
      data-testid="opened-melon"
      data-shape={melon.shape}
    >
      <style>{OPENING_STYLES}</style>
      <rect x={left} y={top} width={right - left} height={bottom - top} className="harmonist-paper" />
      <ellipse cx={cx + 16} cy={cy + r - 6} rx={r * 0.92} ry={30} className="fill-foreground" opacity={0.08} />
      <circle cx={cx} cy={cy} r={r} className="fill-melon-green" />
      {melon.stripes.map((s, n) => (
        <ellipse key={n} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} className="fill-melon-green-light" opacity={0.3} />
      ))}
      <polygon points={lid} className="fill-melon-green-light" />
      <polygon points={pointsOf(melon.flesh)} className="fill-melon-red" />
      {melon.seeds.map((s, n) => (
        <ellipse
          key={n}
          data-seed=""
          cx={s.x}
          cy={s.y}
          rx={s.rx}
          ry={s.ry}
          fill="#1a1a1a"
          transform={`rotate(${(s.angle * 180) / Math.PI} ${s.x} ${s.y})`}
        />
      ))}
      <polygon
        points={pointsOf(resting)}
        className="fill-foreground"
        style={{ opacity: 0.1, animation: 'harmonist-shadow 0.6s ease-out 1.4s both' }}
      />
      <g style={lidStyle}>
        <g style={{ opacity: 0, animation: 'harmonist-face-out 0.12s linear 1.34s both' }}>
          <polygon points={lid} className="fill-melon-green" />
          <polygon
            points={lid}
            pathLength={1}
            className="fill-none stroke-melon-green-light"
            strokeWidth={1.5 * k}
            strokeLinejoin="round"
            strokeDasharray="1 1"
            style={{ animation: 'harmonist-cut 0.9s ease-in-out both' }}
          />
        </g>
        <g data-cut-face="" style={{ animation: 'harmonist-face-in 0.12s linear 1.4s both' }}>
          <polygon points={lid} transform="translate(0 8)" className="fill-melon-green" />
          <polygon points={lid} className="fill-melon-green" />
          <polygon points={pointsOf(cutBand(melon))} className="fill-melon-green-light" />
          <polygon points={pointsOf(melon.flesh)} className="fill-melon-red" />
        </g>
      </g>
    </svg>
  )
}

/** The melon, shown once: the picture to keep, with its opening played over it unless motion is reduced. */
function MelonEnding({ breaths, still }: { breaths: Breath[]; still: boolean }) {
  const [day] = useState(() => new Date())
  const plan = useMemo(() => harmonistKeepsake({ breaths, day }), [breaths, day])
  return (
    <div className="relative mb-6">
      <Keepsake plan={plan} label="Keep this melon" hideLabel />
      {!still && <OpeningMelon breaths={breaths} />}
    </div>
  )
}

function StillGuide({ phases, phaseIndex, breaths }: { phases: BreathingPhase[]; phaseIndex: number; breaths: Breath[] }) {
  const c = 100
  const r = 80
  const sides = phases.length
  const [px, py] = guidePoint(sides, phaseIndex, 0.5, c, c, r)
  const kind = phaseKind(phases, phaseIndex)
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
      {phases.map((_, k) => (
        <path
          key={k}
          d={sidePath(sides, k, c, r)}
          className={cn('fill-none', KIND_STROKE[phaseKind(phases, k)])}
          strokeWidth={k === phaseIndex ? 6 : 4}
          strokeOpacity={k === phaseIndex ? 1 : 0.4}
          strokeLinecap="round"
        />
      ))}
      <MelonSvg c={c} r={phases[phaseIndex].fill > 0.5 ? fullMelonRadius(sides, r) : r * 0.22} breaths={breaths} />
      <circle cx={px} cy={py} r={8} className={KIND_FILL[kind]} />
    </svg>
  )
}

function PatternGlyph({ phases }: { phases: BreathingPhase[] }) {
  const sides = phases.length
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10 flex-shrink-0" aria-hidden="true">
      {sides === 0 ? (
        <circle cx="20" cy="20" r="14" className="fill-none stroke-success" strokeWidth="2.5" strokeDasharray="3 5" strokeLinecap="round" />
      ) : (
        phases.map((_, k) => (
          <path
            key={k}
            d={sidePath(sides, k, 20, 15)}
            className={cn('fill-none', KIND_STROKE[phaseKind(phases, k)])}
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))
      )}
      <circle cx="20" cy="20" r="5" className="fill-melon-red" />
    </svg>
  )
}

// Arrow keys move through a radio group and select as they go.
function moveInRadioGroup(e: React.KeyboardEvent, ids: string[], current: number, select: (index: number) => void) {
  const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown'
  const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp'
  if (!forward && !back) return
  e.preventDefault()
  e.stopPropagation()
  const next = (current + (forward ? 1 : -1) + ids.length) % ids.length
  select(next)
  document.getElementById(ids[next])?.focus()
}

// Enter on a choice begins, as it submits a form; Space keeps its usual job of choosing.
function beginOnEnter(e: React.KeyboardEvent, begin: () => void) {
  if (e.key !== 'Enter') return
  e.preventDefault()
  begin()
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function subscribeToNothing(): () => void {
  return () => {}
}

function readSavedMelon(): string | null {
  try {
    return localStorage.getItem(LAST_MELON_KEY)
  } catch {
    return null
  }
}

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso))
}

function Chip({ pressed, onToggle, children }: { pressed: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm border transition-colors duration-75',
        'focus:outline-none focus:ring-2 focus:ring-focus-ring',
        pressed ? 'border-chosen-line bg-chosen text-foreground' : 'border-card-border text-foreground/75 hover:border-accent/50',
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BreathingPatterns() {
  const [selectedPatternId, setSelectedPatternId] = useState<BreathPatternId>('box')
  const [lengthMinutes, setLengthMinutes] = useState<number | null>(3)
  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [patternStartMs, setPatternStartMs] = useState(0)
  const [breaths, setBreaths] = useState<Breath[]>([])
  const [freeBreathCount, setFreeBreathCount] = useState(0)
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null)
  const [buzzWithBreath, setBuzzWithBreath] = useState(false)
  const [tonesOn, setTonesOn] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const audible = useSoundAudible()
  const canBuzz = useCanBuzz()
  const seeds = breaths.length

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const guideCardRef = useRef<HTMLDivElement>(null)
  const endingRef = useRef<HTMLElement>(null)
  const phaseHeadingRef = useRef<HTMLHeadingElement>(null)
  const justStartedRef = useRef(false)
  // performance.now() at which a never-paused session would have started
  const sessionStartRef = useRef(0)
  const pausedAtRef = useRef(0)
  const patternStartRef = useRef(0)
  // Every breath finished this session, in order; the melon is drawn from it
  const breathLogRef = useRef<Breath[]>([])
  // Guided breaths of the current pattern already in the log
  const loggedInPatternRef = useRef(0)
  // Session time (ms) of each breath marked in free mode
  const freeBreathsRef = useRef<number[]>([])
  const lastCueRef = useRef('')
  const buzzWithBreathRef = useRef(false)
  const tonesOnRef = useRef(false)

  useEffect(() => {
    buzzWithBreathRef.current = buzzWithBreath
  }, [buzzWithBreath])

  useEffect(() => {
    tonesOnRef.current = tonesOn
  }, [tonesOn])

  const savedMelon = useSyncExternalStore(subscribeToNothing, readSavedMelon, () => null)
  const lastMelon = useMemo(() => readLastMelon(savedMelon), [savedMelon])

  const pattern = PATTERNS.find((p) => p.id === selectedPatternId)!
  const isFreeMode = pattern.id === 'free'
  const isRunning = sessionState === 'active'
  const targetMs = lengthMinutes === null ? null : lengthMinutes * 60_000
  const position = isFreeMode ? null : breathPositionAt(pattern.phases, elapsedMs - patternStartMs)
  const finishing = targetMs !== null && elapsedMs >= targetMs

  // ---------------------------------------------------------------------------
  // Session controls
  // ---------------------------------------------------------------------------

  const startSession = useCallback((patternId?: BreathPatternId, minutes?: number | null) => {
    if (patternId) setSelectedPatternId(patternId)
    if (minutes !== undefined) setLengthMinutes(minutes)
    wakeTones(tonesOnRef.current)
    sessionStartRef.current = performance.now()
    patternStartRef.current = 0
    breathLogRef.current = []
    loggedInPatternRef.current = 0
    freeBreathsRef.current = []
    lastCueRef.current = ''
    justStartedRef.current = true
    setPatternStartMs(0)
    setElapsedMs(0)
    setFreeBreathCount(0)
    setBreaths([])
    setCheckIn(null)
    setSessionState('active')
  }, [])

  // Brings the guided breaths of the current pattern into the log, up to `count`.
  const logGuidedBreaths = useCallback((count: number) => {
    if (selectedPatternId === 'free') return
    const seconds = cycleMsOf(PATTERNS.find((p) => p.id === selectedPatternId)!.phases) / 1000
    while (loggedInPatternRef.current < count) {
      breathLogRef.current.push({ pattern: selectedPatternId, seconds })
      loggedInPatternRef.current += 1
    }
  }, [selectedPatternId])

  const pauseSession = useCallback(() => {
    pausedAtRef.current = performance.now()
    setSessionState('paused')
  }, [])

  // The rhythm only changes while paused, so a breath is never cut off mid-way by a stray tap
  const focusRhythmRef = useRef(false)
  const pauseToChangeRhythm = () => {
    focusRhythmRef.current = true
    pauseSession()
  }

  useEffect(() => {
    if (sessionState !== 'paused' || !focusRhythmRef.current) return
    focusRhythmRef.current = false
    document.getElementById(`rhythm-${selectedPatternId}`)?.focus()
  }, [sessionState, selectedPatternId])

  const resumeSession = useCallback(() => {
    sessionStartRef.current += performance.now() - pausedAtRef.current
    setSessionState('active')
  }, [])

  const breathsInCurrentPattern = useCallback((elapsed: number) => {
    if (isFreeMode) return 0
    return Math.floor((elapsed - patternStartRef.current) / cycleMsOf(pattern.phases))
  }, [isFreeMode, pattern])

  const endSession = useCallback(() => {
    logGuidedBreaths(breathsInCurrentPattern(elapsedMs))
    setBreaths([...breathLogRef.current])
    setSessionState('complete')
  }, [breathsInCurrentPattern, elapsedMs, logGuidedBreaths])

  const resetSession = useCallback(() => {
    setSessionState('idle')
    setElapsedMs(0)
    setFreeBreathCount(0)
  }, [])

  const markBreath = useCallback(() => {
    const at = performance.now() - sessionStartRef.current
    const previous = Math.max(patternStartRef.current, freeBreathsRef.current.at(-1) ?? 0)
    freeBreathsRef.current.push(at)
    breathLogRef.current.push({ pattern: 'free', seconds: Math.max(0.1, (at - previous) / 1000) })
    setFreeBreathCount(freeBreathsRef.current.length)
    setBreaths([...breathLogRef.current])
    playTones(MARK_TONE, TONE_LOUDNESS, tonesOnRef.current)
  }, [])

  // Changing rhythm mid-session keeps the session clock and starts the new
  // pattern from its first inhale.
  const switchPattern = useCallback((patternId: BreathPatternId) => {
    if (patternId === selectedPatternId) return
    const now = sessionState === 'paused' ? pausedAtRef.current : performance.now()
    const elapsed = Math.max(0, now - sessionStartRef.current)
    logGuidedBreaths(breathsInCurrentPattern(elapsed))
    loggedInPatternRef.current = 0
    setBreaths([...breathLogRef.current])
    patternStartRef.current = elapsed
    setPatternStartMs(elapsed)
    setElapsedMs(elapsed)
    setSelectedPatternId(patternId)
  }, [selectedPatternId, sessionState, breathsInCurrentPattern, logGuidedBreaths])

  // ---------------------------------------------------------------------------
  // Session clock, cues and drawing
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isRunning) return

    // With reduced motion there is no canvas, but the clock still has to run.
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d') ?? null
    const dpr = window.devicePixelRatio || 1

    const resizeCanvas = () => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }
    resizeCanvas()

    const ro = new ResizeObserver(resizeCanvas)
    if (canvas) ro.observe(canvas)

    const cycleMs = isFreeMode ? 0 : cycleMsOf(pattern.phases)
    const guidedBreathsAt = (elapsed: number) =>
      isFreeMode ? 0 : Math.floor((elapsed - patternStartRef.current) / cycleMs)
    let layout = { count: -1, seeds: [] as Seed[] }
    const seedsOf = (log: Breath[]) => {
      if (layout.count !== log.length) layout = { count: log.length, seeds: melonSeeds(log) }
      return layout.seeds
    }

    let frame = 0
    const tick = (now: number) => {
      let elapsed = Math.max(0, now - sessionStartRef.current)

      // A timed session ends at the target in free mode, or at the end of the
      // breath in progress once the target has passed, never mid-exhale.
      if (targetMs !== null && elapsed >= targetMs) {
        const inPattern = targetMs - patternStartRef.current
        const endAt = isFreeMode
          ? targetMs
          : patternStartRef.current + Math.max(1, Math.ceil(inPattern / cycleMs)) * cycleMs
        if (elapsed >= endAt) {
          elapsed = endAt
          setElapsedMs(elapsed)
          if (!isFreeMode) logGuidedBreaths(Math.round((elapsed - patternStartRef.current) / cycleMs))
          setBreaths([...breathLogRef.current])
          setSessionState('complete')
          return
        }
      }

      setElapsedMs(elapsed)
      const guidedBreaths = guidedBreathsAt(elapsed)
      logGuidedBreaths(guidedBreaths)
      const log = breathLogRef.current
      setBreaths((shown) => (shown.length === log.length ? shown : [...log]))

      const breath = isFreeMode ? null : breathPositionAt(pattern.phases, elapsed - patternStartRef.current)
      if (breath) {
        const cue = `${patternStartRef.current}:${guidedBreaths}:${breath.phaseIndex}`
        if (cue !== lastCueRef.current) {
          lastCueRef.current = cue
          const kind = phaseKind(pattern.phases, breath.phaseIndex)
          playTones(PHASE_TONES[kind], TONE_LOUDNESS, tonesOnRef.current)
          if (buzzWithBreathRef.current && PHASE_BUZZ[kind].length > 0) buzz(PHASE_BUZZ[kind])
        }
      }

      if (canvas && ctx) {
        const size = canvas.width / dpr
        ctx.save()
        ctx.scale(dpr, dpr)
        const palette = readPalette()
        if (breath) {
          const sinceSeed = guidedBreaths > 0 ? (elapsed - patternStartRef.current) % cycleMs : SEED_FADE_MS
          renderGuided(ctx, size, pattern.phases, breath, palette, seedsOf(log), Math.min(1, sinceSeed / SEED_FADE_MS))
        } else {
          renderFree(ctx, size, freeBreathsRef.current, palette, elapsed, seedsOf(log))
        }
        ctx.restore()
      }

      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [isRunning, prefersReducedMotion, isFreeMode, pattern, targetMs, logGuidedBreaths])

  // On a phone the guide starts below the choices, so bring it into view and move focus
  // to it; Space and Escape keep working from there.
  useEffect(() => {
    if (sessionState !== 'active' || !justStartedRef.current) return
    justStartedRef.current = false
    phaseHeadingRef.current?.focus({ preventScroll: true })
    const card = guideCardRef.current
    if (!card) return
    const { top, bottom } = card.getBoundingClientRect()
    if (top >= 0 && bottom <= window.innerHeight) return
    card.scrollIntoView({
      block: bottom - top <= window.innerHeight ? 'nearest' : 'start',
      behavior: prefersReducedMotion ? 'instant' : 'smooth',
    })
  }, [sessionState, prefersReducedMotion])

  // The ending opens with the melon, so it is brought to the top of the screen; focus waits on
  // Breathe again without scrolling there, which on a phone would push the melon off the top.
  useEffect(() => {
    if (sessionState !== 'complete') return
    const ending = endingRef.current
    if (!ending) return
    ending.querySelector<HTMLButtonElement>('[data-breathe-again]')?.focus({ preventScroll: true })
    const { top } = ending.getBoundingClientRect()
    if (top < 0 || top > window.innerHeight / 3) {
      ending.scrollIntoView({ block: 'start', behavior: prefersReducedMotion ? 'instant' : 'smooth' })
    }
  }, [sessionState, prefersReducedMotion])

  // The sea's fixed swell would compete with the breath, so it rests during a session.
  useEffect(() => {
    if (sessionState !== 'active' && sessionState !== 'paused') return
    return hushAmbient(['ocean-waves'])
  }, [sessionState])

  useEffect(() => {
    if (sessionState !== 'complete' || breaths.length === 0) return
    try {
      localStorage.setItem(LAST_MELON_KEY, writeLastMelon(breaths, new Date()))
    } catch {
      // Without storage the melon is simply not kept for next time.
    }
  }, [sessionState, breaths])

  // A guide nobody is watching should wait rather than keep counting.
  useEffect(() => {
    if (!isRunning) return
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') pauseSession()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [isRunning, pauseSession])

  // ---------------------------------------------------------------------------
  // Keyboard controls
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      // A focused button, link or disclosure already acts on Space; handling it here as well
      // would do the action twice (pause, then immediately resume).
      const onControl = e.target instanceof Element && e.target.closest('button, a, summary') !== null

      switch (e.key) {
        case ' ': {
          if (onControl) return
          e.preventDefault()
          if (sessionState === 'idle') startSession()
          else if (sessionState === 'active') {
            if (isFreeMode) markBreath()
            else pauseSession()
          }
          else if (sessionState === 'paused') resumeSession()
          break
        }
        case 'Escape': {
          if (sessionState === 'active' || sessionState === 'paused') endSession()
          else if (sessionState === 'complete') resetSession()
          break
        }
        case 'p':
        case 'P': {
          if (sessionState === 'active') pauseSession()
          else if (sessionState === 'paused') resumeSession()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sessionState, isFreeMode, startSession, pauseSession, resumeSession, endSession, resetSession, markBreath])

  // This visit's melon once there is one; before that, the one kept from last time.
  const shownMelon: { breaths: Breath[]; at: string | null } | null = breaths.length > 0 ? { breaths, at: null } : lastMelon
  const patternIndex = PATTERNS.findIndex((p) => p.id === selectedPatternId)
  const lengthIndex = LENGTHS.findIndex((l) => l.minutes === lengthMinutes)

  // ---------------------------------------------------------------------------
  // Render: Complete state
  // ---------------------------------------------------------------------------

  if (sessionState === 'complete') {
    // Only rhythms actually breathed: passing over an option while paused is not breathing it
    const breathed = [...new Set(breaths.map((breath) => breath.pattern))]
    const usedNames = breathed.map((id) => PATTERNS.find((p) => p.id === id)!.name)
    const reply = CHECK_INS.find((c) => c.id === checkIn)
    const onlyFree = isFreeMode && breathed.every((id) => id === 'free')

    return (
      <section ref={endingRef} className="max-w-2xl mx-auto scroll-mt-20" aria-label="Breathing guide">
        <div className="bg-card-bg border border-card-border rounded-lg px-4 py-6 sm:p-12 text-center min-h-[400px] flex flex-col justify-center">
          <div className="animate-fade">
            {/* The heading comes first, so the keepsake's own heading sits beneath it rather than before it */}
            <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-foreground">
              {seeds > 0 ? 'Your breaths, gathered' : 'A short pause'}
            </h2>
            {seeds > 0 ? (
              <MelonEnding breaths={breaths} still={prefersReducedMotion} />
            ) : (
              <svg viewBox="0 0 200 200" className="w-36 h-36 mx-auto mb-4" role="img" aria-label="A whole melon, waiting">
                <MelonSvg c={100} r={92} breaths={breaths} />
              </svg>
            )}
            {seeds === 0 && <p className="text-lg text-foreground/80 mb-2">A pause, however short, is still a pause.</p>}
            {seeds > 0 && (
              <p className="text-sm text-foreground/70">
                Each seed is a breath you {onlyFree ? 'marked' : 'finished'}. Its shape comes from the rhythm, and
                longer breaths grew longer seeds.
              </p>
            )}
            {!onlyFree && usedNames.length > 0 && (
              <p className="text-sm text-foreground/70 mt-1">
                {`${usedNames.length > 1 ? 'Patterns' : 'Pattern'}: ${usedNames.join(', ')}`}
              </p>
            )}
          </div>

          <fieldset className="mt-8">
            <legend className="text-base text-foreground mb-3 mx-auto">How do you feel now?</legend>
            <div className="flex flex-wrap justify-center gap-2">
              {CHECK_INS.map((option) => (
                <Chip key={option.id} pressed={checkIn === option.id} onToggle={() => setCheckIn(option.id)}>
                  {option.label}
                </Chip>
              ))}
            </div>
            <p className="mt-3 min-h-6 text-sm text-foreground/80" aria-live="polite">
              {reply?.reply}
            </p>
          </fieldset>

          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {checkIn === 'tense' && (
              <Button variant="secondary" onClick={() => startSession('sigh', 1)}>
                One minute of sighs
              </Button>
            )}
            <Button variant="primary" onClick={resetSession} data-breathe-again="">
              Breathe again
            </Button>
          </div>
        </div>
      </section>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: Active / Paused state
  // ---------------------------------------------------------------------------

  if (sessionState === 'active' || sessionState === 'paused') {
    const phaseLabel = position
      ? pattern.phases[position.phaseIndex].label
      : 'Breathe at your own pace'

    return (
      <section className="max-w-2xl mx-auto" aria-label="Breathing guide">
        {/* Screen reader announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {sessionState === 'paused' ? 'Session paused' : position ? phaseLabel : ''}
        </div>

        <div ref={guideCardRef} className="bg-card-bg border border-card-border rounded-lg px-4 py-6 sm:p-8 text-center flex flex-col justify-center relative scroll-mt-4">
          <p className="text-sm text-foreground/70 mb-2">{pattern.name}</p>

          {/* Canvas or reduced-motion fallback */}
          {prefersReducedMotion ? (
            <div
              className={cn('w-56 h-56 sm:w-64 sm:h-64 mx-auto mb-4', isFreeMode && 'cursor-pointer')}
              role="img"
              aria-label={`Breathing visualization - ${phaseLabel}`}
              onClick={isFreeMode && isRunning ? markBreath : undefined}
            >
              {position ? (
                <StillGuide phases={pattern.phases} phaseIndex={position.phaseIndex} breaths={breaths} />
              ) : (
                <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
                  <circle cx="100" cy="100" r="80" className="fill-none stroke-success" strokeWidth="3" strokeDasharray="6 10" strokeLinecap="round" />
                  <MelonSvg c={100} r={48} breaths={breaths} />
                </svg>
              )}
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className={cn('w-full aspect-square max-w-[300px] mx-auto mb-4', isFreeMode && 'cursor-pointer')}
              role="img"
              aria-label={`Breathing visualization - ${phaseLabel}`}
              onClick={isFreeMode && isRunning ? markBreath : undefined}
            />
          )}

          <h2
            ref={phaseHeadingRef}
            tabIndex={-1}
            className={cn(
              'text-2xl sm:text-3xl font-semibold mb-2 text-foreground focus:outline-none',
              sessionState === 'paused' && 'opacity-60',
            )}
          >
            {sessionState === 'paused' ? 'Paused' : phaseLabel}
          </h2>

          {position && (
            <div className="w-48 h-1.5 mx-auto bg-foreground/10 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-success rounded-full"
                data-testid="phase-progress"
                style={{ width: `${position.phaseProgress * 100}%` }}
              />
            </div>
          )}

          {isFreeMode && (
            <p className="text-sm text-foreground/70 mb-3" aria-live="polite">
              {`${plural(freeBreathCount, 'breath')} marked`}
            </p>
          )}

          {/* No clock: the seeds gather in the melon, and nothing counts the time or hurries the end. */}
          <p className="text-sm text-foreground/70 mb-5 min-h-5">
            {finishing && !isFreeMode && 'Finishing this breath'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {isFreeMode && (
              <Button variant="secondary" size="sm" onClick={markBreath} disabled={!isRunning}>
                Mark a breath
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={sessionState === 'paused' ? resumeSession : pauseSession}
            >
              {sessionState === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="ghost" size="sm" onClick={endSession}>
              End session
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-card-border">
            {sessionState === 'paused' ? (
              <div
                role="radiogroup"
                aria-label="Change rhythm"
                className="flex flex-wrap justify-center gap-1.5"
                onKeyDown={(e) => moveInRadioGroup(e, PATTERNS.map((p) => `rhythm-${p.id}`), patternIndex, (i) => switchPattern(PATTERNS[i].id))}
              >
                {PATTERNS.map((p) => (
                  <button
                    key={p.id}
                    id={`rhythm-${p.id}`}
                    type="button"
                    role="radio"
                    aria-checked={p.id === selectedPatternId}
                    tabIndex={p.id === selectedPatternId ? 0 : -1}
                    onClick={() => switchPattern(p.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs border transition-colors duration-75',
                      'focus:outline-none focus:ring-2 focus:ring-focus-ring',
                      p.id === selectedPatternId
                        ? 'border-chosen-line bg-chosen text-foreground'
                        : 'border-card-border text-foreground/75 hover:border-accent/50',
                    )}
                  >
                    {p.name.replace(/ (Breathing|Relaxation)$/, '')}
                  </button>
                ))}
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={pauseToChangeRhythm}>
                Change rhythm
              </Button>
            )}
            <KeyHints className="mt-3 text-foreground/70">
              {sessionState === 'paused'
                ? 'Choose a rhythm, then Resume. Escape ends.'
                : isFreeMode
                  ? 'Space marks a breath. P pauses. Escape ends.'
                  : 'Space pauses. Escape ends.'}
            </KeyHints>
          </div>
        </div>
      </section>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: Idle (pattern selection)
  // ---------------------------------------------------------------------------

  return (
    <section className="max-w-2xl mx-auto" aria-label="Breathing guide">
      <p className="text-center text-sm sm:text-base text-foreground/75 mb-3 sm:mb-4">
        Pick a rhythm and follow the dot around its shape.
      </p>

      {shownMelon && (
        <figure className="flex items-center justify-center gap-3 mb-3 sm:mb-4">
          <svg viewBox="0 0 200 200" className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" aria-hidden="true">
            <MelonSvg c={100} r={96} breaths={shownMelon.breaths} />
          </svg>
          <figcaption className="text-sm text-foreground/75">
            Your last melon{shownMelon.at ? `, from ${formatDay(shownMelon.at)}` : ''}: {plural(shownMelon.breaths.length, 'seed')}.
          </figcaption>
        </figure>
      )}

      <div
        className="grid grid-cols-1 gap-1.5 sm:gap-2 mb-3 sm:mb-5"
        role="radiogroup"
        aria-label="Breathing pattern"
        onKeyDown={(e) => {
          beginOnEnter(e, () => startSession())
          moveInRadioGroup(e, PATTERNS.map((p) => `breathing-pattern-${p.id}`), patternIndex, (i) => setSelectedPatternId(PATTERNS[i].id))
        }}
      >
        {PATTERNS.map((p) => (
          <button
            key={p.id}
            id={`breathing-pattern-${p.id}`}
            type="button"
            role="radio"
            aria-checked={selectedPatternId === p.id}
            tabIndex={selectedPatternId === p.id ? 0 : -1}
            onClick={() => setSelectedPatternId(p.id)}
            className={cn(
              'text-left px-4 py-2 sm:py-3 rounded-lg border transition-all duration-75',
              'focus:outline-none focus:ring-2 focus:ring-focus-ring',
              selectedPatternId === p.id
                ? 'border-chosen-line bg-chosen'
                : 'border-card-border bg-card-bg hover:border-accent/40',
            )}
          >
            <div className="flex items-center gap-3">
              <PatternGlyph phases={p.phases} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-foreground">{p.name}</span>
                  {p.phases.length > 0 && (
                    <span className="text-xs text-foreground/70 whitespace-nowrap">
                      {p.phases.map((ph) => ph.duration).join('-')}s
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/75">{p.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
        <span id="length-label" className="text-sm text-foreground/75 mr-1">Length</span>
        <div
          role="radiogroup"
          aria-labelledby="length-label"
          className="flex gap-1.5"
          onKeyDown={(e) => {
            beginOnEnter(e, () => startSession())
            moveInRadioGroup(e, LENGTHS.map((l) => `length-${l.minutes ?? 'open'}`), lengthIndex, (i) => setLengthMinutes(LENGTHS[i].minutes))
          }}
        >
          {LENGTHS.map((l) => (
            <button
              key={l.label}
              id={`length-${l.minutes ?? 'open'}`}
              type="button"
              role="radio"
              aria-checked={lengthMinutes === l.minutes}
              tabIndex={lengthMinutes === l.minutes ? 0 : -1}
              onClick={() => setLengthMinutes(l.minutes)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-colors duration-75',
                'focus:outline-none focus:ring-2 focus:ring-focus-ring',
                lengthMinutes === l.minutes
                  ? 'border-chosen-line bg-chosen text-foreground'
                  : 'border-card-border text-foreground/75 hover:border-accent/50',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Button variant="primary" size="lg" onClick={() => startSession()}>
          Begin breathing
        </Button>
        <KeyHints className="mt-3 text-foreground/70">Arrow keys choose. Enter begins.</KeyHints>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-6 mb-2">
        <Chip pressed={tonesOn} onToggle={() => setTonesOn((on) => !on)}>Breath tones</Chip>
        {canBuzz && (
          <Chip pressed={buzzWithBreath} onToggle={() => setBuzzWithBreath((on) => !on)}>Buzz as each breath turns</Chip>
        )}
      </div>
      <p className="text-center text-sm text-foreground/75 max-w-md mx-auto">
        {!tonesOn
          ? 'Breath tones let you follow along with your eyes closed.'
          : audible
            ? 'A rising note means breathe in, a falling one means breathe out. They play on their own, with or without the background sound.'
            : 'Sound is muted in the accessibility settings, so the tones stay silent.'}
      </p>

    </section>
  )
}
