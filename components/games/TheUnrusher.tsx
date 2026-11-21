'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

interface Task {
  id: string
  title: string
  description: string
  duration: number // seconds
  reward: string
  icon: string
  guidance: string[] // Rotating guidance text during task
}

const TASKS: Task[] = [
  {
    id: 'breathe',
    title: 'Just Breathe',
    description: 'Follow the circle. Breathe with it.',
    duration: 60,
    reward: 'Inhale peace. Exhale worry.',
    icon: '🌊',
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
    icon: '🍉',
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
    icon: '🎵',
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
    icon: '✨',
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
    icon: '💚',
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

export default function TheUnrusher() {
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [startedAt, setStartedAt] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [completed, setCompleted] = useState<string[]>([])
  const [showReward, setShowReward] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousViewRef = useRef<View>('menu')
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    setCompleted(loadToday())
  }, [])

  const view: View = currentTask ? (showReward ? 'reward' : 'task') : 'menu'

  // Everything on screen is derived from one wall-clock reading, so the countdown,
  // the breathing circle and the guidance cannot drift apart or stall in a background tab.
  useEffect(() => {
    if (!isActive || !currentTask) return

    const stop = () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
    const tick = () => {
      const elapsed = Date.now() - startedAt
      if (elapsed >= currentTask.duration * 1000) {
        stop()
        setIsActive(false)
        setShowReward(true)
        setCompleted((prev) => {
          const next = [...prev, currentTask.id]
          saveToday(next)
          return next
        })
        return
      }
      setElapsedMs(elapsed)
    }

    const interval = setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', tick)
    return stop
  }, [isActive, currentTask, startedAt])

  useEffect(() => {
    if (previousViewRef.current === view) return
    previousViewRef.current = view
    headingRef.current?.focus()
  }, [view])

  const startTask = (task: Task) => {
    setCurrentTask(task)
    setStartedAt(Date.now())
    setElapsedMs(0)
    setIsActive(true)
    setShowReward(false)
  }

  const resetTask = () => {
    setCurrentTask(null)
    setElapsedMs(0)
    setIsActive(false)
    setShowReward(false)
  }

  // Render active task
  if (currentTask) {
    const timeRemaining = currentTask.duration - Math.floor(elapsedMs / 1000)
    const breathPhaseIndex = breathPhaseIndexAt(elapsedMs)
    const breathPhase = BREATH_PHASES[breathPhaseIndex].phase
    const lungsFull = elapsedMs > 0 && (breathPhase === 'inhale' || breathPhase === 'hold')
    const guidanceIndex = currentTask.id === 'breathe'
      ? breathPhaseIndex
      : Math.floor((elapsedMs / (currentTask.duration * 1000)) * currentTask.guidance.length)

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card-bg border border-card-border rounded-lg p-8 sm:p-12 text-center min-h-[500px] flex flex-col justify-center">
          {!showReward ? (
            <>
              {/* Breathing Circle Visualization */}
              {currentTask.id === 'breathe' && (
                <div className="mb-8 flex flex-col items-center">
                  <div
                    className={`
                      relative rounded-full transition-all
                      ${lungsFull ? 'w-48 h-48 sm:w-64 sm:h-64' : 'w-24 h-24 sm:w-32 sm:h-32'}
                      ${breathPhase === 'inhale' ? 'duration-[4000ms]' : ''}
                      ${breathPhase === 'exhale' ? 'duration-[8000ms]' : ''}
                      ${breathPhase === 'hold' || breathPhase === 'pause' ? 'duration-100' : ''}
                    `}
                    role="img"
                    aria-label={`Breathing circle - ${breathPhase}`}
                  >
                    {/* Outer glow ring */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/20 to-success/20 blur-xl" />
                    {/* Main circle */}
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-accent/40 to-success/40 flex items-center justify-center">
                      <span className="text-foreground text-sm sm:text-base font-medium" aria-hidden="true">
                        {breathPhase === 'inhale' && 'Inhale...'}
                        {breathPhase === 'hold' && 'Hold...'}
                        {breathPhase === 'exhale' && 'Exhale...'}
                        {breathPhase === 'pause' && 'Rest...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Task icon (for non-breathing tasks) */}
              {currentTask.id !== 'breathe' && (
                <div className="text-7xl mb-6 animate-pulse-slow" aria-hidden="true">
                  {currentTask.icon}
                </div>
              )}

              {/* Task title */}
              <h2 ref={headingRef} tabIndex={-1} className="text-2xl sm:text-3xl font-semibold mb-4 text-foreground">
                {currentTask.title}
              </h2>

              {/* Guidance text - rotates during task */}
              <p className="text-lg text-accent mb-4 h-8" aria-live="polite">
                {currentTask.guidance[guidanceIndex]}
              </p>

              {/* Floating seeds animation for "Watch the Seeds" */}
              {currentTask.id === 'watch' && (
                <div className="relative h-64 mb-8 overflow-hidden rounded-xl bg-gradient-to-b from-transparent to-accent/5" role="img" aria-label={reducedMotion ? 'Watermelon seeds resting' : 'Watermelon seeds floating gently'}>
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

              {/* Listen visualization - subtle pulsing circles */}
              {currentTask.id === 'listen' && (
                <div className="relative h-40 mb-8 flex items-center justify-center" role="img" aria-label="Sound waves visualization">
                  <div className="absolute w-16 h-16 rounded-full bg-accent/10 animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute w-24 h-24 rounded-full bg-accent/5 animate-ping" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
                  <div className="absolute w-32 h-32 rounded-full bg-accent/3 animate-ping" style={{ animationDuration: '5s', animationDelay: '1s' }} />
                  <div className="text-3xl" aria-hidden="true">👂</div>
                </div>
              )}

              {/* Timer - smaller, less prominent */}
              <div className="text-4xl sm:text-5xl font-light mb-6 text-foreground/40 tabular-nums" role="timer" aria-live="off" aria-label={`${Math.floor(timeRemaining / 60)} minutes ${timeRemaining % 60} seconds remaining`}>
                {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
              </div>

              {/* Subtle encouragement */}
              <div className="text-sm text-primary-light/60">
                <p>No rush. Just be here.</p>
              </div>

              {/* Cancel button */}
              <div className="mt-8">
                <Button
                  variant="ghost"
                  onClick={resetTask}
                  aria-label="Stop current task"
                >
                  I need to stop
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Reward message */}
              <div className="animate-fade" role="status">
                <div className="text-7xl mb-6" aria-hidden="true">
                  ✨
                </div>
                <h2 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold mb-4 text-foreground">
                  You Did It
                </h2>
                <p className="text-xl italic text-primary-light mb-8 max-w-md mx-auto">
                  &ldquo;{currentTask.reward}&rdquo;
                </p>

                <div className="space-y-4">
                  <Button
                    variant="primary"
                    onClick={resetTask}
                    className="w-full sm:w-auto"
                  >
                    Continue Slowing Down
                  </Button>
                  <div className="text-sm text-primary-light">
                    {completed.length} {completed.length === 1 ? 'moment' : 'moments'} savored today
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Render task selection
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4" aria-hidden="true">
          🐌
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl sm:text-3xl font-semibold mb-3 text-foreground">
          The Anti-Game
        </h2>
        <p className="text-base sm:text-lg text-primary-light max-w-2xl mx-auto">
          In a world that says &ldquo;hurry up,&rdquo; this game says &ldquo;slow down.&rdquo;
          <br />
          Choose a moment to savor.
        </p>
      </div>

      {/* Task grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {TASKS.map((task) => {
          const isCompleted = completed.includes(task.id)
          return (
            <button
              key={task.id}
              onClick={() => startTask(task)}
              className={`
                bg-card-bg border border-card-border rounded-lg p-6
                text-left transition-all duration-75
                hover:border-accent hover:shadow-md
                focus:outline-none focus:ring-2 focus:ring-accent
                ${isCompleted ? 'opacity-60' : ''}
              `}
              aria-label={`${task.title}: ${task.description}. ${task.duration} seconds.${isCompleted ? ' Completed.' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl flex-shrink-0" aria-hidden="true">
                  {task.icon}
                  {isCompleted && <span className="ml-1 text-success text-lg">✓</span>}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1 text-foreground">
                    {task.title}
                  </h3>
                  <p className="text-sm text-primary-light mb-2">
                    {task.description}
                  </p>
                  <div className="text-xs text-primary-light">
                    {task.duration} seconds
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Completion status */}
      {completed.length > 0 && (
        <div className="bg-accent-soft border border-accent/20 rounded-lg p-4 text-center">
          <p className="text-sm text-foreground">
            🎉 You&rsquo;ve savored {completed.length} {completed.length === 1 ? 'moment' : 'moments'} today
          </p>
          {TASKS.every((task) => completed.includes(task.id)) && (
            <p className="text-sm text-primary-light mt-2">
              Every moment here has been savored. Come back whenever the world speeds up.
            </p>
          )}
        </div>
      )}

      {/* Philosophy */}
      <div className="mt-8 text-center text-sm text-primary-light max-w-2xl mx-auto">
        <p>
          The fastest way to reduce anxiety is to stop rushing.
          <br />
          Even for just a minute.
        </p>
      </div>
    </div>
  )
}
