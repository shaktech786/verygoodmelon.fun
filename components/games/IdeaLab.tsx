'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Sparkles, Trash2, RotateCcw, FlaskConical } from 'lucide-react'
import { BASE_CONCEPTS, type Concept } from '@/lib/games/idea-lab/concepts'
import { WORK_TITLES, goldsFor, isGolden } from '@/lib/games/idea-lab/golds'
import {
  DEFAULT_PROGRESS, afterCombination, beginNextWork, parseCombinations, parseDiscoveries, parseProgress, type LabProgress,
} from '@/lib/games/idea-lab/progress'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { GoldShelf } from '@/components/games/idea-lab/GoldShelf'
import { LetterScene } from '@/components/games/idea-lab/LetterScene'

interface CombinationResult {
  name: string
  emoji: string
  description: string
  status: 'new' | 'known' | 'unresolved'
  /** The riddle a new gold answered. */
  riddle?: string
}

type FocusTarget = 'first-concept' | 'letter' | 'shelf'

const STORAGE_KEY = 'ideaLab_discoveries'
const COMBINATIONS_KEY = 'ideaLab_combinations'
const PROGRESS_KEY = 'ideaLab_progress'
const NEW_HIGHLIGHT_MS = 2000
const RESET_BUTTON_ID = 'idea-lab-reset'
const HINT_ANNOUNCEMENTS = ['', 'A plainer clue has surfaced on the shelf.', 'The shelf now names the ingredients.']

const getComboKey = (c1: Concept, c2: Concept) => [c1.id, c2.id].sort().join('+')

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function announcementFor(result: CombinationResult, goldCount: number, goldTotal: number): string {
  if (result.status === 'unresolved') return result.description
  const lead = result.riddle
    ? `Gold: ${result.name}, one of the seven. ${goldCount} of ${goldTotal} found.`
    : result.status === 'new'
      ? `New discovery: ${result.name}.`
      : `${result.name}, already in your concepts.`
  return result.description ? `${lead} ${result.description}` : lead
}

export default function IdeaLab() {
  const [discoveries, setDiscoveries] = useState<Concept[]>([])
  const [combinations, setCombinations] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState<LabProgress>(DEFAULT_PROGRESS)
  const [selectedConcepts, setSelectedConcepts] = useState<Concept[]>([])
  const [isCombining, setIsCombining] = useState(false)
  const [lastResult, setLastResult] = useState<CombinationResult | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [newConceptId, setNewConceptId] = useState<string | null>(null)
  const [letterWork, setLetterWork] = useState<number | null>(null)
  const [showIntro, setShowIntro] = useState(true)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [stickyTop, setStickyTop] = useState(64)
  const reducedMotion = useReducedMotion()
  const cancelResetRef = useRef<HTMLButtonElement>(null)
  const confirmResetRef = useRef<HTMLButtonElement>(null)
  const firstConceptRef = useRef<HTMLButtonElement>(null)
  const letterHeadingRef = useRef<HTMLHeadingElement>(null)
  const shelfHeadingRef = useRef<HTMLHeadingElement>(null)
  const pendingFocus = useRef<FocusTarget | null>(null)

  const concepts = [...BASE_CONCEPTS, ...discoveries]
  const golds = goldsFor(progress.work)
  const goldFoundIn = (list: Concept[]) =>
    golds.map(gold => list.find(c => c.name.toLowerCase() === gold.name.toLowerCase()))
  const goldFound = goldFoundIn(discoveries)
  const workComplete = (work: number) =>
    goldsFor(work).every(gold => discoveries.some(c => c.name.toLowerCase() === gold.name.toLowerCase()))
  const completedWorks = [0, 1].filter(work => work <= progress.work && workComplete(work))
  const canBeginNextWork = progress.work === 0 && workComplete(0)

  useEffect(() => {
    const savedDiscoveries = parseDiscoveries(localStorage.getItem(STORAGE_KEY))
    const savedCombinations = parseCombinations(localStorage.getItem(COMBINATIONS_KEY))
    const savedProgress = parseProgress(localStorage.getItem(PROGRESS_KEY))
    // The site header is sticky, so the phone bench has to stop just below it.
    const headerHeight = document.querySelector('header')?.getBoundingClientRect().height

    queueMicrotask(() => {
      setDiscoveries(savedDiscoveries)
      setCombinations(savedCombinations)
      setProgress(savedProgress)
      if (headerHeight) setStickyTop(Math.round(headerHeight))
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

  useEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    const element = { 'first-concept': firstConceptRef, letter: letterHeadingRef, shelf: shelfHeadingRef }[target].current
    if (!element) return
    pendingFocus.current = null
    element.focus({ preventScroll: true })
    element.scrollIntoView({ block: target === 'first-concept' ? 'nearest' : 'start', behavior: reducedMotion ? 'auto' : 'smooth' })
  })

  const updateProgress = (next: LabProgress) => {
    setProgress(next)
    save(PROGRESS_KEY, next)
  }

  const rememberCombination = (c1: Concept, c2: Concept, resultId: string) => {
    const updated = { ...combinations, [getComboKey(c1, c2)]: resultId }
    setCombinations(updated)
    save(COMBINATIONS_KEY, updated)
  }

  /** Every settled combination counts as a try toward the next clue; a new gold resets the count. */
  const settle = (result: CombinationResult, allDiscoveries: Concept[]) => {
    const next = afterCombination(progress, Boolean(result.riddle))
    const hint = next.hintLevel > progress.hintLevel ? HINT_ANNOUNCEMENTS[next.hintLevel] : ''
    const foundNow = goldFoundIn(allDiscoveries).filter(Boolean).length
    const completes = Boolean(result.riddle) && foundNow === golds.length
    updateProgress(next)
    setLastResult(result)
    setAnnouncement([
      announcementFor(result, foundNow, golds.length),
      hint,
      completes ? `${WORK_TITLES[progress.work]} is complete. A letter has been written for you.` : '',
    ].filter(Boolean).join(' '))
    if (completes) {
      setLetterWork(progress.work)
      pendingFocus.current = 'letter'
    }
  }

  const handleSelectConcept = (concept: Concept) => {
    if (isCombining) return

    // A finished pair stays on show with its result; the next pick starts a new pair.
    if (selectedConcepts.length !== 1) {
      setSelectedConcepts([concept])
      setLastResult(null)
      setAnnouncement('')
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
      settle({
        name: cached.name,
        emoji: cached.emoji,
        description: cached.description ?? 'You have made this one before.',
        status: 'known',
      }, discoveries)
      return
    }

    setIsCombining(true)
    setAnnouncement('Combining')

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
        settle({ name: existingConcept.name, emoji: existingConcept.emoji, description, status: 'known' }, discoveries)
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
      save(STORAGE_KEY, updatedDiscoveries)
      rememberCombination(concept1, concept2, newConcept.id)
      setNewConceptId(newConcept.id)
      const gold = golds.find(g => g.name.toLowerCase() === name.toLowerCase())
      settle({ name, emoji, description, status: 'new', riddle: gold?.riddles[0] }, updatedDiscoveries)
    } catch (error) {
      console.error('Combination error:', error)
      const unresolved: CombinationResult = {
        name: 'Mystery',
        emoji: '❓',
        description: 'These two are keeping their secret for now. Try another pair, or come back to this one later.',
        status: 'unresolved'
      }
      setLastResult(unresolved)
      setAnnouncement(unresolved.description)
    } finally {
      setIsCombining(false)
    }
  }

  const beginSecondWork = () => {
    updateProgress(beginNextWork(progress))
    setLetterWork(null)
    setLastResult(null)
    setSelectedConcepts([])
    setAnnouncement('The Second Work begins. Seven new riddles are on the shelf.')
    pendingFocus.current = 'shelf'
  }

  const openLetter = (work: number) => {
    setLetterWork(work)
    pendingFocus.current = 'letter'
  }

  const closeLetter = () => {
    setLetterWork(null)
    pendingFocus.current = 'first-concept'
  }

  const closeResetConfirm = () => {
    setShowResetConfirm(false)
    document.getElementById(RESET_BUTTON_ID)?.focus()
  }

  const confirmReset = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(COMBINATIONS_KEY)
    localStorage.removeItem(PROGRESS_KEY)
    setDiscoveries([])
    setCombinations({})
    setProgress(DEFAULT_PROGRESS)
    setSelectedConcepts([])
    setLastResult(null)
    setLetterWork(null)
    setAnnouncement('')
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
    setAnnouncement('')
  }

  const beginExploring = () => {
    setShowIntro(false)
    pendingFocus.current = 'first-concept'
  }

  if (showIntro) {
    return (
      <div className="min-h-[60vh] bg-background flex items-center justify-center px-6">
        <div className="max-w-lg text-center animate-fade">
          <FlaskConical className="mx-auto mb-6 text-warm" size={56} strokeWidth={1.5} aria-hidden="true" />
          <h1 className="text-4xl font-semibold mb-4">The Alchemist</h1>
          <p className="text-lg text-foreground/80 mb-3 leading-relaxed">
            Mix two ideas and see what they become. Seven of them are gold, each hidden behind a riddle, and the heaviest feelings are often the way there.
          </p>
          <p className="text-foreground/70 mb-8">
            No timer, no wrong answers. Clues grow plainer if you are stuck, and everything you make is kept.
          </p>
          <Button onClick={beginExploring} variant="primary" className="px-8 py-3">
            Begin Exploring
          </Button>
        </div>
      </div>
    )
  }

  const resultIsGold = Boolean(lastResult?.riddle)
  const goldCount = goldFound.filter(Boolean).length
  const hasBench = selectedConcepts.length > 0 || lastResult !== null || isCombining

  const resultTone = isCombining
    ? 'border-warm bg-warm/10'
    : resultIsGold
      ? 'border-warm bg-warm/20 ring-4 ring-warm/40'
      : lastResult?.status === 'new'
        ? 'border-melon-green bg-melon-green/10'
        : 'border-foreground/20 bg-foreground/5'

  const resultTag = !lastResult || isCombining
    ? null
    : resultIsGold
      ? 'GOLD'
      : lastResult.status === 'new'
        ? 'NEW'
        : lastResult.status === 'known'
          ? 'Already yours'
          : null

  const renderSlot = (concept: Concept | undefined, compact: boolean) => (
    <div className={`${compact ? 'flex-1 min-w-0 rounded-lg overflow-hidden' : 'w-32 min-h-32 rounded-xl'} py-1 border-2 border-dashed flex flex-col items-center justify-center transition-colors ${concept ? 'border-accent bg-accent/5' : 'border-foreground/20 bg-foreground/5'}`}>
      {concept ? (
        <>
          <span className={compact ? 'text-base leading-tight' : 'text-4xl mb-1'} aria-hidden="true">{concept.emoji}</span>
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-center px-1 break-words max-w-full`}>{concept.name}</span>
        </>
      ) : (
        <span className="text-foreground/70 text-sm">Select</span>
      )}
    </div>
  )

  const renderResult = (compact: boolean) => (
    <div className={`${compact ? 'flex-1 min-w-0 rounded-lg overflow-hidden' : 'w-32 min-h-32 rounded-xl'} py-1 border-2 flex flex-col items-center justify-center transition-colors ${resultTone}`}>
      {isCombining ? (
        <>
          <FlaskConical className={`text-foreground/70 ${reducedMotion ? '' : 'animate-pulse'}`} size={compact ? 16 : 32} aria-hidden="true" />
          <span className="text-xs text-foreground/70 mt-1">Combining...</span>
        </>
      ) : lastResult ? (
        <>
          <span className={compact ? 'text-base leading-tight' : 'text-4xl mb-1'} aria-hidden="true">{lastResult.emoji}</span>
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-center px-1 break-words max-w-full`}>{lastResult.name}</span>
          {resultTag && (
            <span className={`text-[11px] sm:text-xs font-semibold mt-0.5 text-center ${lastResult.status === 'known' ? 'font-normal text-foreground/75' : 'text-foreground'}`}>
              {resultTag}
            </span>
          )}
        </>
      ) : (
        <span className="text-foreground/70 text-sm text-center px-2">Result</span>
      )}
    </div>
  )

  const goldNote = resultIsGold && lastResult?.riddle && (
    <p className="mt-2 text-sm text-foreground">
      <span className="font-medium">One of the seven golds, {goldCount} of {golds.length} found.</span>{' '}
      <span className="text-foreground/80">It answers: <span className="italic">{lastResult.riddle}</span></span>
    </p>
  )

  const clearButton = hasBench && !isCombining && (
    <Button onClick={handleClearSelection} variant="ghost" className="text-sm inline-flex items-center min-h-[44px]">
      <Trash2 size={14} className="mr-2" aria-hidden="true" />
      Clear
    </Button>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-6xl">
        <div className={reducedMotion ? '' : 'animate-fade'}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold mb-2">The Alchemist</h1>
              <p className="text-foreground/75">
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

          {letterWork !== null && (
            <LetterScene
              ref={letterHeadingRef}
              work={letterWork}
              discoveries={discoveries}
              canBeginNextWork={letterWork === 0 && canBeginNextWork}
              reducedMotion={reducedMotion}
              onBeginNextWork={beginSecondWork}
              onClose={closeLetter}
            />
          )}

          <div role="status" aria-live="polite" className="sr-only">{announcement}</div>

          {/* The bench. On a phone it lives at the top of the concept grid and stays in view while scrolling. */}
          <div className="hidden sm:block bg-card-bg border border-card-border rounded-xl p-8 mb-6 min-h-[200px]" aria-hidden="true">
            <div className="flex items-center justify-center gap-6 mb-5">
              {renderSlot(selectedConcepts[0], false)}
              <div className="text-3xl text-foreground/40 font-light">+</div>
              {renderSlot(selectedConcepts[1], false)}
              <div className="text-3xl text-foreground/40 font-light">=</div>
              {renderResult(false)}
            </div>
            <div className="text-center max-w-md mx-auto">
              {lastResult?.description && !isCombining && (
                <p className="text-foreground/85 text-base leading-relaxed">&ldquo;{lastResult.description}&rdquo;</p>
              )}
              {goldNote}
              {!hasBench && <p className="text-foreground/75 text-sm">Choose two concepts below to combine them</p>}
            </div>
          </div>
          {clearButton && <div className="hidden sm:flex justify-center -mt-4 mb-6">{clearButton}</div>}

          <div className="bg-card-bg border border-card-border rounded-xl">
            <div
              className="sm:hidden sticky z-10 bg-card-bg border-b border-card-border rounded-t-xl px-3 pt-3 pb-2"
              style={{ top: stickyTop }}
              data-testid="phone-bench"
            >
              <div className="flex items-stretch gap-1.5 h-14" aria-hidden="true">
                {renderSlot(selectedConcepts[0], true)}
                <span className="self-center text-foreground/60">+</span>
                {renderSlot(selectedConcepts[1], true)}
                <span className="self-center text-foreground/60">=</span>
                {renderResult(true)}
              </div>
              {/* A fixed height, so a result never pushes the chip the player just tapped out from under their finger. */}
              <div className="flex items-center gap-2 h-[3.75rem] mt-1">
                <p className="flex-1 min-w-0 text-[13px] leading-snug text-foreground/85 line-clamp-3" aria-hidden="true">
                  {isCombining
                    ? ''
                    : resultIsGold && lastResult?.riddle
                      ? <>Gold, {goldCount} of {golds.length}. It answers: <span className="italic">{lastResult.riddle}</span></>
                      : lastResult?.description
                        ? <>&ldquo;{lastResult.description}&rdquo;</>
                        : !hasBench && 'Choose two concepts to combine them.'}
                </p>
                {clearButton}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-foreground/80">Your Concepts</h2>
                <span className="text-sm text-foreground/70">
                  {concepts.length} total
                </span>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                {concepts.map((concept, index) => {
                  const isSelected = selectedConcepts.some(c => c.id === concept.id)
                  const gold = !concept.isBase && isGolden(concept.name, progress.work)

                  return (
                    <button
                      key={concept.id}
                      ref={index === 0 ? firstConceptRef : undefined}
                      onClick={() => handleSelectConcept(concept)}
                      aria-disabled={isCombining}
                      className={`
                        flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg border transition-colors
                        text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card-bg
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
          </div>

          <GoldShelf
            ref={shelfHeadingRef}
            work={progress.work}
            hintLevel={progress.hintLevel}
            found={goldFound}
            completedWorks={completedWorks}
            canBeginNextWork={canBeginNextWork}
            onReadLetter={openLetter}
            onBeginNextWork={beginSecondWork}
          />

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
            <p id="idea-lab-reset-description" className="text-sm text-foreground/75 mb-4">
              This will erase all your discovered concepts, golds and letters included. Your starting concepts will remain.
            </p>
            <div className="flex gap-3">
              <button
                ref={cancelResetRef}
                onClick={closeResetConfirm}
                className="flex-1 px-4 py-2 min-h-[44px] border border-foreground/20 rounded-lg hover:bg-foreground/5 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                ref={confirmResetRef}
                onClick={confirmReset}
                className="flex-1 px-4 py-2 min-h-[44px] bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
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
