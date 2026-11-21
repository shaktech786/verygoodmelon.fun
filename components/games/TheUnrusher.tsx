'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

type TaskId = 'breathe' | 'watch' | 'listen' | 'reflect' | 'appreciate'

interface Task {
  id: TaskId
  title: string
  description: string
  duration: number // seconds
  reward: string
  guidance: string[] // Rotating guidance text during task
}

const TASKS: Task[] = [
  {
    id: 'breathe',
    title: 'Just Breathe',
    description: 'Follow the circle. Breathe with it.',
    duration: 60,
    reward: 'Inhale peace. Exhale worry.',
    guidance: [
      'Breathe in slowly...',
      'Hold gently...',
      'Release everything...',
      'Feel the stillness...'
    ]
  },
  {
    id: 'watch',
    title: 'Watch the Seeds',
    description: 'Watch watermelon seeds drift slowly.',
    duration: 45,
    reward: 'Some things cannot be hurried.',
    guidance: [
      'Let your eyes soften...',
      'Follow without forcing...',
      'Time moves differently here...',
      'No destination needed...'
    ]
  },
  {
    id: 'listen',
    title: 'Listen to Silence',
    description: 'Close your eyes. What do you hear?',
    duration: 60,
    reward: 'In stillness, we find clarity.',
    guidance: [
      'Close your eyes gently...',
      'What sounds surround you?',
      'The silence has layers...',
      'Be here, nowhere else...'
    ]
  },
  {
    id: 'reflect',
    title: 'Notice This Moment',
    description: 'What do you feel right now?',
    duration: 45,
    reward: 'This moment is all we truly have.',
    guidance: [
      'How does your body feel?',
      'What emotions are present?',
      'This is enough...',
      'You are here, now...'
    ]
  },
  {
    id: 'appreciate',
    title: 'Count Three Things',
    description: 'Three things you appreciate today.',
    duration: 50,
    reward: 'Gratitude slows time beautifully.',
    guidance: [
      'Think of something small...',
      'Something you overlooked...',
      'Someone who matters...',
      'A moment of grace...'
    ]
  }
]

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'pause'

const BREATH_PHASES: { phase: BreathPhase; endsAtMs: number }[] = [
  { phase: 'inhale', endsAtMs: 4000 },
  { phase: 'hold', endsAtMs: 11000 },
  { phase: 'exhale', endsAtMs: 19000 },
  { phase: 'pause', endsAtMs: 20000 }
]
const BREATH_CYCLE_MS = 20000
const TICK_MS = 200
const BREATH_WORDS: Record<BreathPhase, string> = { inhale: 'Inhale', hold: 'Hold', exhale: 'Exhale', pause: 'Rest' }

function breathPhaseIndexAt(elapsedMs: number): number {
  const inCycle = elapsedMs % BREATH_CYCLE_MS
  return BREATH_PHASES.findIndex(({ endsAtMs }) => inCycle < endsAtMs)
}

// Negative delays start each seed part-way through its 8s drift, so the field is never empty.
const FLOATING_SEEDS = Array.from({ length: 8 }, (_, i) => {
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 233280
    return x - Math.floor(x)
  }
  return {
    id: i,
    x: seededRandom(i * 2) * 80 + 10,
    delay: -(i + seededRandom(i * 2 + 1)),
    restingTop: seededRandom(i * 2 + 7) * 70 + 10
  }
})

type View = 'menu' | 'task' | 'reward'

const STORAGE_KEY = 'verygoodmelon:unrusher-today'
const THING_LABELS = ['First thing', 'Second thing', 'Third thing']

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// The menu promises moments "savored today", so the count survives a reload but not midnight.
function loadToday(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { day: string; completed: string[] } | null
    return saved?.day === todayKey() && Array.isArray(saved.completed) ? saved.completed : []
  } catch {
    return []
  }
}

function saveToday(completed: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ day: todayKey(), completed }))
  } catch {
    // Without storage the count simply lasts for this visit.
  }
}

function MomentIcon({ id, className }: { id: TaskId; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      {id === 'breathe' && (
        <>
          <circle cx="16" cy="16" r="13" className="fill-none stroke-success" strokeWidth="2" />
          <circle cx="16" cy="16" r="8" className="fill-success/30 stroke-success" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="3" className="fill-melon-green" />
        </>
      )}
      {id === 'watch' && (
        <>
          <path d="M3 12 A13 13 0 0 0 29 12 Z" className="fill-melon-green" />
          <path d="M5.5 12 A10.5 10.5 0 0 0 26.5 12 Z" className="fill-success/60" />
          <path d="M7 12 A9 9 0 0 0 25 12 Z" className="fill-melon-red" />
          <ellipse cx="12" cy="16" rx="1" ry="1.6" className="fill-foreground" />
          <ellipse cx="16" cy="18.5" rx="1" ry="1.6" className="fill-foreground" />
          <ellipse cx="20" cy="16" rx="1" ry="1.6" className="fill-foreground" />
        </>
      )}
      {id === 'listen' && (
        <>
          <circle cx="9" cy="16" r="3" className="fill-accent" />
          <path d="M15 10 A8 8 0 0 1 15 22" className="fill-none stroke-accent" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 6 A13 13 0 0 1 20 26" className="fill-none stroke-accent/60" strokeWidth="2" strokeLinecap="round" />
          <path d="M25 3 A17 17 0 0 1 25 29" className="fill-none stroke-accent/30" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {id === 'reflect' && (
        <>
          <path d="M3 16 Q16 4 29 16 Q16 28 3 16 Z" className="fill-none stroke-melon-green" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="16" cy="16" r="5" className="fill-success/40 stroke-melon-green" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="2" className="fill-melon-green" />
        </>
      )}
      {id === 'appreciate' && (
        <>
          <ellipse cx="8" cy="20" rx="3.2" ry="5" transform="rotate(-20 8 20)" className="fill-melon-red" />
          <ellipse cx="16" cy="12" rx="3.2" ry="5" className="fill-warm" />
          <ellipse cx="24" cy="20" rx="3.2" ry="5" transform="rotate(20 24 20)" className="fill-success" />
        </>
      )}
    </svg>
  )
}

const RING_RADIUS = 26
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

export default function TheUnrusher() {
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [completed, setCompleted] = useState<string[]>([])
  const [showReward, setShowReward] = useState(false)
  const [welcomeBack, setWelcomeBack] = useState(false)
  const [things, setThings] = useState(['', '', ''])
  const startedAtRef = useRef(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousViewRef = useRef<View>('menu')
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    setCompleted(loadToday())
  }, [])

  const view: View = currentTask ? (showReward ? 'reward' : 'task') : 'menu'

  // Everything on screen is derived from one wall-clock reading, so the countdown,
  // the breathing circle and the guidance cannot drift apart. A moment only counts
  // while it is on screen: time spent in another tab is not time spent slowing down.
  useEffect(() => {
    if (!isActive || !currentTask) return

    let hiddenSince: number | null = document.visibilityState === 'hidden' ? Date.now() : null
    const stop = () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    const tick = () => {
      if (hiddenSince !== null) return
      const elapsed = Date.now() - startedAtRef.current
      if (elapsed >= currentTask.duration * 1000) {
        stop()
        setIsActive(false)
        setShowReward(true)
        setCompleted((prev) => {
          const next = prev.includes(currentTask.id) ? prev : [...prev, currentTask.id]
          saveToday(next)
          return next
        })
        return
      }
      setElapsedMs(elapsed)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenSince ??= Date.now()
        return
      }
      if (hiddenSince !== null) {
        startedAtRef.current += Date.now() - hiddenSince
        hiddenSince = null
        setWelcomeBack(true)
      }
      tick()
    }

    const interval = setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return stop
  }, [isActive, currentTask])

  // Someone listening with their eyes closed should not come back to a locked
  // phone and a paused moment, so the screen stays awake while a moment runs.
  useEffect(() => {
    if (!isActive || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let released = false
    const acquire = () => {
      navigator.wakeLock.request('screen').then((sentinel) => {
        if (released) sentinel.release().catch(() => {})
        else lock = sentinel
      }).catch(() => {
        // Battery saver or an unsupported browser: the moment simply pauses if the screen sleeps.
      })
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      lock?.release().catch(() => {})
    }
  }, [isActive])

  useEffect(() => {
    if (previousViewRef.current === view) return
    previousViewRef.current = view
    headingRef.current?.focus()
  }, [view])

  const startTask = (task: Task) => {
    startedAtRef.current = Date.now()
    setCurrentTask(task)
    setElapsedMs(0)
    setIsActive(true)
    setShowReward(false)
    setWelcomeBack(false)
    setThings(['', '', ''])
  }

  const resetTask = () => {
    setCurrentTask(null)
    setElapsedMs(0)
    setIsActive(false)
    setShowReward(false)
    setWelcomeBack(false)
  }

  // Render active task
  if (currentTask) {
    const timeRemaining = Math.max(0, currentTask.duration - Math.floor(elapsedMs / 1000))
    const progress = Math.min(1, elapsedMs / (currentTask.duration * 1000))
    const breathPhaseIndex = breathPhaseIndexAt(elapsedMs)
    const breathPhase = BREATH_PHASES[breathPhaseIndex].phase
    const lungsFull = elapsedMs > 0 && (breathPhase === 'inhale' || breathPhase === 'hold')
    const guidanceIndex = currentTask.id === 'breathe'
      ? breathPhaseIndex
      : Math.min(currentTask.guidance.length - 1, Math.floor(progress * currentTask.guidance.length))
    const notedThings = things.map((t) => t.trim()).filter(Boolean)

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card-bg border border-card-border rounded-lg px-6 py-10 sm:p-12 text-center min-h-[480px] flex flex-col justify-center">
          {!showReward ? (
            <>
              {currentTask.id === 'breathe' && (
                <div className="mb-6 flex h-52 sm:h-64 items-center justify-center">
                  <div
                    className={cn(
                      'relative rounded-full flex items-center justify-center',
                      reducedMotion
                        ? 'w-40 h-40'
                        : cn(
                          'transition-all ease-in-out',
                          lungsFull ? 'w-48 h-48 sm:w-64 sm:h-64' : 'w-24 h-24 sm:w-32 sm:h-32',
                          breathPhase === 'inhale' && 'duration-[4000ms]',
                          breathPhase === 'exhale' && 'duration-[8000ms]',
                          (breathPhase === 'hold' || breathPhase === 'pause') && 'duration-100',
                        ),
                    )}
                    role="img"
                    aria-label={`Breathing circle - ${breathPhase}`}
                  >
                    <div className="absolute inset-0 rounded-full bg-success/30 border-4 border-success" />
                    <div className="absolute inset-[12%] rounded-full bg-accent-soft" />
                    <span className="relative text-foreground text-base font-medium" aria-hidden="true">
                      {BREATH_WORDS[breathPhase]}
                    </span>
                  </div>
                </div>
              )}

              {(currentTask.id === 'reflect' || currentTask.id === 'appreciate') && (
                <MomentIcon
                  id={currentTask.id}
                  className={cn('w-20 h-20 mx-auto mb-6', !reducedMotion && 'animate-pulse-slow')}
                />
              )}

              <h2 ref={headingRef} tabIndex={-1} className="text-2xl sm:text-3xl font-semibold mb-3 text-foreground focus:outline-none">
                {currentTask.title}
              </h2>

              <p className="text-lg text-foreground/80 mb-6 min-h-8" aria-live="polite">
                {currentTask.guidance[guidanceIndex]}
              </p>

              {currentTask.id === 'watch' && (
                <div className="relative h-56 mb-6 overflow-hidden rounded-xl bg-gradient-to-b from-transparent to-accent/10" role="img" aria-label={reducedMotion ? 'Watermelon seeds resting' : 'Watermelon seeds floating gently'}>
                  {FLOATING_SEEDS.map((seed) => (
                    <div
                      key={seed.id}
                      className={`absolute w-3 h-5 bg-foreground/70 rounded-full shadow-lg ${reducedMotion ? '' : 'animate-float-seed'}`}
                      style={{
                        left: `${seed.x}%`,
                        animationDelay: `${seed.delay}s`,
                        top: reducedMotion ? `${seed.restingTop}%` : '-20px'
                      }}
                    />
                  ))}
                </div>
              )}

              {currentTask.id === 'listen' && (
                <div className="relative h-40 mb-6 flex items-center justify-center" role="img" aria-label="Quiet sound ripples">
                  {!reducedMotion && (
                    <>
                      <div className="absolute w-16 h-16 rounded-full bg-accent/10 animate-ping" style={{ animationDuration: '4s' }} />
                      <div className="absolute w-24 h-24 rounded-full bg-accent/5 animate-ping" style={{ animationDuration: '5s', animationDelay: '0.8s' }} />
                    </>
                  )}
                  <div className="absolute w-32 h-32 rounded-full border border-accent/20" />
                  <MomentIcon id="listen" className="relative w-12 h-12" />
                </div>
              )}

              {currentTask.id === 'appreciate' && (
                <div className="mb-6 mx-auto w-full max-w-sm space-y-2 text-left">
                  <p className="text-sm text-foreground/70 text-center mb-3">
                    Write them down if you like. They stay on this screen only.
                  </p>
                  {THING_LABELS.map((label, i) => (
                    <label key={label} className="flex items-center gap-3">
                      <span className="sr-only">{label}</span>
                      <span aria-hidden="true" className="w-5 text-right text-sm text-foreground/70 tabular-nums">{i + 1}.</span>
                      <input
                        type="text"
                        value={things[i]}
                        maxLength={80}
                        onChange={(e) => setThings((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
                        className="flex-1 min-w-0 rounded-lg border border-card-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </label>
                  ))}
                </div>
              )}

              {welcomeBack && (
                <p className="text-sm text-foreground/70 mb-4" role="status">
                  Welcome back. The moment waited for you.
                </p>
              )}

              {/* Progress is shown as a ripening ring, with the time beside it kept quiet. */}
              <div className="flex items-center justify-center gap-3 mb-2">
                <svg viewBox="0 0 60 60" className="w-10 h-10 -rotate-90" aria-hidden="true">
                  <circle cx="30" cy="30" r={RING_RADIUS} className="fill-none stroke-foreground/10" strokeWidth="5" />
                  <circle
                    cx="30"
                    cy="30"
                    r={RING_RADIUS}
                    className="fill-none stroke-success"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={RING_LENGTH}
                    strokeDashoffset={RING_LENGTH * (1 - progress)}
                  />
                </svg>
                <div
                  className="text-base text-foreground/70 tabular-nums"
                  role="timer"
                  aria-live="off"
                  aria-label={`${Math.floor(timeRemaining / 60)} minutes ${timeRemaining % 60} seconds remaining`}
                >
                  {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                </div>
              </div>

              <p className="text-sm text-foreground/70">No rush. Just be here.</p>

              <div className="mt-6">
                <Button variant="ghost" onClick={resetTask} aria-label="Stop current task">
                  I need to stop
                </Button>
              </div>
            </>
          ) : (
            <div className="animate-fade" role="status">
              <MomentIcon id={currentTask.id} className="w-16 h-16 mx-auto mb-6" />
              <h2 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold mb-4 text-foreground focus:outline-none">
                Moment savored
              </h2>
              <p className="text-xl italic text-foreground/80 mb-6 max-w-md mx-auto">
                &ldquo;{currentTask.reward}&rdquo;
              </p>

              {currentTask.id === 'appreciate' && notedThings.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-foreground/70 mb-2">Today you noticed</p>
                  <ul className="space-y-1 text-foreground">
                    {notedThings.map((thing, i) => (
                      <li key={i}>{thing}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button variant="primary" onClick={resetTask} className="w-full sm:w-auto">
                  Continue Slowing Down
                </Button>
                <Button variant="secondary" onClick={() => startTask(currentTask)} className="w-full sm:w-auto">
                  Stay a little longer
                </Button>
              </div>
              <p className="mt-4 text-sm text-foreground/70">
                {completed.length} {completed.length === 1 ? 'moment' : 'moments'} savored today
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const allSavored = TASKS.every((task) => completed.includes(task.id))

  // Render task selection
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 ref={headingRef} tabIndex={-1} className="text-xl sm:text-2xl font-semibold mb-2 text-foreground focus:outline-none">
          Choose a moment to savor
        </h2>
        <p className="text-sm sm:text-base text-foreground/70 max-w-xl mx-auto">
          An anti-game: nothing to win, nothing to hurry. Slow down for one minute.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {TASKS.map((task) => {
          const isCompleted = completed.includes(task.id)
          return (
            <button
              key={task.id}
              onClick={() => startTask(task)}
              className={cn(
                'bg-card-bg border rounded-lg p-5 text-left transition-all duration-75',
                'hover:border-accent hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent',
                isCompleted ? 'border-success' : 'border-card-border',
              )}
              aria-label={`${task.title}: ${task.description}. ${task.duration} seconds.${isCompleted ? ' Completed.' : ''}`}
            >
              <div className="flex items-start gap-4">
                <MomentIcon id={task.id} className="w-10 h-10 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1 text-foreground">{task.title}</h3>
                  <p className="text-sm text-foreground/75 mb-2">{task.description}</p>
                  <div className="text-xs text-foreground/70">
                    {task.duration} seconds
                    {isCompleted && <span className="ml-2 font-medium text-foreground">· Savored today</span>}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {completed.length > 0 && (
        <div className="bg-success/15 border border-success/40 rounded-lg p-4 text-center">
          <p className="text-sm text-foreground">
            You&rsquo;ve savored {completed.length} {completed.length === 1 ? 'moment' : 'moments'} today
          </p>
          {allSavored && (
            <p className="text-sm text-foreground/75 mt-2">
              Every moment here has been savored. Come back whenever the world speeds up.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
