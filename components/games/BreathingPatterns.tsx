'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BreathingPhase {
  label: string
  duration: number // seconds
  fill: number // how full the lungs are when the phase ends, 0..1
}

interface BreathingPattern {
  id: string
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
    name: 'Box Breathing',
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
    name: '4-7-8 Relaxation',
    description: 'A long hold and a longer exhale. Good before sleep.',
    phases: [
      { label: 'Inhale', duration: 4, fill: 1 },
      { label: 'Hold', duration: 7, fill: 1 },
      { label: 'Exhale', duration: 8, fill: 0 },
    ],
  },
  {
    id: 'coherent',
    name: 'Coherent Breathing',
    description: 'In and out, evenly. About five breaths a minute.',
    phases: [
      { label: 'Inhale', duration: 5.5, fill: 1 },
      { label: 'Exhale', duration: 5.5, fill: 0 },
    ],
  },
  {
    id: 'sigh',
    name: 'Physiological Sigh',
    description: 'Two inhales, one slow exhale. A quick reset.',
    phases: [
      { label: 'Inhale', duration: 1.5, fill: 0.6 },
      { label: 'Inhale deeply', duration: 2.5, fill: 1 },
      { label: 'Exhale slowly', duration: 7, fill: 0 },
    ],
  },
  {
    id: 'free',
    name: 'Free Breathing',
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

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
    out: v('--accent', '#d32f3f'),
    faint: v('--card-border', '#e8e8e8'),
  }
}

function drawMelon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, palette: Palette, turn: number) {
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

  if (r < 14) return
  ctx.fillStyle = palette.seed
  for (let i = 0; i < 7; i++) {
    const angle = turn + (i * Math.PI * 2) / 7
    ctx.save()
    ctx.translate(cx + Math.cos(angle) * r * 0.5, cy + Math.sin(angle) * r * 0.5)
    ctx.rotate(angle + Math.PI / 2)
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 0.045, r * 0.085, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
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
  time: number,
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

  const melonRadius = lerp(r * 0.16, r * 0.45, position.expansion)
  drawMelon(ctx, c, c, melonRadius, palette, time * 0.00004)

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
  drawMelon(ctx, c, c, size * 0.12 * (1 + swell), palette, time * 0.00004)
}

// ---------------------------------------------------------------------------
// Static guide for reduced motion: changes once per phase, never animates.
// ---------------------------------------------------------------------------

const KIND_STROKE: Record<PhaseKind, string> = { in: 'stroke-success', hold: 'stroke-warm', out: 'stroke-accent' }
const KIND_FILL: Record<PhaseKind, string> = { in: 'fill-success', hold: 'fill-warm', out: 'fill-accent' }

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

function MelonSvg({ c, r }: { c: number; r: number }) {
  return (
    <g>
      <circle cx={c} cy={c} r={r} className="fill-melon-green" />
      <circle cx={c} cy={c} r={r * 0.88} className="fill-melon-green-light" />
      <circle cx={c} cy={c} r={r * 0.8} className="fill-melon-red" />
      {r >= 14 && Array.from({ length: 7 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 7
        return (
          <ellipse
            key={i}
            cx={c + Math.cos(angle) * r * 0.5}
            cy={c + Math.sin(angle) * r * 0.5}
            rx={r * 0.045}
            ry={r * 0.085}
            fill="#1a1a1a"
            transform={`rotate(${(angle * 180) / Math.PI + 90} ${c + Math.cos(angle) * r * 0.5} ${c + Math.sin(angle) * r * 0.5})`}
          />
        )
      })}
    </g>
  )
}

function StillGuide({ phases, phaseIndex }: { phases: BreathingPhase[]; phaseIndex: number }) {
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
      <MelonSvg c={c} r={phases[phaseIndex].fill > 0.5 ? r * 0.45 : r * 0.22} />
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BreathingPatterns() {
  const [selectedPatternId, setSelectedPatternId] = useState('box')
  const [lengthMinutes, setLengthMinutes] = useState<number | null>(3)
  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [patternStartMs, setPatternStartMs] = useState(0)
  const [patternsUsed, setPatternsUsed] = useState<string[]>([])
  const [fullBreaths, setFullBreaths] = useState(0)
  const [freeBreathCount, setFreeBreathCount] = useState(0)
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  // performance.now() at which a never-paused session would have started
  const sessionStartRef = useRef(0)
  const pausedAtRef = useRef(0)
  const patternStartRef = useRef(0)
  // Full breaths finished in patterns used earlier in this session
  const earlierBreathsRef = useRef(0)
  // Session time (ms) of each breath marked in free mode
  const freeBreathsRef = useRef<number[]>([])

  const pattern = PATTERNS.find((p) => p.id === selectedPatternId)!
  const isFreeMode = pattern.id === 'free'
  const isRunning = sessionState === 'active'
  const targetMs = lengthMinutes === null ? null : lengthMinutes * 60_000
  const position = isFreeMode ? null : breathPositionAt(pattern.phases, elapsedMs - patternStartMs)
  const sessionElapsed = Math.floor(elapsedMs / 1000)
  const finishing = targetMs !== null && elapsedMs >= targetMs

  // ---------------------------------------------------------------------------
  // Session controls
  // ---------------------------------------------------------------------------

  const startSession = useCallback((patternId?: string, minutes?: number | null) => {
    if (patternId) setSelectedPatternId(patternId)
    if (minutes !== undefined) setLengthMinutes(minutes)
    sessionStartRef.current = performance.now()
    patternStartRef.current = 0
    earlierBreathsRef.current = 0
    freeBreathsRef.current = []
    setPatternStartMs(0)
    setPatternsUsed([patternId ?? selectedPatternId])
    setElapsedMs(0)
    setFreeBreathCount(0)
    setFullBreaths(0)
    setCheckIn(null)
    setSessionState('active')
  }, [selectedPatternId])

  const pauseSession = useCallback(() => {
    pausedAtRef.current = performance.now()
    setSessionState('paused')
  }, [])

  const resumeSession = useCallback(() => {
    sessionStartRef.current += performance.now() - pausedAtRef.current
    setSessionState('active')
  }, [])

  const breathsInCurrentPattern = useCallback((elapsed: number) => {
    if (isFreeMode) return 0
    return Math.floor((elapsed - patternStartRef.current) / cycleMsOf(pattern.phases))
  }, [isFreeMode, pattern])

  const endSession = useCallback(() => {
    setFullBreaths(earlierBreathsRef.current + breathsInCurrentPattern(elapsedMs))
    setSessionState('complete')
  }, [breathsInCurrentPattern, elapsedMs])

  const resetSession = useCallback(() => {
    setSessionState('idle')
    setElapsedMs(0)
    setFreeBreathCount(0)
  }, [])

  const markBreath = useCallback(() => {
    freeBreathsRef.current.push(performance.now() - sessionStartRef.current)
    setFreeBreathCount(freeBreathsRef.current.length)
  }, [])

  // Changing rhythm mid-session keeps the session clock and starts the new
  // pattern from its first inhale.
  const switchPattern = useCallback((patternId: string) => {
    if (patternId === selectedPatternId) return
    const now = sessionState === 'paused' ? pausedAtRef.current : performance.now()
    const elapsed = Math.max(0, now - sessionStartRef.current)
    earlierBreathsRef.current += breathsInCurrentPattern(elapsed)
    patternStartRef.current = elapsed
    setPatternStartMs(elapsed)
    setElapsedMs(elapsed)
    setSelectedPatternId(patternId)
    setPatternsUsed((used) => (used.includes(patternId) ? used : [...used, patternId]))
  }, [selectedPatternId, sessionState, breathsInCurrentPattern])

  // ---------------------------------------------------------------------------
  // Session clock and drawing
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
          setFullBreaths(earlierBreathsRef.current + (isFreeMode ? 0 : Math.round((elapsed - patternStartRef.current) / cycleMs)))
          setSessionState('complete')
          return
        }
      }

      setElapsedMs(elapsed)

      if (canvas && ctx) {
        const size = canvas.width / dpr
        ctx.save()
        ctx.scale(dpr, dpr)
        const palette = readPalette()
        if (isFreeMode) {
          renderFree(ctx, size, freeBreathsRef.current, palette, elapsed)
        } else {
          renderGuided(ctx, size, pattern.phases, breathPositionAt(pattern.phases, elapsed - patternStartRef.current), palette, elapsed)
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
  }, [isRunning, prefersReducedMotion, isFreeMode, pattern, targetMs])

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

      // A focused button or link already acts on Space; handling it here as well
      // would do the action twice (pause, then immediately resume).
      const onControl = e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement

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

  const patternIndex = PATTERNS.findIndex((p) => p.id === selectedPatternId)
  const lengthIndex = LENGTHS.findIndex((l) => l.minutes === lengthMinutes)

  // ---------------------------------------------------------------------------
  // Render: Complete state
  // ---------------------------------------------------------------------------

  if (sessionState === 'complete') {
    const minutes = Math.floor(sessionElapsed / 60)
    const seconds = sessionElapsed % 60
    const timeStr =
      minutes > 0
        ? `${minutes} minute${minutes !== 1 ? 's' : ''}${seconds > 0 ? ` and ${seconds} second${seconds !== 1 ? 's' : ''}` : ''}`
        : `${seconds} second${seconds !== 1 ? 's' : ''}`
    const usedNames = patternsUsed.map((id) => PATTERNS.find((p) => p.id === id)!.name)
    const reply = CHECK_INS.find((c) => c.id === checkIn)

    return (
      <div className="max-w-2xl mx-auto" role="application" aria-label="Breathing Patterns">
        <div className="bg-card-bg border border-card-border rounded-lg px-6 py-10 sm:p-12 text-center min-h-[400px] flex flex-col justify-center">
          <div className="animate-fade" role="status">
            <svg viewBox="0 0 200 200" className="w-20 h-20 mx-auto mb-4" aria-hidden="true">
              <MelonSvg c={100} r={90} />
            </svg>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-foreground">
              Well done.
            </h2>
            <p className="text-lg text-foreground/80 mb-2">
              You spent {timeStr} breathing.
            </p>
            <p className="text-sm text-foreground/70">
              {isFreeMode && patternsUsed.length === 1
                ? `${freeBreathCount} breath${freeBreathCount !== 1 ? 's' : ''} marked.`
                : `${usedNames.length > 1 ? 'Patterns' : 'Pattern'}: ${usedNames.join(', ')}`}
            </p>
            {fullBreaths > 0 && (
              <p className="text-sm text-foreground/70 mt-1">
                {fullBreaths} full {fullBreaths === 1 ? 'breath' : 'breaths'}, start to finish.
              </p>
            )}
          </div>

          <fieldset className="mt-8">
            <legend className="text-base text-foreground mb-3 mx-auto">How do you feel now?</legend>
            <div className="flex flex-wrap justify-center gap-2">
              {CHECK_INS.map((option) => (
                <Button
                  key={option.id}
                  variant={checkIn === option.id ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={checkIn === option.id}
                  onClick={() => setCheckIn(option.id)}
                >
                  {option.label}
                </Button>
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
            <Button variant="primary" onClick={resetSession} autoFocus>
              Breathe Again
            </Button>
          </div>
        </div>
      </div>
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
      <div className="max-w-2xl mx-auto" role="application" aria-label="Breathing Patterns">
        {/* Screen reader announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {sessionState === 'paused' ? 'Session paused' : position ? phaseLabel : ''}
        </div>

        <div className="bg-card-bg border border-card-border rounded-lg px-4 py-6 sm:p-8 text-center flex flex-col justify-center relative">
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
                <StillGuide phases={pattern.phases} phaseIndex={position.phaseIndex} />
              ) : (
                <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
                  <circle cx="100" cy="100" r="80" className="fill-none stroke-success" strokeWidth="3" strokeDasharray="6 10" strokeLinecap="round" />
                  <MelonSvg c={100} r={36} />
                  <text x="100" y="185" textAnchor="middle" className="fill-foreground text-[16px]">{freeBreathCount}</text>
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
            className={cn(
              'text-2xl sm:text-3xl font-semibold mb-2 text-foreground',
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
              {freeBreathCount} breath{freeBreathCount !== 1 ? 's' : ''} marked
            </p>
          )}

          <p className="text-sm text-foreground/70 mb-5">
            <span className="tabular-nums" role="timer" aria-label="Session time">{formatTime(sessionElapsed)}</span>
            {lengthMinutes !== null && (
              <span>
                {' '}of {lengthMinutes}:00{finishing && !isFreeMode ? ' · finishing this breath' : ''}
              </span>
            )}
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
              aria-label={sessionState === 'paused' ? 'Resume session' : 'Pause session'}
            >
              {sessionState === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="ghost" size="sm" onClick={endSession} aria-label="End breathing session">
              End Session
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-card-border">
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
                    'focus:outline-none focus:ring-2 focus:ring-accent',
                    p.id === selectedPatternId
                      ? 'border-accent bg-accent-soft text-foreground'
                      : 'border-card-border text-foreground/75 hover:border-accent/50',
                  )}
                >
                  {p.name.replace(/ (Breathing|Relaxation)$/, '')}
                </button>
              ))}
            </div>
            <p className="text-xs text-foreground/70 mt-3">
              {isFreeMode
                ? 'Space marks a breath. P pauses. Escape ends.'
                : 'Space pauses. Escape ends.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: Idle (pattern selection)
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-2xl mx-auto" role="application" aria-label="Breathing Patterns">
      <p className="text-center text-sm sm:text-base text-foreground/75 mb-4">
        Pick a rhythm and a length, then begin. Follow the dot around the shape.
      </p>

      <div
        className="grid grid-cols-1 gap-2 mb-5"
        role="radiogroup"
        aria-label="Breathing pattern"
        onKeyDown={(e) => moveInRadioGroup(e, PATTERNS.map((p) => `breathing-pattern-${p.id}`), patternIndex, (i) => setSelectedPatternId(PATTERNS[i].id))}
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
              'text-left px-4 py-3 rounded-lg border transition-all duration-75',
              'focus:outline-none focus:ring-2 focus:ring-accent',
              selectedPatternId === p.id
                ? 'border-accent bg-accent-soft'
                : 'border-card-border bg-card-bg hover:border-accent/40',
            )}
          >
            <div className="flex items-center gap-3">
              <PatternGlyph phases={p.phases} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{p.name}</h3>
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

      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        <span id="length-label" className="text-sm text-foreground/75 mr-1">Length</span>
        <div
          role="radiogroup"
          aria-labelledby="length-label"
          className="flex gap-1.5"
          onKeyDown={(e) => moveInRadioGroup(e, LENGTHS.map((l) => `length-${l.minutes ?? 'open'}`), lengthIndex, (i) => setLengthMinutes(LENGTHS[i].minutes))}
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
                'focus:outline-none focus:ring-2 focus:ring-accent',
                lengthMinutes === l.minutes
                  ? 'border-accent bg-accent-soft text-foreground'
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
          Begin Breathing
        </Button>
        <p className="mt-3 text-xs text-foreground/70">
          Arrow keys move within a list. Space begins.
        </p>
      </div>
    </div>
  )
}
