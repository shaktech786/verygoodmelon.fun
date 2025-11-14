'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface Priority {
  id: string
  text: string
  order: number
}

const STARTER_PRIORITIES = [
  'Work & Career',
  'Family & Relationships',
  'Health & Wellness',
  'Personal Growth',
  'Financial Security',
  'Hobbies & Passions',
  'Rest & Recovery',
  'Community & Impact'
]

export default function WhatReallyMatters() {
  const [step, setStep] = useState<'intro' | 'add' | 'sort' | 'reveal'>('intro')
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [newPriority, setNewPriority] = useState('')
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [totalSlices] = useState(8)
  const [showInsight, setShowInsight] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when on add step
  useEffect(() => {
    if (step === 'add' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [step])

  const useStarters = () => {
    const starterPriorities: Priority[] = STARTER_PRIORITIES.map((text, index) => ({
      id: `priority-${Date.now()}-${index}`,
      text,
      order: index
    }))
    setPriorities(starterPriorities)
    setStep('sort')
  }

  const addPriority = () => {
    if (!newPriority.trim() || priorities.length >= 12) return

    const priority: Priority = {
      id: `priority-${Date.now()}`,
      text: newPriority.trim(),
      order: priorities.length
    }

    setPriorities([...priorities, priority])
    setNewPriority('')
  }

  const removePriority = (id: string) => {
    setPriorities(priorities.filter(p => p.id !== id).map((p, index) => ({ ...p, order: index })))
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetId) return

    const draggedIndex = priorities.findIndex(p => p.id === draggedItem)
    const targetIndex = priorities.findIndex(p => p.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newPriorities = [...priorities]
    const [removed] = newPriorities.splice(draggedIndex, 1)
    newPriorities.splice(targetIndex, 0, removed)

    setPriorities(newPriorities.map((p, index) => ({ ...p, order: index })))
  }

  const handleDrop = () => {
    setDraggedItem(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string, index: number) => {
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault()
      const newPriorities = [...priorities]
      ;[newPriorities[index - 1], newPriorities[index]] = [newPriorities[index], newPriorities[index - 1]]
      setPriorities(newPriorities.map((p, i) => ({ ...p, order: i })))
    } else if (e.key === 'ArrowDown' && index < priorities.length - 1) {
      e.preventDefault()
      const newPriorities = [...priorities]
      ;[newPriorities[index], newPriorities[index + 1]] = [newPriorities[index + 1], newPriorities[index]]
      setPriorities(newPriorities.map((p, i) => ({ ...p, order: i })))
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      removePriority(id)
    }
  }

  const getSliceSize = (index: number): number => {
    if (index >= totalSlices) return 0
    const remaining = priorities.length - totalSlices
    if (remaining <= 0) {
      return 100 / priorities.length
    }
    const baseSize = 100 / totalSlices
    return baseSize * (1 - (Math.min(index, totalSlices - 1) * 0.08))
  }

  const getInsight = (): { message: string; highlight: string[] } => {
    if (priorities.length === 0) return { message: '', highlight: [] }

    const top3 = priorities.slice(0, 3).map(p => p.text)

    const hasWork = top3.some(p => p.toLowerCase().includes('work') || p.toLowerCase().includes('career'))
    const hasRest = top3.some(p => p.toLowerCase().includes('rest') || p.toLowerCase().includes('recovery'))
    const hasHealth = top3.some(p => p.toLowerCase().includes('health'))

    if (hasRest) {
      return {
        message: "Rest in your top 3. That&rsquo;s brave and necessary.",
        highlight: ['rest', 'recovery']
      }
    }

    if (!hasHealth && priorities.length >= 5) {
      return {
        message: "Health isn&rsquo;t in your top 3. Without it, everything else gets harder.",
        highlight: ['health', 'wellness']
      }
    }

    if (hasWork && !hasRest && priorities.length >= 6) {
      return {
        message: "Work is important, but even watermelons need time to grow.",
        highlight: ['work', 'career']
      }
    }

    if (priorities.length > totalSlices) {
      return {
        message: `You have ${priorities.length} priorities but only ${totalSlices} slices. Something has to give.`,
        highlight: []
      }
    }

    return {
      message: "Your priorities reflect what you value most right now. That&rsquo;s beautiful.",
      highlight: top3
    }
  }

  // Intro screen
  if (step === 'intro') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card-bg border border-card-border rounded-lg p-8 sm:p-12 text-center">
          <div className="text-6xl mb-6" aria-hidden="true">
            🍉
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-foreground">
            You Have 8 Slices
          </h2>
          <p className="text-lg text-primary-light mb-8 max-w-md mx-auto">
            Life is like a watermelon. You can&rsquo;t have unlimited slices.
            <br /><br />
            What really matters to you?
          </p>

          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={() => setStep('add')}
              className="w-full sm:w-auto"
            >
              Start From Scratch
            </Button>
            <div>
              <Button
                variant="ghost"
                onClick={useStarters}
                className="w-full sm:w-auto"
              >
                Use Common Priorities
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Add priorities screen
  if (step === 'add') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card-bg border border-card-border rounded-lg p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
            List What Matters to You
          </h2>
          <p className="text-primary-light mb-6">
            Add 3-12 priorities. Be honest. No judgment.
          </p>

          {/* Add priority form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              addPriority()
            }}
            className="mb-6"
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                placeholder="e.g., Family time, Creative projects..."
                className="flex-1 px-4 py-3 border border-card-border rounded-lg bg-card-bg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                maxLength={50}
                aria-label="Add a priority"
              />
              <Button
                type="submit"
                disabled={!newPriority.trim() || priorities.length >= 12}
                variant="primary"
              >
                Add
              </Button>
            </div>
            <div className="mt-2 text-sm text-primary-light">
              {priorities.length}/12 priorities
            </div>
          </form>

          {/* Current priorities */}
          {priorities.length > 0 && (
            <div className="space-y-2 mb-6">
              {priorities.map((priority) => (
                <div
                  key={priority.id}
                  className="flex items-center gap-2 p-3 bg-hover-bg rounded-lg"
                >
                  <span className="flex-1 text-foreground">{priority.text}</span>
                  <button
                    onClick={() => removePriority(priority.id)}
                    className="text-danger hover:text-danger/80 text-sm px-2"
                    aria-label={`Remove ${priority.text}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Next button */}
          <div className="flex gap-3">
            <Button
              onClick={() => setStep('sort')}
              disabled={priorities.length < 3}
              variant="primary"
              className="flex-1"
            >
              {priorities.length < 3 ? 'Add at least 3' : 'Continue to Sorting'}
            </Button>
            <Button
              onClick={useStarters}
              variant="ghost"
            >
              Use Starters
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Sort priorities screen
  if (step === 'sort') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-card-bg border border-card-border rounded-lg p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground text-center">
            Now, Prioritize Them
          </h2>
          <p className="text-primary-light mb-6 text-center">
            Drag to reorder. Most important at the top.
            <br />
            <span className="text-sm">Keyboard: Arrow keys to move, Delete/Backspace to remove</span>
          </p>

          {/* Draggable list */}
          <div className="space-y-2 mb-6" role="list" aria-label="Priority list">
            {priorities.map((priority, index) => (
              <div
                key={priority.id}
                draggable
                onDragStart={(e) => handleDragStart(e, priority.id)}
                onDragOver={(e) => handleDragOver(e, priority.id)}
                onDrop={handleDrop}
                onDragEnd={handleDrop}
                onKeyDown={(e) => handleKeyDown(e, priority.id, index)}
                tabIndex={0}
                role="listitem"
                aria-label={`Priority ${index + 1}: ${priority.text}. Press arrow keys to reorder, delete to remove.`}
                className={`
                  flex items-center gap-3 p-4 rounded-lg
                  cursor-move bg-hover-bg border border-card-border
                  transition-all duration-75
                  hover:border-accent hover:shadow-md
                  focus:outline-none focus:ring-2 focus:ring-accent
                  ${draggedItem === priority.id ? 'opacity-50' : ''}
                `}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <span className="flex-1 text-foreground font-medium">{priority.text}</span>
                <div className="flex-shrink-0 text-primary-light text-sm" aria-hidden="true">
                  ⋮⋮
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setStep('add')}
              variant="ghost"
            >
              ← Edit List
            </Button>
            <Button
              onClick={() => {
                setStep('reveal')
                setTimeout(() => setShowInsight(true), 500)
              }}
              variant="primary"
              className="flex-1"
            >
              See My Watermelon
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Reveal screen
  const insight = getInsight()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card-bg border border-card-border rounded-lg p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-foreground text-center">
          Your Watermelon of Priorities
        </h2>

        {/* Watermelon visualization */}
        <div className="mb-8">
          <div className="max-w-md mx-auto space-y-1">
            {priorities.slice(0, totalSlices).map((priority, index) => {
              const sliceSize = getSliceSize(index)
              const isHighlighted = insight.highlight.some(h =>
                priority.text.toLowerCase().includes(h.toLowerCase())
              )

              return (
                <div
                  key={priority.id}
                  className="relative"
                  style={{ height: `${Math.max(sliceSize * 3, 30)}px` }}
                >
                  <div
                    className={`
                      absolute inset-0 rounded-lg flex items-center px-4
                      transition-all duration-300
                      ${isHighlighted ? 'bg-accent text-white' : 'bg-success/20 text-foreground border border-success/40'}
                    `}
                    role="img"
                    aria-label={`Priority ${index + 1} of ${totalSlices}: ${priority.text}`}
                  >
                    <span className="text-sm sm:text-base font-medium truncate">
                      {index + 1}. {priority.text}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Overflow priorities */}
          {priorities.length > totalSlices && (
            <div className="mt-6 max-w-md mx-auto">
              <div className="bg-accent-soft border border-accent/20 rounded-lg p-4">
                <p className="text-sm font-semibold text-foreground mb-2">
                  Not Enough Slices:
                </p>
                <div className="space-y-1">
                  {priorities.slice(totalSlices).map((priority, index) => (
                    <div key={priority.id} className="text-sm text-primary-light line-through">
                      {totalSlices + index + 1}. {priority.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Insight */}
        {showInsight && (
          <div className="animate-fade bg-accent-soft border border-accent/20 rounded-lg p-6 mb-6 text-center">
            <p className="text-lg text-foreground italic">
              &ldquo;{insight.message}&rdquo;
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => {
              setStep('sort')
              setShowInsight(false)
            }}
            variant="ghost"
          >
            Reorder
          </Button>
          <Button
            onClick={() => {
              setPriorities([])
              setStep('intro')
              setShowInsight(false)
            }}
            variant="secondary"
          >
            Start Over
          </Button>
        </div>

        {/* Philosophy */}
        <div className="mt-8 text-center text-sm text-primary-light max-w-2xl mx-auto">
          <p>
            Priorities aren&rsquo;t permanent. They shift with seasons of life.
            <br />
            What matters is knowing what matters <em>right now</em>.
          </p>
        </div>
      </div>
    </div>
  )
}
