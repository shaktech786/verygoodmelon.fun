'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Sparkles, Trash2, RotateCcw, FlaskConical } from 'lucide-react'
import { BASE_CONCEPTS, GOLDEN_IDEAS, isGolden, type Concept } from '@/lib/games/idea-lab/concepts'

interface CombinationResult {
  name: string
  emoji: string
  description: string
  status: 'new' | 'known' | 'unresolved'
}

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
  const goldFound = GOLDEN_IDEAS.map(golden =>
    discoveries.find(c => c.name.toLowerCase() === golden.name.toLowerCase())
  )
  const goldCount = goldFound.filter(Boolean).length
  const greatWorkDone = goldCount === GOLDEN_IDEAS.length

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
          <FlaskConical className="mx-auto mb-6 text-warm" size={56} strokeWidth={1.5} aria-hidden="true" />
          <h1 className="text-4xl font-semibold mb-4">The Alchemist</h1>
          <p className="text-lg text-foreground/80 mb-3 leading-relaxed">
            Select two concepts to combine them. Seven of the ideas you can make are gold, and the heaviest feelings are often the way there.
          </p>
          <p className="text-foreground/70 mb-8">
            No timer, no wrong answers. Everything you make is kept.
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
    flex flex-col items-center justify-center transition-colors
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
        <span className="text-foreground/60 text-sm">Select</span>
      )}
    </div>
  )

  const resultIsGold = lastResult?.status === 'new' && isGolden(lastResult.name)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-6xl">
        <div className="animate-fade">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold mb-2">The Alchemist</h1>
              <p className="text-foreground/70">
                Mix two ideas and see what they become.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-foreground/5 text-foreground rounded-lg">
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
                className="p-2 min-w-[44px] min-h-[44px]"
                aria-label="Reset all discoveries"
              >
                <RotateCcw size={18} aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Combination workspace */}
          <div className="bg-card-bg border border-card-border rounded-xl p-5 sm:p-8 mb-6 min-h-[200px]">
            <div className="flex items-center justify-center gap-2 sm:gap-6 mb-5 flex-wrap">
              {renderSlot(selectedConcepts[0])}

              <div className="text-xl sm:text-3xl text-foreground/40 font-light" aria-hidden="true">+</div>

              {renderSlot(selectedConcepts[1])}

              <div className="text-xl sm:text-3xl text-foreground/40 font-light" aria-hidden="true">=</div>

              <div
                className={`
                  w-20 min-h-20 sm:w-32 sm:min-h-32 py-1 rounded-xl border-2
                  flex flex-col items-center justify-center transition-colors
                  ${isCombining
                    ? 'border-warm bg-warm/10'
                    : resultIsGold
                      ? 'border-warm bg-warm/20 ring-4 ring-warm/40'
                      : lastResult?.status === 'new'
                        ? 'border-melon-green bg-melon-green/10'
                        : 'border-foreground/20 bg-foreground/5'
                  }
                `}
              >
                {isCombining ? (
                  <div className="flex flex-col items-center">
                    <FlaskConical className="text-warm animate-pulse" size={32} aria-hidden="true" />
                    <span className="text-xs text-foreground/70 mt-2">Combining...</span>
                  </div>
                ) : lastResult ? (
                  <>
                    <span className="text-3xl sm:text-4xl mb-1" aria-hidden="true">{lastResult.emoji}</span>
                    <span className="text-xs sm:text-sm font-semibold text-center px-1 break-words max-w-full">
                      {lastResult.name}
                    </span>
                    {resultIsGold && (
                      <span className="text-xs font-semibold text-foreground mt-1">GOLD</span>
                    )}
                    {lastResult.status === 'new' && !resultIsGold && (
                      <span className="text-xs font-semibold text-melon-green mt-1">NEW!</span>
                    )}
                    {lastResult.status === 'known' && (
                      <span className="text-[11px] sm:text-xs text-foreground/70 mt-1 text-center">Already yours</span>
                    )}
                  </>
                ) : (
                  <span className="text-foreground/60 text-sm text-center px-2">Result</span>
                )}
              </div>
            </div>

            <div role="status" aria-live="polite" className="text-center max-w-md mx-auto">
              {isCombining && <span className="sr-only">Combining</span>}
              {lastResult && !isCombining && (
                <>
                  <span className="sr-only">
                    {resultIsGold && `Gold: ${lastResult.name}, one of the seven. `}
                    {lastResult.status === 'new' && !resultIsGold && `New discovery: ${lastResult.name}. `}
                    {lastResult.status === 'known' && `${lastResult.name}, already in your concepts. `}
                  </span>
                  {lastResult.description && (
                    <p className="text-foreground/80 text-base leading-relaxed">
                      &ldquo;{lastResult.description}&rdquo;
                    </p>
                  )}
                  {resultIsGold && (
                    <p className="mt-2 text-sm font-medium text-foreground">
                      One of the seven golds. {goldCount} of {GOLDEN_IDEAS.length} found.
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
              <p className="text-center text-foreground/70 text-sm">
                Choose two concepts below to combine them
              </p>
            )}
          </div>

          {/* Concept grid */}
          <div className="bg-card-bg border border-card-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-foreground/80">Your Concepts</h2>
              <span className="text-sm text-foreground/70">
                {concepts.length} total
              </span>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              {concepts.map((concept) => {
                const isSelected = selectedConcepts.some(c => c.id === concept.id)
                const gold = !concept.isBase && isGolden(concept.name)

                return (
                  <button
                    key={concept.id}
                    onClick={() => handleSelectConcept(concept)}
                    disabled={isCombining}
                    className={`
                      flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg border transition-colors
                      text-sm font-medium
                      ${isSelected
                        ? 'border-accent bg-accent/10 text-foreground'
                        : gold
                          ? 'border-warm bg-warm/20 hover:bg-warm/30'
                          : concept.isBase
                            ? 'border-foreground/10 bg-foreground/5 hover:border-accent/50 hover:bg-accent/5'
                            : 'border-melon-green/30 bg-melon-green/5 hover:border-melon-green/60 hover:bg-melon-green/10'
                      }
                      ${concept.id === newConceptId ? 'ring-2 ring-melon-green ring-offset-2 ring-offset-background' : ''}
                      ${isCombining ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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

          {/* The seven golds */}
          <section
            className="mt-6 bg-card-bg border border-card-border rounded-xl p-4 sm:p-6"
            aria-labelledby="great-work-title"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <h2 id="great-work-title" className="font-medium text-foreground/80">
                {greatWorkDone ? 'The Great Work is complete' : 'The seven golds'}
              </h2>
              <span className="text-sm text-foreground/70">{goldCount} of {GOLDEN_IDEAS.length} found</span>
            </div>
            <p className="text-sm text-foreground/70 mb-4">
              {greatWorkDone
                ? 'You turned fear, grief and doubt into seven kinds of gold. The lab stays open whenever you want to wander.'
                : 'Each riddle names the two ideas a gold is made from. Find those first.'}
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {GOLDEN_IDEAS.map((golden, index) => {
                const found = goldFound[index]
                return (
                  <li
                    key={golden.name}
                    className={`rounded-lg border px-3 py-3 ${
                      found ? 'border-warm bg-warm/15' : 'border-dashed border-foreground/20'
                    }`}
                  >
                    {found ? (
                      <>
                        <p className="font-semibold text-foreground">
                          <span aria-hidden="true">{found.emoji} </span>{found.name}
                        </p>
                        {found.description && (
                          <p className="text-sm text-foreground/70 mt-1">{found.description}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm font-medium text-foreground/70">
                        <span className="sr-only">Not yet found. Riddle: </span>
                        <span aria-hidden="true">? </span>{golden.riddle}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

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
              This will erase all your discovered concepts, golds included. Your base concepts will remain.
            </p>
            <div className="flex gap-3">
              <button
                ref={cancelResetRef}
                onClick={closeResetConfirm}
                className="flex-1 px-4 py-2 border border-foreground/20 rounded-lg hover:bg-foreground/5 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                ref={confirmResetRef}
                onClick={confirmReset}
                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
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
