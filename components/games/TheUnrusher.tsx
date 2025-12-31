'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface Task {
  id: string
  title: string
  description: string
  duration: number // seconds
  reward: string
  icon: string
  guidance?: string[] // Rotating guidance text during task
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

export default function TheUnrusher() {
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [completed, setCompleted] = useState<string[]>([])
  const [showReward, setShowReward] = useState(false)
  const [floatingSeeds, setFloatingSeeds] = useState<Array<{ id: number; x: number; delay: number }>>([])
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale')
  const [guidanceIndex, setGuidanceIndex] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const breathTimerRef = useRef<NodeJS.Timeout | null>(null)
  const guidanceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Generate floating seeds for "Watch the Seeds" task
  useEffect(() => {
    if (currentTask?.id === 'watch') {
      const seeds = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 80 + 10, // 10-90% of width
        delay: Math.random() * 2
      }))
      setFloatingSeeds(seeds)
    } else {
      setFloatingSeeds([])
    }
  }, [currentTask?.id])

  // Breathing cycle (4-7-8 pattern: 4s inhale, 7s hold, 8s exhale)
  useEffect(() => {
    if (currentTask?.id === 'breathe' && isActive) {
      const breathCycle = () => {
        setBreathPhase('inhale')
        breathTimerRef.current = setTimeout(() => {
          setBreathPhase('hold')
          breathTimerRef.current = setTimeout(() => {
            setBreathPhase('exhale')
            breathTimerRef.current = setTimeout(() => {
              setBreathPhase('pause')
              breathTimerRef.current = setTimeout(breathCycle, 1000) // Brief pause before next cycle
            }, 8000)
          }, 7000)
        }, 4000)
      }
      breathCycle()
    }

    return () => {
      if (breathTimerRef.current) clearTimeout(breathTimerRef.current)
    }
  }, [currentTask?.id, isActive])

  // Rotate guidance text
  useEffect(() => {
    if (currentTask?.guidance && isActive) {
      setGuidanceIndex(0)
      const interval = Math.floor((currentTask.duration * 1000) / currentTask.guidance.length)
      guidanceTimerRef.current = setInterval(() => {
        setGuidanceIndex(prev => (prev + 1) % (currentTask.guidance?.length || 1))
      }, interval)
    }

    return () => {
      if (guidanceTimerRef.current) clearInterval(guidanceTimerRef.current)
    }
  }, [currentTask, isActive])

  // Timer logic
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsActive(false)
            setShowReward(true)
            if (currentTask) {
              setCompleted((prev) => [...prev, currentTask.id])
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isActive, timeRemaining, currentTask])

  const startTask = (task: Task) => {
    setCurrentTask(task)
    setTimeRemaining(task.duration)
    setIsActive(true)
    setShowReward(false)
  }

  const resetTask = () => {
    setCurrentTask(null)
    setTimeRemaining(0)
    setIsActive(false)
    setShowReward(false)
  }

  // Render active task
  if (currentTask) {
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
                      ${breathPhase === 'inhale' ? 'w-48 h-48 sm:w-64 sm:h-64 duration-[4000ms]' : ''}
                      ${breathPhase === 'hold' ? 'w-48 h-48 sm:w-64 sm:h-64 duration-100' : ''}
                      ${breathPhase === 'exhale' ? 'w-24 h-24 sm:w-32 sm:h-32 duration-[8000ms]' : ''}
                      ${breathPhase === 'pause' ? 'w-24 h-24 sm:w-32 sm:h-32 duration-100' : ''}
                    `}
                    role="img"
                    aria-label={`Breathing circle - ${breathPhase}`}
                  >
                    {/* Outer glow ring */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/20 to-success/20 blur-xl" />
                    {/* Main circle */}
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-accent/40 to-success/40 flex items-center justify-center">
                      <span className="text-white/90 text-sm sm:text-base font-medium">
                        {breathPhase === 'inhale' && 'Inhale...'}
                        {breathPhase === 'hold' && 'Hold...'}
                        {breathPhase === 'exhale' && 'Exhale...'}
                        {breathPhase === 'pause' && '...'}
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
              <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-foreground">
                {currentTask.title}
              </h2>

              {/* Guidance text - rotates during task */}
              {currentTask.guidance && (
                <p className="text-lg text-accent/80 mb-4 h-8 transition-opacity duration-500" key={guidanceIndex}>
                  {currentTask.guidance[guidanceIndex]}
                </p>
              )}

              {/* Floating seeds animation for "Watch the Seeds" */}
              {currentTask.id === 'watch' && floatingSeeds.length > 0 && (
                <div className="relative h-64 mb-8 overflow-hidden rounded-xl bg-gradient-to-b from-transparent to-accent/5" role="img" aria-label="Watermelon seeds floating gently">
                  {floatingSeeds.map((seed) => (
                    <div
                      key={seed.id}
                      className="absolute w-3 h-5 bg-foreground/70 rounded-full animate-float-seed shadow-lg"
                      style={{
                        left: `${seed.x}%`,
                        animationDelay: `${seed.delay}s`,
                        top: '-20px'
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
                  <div className="text-3xl">👂</div>
                </div>
              )}

              {/* Timer - smaller, less prominent */}
              <div className="text-4xl sm:text-5xl font-light mb-6 text-foreground/40 tabular-nums" aria-live="polite" aria-atomic="true">
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
              <div className="animate-fade">
                <div className="text-7xl mb-6" aria-hidden="true">
                  ✨
                </div>
                <h2 className="text-3xl font-semibold mb-4 text-foreground">
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
        <h2 className="text-2xl sm:text-3xl font-semibold mb-3 text-foreground">
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
