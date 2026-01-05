'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Sparkles, Trash2, RotateCcw, Lightbulb } from 'lucide-react'

interface Concept {
  id: string
  name: string
  emoji: string
  isBase?: boolean
  isNew?: boolean
}

interface CombinationResult {
  name: string
  emoji: string
  description: string
  isNewDiscovery: boolean
}

// Base philosophical concepts - the building blocks of thought
const BASE_CONCEPTS: Concept[] = [
  { id: 'love', name: 'Love', emoji: '💕', isBase: true },
  { id: 'fear', name: 'Fear', emoji: '😨', isBase: true },
  { id: 'time', name: 'Time', emoji: '⏳', isBase: true },
  { id: 'death', name: 'Death', emoji: '💀', isBase: true },
  { id: 'knowledge', name: 'Knowledge', emoji: '📚', isBase: true },
  { id: 'power', name: 'Power', emoji: '⚡', isBase: true },
  { id: 'freedom', name: 'Freedom', emoji: '🕊️', isBase: true },
  { id: 'truth', name: 'Truth', emoji: '💎', isBase: true },
  { id: 'beauty', name: 'Beauty', emoji: '🌸', isBase: true },
  { id: 'justice', name: 'Justice', emoji: '⚖️', isBase: true },
  { id: 'hope', name: 'Hope', emoji: '🌅', isBase: true },
  { id: 'chaos', name: 'Chaos', emoji: '🌀', isBase: true },
  { id: 'order', name: 'Order', emoji: '📐', isBase: true },
  { id: 'nature', name: 'Nature', emoji: '🌿', isBase: true },
  { id: 'self', name: 'Self', emoji: '🪞', isBase: true },
  { id: 'other', name: 'Other', emoji: '👥', isBase: true },
]

const STORAGE_KEY = 'ideaLab_discoveries'
const COMBINATIONS_KEY = 'ideaLab_combinations'

export default function IdeaLab() {
  const [concepts, setConcepts] = useState<Concept[]>(BASE_CONCEPTS)
  const [selectedConcepts, setSelectedConcepts] = useState<Concept[]>([])
  const [isCombining, setIsCombining] = useState(false)
  const [lastResult, setLastResult] = useState<CombinationResult | null>(null)
  const [discoveryCount, setDiscoveryCount] = useState(0)
  const [combinations, setCombinations] = useState<Record<string, string>>({})
  const [showIntro, setShowIntro] = useState(true)
  const workspaceRef = useRef<HTMLDivElement>(null)

  // Load saved discoveries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    const savedCombinations = localStorage.getItem(COMBINATIONS_KEY)

    if (saved) {
      try {
        const discoveries: Concept[] = JSON.parse(saved)
        setConcepts([...BASE_CONCEPTS, ...discoveries])
        setDiscoveryCount(discoveries.length)
      } catch (e) {
        console.error('Failed to load discoveries:', e)
      }
    }

    if (savedCombinations) {
      try {
        setCombinations(JSON.parse(savedCombinations))
      } catch (e) {
        console.error('Failed to load combinations:', e)
      }
    }

    // Check if user has played before
    if (saved || savedCombinations) {
      setShowIntro(false)
    }
  }, [])

  // Save discoveries to localStorage
  const saveDiscovery = useCallback((newConcept: Concept, combo1: string, combo2: string) => {
    const saved = localStorage.getItem(STORAGE_KEY)
    const discoveries: Concept[] = saved ? JSON.parse(saved) : []

    // Check if already discovered
    if (!discoveries.find(c => c.id === newConcept.id)) {
      discoveries.push(newConcept)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(discoveries))
      setDiscoveryCount(discoveries.length)
    }

    // Save the combination
    const comboKey = [combo1, combo2].sort().join('+')
    const newCombinations = { ...combinations, [comboKey]: newConcept.id }
    setCombinations(newCombinations)
    localStorage.setItem(COMBINATIONS_KEY, JSON.stringify(newCombinations))
  }, [combinations])

  // Get combination key
  const getComboKey = (c1: Concept, c2: Concept) => {
    return [c1.id, c2.id].sort().join('+')
  }

  // Check if combination already exists
  const getCachedResult = (c1: Concept, c2: Concept): Concept | null => {
    const comboKey = getComboKey(c1, c2)
    const resultId = combinations[comboKey]
    if (resultId) {
      return concepts.find(c => c.id === resultId) || null
    }
    return null
  }

  // Handle concept selection
  const handleSelectConcept = (concept: Concept) => {
    if (isCombining) return

    if (selectedConcepts.length === 0) {
      setSelectedConcepts([concept])
    } else if (selectedConcepts.length === 1) {
      // Don't allow combining with self
      if (selectedConcepts[0].id === concept.id) {
        setSelectedConcepts([])
        return
      }
      setSelectedConcepts([selectedConcepts[0], concept])
      // Trigger combination
      combineConceptsAction(selectedConcepts[0], concept)
    }
  }

  // Combine two concepts using AI
  const combineConceptsAction = async (concept1: Concept, concept2: Concept) => {
    setIsCombining(true)
    setLastResult(null)

    // Check cache first
    const cached = getCachedResult(concept1, concept2)
    if (cached) {
      setLastResult({
        name: cached.name,
        emoji: cached.emoji,
        description: `You've discovered this before!`,
        isNewDiscovery: false
      })
      setSelectedConcepts([])
      setIsCombining(false)
      return
    }

    try {
      const response = await fetch('/api/idea-lab/combine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept1: concept1.name,
          concept2: concept2.name
        })
      })

      if (!response.ok) {
        throw new Error('Failed to combine concepts')
      }

      const data = await response.json()

      const newConcept: Concept = {
        id: data.name.toLowerCase().replace(/\s+/g, '-'),
        name: data.name,
        emoji: data.emoji,
        isNew: true
      }

      // Check if this concept already exists
      const existingConcept = concepts.find(
        c => c.name.toLowerCase() === newConcept.name.toLowerCase()
      )

      if (existingConcept) {
        // Already have this concept
        setLastResult({
          name: existingConcept.name,
          emoji: existingConcept.emoji,
          description: data.description,
          isNewDiscovery: false
        })
        // Still cache the combination
        const comboKey = getComboKey(concept1, concept2)
        const newCombinations = { ...combinations, [comboKey]: existingConcept.id }
        setCombinations(newCombinations)
        localStorage.setItem(COMBINATIONS_KEY, JSON.stringify(newCombinations))
      } else {
        // New discovery!
        setConcepts(prev => [...prev, newConcept])
        saveDiscovery(newConcept, concept1.id, concept2.id)

        setLastResult({
          name: newConcept.name,
          emoji: newConcept.emoji,
          description: data.description,
          isNewDiscovery: true
        })

        // Clear "new" flag after animation
        setTimeout(() => {
          setConcepts(prev =>
            prev.map(c => c.id === newConcept.id ? { ...c, isNew: false } : c)
          )
        }, 2000)
      }
    } catch (error) {
      console.error('Combination error:', error)
      setLastResult({
        name: 'Mystery',
        emoji: '❓',
        description: 'These concepts resist combination. Try another pair.',
        isNewDiscovery: false
      })
    } finally {
      setSelectedConcepts([])
      setIsCombining(false)
    }
  }

  // Reset all discoveries
  const handleReset = () => {
    if (confirm('This will erase all your discoveries. Are you sure?')) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(COMBINATIONS_KEY)
      setConcepts(BASE_CONCEPTS)
      setCombinations({})
      setDiscoveryCount(0)
      setSelectedConcepts([])
      setLastResult(null)
    }
  }

  // Clear workspace
  const handleClearSelection = () => {
    setSelectedConcepts([])
    setLastResult(null)
  }

  // Start playing
  const handleStart = () => {
    setShowIntro(false)
  }

  if (showIntro) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-lg text-center animate-fade">
          <div className="text-6xl mb-6">🧠</div>
          <h1 className="text-4xl font-semibold mb-4">The Idea Lab</h1>
          <p className="text-lg text-foreground/70 mb-6 leading-relaxed">
            Combine philosophical concepts to discover new ideas.
            What happens when you mix Love with Fear? Time with Death?
            Freedom with Order?
          </p>
          <p className="text-foreground/50 mb-8">
            Select two concepts to combine them. Each combination creates
            something new—some profound, some surprising, all worth exploring.
          </p>
          <Button onClick={handleStart} variant="primary" className="px-8 py-3">
            Begin Exploring
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-6xl">
        <div className="animate-fade">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold mb-2">The Idea Lab</h1>
              <p className="text-foreground/60">
                Combine concepts to discover new ideas
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-lg">
                <Sparkles size={18} />
                <span className="font-medium">{discoveryCount} discoveries</span>
              </div>
              <Button
                onClick={handleReset}
                variant="ghost"
                className="p-2"
                aria-label="Reset all discoveries"
              >
                <RotateCcw size={18} />
              </Button>
            </div>
          </div>

          {/* Combination workspace */}
          <div
            ref={workspaceRef}
            className="bg-card-bg border border-card-border rounded-xl p-6 sm:p-8 mb-6 min-h-[200px]"
          >
            {/* Selected concepts */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
              {/* First slot */}
              <div
                className={`
                  w-24 h-24 sm:w-32 sm:h-32 rounded-xl border-2 border-dashed
                  flex flex-col items-center justify-center transition-all
                  ${selectedConcepts[0]
                    ? 'border-accent bg-accent/5'
                    : 'border-foreground/20 bg-foreground/5'
                  }
                `}
              >
                {selectedConcepts[0] ? (
                  <>
                    <span className="text-3xl sm:text-4xl mb-1">{selectedConcepts[0].emoji}</span>
                    <span className="text-xs sm:text-sm font-medium text-center px-1">
                      {selectedConcepts[0].name}
                    </span>
                  </>
                ) : (
                  <span className="text-foreground/30 text-sm">Select</span>
                )}
              </div>

              {/* Plus sign */}
              <div className="text-2xl sm:text-3xl text-foreground/30 font-light">+</div>

              {/* Second slot */}
              <div
                className={`
                  w-24 h-24 sm:w-32 sm:h-32 rounded-xl border-2 border-dashed
                  flex flex-col items-center justify-center transition-all
                  ${selectedConcepts[1]
                    ? 'border-accent bg-accent/5'
                    : 'border-foreground/20 bg-foreground/5'
                  }
                `}
              >
                {selectedConcepts[1] ? (
                  <>
                    <span className="text-3xl sm:text-4xl mb-1">{selectedConcepts[1].emoji}</span>
                    <span className="text-xs sm:text-sm font-medium text-center px-1">
                      {selectedConcepts[1].name}
                    </span>
                  </>
                ) : (
                  <span className="text-foreground/30 text-sm">Select</span>
                )}
              </div>

              {/* Equals sign */}
              <div className="text-2xl sm:text-3xl text-foreground/30 font-light">=</div>

              {/* Result slot */}
              <div
                className={`
                  w-24 h-24 sm:w-32 sm:h-32 rounded-xl border-2
                  flex flex-col items-center justify-center transition-all
                  ${isCombining
                    ? 'border-accent animate-pulse bg-accent/10'
                    : lastResult
                      ? lastResult.isNewDiscovery
                        ? 'border-success bg-success/10'
                        : 'border-foreground/20 bg-foreground/5'
                      : 'border-foreground/20 bg-foreground/5'
                  }
                `}
              >
                {isCombining ? (
                  <div className="flex flex-col items-center">
                    <Lightbulb className="text-accent animate-bounce" size={32} />
                    <span className="text-xs text-foreground/50 mt-2">Thinking...</span>
                  </div>
                ) : lastResult ? (
                  <>
                    <span className="text-3xl sm:text-4xl mb-1">{lastResult.emoji}</span>
                    <span className="text-xs sm:text-sm font-medium text-center px-1">
                      {lastResult.name}
                    </span>
                    {lastResult.isNewDiscovery && (
                      <span className="text-xs text-success mt-1">NEW!</span>
                    )}
                  </>
                ) : (
                  <span className="text-foreground/30 text-sm text-center px-2">Result</span>
                )}
              </div>
            </div>

            {/* Result description */}
            {lastResult && !isCombining && (
              <div className="text-center max-w-md mx-auto">
                <p className="text-foreground/70 text-sm italic">
                  &ldquo;{lastResult.description}&rdquo;
                </p>
              </div>
            )}

            {/* Clear button */}
            {(selectedConcepts.length > 0 || lastResult) && !isCombining && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={handleClearSelection}
                  variant="ghost"
                  className="text-sm"
                >
                  <Trash2 size={14} className="mr-2" />
                  Clear
                </Button>
              </div>
            )}

            {/* Instructions */}
            {selectedConcepts.length === 0 && !lastResult && !isCombining && (
              <p className="text-center text-foreground/50 text-sm">
                Click two concepts below to combine them
              </p>
            )}
          </div>

          {/* Concept grid */}
          <div className="bg-card-bg border border-card-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-foreground/80">Your Concepts</h2>
              <span className="text-sm text-foreground/50">
                {concepts.length} total
              </span>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              {concepts.map((concept) => {
                const isSelected = selectedConcepts.some(c => c.id === concept.id)

                return (
                  <button
                    key={concept.id}
                    onClick={() => handleSelectConcept(concept)}
                    disabled={isCombining}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
                      text-sm font-medium
                      ${isSelected
                        ? 'border-accent bg-accent/10 text-accent'
                        : concept.isBase
                          ? 'border-foreground/10 bg-foreground/5 hover:border-accent/50 hover:bg-accent/5'
                          : 'border-success/30 bg-success/5 hover:border-success/50 hover:bg-success/10'
                      }
                      ${concept.isNew ? 'animate-pulse ring-2 ring-success ring-offset-2 ring-offset-background' : ''}
                      ${isCombining ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      focus:outline-none focus:ring-2 focus:ring-accent
                    `}
                    aria-label={`${concept.name} ${isSelected ? '(selected)' : ''}`}
                    aria-pressed={isSelected}
                  >
                    <span>{concept.emoji}</span>
                    <span>{concept.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-foreground/5 rounded-lg">
            <h3 className="text-sm font-medium text-foreground/70 mb-2">Tips</h3>
            <ul className="text-sm text-foreground/50 space-y-1">
              <li>• Combine discoveries with base concepts to go deeper</li>
              <li>• Some combinations lead to profound insights</li>
              <li>• Your discoveries are saved automatically</li>
              <li>• Try combining opposites for interesting results</li>
            </ul>
          </div>

          {/* Back Home */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-card-bg text-foreground border border-card-border rounded-lg font-medium hover:bg-hover-bg transition-colors"
            >
              ← Back Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
