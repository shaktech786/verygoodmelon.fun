'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Sparkles, Trash2, RotateCcw, Lightbulb } from 'lucide-react'

interface Concept {
  id: string
  name: string
  emoji: string
  description?: string
  isBase?: boolean
}

interface CombinationResult {
  name: string
  emoji: string
  description: string
  status: 'new' | 'known' | 'unresolved'
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
const NEW_HIGHLIGHT_MS = 2000
const RESET_BUTTON_ID = 'idea-lab-reset'

const getComboKey = (c1: Concept, c2: Concept) => [c1.id, c2.id].sort().join('+')

function loadDiscoveries(): Concept[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return []

  try {
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((c): c is Concept => typeof c?.id === 'string' && typeof c?.name === 'string' && typeof c?.emoji === 'string')
      .map(({ id, name, emoji, description }) => ({ id, name, emoji, description }))
  } catch (e) {
    console.error('Failed to load discoveries:', e)
    return []
  }
}

function loadCombinations(): Record<string, string> {
  const saved = localStorage.getItem(COMBINATIONS_KEY)
  if (!saved) return {}

  try {
    const parsed: unknown = JSON.parse(saved)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {}
  } catch (e) {
    console.error('Failed to load combinations:', e)
    return {}
  }
}

export default function IdeaLab() {
  const [discoveries, setDiscoveries] = useState<Concept[]>([])
  const [selectedConcepts, setSelectedConcepts] = useState<Concept[]>([])
  const [isCombining, setIsCombining] = useState(false)
  const [lastResult, setLastResult] = useState<CombinationResult | null>(null)
  const [newConceptId, setNewConceptId] = useState<string | null>(null)
  const [combinations, setCombinations] = useState<Record<string, string>>({})
  const [showIntro, setShowIntro] = useState(true)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const cancelResetRef = useRef<HTMLButtonElement>(null)
  const confirmResetRef = useRef<HTMLButtonElement>(null)

  const concepts = [...BASE_CONCEPTS, ...discoveries]

  useEffect(() => {
    const savedDiscoveries = loadDiscoveries()
    const savedCombinations = loadCombinations()

    queueMicrotask(() => {
      setDiscoveries(savedDiscoveries)
      setCombinations(savedCombinations)
      if (savedDiscoveries.length > 0 || Object.keys(savedCombinations).length > 0) {
        setShowIntro(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!newConceptId) return
    const timer = setTimeout(() => setNewConceptId(null), NEW_HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [newConceptId])

  useEffect(() => {
    if (showResetConfirm) cancelResetRef.current?.focus()
  }, [showResetConfirm])

  const rememberCombination = (c1: Concept, c2: Concept, resultId: string) => {
    const updated = { ...combinations, [getComboKey(c1, c2)]: resultId }
    setCombinations(updated)
    localStorage.setItem(COMBINATIONS_KEY, JSON.stringify(updated))
  }

  const handleSelectConcept = (concept: Concept) => {
    if (isCombining) return

    // A finished pair stays on show with its result; the next pick starts a new pair.
    if (selectedConcepts.length !== 1) {
      setSelectedConcepts([concept])
      setLastResult(null)
      return
    }

    // A concept cannot be combined with itself; picking it again puts it back.
    if (selectedConcepts[0].id === concept.id) {
      setSelectedConcepts([])
      return
    }

    setSelectedConcepts([selectedConcepts[0], concept])
    combineConcepts(selectedConcepts[0], concept)
  }

  const combineConcepts = async (concept1: Concept, concept2: Concept) => {
    const cachedId = combinations[getComboKey(concept1, concept2)]
    const cached = cachedId ? concepts.find(c => c.id === cachedId) : undefined
    if (cached) {
      setLastResult({
        name: cached.name,
        emoji: cached.emoji,
        description: cached.description ?? 'You have made this one before.',
        status: 'known'
      })
      return
    }

    setIsCombining(true)

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
      if (typeof data?.name !== 'string' || !data.name.trim()) {
        throw new Error('Combination has no name')
      }

      const name: string = data.name.trim()
      const emoji: string = typeof data.emoji === 'string' && data.emoji ? data.emoji : '🔮'
      const description: string = typeof data.description === 'string' ? data.description : ''

      const existingConcept = concepts.find(c => c.name.toLowerCase() === name.toLowerCase())

      if (existingConcept) {
        rememberCombination(concept1, concept2, existingConcept.id)
        setLastResult({
          name: existingConcept.name,
          emoji: existingConcept.emoji,
          description,
          status: 'known'
        })
        return
      }

      const newConcept: Concept = {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        emoji,
        description
      }
      const updatedDiscoveries = [...discoveries, newConcept]
      setDiscoveries(updatedDiscoveries)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDiscoveries))
      rememberCombination(concept1, concept2, newConcept.id)
      setNewConceptId(newConcept.id)
      setLastResult({ name, emoji, description, status: 'new' })
    } catch (error) {
      console.error('Combination error:', error)
      setLastResult({
        name: 'Mystery',
        emoji: '❓',
        description: 'These two are keeping their secret for now. Try another pair, or come back to this one later.',
        status: 'unresolved'
      })
    } finally {
      setIsCombining(false)
    }
  }

  const closeResetConfirm = () => {
    setShowResetConfirm(false)
    document.getElementById(RESET_BUTTON_ID)?.focus()
  }

  const confirmReset = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(COMBINATIONS_KEY)
    setDiscoveries([])
    setCombinations({})
    setSelectedConcepts([])
    setLastResult(null)
    closeResetConfirm()
  }

  const handleResetDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeResetConfirm()
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const next = document.activeElement === cancelResetRef.current ? confirmResetRef : cancelResetRef
      next.current?.focus()
    }
  }

  const handleClearSelection = () => {
    setSelectedConcepts([])
    setLastResult(null)
  }

  if (showIntro) {
    return (
      <div className="min-h-[60vh] bg-background flex items-center justify-center px-6">
        <div className="max-w-lg text-center animate-fade">
          <div className="text-6xl mb-6" aria-hidden="true">🧠</div>
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
          <Button onClick={() => setShowIntro(false)} variant="primary" className="px-8 py-3">
            Begin Exploring
          </Button>
        </div>
      </div>
    )
  }

  const slotClass = (filled: boolean) => `
    w-20 min-h-20 sm:w-32 sm:min-h-32 py-1 rounded-xl border-2 border-dashed
    flex flex-col items-center justify-center transition-all
    ${filled ? 'border-accent bg-accent/5' : 'border-foreground/20 bg-foreground/5'}
  `

  const renderSlot = (concept: Concept | undefined) => (
    <div className={slotClass(Boolean(concept))}>
      {concept ? (
        <>
          <span className="text-3xl sm:text-4xl mb-1" aria-hidden="true">{concept.emoji}</span>
          <span className="text-xs sm:text-sm font-medium text-center px-1 break-words max-w-full">
            {concept.name}
          </span>
        </>
      ) : (
        <span className="text-foreground/50 text-sm">Select</span>
      )}
    </div>
  )

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
                <Sparkles size={18} aria-hidden="true" />
                <span className="font-medium">
                  {discoveries.length} {discoveries.length === 1 ? 'discovery' : 'discoveries'}
                </span>
              </div>
              <Button
                id={RESET_BUTTON_ID}
                onClick={() => setShowResetConfirm(true)}
                disabled={isCombining}
                variant="ghost"
                className="p-2"
                aria-label="Reset all discoveries"
              >
                <RotateCcw size={18} aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Combination workspace */}
          <div className="bg-card-bg border border-card-border rounded-xl p-6 sm:p-8 mb-6 min-h-[200px]">
            <div className="flex items-center justify-center gap-2 sm:gap-6 mb-6 flex-wrap">
              {renderSlot(selectedConcepts[0])}

              <div className="text-xl sm:text-3xl text-foreground/30 font-light" aria-hidden="true">+</div>

              {renderSlot(selectedConcepts[1])}

              <div className="text-xl sm:text-3xl text-foreground/30 font-light" aria-hidden="true">=</div>

              {/* Result slot */}
              <div
                className={`
                  w-20 min-h-20 sm:w-32 sm:min-h-32 py-1 rounded-xl border-2
                  flex flex-col items-center justify-center transition-all
                  ${isCombining
                    ? 'border-accent animate-pulse bg-accent/10'
                    : lastResult?.status === 'new'
                      ? 'border-success bg-success/10'
                      : 'border-foreground/20 bg-foreground/5'
                  }
                `}
              >
                {isCombining ? (
                  <div className="flex flex-col items-center">
                    <Lightbulb className="text-accent animate-bounce" size={32} aria-hidden="true" />
                    <span className="text-xs text-foreground/60 mt-2">Combining...</span>
                  </div>
                ) : lastResult ? (
                  <>
                    <span className="text-3xl sm:text-4xl mb-1" aria-hidden="true">{lastResult.emoji}</span>
                    <span className="text-xs sm:text-sm font-medium text-center px-1 break-words max-w-full">
                      {lastResult.name}
                    </span>
                    {lastResult.status === 'new' && (
                      <span className="text-xs font-semibold text-melon-green mt-1">NEW!</span>
                    )}
                    {lastResult.status === 'known' && (
                      <span className="text-[10px] sm:text-xs text-foreground/60 mt-1 text-center">Already yours</span>
                    )}
                  </>
                ) : (
                  <span className="text-foreground/50 text-sm text-center px-2">Result</span>
                )}
              </div>
            </div>

            <div role="status" aria-live="polite" className="text-center max-w-md mx-auto">
              {isCombining && <span className="sr-only">Combining</span>}
              {lastResult && !isCombining && (
                <>
                  <span className="sr-only">
                    {lastResult.status === 'new' && `New discovery: ${lastResult.name}. `}
                    {lastResult.status === 'known' && `${lastResult.name}, already in your concepts. `}
                  </span>
                  {lastResult.description && (
                    <p className="text-foreground/70 text-sm italic">
                      &ldquo;{lastResult.description}&rdquo;
                    </p>
                  )}
                </>
              )}
            </div>

            {(selectedConcepts.length > 0 || lastResult) && !isCombining && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={handleClearSelection}
                  variant="ghost"
                  className="text-sm inline-flex items-center"
                >
                  <Trash2 size={14} className="mr-2" aria-hidden="true" />
                  Clear
                </Button>
              </div>
            )}

            {selectedConcepts.length === 0 && !lastResult && !isCombining && (
              <p className="text-center text-foreground/60 text-sm">
                Choose two concepts below to combine them
              </p>
            )}
          </div>

          {/* Concept grid */}
          <div className="bg-card-bg border border-card-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-foreground/80">Your Concepts</h2>
              <span className="text-sm text-foreground/60">
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
                      ${concept.id === newConceptId ? 'animate-pulse ring-2 ring-success ring-offset-2 ring-offset-background' : ''}
                      ${isCombining ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      focus:outline-none focus:ring-2 focus:ring-accent
                    `}
                    aria-label={concept.name}
                    aria-pressed={isSelected}
                  >
                    <span aria-hidden="true">{concept.emoji}</span>
                    <span>{concept.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-foreground/5 rounded-lg">
            <h3 className="text-sm font-medium text-foreground/70 mb-2">Tips</h3>
            <ul className="text-sm text-foreground/60 space-y-1">
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

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="idea-lab-reset-title"
            aria-describedby="idea-lab-reset-description"
            onKeyDown={handleResetDialogKeyDown}
            className="bg-card-bg rounded-xl p-6 max-w-sm w-full shadow-2xl border border-card-border"
          >
            <h3 id="idea-lab-reset-title" className="text-lg font-semibold mb-2 text-foreground">Reset all discoveries?</h3>
            <p id="idea-lab-reset-description" className="text-sm text-foreground/70 mb-4">
              This will erase all your discovered concepts. Your base concepts will remain.
            </p>
            <div className="flex gap-3">
              <button
                ref={cancelResetRef}
                onClick={closeResetConfirm}
                className="flex-1 px-4 py-2 border border-foreground/20 rounded-lg hover:bg-foreground/5 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                Cancel
              </button>
              <button
                ref={confirmResetRef}
                onClick={confirmReset}
                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
