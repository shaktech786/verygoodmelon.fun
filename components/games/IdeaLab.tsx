'use client'

import { REPLY_TIMEOUT_MS } from '@/lib/games/reply-timeout'
import { useState, useEffect, useId, useRef } from 'react'
import { NoteDialog } from '@/components/seedpress/NoteDialog'
import { Stamp } from '@/components/seedpress/Stamp'
import { Go } from '@/components/seedpress/Go'
import { QuietButton } from '@/components/seedpress/QuietButton'
import { IconStamp } from '@/components/seedpress/IconStamp'
import { cn } from '@/lib/utils/cn'
import styles from './IdeaLab.module.css'
import { BASE_CONCEPTS, findKnownCombination, type Concept } from '@/lib/games/idea-lab/concepts'
import { WORK_TITLES, goldsFor, isGolden, type GoldenIdea } from '@/lib/games/idea-lab/golds'
import {
  DEFAULT_PROGRESS, afterCombination, beginNextWork, parseCombinations, parseDiscoveries, parseProgress, type LabProgress,
} from '@/lib/games/idea-lab/progress'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useSense } from '@/lib/design/sense'
import { FRESH_GOLD_ID, GoldShelf } from '@/components/games/idea-lab/GoldShelf'
import { LetterScene } from '@/components/games/idea-lab/LetterScene'
import { IdeaCabinet } from '@/components/games/idea-lab/IdeaCabinet'
import { Icon } from '@/components/seedpress/icons/Icon'

interface CombinationResult {
  name: string
  emoji: string
  description: string
  status: 'new' | 'known' | 'unresolved'
  /** The riddle a new gold answered. */
  riddle?: string
}

type FocusTarget = 'concepts' | 'letter' | 'shelf'

const STORAGE_KEY = 'ideaLab_discoveries'
const COMBINATIONS_KEY = 'ideaLab_combinations'
const PROGRESS_KEY = 'ideaLab_progress'
const NEW_HIGHLIGHT_MS = 2000
const RESET_BUTTON_ID = 'idea-lab-reset'
// From this width the bench and riddles sit in their own column beside the concepts.
const WIDE_QUERY = '(min-width: 1024px)'
const CLUE_LABELS = ['Riddle:', 'Plainer:', 'Ingredients:']

// A found gold: its dashed riddle outline turns to brass, and what it answers arrives one beat later.
const GOLD_MOMENT_CSS = `
li.alchemist-gold-settled {
  border-style: solid;
  border-color: var(--brass);
  background-color: color-mix(in srgb, var(--brass) 14%, var(--sheet));
  box-shadow: 0 3px 0 var(--brass);
}
@keyframes alchemist-gold-turn {
  from {
    border-color: var(--rule-strong);
    background-color: transparent;
    box-shadow: 0 0 0 0 transparent;
  }
}
@keyframes alchemist-gold-answer {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: none; }
}
.alchemist-gold-turn { animation: alchemist-gold-turn calc(700ms * var(--motion)) ease-out both; }
.alchemist-gold-answer { animation: alchemist-gold-answer calc(500ms * var(--motion)) ease-out calc(900ms * var(--motion)) both; }
`

const getComboKey = (c1: Concept, c2: Concept) => [c1.id, c2.id].sort().join('+')

interface CombineReply {
  name?: unknown
  emoji?: unknown
  description?: unknown
}

async function askForCombination(first: string, second: string): Promise<CombineReply> {
  const response = await fetch('/api/idea-lab/combine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concept1: first, concept2: second }),
    signal: AbortSignal.timeout(REPLY_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error('Failed to combine concepts')
  return response.json()
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function announcementFor(result: CombinationResult): string {
  if (result.status === 'unresolved') return result.description
  const lead = result.riddle
    ? `Gold: ${result.name}. It answers: ${result.riddle}`
    : result.status === 'new'
      ? `New discovery: ${result.name}.`
      : `${result.name}, already in your concepts.`
  return result.description ? `${lead} ${result.description}` : lead
}

function clueAnnouncement(gold: GoldenIdea, level: number): string {
  return level >= 2 ? `A riddle now names its ingredients: ${gold.riddles[2]}` : `A riddle has grown plainer: ${gold.riddles[1]}`
}

/** The concept straight above or below, by where the wrapped chips actually sit on screen. */
function verticalNeighbour(buttons: (HTMLElement | undefined)[], from: number, direction: 1 | -1): number | null {
  const origin = buttons[from]?.getBoundingClientRect()
  if (!origin) return null
  const centre = origin.left + origin.width / 2
  let best: { index: number; gap: number; offset: number } | null = null
  for (const [index, button] of buttons.entries()) {
    const rect = button?.getBoundingClientRect()
    if (!rect) continue
    const gap = direction === 1 ? rect.top - origin.bottom : origin.top - rect.bottom
    if (gap < -origin.height / 2) continue
    const offset = Math.abs(rect.left + rect.width / 2 - centre)
    if (!best || gap < best.gap - 1 || (Math.abs(gap - best.gap) <= 1 && offset < best.offset)) best = { index, gap, offset }
  }
  return best?.index ?? null
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
  const [wide, setWide] = useState(false)
  const [freshClue, setFreshClue] = useState<number | null>(null)
  const [activeConceptId, setActiveConceptId] = useState(BASE_CONCEPTS[0].id)
  const reducedMotion = useReducedMotion()
  const mixReasonId = useId()
  // Read through a ref, so turning the sensory dial never re-fires a scroll or a focus move
  const { motionScale } = useSense()
  const scrollBehaviourRef = useRef<ScrollBehavior>('smooth')
  useEffect(() => {
    scrollBehaviourRef.current = motionScale ? 'smooth' : 'auto'
  }, [motionScale])
  const cancelResetRef = useRef<HTMLButtonElement>(null)
  const resetOpenerRef = useRef<HTMLElement | null>(null)
  const conceptRefs = useRef(new Map<string, HTMLButtonElement>())
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
  // Tab lands on one concept only; the arrow keys move between them.
  const activeId = concepts.some(c => c.id === activeConceptId) ? activeConceptId : concepts[0].id

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
    const query = window.matchMedia(WIDE_QUERY)
    const update = () => setWide(query.matches)
    queueMicrotask(update)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!newConceptId) return
    const timer = setTimeout(() => setNewConceptId(null), NEW_HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [newConceptId])

  useEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    const element = target === 'concepts'
      ? conceptRefs.current.get(activeId)
      : { letter: letterHeadingRef, shelf: shelfHeadingRef }[target].current
    if (!element) return
    pendingFocus.current = null
    element.focus({ preventScroll: true })
    element.scrollIntoView({ block: target === 'concepts' ? 'nearest' : 'start', behavior: scrollBehaviourRef.current })
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
    const solved = goldFoundIn(allDiscoveries).map(Boolean)
    const { progress: next, clued } = afterCombination(progress, Boolean(result.riddle), solved)
    const hint = clued === null ? '' : clueAnnouncement(golds[clued], next.hints[clued])
    const foundNow = solved.filter(Boolean).length
    const completes = Boolean(result.riddle) && foundNow === golds.length
    updateProgress(next)
    setFreshClue(clued)
    setLastResult(result)
    setAnnouncement([
      announcementFor(result),
      hint,
      completes ? `${WORK_TITLES[progress.work]} is complete. A letter has been written for you.` : '',
    ].filter(Boolean).join(' '))
    if (completes) {
      setLetterWork(progress.work)
      pendingFocus.current = 'letter'
    }
  }

  const handleSelectConcept = (concept: Concept) => {
    setActiveConceptId(concept.id)
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

    // Two on the bench wait for Mix: nothing is combined by a tap alone
    setSelectedConcepts([selectedConcepts[0], concept])
    setLastResult(null)
    setAnnouncement(`${selectedConcepts[0].name} and ${concept.name} are on the bench. Press Mix to combine them.`)
  }

  const mixPair = () => {
    if (isCombining) return
    if (selectedConcepts.length < 2 || (lastResult && lastResult.status !== 'unresolved')) {
      setAnnouncement(selectedConcepts.length < 2 ? 'Pick two concepts, then press Mix.' : 'Pick a new pair to mix again.')
      return
    }
    combineConcepts(selectedConcepts[0], selectedConcepts[1])
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
      // The hand-written pairs are answered here, so they still work on a flaky connection
      const data = findKnownCombination(concept1.name, concept2.name) ?? await askForCombination(concept1.name, concept2.name)
      if (typeof data?.name !== 'string' || !data.name.trim()) {
        throw new Error('Combination has no name')
      }

      const name: string = data.name.trim()
      const emoji: string = typeof data.emoji === 'string' && data.emoji ? data.emoji : '🔮'
      const description: string = typeof data.description === 'string' ? data.description : ''

      const existingConcept = concepts.find(c => c.name.toLowerCase() === name.toLowerCase())

      if (existingConcept) {
        rememberCombination(concept1, concept2, existingConcept.id)
        settle({ name: existingConcept.name, emoji: existingConcept.emoji, description: existingConcept.description ?? description, status: 'known' }, discoveries)
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
      // The bench already answers in its own words; a failed pair is not an error worth shouting about
      console.warn('Combination unresolved:', error)
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
    setFreshClue(null)
    setAnnouncement('The Second Work begins. Seven new riddles are on the shelf.')
    pendingFocus.current = 'shelf'
  }

  const openLetter = (work: number) => {
    setLetterWork(work)
    pendingFocus.current = 'letter'
  }

  const closeLetter = () => {
    setLetterWork(null)
    pendingFocus.current = 'concepts'
  }

  /** On a phone the page stays put when a gold is found; this brings it into view only when asked. */
  const seeFreshGold = () => {
    const card = document.getElementById(FRESH_GOLD_ID)
    card?.focus({ preventScroll: true })
    card?.scrollIntoView({ block: 'center', behavior: scrollBehaviourRef.current })
  }

  const skipToRiddles = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const heading = shelfHeadingRef.current
    heading?.focus({ preventScroll: true })
    heading?.scrollIntoView({ block: 'start', behavior: scrollBehaviourRef.current })
  }

  const moveConceptFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = concepts.findIndex(c => c.id === activeId)
    const last = concepts.length - 1
    const buttons = concepts.map(c => conceptRefs.current.get(c.id))
    const moves: Record<string, () => number | null> = {
      ArrowRight: () => Math.min(index + 1, last),
      ArrowLeft: () => Math.max(index - 1, 0),
      Home: () => 0,
      End: () => last,
      ArrowDown: () => verticalNeighbour(buttons, index, 1),
      ArrowUp: () => verticalNeighbour(buttons, index, -1),
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    const next = move()
    if (next === null) return
    setActiveConceptId(concepts[next].id)
    buttons[next]?.focus()
  }

  const closeResetConfirm = () => {
    setShowResetConfirm(false)
  }

  const confirmReset = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(COMBINATIONS_KEY)
    localStorage.removeItem(PROGRESS_KEY)
    setDiscoveries([])
    setCombinations({})
    setProgress(DEFAULT_PROGRESS)
    setFreshClue(null)
    setSelectedConcepts([])
    setLastResult(null)
    setLetterWork(null)
    setAnnouncement('')
    closeResetConfirm()
  }

  const handleClearSelection = () => {
    setSelectedConcepts([])
    setLastResult(null)
    setAnnouncement('')
  }

  const beginExploring = () => {
    setShowIntro(false)
    pendingFocus.current = 'concepts'
  }

  if (showIntro) {
    return (
      <div className={styles.intro}>
        <div className={styles.introBody}>
          <Icon name="flask" size={48} className={styles.flask} />
          <p className={styles.introLead}>
            Seven of them are gold, each hidden behind a riddle, and the heaviest feelings are often the way there.
          </p>
          <p className={styles.introSoft}>
            No timer, no wrong answers. Clues grow plainer if you are stuck, and everything you make is kept.
          </p>
          <Go onClick={beginExploring}>Begin Exploring</Go>
        </div>
      </div>
    )
  }

  const resultIsGold = Boolean(lastResult?.riddle)
  const freshGoldIndex = resultIsGold ? golds.findIndex(g => g.name.toLowerCase() === lastResult?.name.toLowerCase()) : -1
  const answerBeat = reducedMotion ? '' : 'alchemist-gold-answer'
  const hasBench = selectedConcepts.length > 0 || lastResult !== null || isCombining
  const unsolved = golds.map((_, index) => index).filter(index => !goldFound[index])
  // The riddle that last grew plainer, or else the oldest one still hidden.
  const currentRiddle = [...unsolved].reverse().find(index => (progress.hints[index] ?? 0) > 0) ?? unsolved[0]
  const currentLevel = currentRiddle === undefined ? 0 : progress.hints[currentRiddle] ?? 0
  // A pair is ready to mix when two are chosen and nothing is under way; a pair that could not be mixed can be tried again
  const readyToMix = selectedConcepts.length === 2 && !isCombining && (lastResult === null || lastResult.status === 'unresolved')
  const waitingReason = selectedConcepts.length < 2 ? 'Pick two concepts to mix' : 'Pick a new pair to mix again'

  const cellTone = isCombining
    ? styles.cellCombining
    : resultIsGold
      ? `${styles.cellGold} ${reducedMotion ? '' : 'alchemist-gold-turn'}`
      : lastResult?.status === 'new'
        ? styles.cellNew
        : ''

  const resultTag = !lastResult || isCombining
    ? null
    : resultIsGold
      ? 'Gold'
      : lastResult.status === 'new'
        ? 'New'
        : lastResult.status === 'known'
          ? 'Already yours'
          : null

  const emojiClass = (compact: boolean) => (compact ? styles.cellEmojiCompact : styles.cellEmoji)
  const nameClass = (compact: boolean) => cn(styles.cellName, compact && styles.cellNameCompact)

  const renderSlot = (concept: Concept | undefined, compact: boolean) => (
    <div className={cn(styles.cell, concept && styles.cellFilled)}>
      {concept ? (
        <>
          <span className={emojiClass(compact)} aria-hidden="true">{concept.emoji}</span>
          <span className={nameClass(compact)}>{concept.name}</span>
        </>
      ) : (
        <span className={styles.cellSoft}>Select</span>
      )}
    </div>
  )

  const renderResult = (compact: boolean) => (
    <div className={cn(styles.cell, cellTone)}>
      {isCombining ? (
        <>
          <Icon name="flask" size={compact ? 12 : 24} />
          <span className={styles.cellSoft}>Combining...</span>
        </>
      ) : lastResult ? (
        <>
          <span className={emojiClass(compact)} aria-hidden="true">{lastResult.emoji}</span>
          <span className={nameClass(compact)}>{lastResult.name}</span>
          {resultTag && <span className={cn(styles.cellTag, lastResult.status === 'known' && styles.cellTagSoft)}>{resultTag}</span>}
        </>
      ) : (
        <span className={styles.cellSoft}>Result</span>
      )}
    </div>
  )

  const renderEquation = (compact: boolean) => (
    <div className={cn(styles.equation, compact ? styles.equationCompact : styles.equationWide)} aria-hidden="true">
      {renderSlot(selectedConcepts[0], compact)}
      <span className={styles.sign}>+</span>
      {renderSlot(selectedConcepts[1], compact)}
      <span className={styles.sign}>=</span>
      {renderResult(compact)}
    </div>
  )

  // Not Go's own `unavailable`, which would wrap the button in a new element and drop keyboard focus as the pair settles
  const mixButton = (
    <span className={styles.mix}>
      <Go onClick={mixPair} loading={isCombining} aria-disabled={readyToMix || isCombining ? undefined : true} aria-describedby={`${mixReasonId}-why`}>
        Mix
      </Go>
      <span id={`${mixReasonId}-why`} className="sr-only">
        {readyToMix || isCombining ? 'Mix the two concepts on the bench' : waitingReason}
      </span>
    </span>
  )

  const clearButton = hasBench && !isCombining && (
    <QuietButton onClick={handleClearSelection}>
      <Icon name="trash" size={12} /> Clear
    </QuietButton>
  )

  const benchHint = selectedConcepts.length === 2 && !lastResult && !isCombining ? 'Press Mix to combine them.' : 'Choose two concepts to combine them.'

  return (
    <div>
      <style>{GOLD_MOMENT_CSS}</style>
      <div className={styles.lab}>
        <div className={styles.toolbar}>
          <IconStamp
            id={RESET_BUTTON_ID}
            icon="reset"
            label="Reset all discoveries"
            disabled={isCombining}
            onClick={(event) => {
              resetOpenerRef.current = event.currentTarget
              setShowResetConfirm(true)
            }}
          />
        </div>

        {letterWork !== null && (
          <LetterScene
            ref={letterHeadingRef}
            work={letterWork}
            discoveries={discoveries}
            canBeginNextWork={letterWork === 0 && canBeginNextWork}
            onBeginNextWork={beginSecondWork}
            onClose={closeLetter}
          />
        )}

        <div role="status" aria-live="polite" className="sr-only">{announcement}</div>

        <div
          className={styles.layout}
          style={{ '--bench-top': `${stickyTop + 16}px`, '--bench-room': `calc(100vh - ${stickyTop + 32}px)` } as React.CSSProperties}
        >
          <div>
            <div className={styles.panel}>
              {/* Below the wide layout the bench and the current riddle sit at the top of the concepts and stay in view while scrolling. */}
              <div className={styles.phoneBench} style={{ top: stickyTop }} data-testid="phone-bench">
                {renderEquation(true)}
                {/* A fixed height, so a result never pushes the chip the player just tapped out from under their finger. */}
                <div className={styles.benchRow}>
                  <p className={styles.benchText} aria-hidden="true">
                    {isCombining
                      ? ''
                      : resultIsGold && lastResult?.riddle
                        ? <span className={answerBeat}>Gold. It answers: <b>{lastResult.riddle}</b></span>
                        : lastResult?.description
                          ? <>&ldquo;{lastResult.description}&rdquo;</>
                          : (!hasBench || selectedConcepts.length === 2) && benchHint}
                  </p>
                  {resultIsGold && !isCombining && (
                    <QuietButton onClick={seeFreshGold} aria-label="See it on the shelf" className={styles.seeIt}>
                      See it
                    </QuietButton>
                  )}
                  {clearButton}
                  {mixButton}
                </div>
                {currentRiddle !== undefined && (
                  <p className={styles.benchRiddle} aria-hidden="true">
                    <b>{CLUE_LABELS[currentLevel]}</b> {golds[currentRiddle].riddles[currentLevel]}
                  </p>
                )}
              </div>

              <div className={styles.panelBody}>
                <div className={styles.headingRow}>
                  <h2 id="idea-lab-concepts" className={styles.heading}>Your Concepts</h2>
                  <a href="#great-work-title" onClick={skipToRiddles} className={cn('sp-link', styles.skip)}>
                    Skip to the riddles
                  </a>
                </div>
                <p id="idea-lab-concepts-help" className="sr-only">
                  Arrow keys move between concepts. Enter or Space picks one; pick two, then press Mix.
                </p>

                <div
                  role="toolbar"
                  aria-labelledby="idea-lab-concepts"
                  aria-describedby="idea-lab-concepts-help"
                  onKeyDown={moveConceptFocus}
                  className={styles.concepts}
                >
                  {concepts.map(concept => {
                    const isSelected = selectedConcepts.some(c => c.id === concept.id)
                    const gold = !concept.isBase && isGolden(concept.name, progress.work)

                    return (
                      <button
                        key={concept.id}
                        ref={element => {
                          if (!element) return
                          conceptRefs.current.set(concept.id, element)
                          return () => { conceptRefs.current.delete(concept.id) }
                        }}
                        type="button"
                        tabIndex={concept.id === activeId ? 0 : -1}
                        onClick={() => handleSelectConcept(concept)}
                        aria-disabled={isCombining}
                        className={cn(
                          styles.chip,
                          !concept.isBase && styles.chipFound,
                          gold && styles.chipGold,
                          isSelected && styles.chipChosen,
                          concept.id === newConceptId && styles.chipNew,
                          isCombining && styles.chipBusy,
                        )}
                        aria-label={concept.name}
                        aria-pressed={isSelected}
                      >
                        {isSelected && <Icon name="done" size={12} className={styles.tick} />}
                        <span aria-hidden="true">{concept.emoji}</span>
                        <span>{concept.name}</span>
                        {gold && <span className={styles.chipGoldWord} aria-hidden="true">gold</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <IdeaCabinet
              discoveries={discoveries}
              combinations={combinations}
              concepts={concepts}
              wide={wide}
            />
          </div>

          {/* In the wide layout this column keeps the bench and the riddles beside whatever concept the player is looking at. */}
          <div className={styles.side}>
            <div className={cn(styles.panel, styles.wideBench)}>
              {renderEquation(false)}
              <div className={styles.wideText} aria-hidden="true">
                {lastResult?.description && !isCombining && <p>&ldquo;{lastResult.description}&rdquo;</p>}
                {resultIsGold && lastResult?.riddle && (
                  <p className={answerBeat}>
                    <b>Gold.</b> It answers: <b>{lastResult.riddle}</b>
                  </p>
                )}
                {(!hasBench || (selectedConcepts.length === 2 && !lastResult && !isCombining)) && <p className={styles.cellSoft}>{benchHint}</p>}
              </div>
              <div className={styles.mixRow}>
                {mixButton}
                {clearButton}
              </div>
            </div>

            <div
              className={styles.shelfScroll}
              role={wide ? 'region' : undefined}
              aria-label={wide ? 'Riddles' : undefined}
              tabIndex={wide ? 0 : undefined}
              data-shelf-scroll
            >
              <GoldShelf
                ref={shelfHeadingRef}
                work={progress.work}
                hints={progress.hints}
                freshClue={freshClue}
                freshGold={freshGoldIndex >= 0 ? freshGoldIndex : null}
                reducedMotion={reducedMotion}
                found={goldFound}
                completedWorks={completedWorks}
                canBeginNextWork={canBeginNextWork}
                onReadLetter={openLetter}
                onBeginNextWork={beginSecondWork}
              />
            </div>
          </div>
        </div>
      </div>

      {showResetConfirm && (
        <NoteDialog
          title="Reset all discoveries?"
          description="This will erase all your discovered concepts, golds and letters included. Your starting concepts will remain."
          size="small"
          onClose={closeResetConfirm}
          initialFocusRef={cancelResetRef}
          returnFocusRef={resetOpenerRef}
          actions={
            <>
              <Stamp ref={cancelResetRef} onClick={closeResetConfirm}>
                Cancel
              </Stamp>
              <Stamp onClick={confirmReset} className="sp-stamp--careful">
                Reset
              </Stamp>
            </>
          }
        />
      )}
    </div>
  )
}
