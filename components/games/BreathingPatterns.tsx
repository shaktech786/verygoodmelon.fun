'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BreathingPhase {
  label: string
  duration: number // seconds
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
      { label: 'Inhale', duration: 4 },
      { label: 'Hold', duration: 4 },
      { label: 'Exhale', duration: 4 },
      { label: 'Hold', duration: 4 },
    ],
  },
  {
    id: '478',
    name: '4-7-8 Relaxation',
    description: 'Deep calm. A natural tranquilizer for the nervous system.',
    phases: [
      { label: 'Inhale', duration: 4 },
      { label: 'Hold', duration: 7 },
      { label: 'Exhale', duration: 8 },
    ],
  },
  {
    id: 'coherent',
    name: 'Coherent Breathing',
    description: 'Steady rhythm. Balances your autonomic nervous system.',
    phases: [
      { label: 'Inhale', duration: 5.5 },
      { label: 'Exhale', duration: 5.5 },
    ],
  },
  {
    id: 'sigh',
    name: 'Physiological Sigh',
    description: 'Double inhale, long exhale. The fastest way to calm down.',
    phases: [
      { label: 'Inhale', duration: 1.5 },
      { label: 'Inhale deeply', duration: 2.5 },
      { label: 'Exhale slowly', duration: 7 },
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
// Color palette
// ---------------------------------------------------------------------------

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

// Map a phase label to an expansion factor (0 = contracted, 1 = expanded)
function phaseExpansion(label: string): number {
  const l = label.toLowerCase()
  if (l.startsWith('inhale')) return 1
  if (l === 'hold') return 0.5 // maintain current-ish size
  if (l.startsWith('exhale')) return 0
  return 0.5
}

// ---------------------------------------------------------------------------
// Canvas renderer
// ---------------------------------------------------------------------------

interface RenderState {
  phase: string
  phaseProgress: number // 0..1 within the current phase
  cycleProgress: number // 0..1 across the full breathing cycle
  expansion: number // 0..1 interpolated expansion
  freeBreaths: number[] // timestamps of free-mode taps
  time: number // performance.now
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
  // State
  const [selectedPatternId, setSelectedPatternId] = useState('box')
  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [phaseElapsed, setPhaseElapsed] = useState(0)
  const [sessionElapsed, setSessionElapsed] = useState(0)
  const [freeBreaths, setFreeBreaths] = useState<number[]>([])
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const lastTickRef = useRef<number>(0)
  const phaseStartRef = useRef<number>(0)
  const sessionStartRef = useRef<number>(0)
  const expansionRef = useRef<number>(0)
  const announcementRef = useRef<string>('')

  const pattern = PATTERNS.find((p) => p.id === selectedPatternId)!
  const isFreeMode = pattern.id === 'free'
  const currentPhase = !isFreeMode && pattern.phases[currentPhaseIndex]
  const isRunning = sessionState === 'active'

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // ---------------------------------------------------------------------------
  // Session controls
  // ---------------------------------------------------------------------------

  const startSession = useCallback(() => {
    const now = performance.now()
    setSessionState('active')
    setCurrentPhaseIndex(0)
    setPhaseElapsed(0)
    setSessionElapsed(0)
    setFreeBreaths([])
    phaseStartRef.current = now
    sessionStartRef.current = now
    lastTickRef.current = now
    expansionRef.current = 0
    announcementRef.current = ''
  }, [])

  const pauseSession = useCallback(() => {
    setSessionState('paused')
  }, [])

  const resumeSession = useCallback(() => {
    const now = performance.now()
    phaseStartRef.current = now - phaseElapsed * 1000
    lastTickRef.current = now
    setSessionState('active')
  }, [phaseElapsed])

  const endSession = useCallback(() => {
    setSessionState('complete')
    cancelAnimationFrame(animFrameRef.current)
  }, [])

  const resetSession = useCallback(() => {
    setSessionState('idle')
    setCurrentPhaseIndex(0)
    setPhaseElapsed(0)
    setSessionElapsed(0)
    setFreeBreaths([])
    cancelAnimationFrame(animFrameRef.current)
  }, [])

  // Free mode tap handler
  const handleFreeTap = useCallback(() => {
    if (isFreeMode && isRunning) {
      setFreeBreaths((prev) => [...prev, performance.now()])
    }
  }, [isFreeMode, isRunning])

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isRunning || prefersReducedMotion) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }
    resizeCanvas()

    const ro = new ResizeObserver(resizeCanvas)
    ro.observe(canvas)

    const tick = (now: number) => {
      lastTickRef.current = now

      // Update session elapsed
      const totalElapsed = (now - sessionStartRef.current) / 1000
      setSessionElapsed(Math.floor(totalElapsed))

      if (isFreeMode) {
        renderFreeCanvas(ctx, canvas.width, canvas.height, freeBreaths, now, dpr)
      } else {
        // Guided mode: advance phase
        const phaseDur = pattern.phases[currentPhaseIndex]?.duration ?? 1
        const elapsed = (now - phaseStartRef.current) / 1000
        const progress = Math.min(elapsed / phaseDur, 1)

        setPhaseElapsed(elapsed)

        // Interpolate expansion
        const targetExpansion = phaseExpansion(pattern.phases[currentPhaseIndex]?.label ?? '')
        const prevExpansion = currentPhaseIndex > 0
          ? phaseExpansion(pattern.phases[currentPhaseIndex - 1]?.label ?? '')
          : phaseExpansion(pattern.phases[pattern.phases.length - 1]?.label ?? '')
        expansionRef.current = lerp(prevExpansion, targetExpansion, Math.min(progress * 1.2, 1))

        // Check phase transition
        if (elapsed >= phaseDur) {
          const nextIndex = (currentPhaseIndex + 1) % pattern.phases.length
          setCurrentPhaseIndex(nextIndex)
          phaseStartRef.current = now
          setPhaseElapsed(0)

          // Update announcement for screen readers
          const nextLabel = pattern.phases[nextIndex]?.label ?? ''
          announcementRef.current = nextLabel
        }

        const cycleDuration = pattern.phases.reduce((sum, p) => sum + p.duration, 0)
        const cycleElapsed = totalElapsed % cycleDuration
        const cycleProgress = cycleElapsed / cycleDuration

        renderCanvas(ctx, canvas.width, canvas.height, {
          phase: pattern.phases[currentPhaseIndex]?.label ?? '',
          phaseProgress: progress,
          cycleProgress,
          expansion: expansionRef.current,
          freeBreaths: [],
          time: now,
        }, dpr)
      }

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      ro.disconnect()
    }
    // We intentionally only re-run when these key values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, prefersReducedMotion, isFreeMode, pattern.id, currentPhaseIndex, freeBreaths])

  // ---------------------------------------------------------------------------
  // Keyboard controls
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when we're the focused context
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case ' ':
        case 'Space': {
          e.preventDefault()
          if (sessionState === 'idle') startSession()
          else if (sessionState === 'active') {
            if (isFreeMode) handleFreeTap()
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
        case 'ArrowUp': {
          if (sessionState === 'idle') {
            e.preventDefault()
            const idx = PATTERNS.findIndex((p) => p.id === selectedPatternId)
            const prev = (idx - 1 + PATTERNS.length) % PATTERNS.length
            setSelectedPatternId(PATTERNS[prev].id)
          }
          break
        }
        case 'ArrowRight':
        case 'ArrowDown': {
          if (sessionState === 'idle') {
            e.preventDefault()
            const idx = PATTERNS.findIndex((p) => p.id === selectedPatternId)
            const next = (idx + 1) % PATTERNS.length
            setSelectedPatternId(PATTERNS[next].id)
          }
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
  }, [sessionState, selectedPatternId, isFreeMode, startSession, pauseSession, resumeSession, endSession, resetSession, handleFreeTap])

  // ---------------------------------------------------------------------------
  // Phase announcement for screen readers
  // ---------------------------------------------------------------------------

  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (!isRunning || isFreeMode) return
    const label = pattern.phases[currentPhaseIndex]?.label
    if (label) {
      setAnnouncement(label)
    }
  }, [currentPhaseIndex, isRunning, isFreeMode, pattern.phases])

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
          <div className="animate-fade">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-foreground">
              Well done.
            </h2>
            <p className="text-lg text-foreground/70 mb-2">
              You spent {timeStr} breathing.
            </p>
            {isFreeMode && freeBreaths.length > 0 && (
              <p className="text-sm text-foreground/50 mb-6">
                {freeBreaths.length} breath{freeBreaths.length !== 1 ? 's' : ''} marked.
              </p>
            )}
            {!isFreeMode && (
              <p className="text-sm text-foreground/50 mb-6">
                Pattern: {pattern.name}
              </p>
            )}
            <div className="space-y-3 mt-6">
              <Button variant="primary" onClick={resetSession}>
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
    const phaseLabel = isFreeMode
      ? 'Breathe at your own pace'
      : (currentPhase as BreathingPhase).label

    return (
      <div className="max-w-2xl mx-auto" role="application" aria-label="Breathing Patterns">
        {/* Screen reader announcements */}
        <div aria-live="assertive" aria-atomic="true" className="sr-only">
          {announcement}
        </div>
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {sessionState === 'paused' ? 'Session paused' : ''}
        </div>

        <div className="bg-card-bg border border-card-border rounded-lg p-6 sm:p-8 text-center min-h-[500px] flex flex-col justify-center relative">
          {/* Pattern name */}
          <p className="text-sm text-foreground/50 mb-4">{pattern.name}</p>

          {/* Canvas or reduced-motion fallback */}
          {prefersReducedMotion ? (
            <div className="flex flex-col items-center mb-6">
              <div
                className={cn(
                  'w-40 h-40 rounded-full flex items-center justify-center transition-colors duration-1000',
                  phaseLabel.toLowerCase().startsWith('inhale')
                    ? 'bg-success/30'
                    : phaseLabel.toLowerCase() === 'hold'
                      ? 'bg-accent/20'
                      : 'bg-[#1a4d2e]/20'
                )}
                role="img"
                aria-label={`Breathing visualization - ${phaseLabel}`}
              >
                <span className="text-foreground/80 text-lg font-medium">
                  {phaseLabel}
                </span>
              </div>
            </div>
          ) : (
            <div className="relative mb-4">
              <canvas
                ref={canvasRef}
                className="w-full aspect-square max-w-[320px] mx-auto"
                role="img"
                aria-label={`Breathing visualization - ${phaseLabel}`}
                onClick={isFreeMode ? handleFreeTap : undefined}
                style={isFreeMode ? { cursor: 'pointer' } : undefined}
              />
            </div>
          )}

          {/* Phase label */}
          <h2
            className={cn(
              'text-2xl sm:text-3xl font-semibold mb-2 text-foreground transition-opacity duration-500',
              sessionState === 'paused' && 'opacity-50',
            )}
          >
            {sessionState === 'paused' ? 'Paused' : phaseLabel}
          </h2>

          {/* Visual countdown bar (not numeric) */}
          {!isFreeMode && currentPhase && (
            <div className="w-48 h-1.5 mx-auto bg-foreground/10 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-success/60 rounded-full transition-all duration-200"
                style={{
                  width: `${Math.min((phaseElapsed / (currentPhase as BreathingPhase).duration) * 100, 100)}%`,
                }}
              />
            </div>
          )}

          {isFreeMode && (
            <p className="text-sm text-foreground/50 mb-4">
              Tap anywhere or press Space to mark each breath.
            </p>
          )}

          {/* Session timer */}
          <p className="text-sm text-foreground/40 tabular-nums mb-6">
            {formatTime(sessionElapsed)}
          </p>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {!isFreeMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={sessionState === 'paused' ? resumeSession : pauseSession}
                aria-label={sessionState === 'paused' ? 'Resume session' : 'Pause session'}
              >
                {sessionState === 'paused' ? 'Resume' : 'Pause'}
              </Button>
            )}
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
          <p className="text-xs text-foreground/30 mt-4">
            {isFreeMode
              ? 'Space = mark breath. Escape = end.'
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
          Choose a breathing pattern. Press Space to begin.
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
            role="radio"
            aria-checked={selectedPatternId === p.id}
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
                <span className="text-xs text-foreground/40 whitespace-nowrap mt-1">
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
      <div className="text-center mt-4 text-xs text-foreground/30">
        <p>Arrow keys to change pattern. Space to start.</p>
      </div>
    </div>
  )
}
