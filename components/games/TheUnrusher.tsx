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
}

const TASKS: Task[] = [
  {
    id: 'breathe',
    title: 'Just Breathe',
    description: 'Take 5 deep breaths. No rush.',
    duration: 30,
    reward: 'Inhale peace. Exhale worry.',
    icon: '🌊'
  },
  {
    id: 'watch',
    title: 'Watch the Seeds',
    description: 'Watch watermelon seeds drift slowly.',
    duration: 45,
    reward: 'Some things cannot be hurried.',
    icon: '🍉'
  },
  {
    id: 'listen',
    title: 'Listen to Silence',
    description: 'Close your eyes. Just listen.',
    duration: 60,
    reward: 'In stillness, we find clarity.',
    icon: '🎵'
  },
  {
    id: 'reflect',
    title: 'Notice This Moment',
    description: 'What do you feel right now?',
    duration: 40,
    reward: 'This moment is all we truly have.',
    icon: '✨'
  },
  {
    id: 'appreciate',
    title: 'Count Three Things',
    description: 'Three things you appreciate today.',
    duration: 50,
    reward: 'Gratitude slows time beautifully.',
    icon: '💚'
  }
]

export default function TheUnrusher() {
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [completed, setCompleted] = useState<string[]>([])
  const [showReward, setShowReward] = useState(false)
  const [floatingSeeds, setFloatingSeeds] = useState<Array<{ id: number; x: number; delay: number }>>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

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
              {/* Task icon */}
              <div className="text-7xl mb-6 animate-pulse-slow" aria-hidden="true">
                {currentTask.icon}
              </div>

              {/* Task title */}
              <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-foreground">
                {currentTask.title}
              </h2>

              {/* Task description */}
              <p className="text-lg text-primary-light mb-8">
                {currentTask.description}
              </p>

              {/* Floating seeds animation for "Watch the Seeds" */}
              {currentTask.id === 'watch' && floatingSeeds.length > 0 && (
                <div className="relative h-64 mb-8 overflow-hidden" role="img" aria-label="Watermelon seeds floating gently">
                  {floatingSeeds.map((seed) => (
                    <div
                      key={seed.id}
                      className="absolute w-3 h-5 bg-foreground/80 rounded-full animate-float-seed"
                      style={{
                        left: `${seed.x}%`,
                        animationDelay: `${seed.delay}s`,
                        top: '-20px'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Timer */}
              <div className="text-6xl font-light mb-8 text-accent tabular-nums" aria-live="polite" aria-atomic="true">
                {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
              </div>

              {/* Progress indicator */}
              <div className="text-sm text-primary-light">
                <p>Take your time. There&rsquo;s no rush.</p>
                {currentTask.id === 'breathe' && (
                  <p className="mt-2 text-foreground/60">
                    In... and out... in... and out...
                  </p>
                )}
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
