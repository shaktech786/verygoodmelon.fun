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

// ---------------------------------------------------------------------------
// Breathing pattern definitions
// ---------------------------------------------------------------------------

const PATTERNS: BreathingPattern[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    description: 'Equal rhythm. Used by Navy SEALs to stay calm.',
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
    description: 'Deep calm. A natural tranquilizer for the nervous system.',
    phases: [
      { label: 'Inhale', duration: 4, fill: 1 },
      { label: 'Hold', duration: 7, fill: 1 },
      { label: 'Exhale', duration: 8, fill: 0 },
    ],
  },
  {
    id: 'coherent',
    name: 'Coherent Breathing',
    description: 'Steady rhythm. Balances your autonomic nervous system.',
    phases: [
      { label: 'Inhale', duration: 5.5, fill: 1 },
      { label: 'Exhale', duration: 5.5, fill: 0 },
    ],
  },
  {
    id: 'sigh',
    name: 'Physiological Sigh',
    description: 'Double inhale, long exhale. The fastest way to calm down.',
    phases: [
      { label: 'Inhale', duration: 1.5, fill: 0.6 },
      { label: 'Inhale deeply', duration: 2.5, fill: 1 },
      { label: 'Exhale slowly', duration: 7, fill: 0 },
    ],
  },
  {
    id: 'free',
    name: 'Free Breathing',
    description: 'No guide. Tap or click to mark each breath.',
    phases: [], // no guided phases
  },
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

interface BreathPosition {
  phaseIndex: number
  phaseProgress: number // 0..1 within the current phase
  cycleProgress: number // 0..1 across the full breathing cycle
  expansion: number // 0..1 interpolated lung fullness
}

// The whole session is a pure function of elapsed time, so the label, the
// progress bar, the shape and the session clock can never disagree.
function breathPositionAt(phases: BreathingPhase[], elapsedMs: number): BreathPosition {
  const cycleMs = phases.reduce((sum, phase) => sum + phase.duration * 1000, 0)
  const inCycle = elapsedMs % cycleMs

  let phaseStart = 0
  let phaseIndex = 0
  while (inCycle >= phaseStart + phases[phaseIndex].duration * 1000) {
    phaseStart += phases[phaseIndex].duration * 1000
    phaseIndex++
  }

  const phase = phases[phaseIndex]
  const previousPhase = phases[(phaseIndex + phases.length - 1) % phases.length]
  const phaseProgress = (inCycle - phaseStart) / (phase.duration * 1000)

  return {
    phaseIndex,
    phaseProgress,
    cycleProgress: inCycle / cycleMs,
    expansion: lerp(previousPhase.fill, phase.fill, Math.min(phaseProgress * 1.2, 1)),
  }
}

// ---------------------------------------------------------------------------
// Canvas renderer
// ---------------------------------------------------------------------------

interface RenderState extends BreathPosition {
  time: number // session time in ms
}

function renderCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: RenderState,
  dpr: number,
) {
  const w = width / dpr
  const h = height / dpr

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2
  const baseRadius = Math.min(w, h) * 0.15
  const maxRadius = Math.min(w, h) * 0.35
  const radius = lerp(baseRadius, maxRadius, state.expansion)

  // Particles (8 orbiting dots)
  const particleCount = 8
  for (let i = 0; i < particleCount; i++) {
    const angle =
      ((Math.PI * 2) / particleCount) * i + state.time * 0.0003
    const orbitRadius = radius + 12 + Math.sin(state.time * 0.001 + i) * 8
    const px = cx + Math.cos(angle) * orbitRadius
    const py = cy + Math.sin(angle) * orbitRadius
    const particleSize = 2 + state.expansion * 2

    ctx.beginPath()
    ctx.arc(px, py, particleSize, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(116, 198, 157, ${0.3 + state.expansion * 0.4})`
    ctx.fill()
  }

  // Outer glow ring
  const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.4)
  glowGrad.addColorStop(0, `rgba(230, 57, 70, ${0.08 + state.expansion * 0.12})`)
  glowGrad.addColorStop(1, 'rgba(230, 57, 70, 0)')
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 1.4, 0, Math.PI * 2)
  ctx.fillStyle = glowGrad
  ctx.fill()

  // Main shape - morph between circle and polygon based on cycle progress
  const sides = Math.round(lerp(32, 6, Math.abs(Math.sin(state.cycleProgress * Math.PI))))
  const mainGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  mainGrad.addColorStop(0, `rgba(230, 57, 70, ${0.25 + state.expansion * 0.25})`)
  mainGrad.addColorStop(0.6, `rgba(116, 198, 157, ${0.2 + state.expansion * 0.2})`)
  mainGrad.addColorStop(1, `rgba(26, 77, 46, ${0.15 + state.expansion * 0.15})`)

  ctx.beginPath()
  for (let i = 0; i <= sides; i++) {
    const angle = ((Math.PI * 2) / sides) * i - Math.PI / 2
    const wobble = 1 + Math.sin(state.time * 0.002 + i * 0.7) * 0.02
    const r = radius * wobble
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = mainGrad
  ctx.fill()

  // Inner circle (progress ring)
  const innerRadius = radius * 0.35
  ctx.beginPath()
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.fill()

  // Progress arc inside inner circle
  ctx.beginPath()
  ctx.arc(cx, cy, innerRadius, -Math.PI / 2, -Math.PI / 2 + state.phaseProgress * Math.PI * 2)
  ctx.strokeStyle = `rgba(116, 198, 157, ${0.4 + state.expansion * 0.3})`
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.stroke()

  ctx.restore()
}

function renderFreeCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  freeBreaths: number[],
  time: number,
  dpr: number,
) {
  const w = width / dpr
  const h = height / dpr

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2

  // Render expanding rings for each breath
  const now = time
  for (const breathTime of freeBreaths) {
    const age = (now - breathTime) / 1000 // seconds since tap
    if (age > 8) continue // fade out after 8s
    const progress = age / 8
    const radius = 20 + progress * Math.min(w, h) * 0.45
    const alpha = (1 - progress) * 0.4

    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(116, 198, 157, ${alpha})`
    ctx.lineWidth = 2 - progress * 1.5
    if (ctx.lineWidth < 0.3) ctx.lineWidth = 0.3
    ctx.stroke()
  }

  // Center dot that pulses on recent breath
  const lastBreath = freeBreaths[freeBreaths.length - 1]
  const timeSinceLast = lastBreath ? (now - lastBreath) / 1000 : 999
  const pulseScale = timeSinceLast < 0.5 ? 1 + (0.5 - timeSinceLast) * 0.6 : 1
  const dotRadius = 8 * pulseScale

  ctx.beginPath()
  ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(230, 57, 70, ${timeSinceLast < 1 ? 0.7 : 0.3})`
  ctx.fill()

  // Ambient floating particles
  const particleCount = 12
  for (let i = 0; i < particleCount; i++) {
    const angle = ((Math.PI * 2) / particleCount) * i + time * 0.0002
    const dist = 60 + Math.sin(time * 0.001 + i * 1.3) * 30
    const px = cx + Math.cos(angle) * dist
    const py = cy + Math.sin(angle) * dist

    ctx.beginPath()
    ctx.arc(px, py, 2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(116, 198, 157, 0.25)'
    ctx.fill()
  }

  ctx.restore()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BreathingPatterns() {
  const [selectedPatternId, setSelectedPatternId] = useState('box')
  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [freeBreathCount, setFreeBreathCount] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  // performance.now() at which a never-paused session would have started
  const sessionStartRef = useRef(0)
  const pausedAtRef = useRef(0)
  // Session time (ms) of each breath marked in free mode
  const freeBreathsRef = useRef<number[]>([])

  const pattern = PATTERNS.find((p) => p.id === selectedPatternId)!
  const isFreeMode = pattern.id === 'free'
  const isRunning = sessionState === 'active'
  const position = isFreeMode ? null : breathPositionAt(pattern.phases, elapsedMs)
  const sessionElapsed = Math.floor(elapsedMs / 1000)

  // ---------------------------------------------------------------------------
  // Session controls
  // ---------------------------------------------------------------------------

  const startSession = useCallback(() => {
    sessionStartRef.current = performance.now()
    freeBreathsRef.current = []
    setElapsedMs(0)
    setFreeBreathCount(0)
    setSessionState('active')
  }, [])

  const pauseSession = useCallback(() => {
    pausedAtRef.current = performance.now()
    setSessionState('paused')
  }, [])

  const resumeSession = useCallback(() => {
    sessionStartRef.current += performance.now() - pausedAtRef.current
    setSessionState('active')
  }, [])

  const endSession = useCallback(() => {
    setSessionState('complete')
  }, [])

  const resetSession = useCallback(() => {
    setSessionState('idle')
    setElapsedMs(0)
    setFreeBreathCount(0)
  }, [])

  const markBreath = useCallback(() => {
    freeBreathsRef.current.push(performance.now() - sessionStartRef.current)
    setFreeBreathCount(freeBreathsRef.current.length)
  }, [])

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

    let frame = 0
    const tick = (now: number) => {
      const elapsed = Math.max(0, now - sessionStartRef.current)
      setElapsedMs(elapsed)

      if (canvas && ctx) {
        if (isFreeMode) {
          renderFreeCanvas(ctx, canvas.width, canvas.height, freeBreathsRef.current, elapsed, dpr)
        } else {
          renderCanvas(ctx, canvas.width, canvas.height, {
            ...breathPositionAt(pattern.phases, elapsed),
            time: elapsed,
          }, dpr)
        }
      }

      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [isRunning, prefersReducedMotion, isFreeMode, pattern])

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
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'ArrowRight':
        case 'ArrowDown': {
          // Only inside the pattern list, so arrow keys still scroll the page elsewhere.
          if (sessionState !== 'idle' || !(e.target instanceof HTMLElement) || e.target.getAttribute('role') !== 'radio') return
          e.preventDefault()
          const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1
          const idx = PATTERNS.findIndex((p) => p.id === selectedPatternId)
          const next = PATTERNS[(idx + step + PATTERNS.length) % PATTERNS.length]
          setSelectedPatternId(next.id)
          document.getElementById(`breathing-pattern-${next.id}`)?.focus()
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
  }, [sessionState, selectedPatternId, isFreeMode, startSession, pauseSession, resumeSession, endSession, resetSession, markBreath])

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

    return (
      <div className="max-w-2xl mx-auto" role="application" aria-label="Breathing Patterns">
        <div className="bg-card-bg border border-card-border rounded-lg p-8 sm:p-12 text-center min-h-[400px] flex flex-col justify-center">
          <div className="animate-fade" role="status">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-foreground">
              Well done.
            </h2>
            <p className="text-lg text-foreground/70 mb-2">
              You spent {timeStr} breathing.
            </p>
            {isFreeMode && freeBreathCount > 0 && (
              <p className="text-sm text-foreground/50 mb-6">
                {freeBreathCount} breath{freeBreathCount !== 1 ? 's' : ''} marked.
              </p>
            )}
            {!isFreeMode && (
              <p className="text-sm text-foreground/50 mb-6">
                Pattern: {pattern.name}
              </p>
            )}
            <div className="space-y-3 mt-6">
              <Button variant="primary" onClick={resetSession} autoFocus>
                Breathe Again
              </Button>
            </div>
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
    const lungsFilling = position !== null && pattern.phases[position.phaseIndex].fill > 0

    return (
      <div className="max-w-2xl mx-auto" role="application" aria-label="Breathing Patterns">
        {/* Screen reader announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {sessionState === 'paused' ? 'Session paused' : position ? phaseLabel : ''}
        </div>

        <div className="bg-card-bg border border-card-border rounded-lg p-6 sm:p-8 text-center min-h-[500px] flex flex-col justify-center relative">
          {/* Pattern name */}
          <p className="text-sm text-foreground/50 mb-4">{pattern.name}</p>

          {/* Canvas or reduced-motion fallback */}
          {prefersReducedMotion ? (
            <div className="flex flex-col items-center mb-6">
              <div
                className={cn(
                  'w-40 h-40 rounded-full flex items-center justify-center',
                  !position
                    ? 'bg-success/20'
                    : phaseLabel === 'Hold'
                      ? 'bg-accent/20'
                      : lungsFilling
                        ? 'bg-success/30'
                        : 'bg-[#1a4d2e]/20'
                )}
                role="img"
                aria-label={`Breathing visualization - ${phaseLabel}`}
                onClick={isFreeMode && isRunning ? markBreath : undefined}
              >
                <span className="text-foreground/80 text-lg font-medium" aria-hidden="true">
                  {position ? phaseLabel : freeBreathCount}
                </span>
              </div>
            </div>
          ) : (
            <div className="relative mb-4">
              <canvas
                ref={canvasRef}
                className={cn('w-full aspect-square max-w-[320px] mx-auto', isFreeMode && 'cursor-pointer')}
                role="img"
                aria-label={`Breathing visualization - ${phaseLabel}`}
                onClick={isFreeMode && isRunning ? markBreath : undefined}
              />
            </div>
          )}

          {/* Phase label */}
          <h2
            className={cn(
              'text-2xl sm:text-3xl font-semibold mb-2 text-foreground',
              sessionState === 'paused' && 'opacity-50',
            )}
          >
            {sessionState === 'paused' ? 'Paused' : phaseLabel}
          </h2>

          {/* Visual countdown bar (not numeric) */}
          {position && (
            <div className="w-48 h-1.5 mx-auto bg-foreground/10 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-success/60 rounded-full"
                data-testid="phase-progress"
                style={{ width: `${position.phaseProgress * 100}%` }}
              />
            </div>
          )}

          {isFreeMode && (
            <p className="text-sm text-foreground/60 mb-4" aria-live="polite">
              {freeBreathCount} breath{freeBreathCount !== 1 ? 's' : ''} marked
            </p>
          )}

          {/* Session timer */}
          <p className="text-sm text-foreground/50 tabular-nums mb-6" role="timer" aria-label="Session time">
            {formatTime(sessionElapsed)}
          </p>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isFreeMode && (
              <Button
                variant="secondary"
                size="sm"
                onClick={markBreath}
                disabled={!isRunning}
              >
                Mark a breath
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={sessionState === 'paused' ? resumeSession : pauseSession}
              aria-label={sessionState === 'paused' ? 'Resume session' : 'Pause session'}
            >
              {sessionState === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={endSession}
              aria-label="End breathing session"
            >
              End Session
            </Button>
          </div>

          {/* Keyboard hint */}
          <p className="text-xs text-foreground/50 mt-4">
            {isFreeMode
              ? 'Space = mark breath. P = pause. Escape = end.'
              : 'Space = pause/resume. Escape = end.'}
          </p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: Idle (pattern selection)
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-2xl mx-auto" role="application" aria-label="Breathing Patterns">
      <div className="text-center mb-6">
        <p className="text-sm sm:text-base text-foreground/70">
          Choose a breathing pattern, then press Begin Breathing.
        </p>
      </div>

      {/* Pattern selector */}
      <div
        className="grid grid-cols-1 gap-3 mb-8"
        role="radiogroup"
        aria-label="Breathing pattern"
      >
        {PATTERNS.map((p) => (
          <button
            key={p.id}
            id={`breathing-pattern-${p.id}`}
            role="radio"
            aria-checked={selectedPatternId === p.id}
            tabIndex={selectedPatternId === p.id ? 0 : -1}
            onClick={() => setSelectedPatternId(p.id)}
            className={cn(
              'text-left px-5 py-4 rounded-lg border transition-all duration-75',
              'focus:outline-none focus:ring-2 focus:ring-accent',
              selectedPatternId === p.id
                ? 'border-accent bg-accent/5'
                : 'border-card-border bg-card-bg hover:border-accent/40',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground mb-1">{p.name}</h3>
                <p className="text-sm text-foreground/60">{p.description}</p>
              </div>
              {p.phases.length > 0 && (
                <span className="text-xs text-foreground/50 whitespace-nowrap mt-1">
                  {p.phases.map((ph) => `${ph.duration}s`).join('-')}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Start button */}
      <div className="text-center">
        <Button variant="primary" size="lg" onClick={startSession}>
          Begin Breathing
        </Button>
      </div>

      {/* Keyboard instructions */}
      <div className="text-center mt-4 text-xs text-foreground/50">
        <p>Arrow keys change the pattern while the list is focused. Space starts.</p>
      </div>
    </div>
  )
}
