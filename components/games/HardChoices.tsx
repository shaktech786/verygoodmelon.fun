'use client'

import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { Go } from '@/components/seedpress/Go'
import { Stamp } from '@/components/seedpress/Stamp'
import { QuietButton } from '@/components/seedpress/QuietButton'
import { StickyTray } from '@/components/seedpress/StickyTray'
import { cn } from '@/lib/utils/cn'
import { keptValues } from '@/lib/games/hard-choices/reading'
import styles from './HardChoices.module.css'
import { useRealtimeVotes } from '@/lib/hooks/useRealtimeVotes'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useLoadedOnClient } from '@/lib/hooks/useLoadedOnClient'
import { DILEMMAS, type Choice, type ChoiceId } from '@/lib/games/hard-choices/dilemmas'
import { keepKnownAnswers, keepKnownIds, type Answer, type Answers } from '@/lib/games/hard-choices/answers'
import { dilemmaConstellation, dilemmaKeepsake } from '@/lib/keepsake/dilemma'
import { Keepsake } from './Keepsake'
import { Icon } from '@/components/seedpress/icons/Icon'

const ANSWERS_KEY = 'hardChoicesVotes'
const COUNTED_KEY = 'hardChoicesCounted'
const LEANING_PERCENT = 60

function readStored(key: string): unknown {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private browsing: answers last for this visit only
  }
}

/** Saved answers, minus any left over from dilemmas that have since been retired. */
function loadAnswers(): Answers {
  return keepKnownAnswers(readStored(ANSWERS_KEY))
}

/** Drops answers and counted votes for dilemmas that no longer exist, so storage stops carrying them. */
function forgetRetiredDilemmas(): void {
  const raw = readStored(ANSWERS_KEY)
  const answers = keepKnownAnswers(raw)
  if (raw !== null && JSON.stringify(raw) !== JSON.stringify(answers)) store(ANSWERS_KEY, answers)
  const rawCounted = readStored(COUNTED_KEY)
  const counted = keepKnownIds(rawCounted)
  if (rawCounted !== null && JSON.stringify(rawCounted) !== JSON.stringify(counted)) store(COUNTED_KEY, counted)
}

function firstUnansweredIndex(answers: Answers): number {
  return DILEMMAS.findIndex((dilemma) => !answers[dilemma.id])
}

const QUESTION_GAP_PX = 8

/** Where the sticky site header ends; content above this line is hidden behind it. */
function headerBottom(): number {
  return Math.max(0, document.querySelector('header[role="banner"]')?.getBoundingClientRect().bottom ?? 0)
}

const isChoice = (answer: Answer | undefined): answer is ChoiceId => answer === 'A' || answer === 'B'

/** How the player's answer sits among everyone's, without ranking anyone. */
function crowdLine(ownPercent: number): string {
  if (ownPercent >= LEANING_PERCENT) return 'Most people chose this too.'
  if (ownPercent <= 100 - LEANING_PERCENT) return `Fewer people chose this: ${ownPercent}% did. You are in thoughtful company.`
  return 'People are almost evenly split on this one.'
}

function Portrait({ answers, onRevisit }: { answers: Answers; onRevisit: (index: number) => void }) {
  const chosen = useMemo(
    () => DILEMMAS.flatMap((dilemma) => {
      const answer = answers[dilemma.id]
      if (!isChoice(answer)) return []
      return [answer === 'A' ? dilemma.choiceA : dilemma.choiceB]
    }),
    [answers],
  )
  const passed = DILEMMAS.length - chosen.length
  const [day] = useState(() => new Date())
  const plan = useMemo(() => dilemmaKeepsake({ chosen, day }), [chosen, day])
  const clusters = useMemo(() => dilemmaConstellation(chosen), [chosen])
  const kept = useMemo(() => keptValues(chosen), [chosen])

  return (
    <div className="grid gap-5 text-left">
      {/* The reading is in the print itself (and its description); here its few values print first as stamps, one after the other. */}
      <div className={styles.reading}>
        {kept.length > 0 && (
          <ul className={styles.values} aria-label="What you reached for">
            {kept.map((value, index) => (
              <li key={value} className={styles.value} style={{ '--n': index } as CSSProperties}>
                {value}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Keepsake plan={plan} label="Tonight's sky of what you reached for" hideLabel />

      {/* The chart's own labels shrink to a few pixels on a phone, so the same names are written out here; the picture's description already reads them */}
      {clusters.length > 0 && (
        <dl data-testid="sky-legend" aria-hidden="true" className={styles.legend}>
          {clusters.map((cluster) => (
            <div key={cluster.theme}>
              <dt>{cluster.title}</dt>
              <dd>{cluster.stars.map((star) => star.value).join(', ')}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className={styles.kind}>
        {chosen.length > 0 && passed > 0 && `You let ${passed === 1 ? 'one question' : `${passed} questions`} pass, and that is allowed too. `}
        None of this is a verdict on who you are. It is what mattered to you today, and it is allowed to change.
      </p>

      <details className={styles.review}>
        <summary>See or change each answer</summary>
        <ol className={styles.reviewList}>
          {DILEMMAS.map((dilemma, index) => {
            const answer = answers[dilemma.id]
            const choice: Choice | null = isChoice(answer) ? (answer === 'A' ? dilemma.choiceA : dilemma.choiceB) : null
            return (
              <li key={dilemma.id} className={styles.reviewRow}>
                <div className="min-w-0">
                  <p className={styles.reviewScenario}>{dilemma.scenario}</p>
                  <p className={styles.reviewChoice}>
                    {choice ? <><strong>{choice.value}</strong>: {choice.text}</> : 'Let it pass'}
                  </p>
                </div>
                <QuietButton onClick={() => onRevisit(index)} aria-label={`Revisit: ${dilemma.scenario}`}>
                  Revisit
                </QuietButton>
              </li>
            )
          })}
        </ol>
      </details>
    </div>
  )
}

/** Where the player is in the set, in words, so no card counts dilemmas at them. */
function dilemmaInWords(index: number, total: number): string {
  if (index === total - 1) return 'The last one'
  if (index < 2) return 'Near the start'
  if (index >= total - 4) return 'Nearly there'
  return 'Partway through'
}

export default function HardChoices() {
  const [currentDilemmaIndex, setCurrentDilemmaIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [finished, setFinished] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstChoiceRef = useRef<HTMLButtonElement>(null)
  const moveFocusToHeading = useRef(false)
  const moveFocusToChoices = useRef(false)
  const resumedAtEnd = useRef(false)
  const [hasChosen, setHasChosen] = useState(false)
  const revealResult = useRef(false)
  const resultEndRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  const currentDilemma = DILEMMAS[currentDilemmaIndex]
  const currentAnswer = answers[currentDilemma.id]
  const selectedChoice = isChoice(currentAnswer) ? currentAnswer : null
  const hasVoted = selectedChoice !== null
  // Perspectives never wait on the crowd counts, which arrive (or not) on their own
  const showResults = hasVoted

  const {
    votes,
    isConnected: isRealtimeConnected,
    recentlyUpdated,
    clearUpdated,
    seedVotes,
    expectOwnVote,
    cancelOwnVote,
  } = useRealtimeVotes(showResults && !finished ? currentDilemma.id : null)

  const displayResults = votes[currentDilemma.id] ?? null

  // A realtime update for the current dilemma pulses its choice briefly, then is cleared
  const pulseChoice = showResults ? recentlyUpdated[currentDilemma.id] ?? null : null
  useEffect(() => {
    if (!pulseChoice) return
    const timer = setTimeout(() => clearUpdated(currentDilemma.id), 600)
    return () => clearTimeout(timer)
  }, [recentlyUpdated, pulseChoice, currentDilemma.id, clearUpdated])

  // Leaving a dilemma mid-pulse forgets the pulse, so revisiting it never shows a vote as just arrived
  useEffect(() => {
    const id = currentDilemma.id
    return () => clearUpdated(id)
  }, [currentDilemma.id, clearUpdated])

  // The reflection never depends on the crowd counts: if they can't be
  // reached, the choice and both perspectives are still shown without them.
  const loadResults = async (dilemmaId: string) => {
    try {
      const response = await fetch(`/api/hard-choices/votes?dilemmaId=${dilemmaId}`)
      if (response.ok) {
        const data = await response.json()
        seedVotes(dilemmaId, data.choiceA, data.choiceB)
      }
    } catch {
      // Shown without crowd counts
    }
  }

  const showDilemma = (index: number, knownAnswers: Answers) => {
    const dilemma = DILEMMAS[index]
    revealResult.current = false
    setFinished(false)
    setCurrentDilemmaIndex(index)
    if (isChoice(knownAnswers[dilemma.id]) && !votes[dilemma.id]) {
      loadResults(dilemma.id)
    }
  }

  // Pick up where the player left off
  const stored = useLoadedOnClient(loadAnswers)
  const [resumedFrom, setResumedFrom] = useState<typeof stored>(null)
  if (stored && stored !== resumedFrom) {
    setResumedFrom(stored)
    setAnswers((current) => ({ ...stored, ...current }))
    // A choice made while the page was still hydrating keeps the player where they are
    if (!hasChosen) {
      const resumeIndex = firstUnansweredIndex(stored)
      if (resumeIndex === -1) {
        // Returning to a finished game opens on the ending itself, not the intro above it
        setCurrentDilemmaIndex(DILEMMAS.length - 1)
        setFinished(true)
      } else {
        setCurrentDilemmaIndex(resumeIndex)
      }
    }
  }

  useEffect(() => {
    if (stored) forgetRetiredDilemmas()
  }, [stored])

  useEffect(() => {
    if (stored && !hasChosen && firstUnansweredIndex(stored) === -1) resumedAtEnd.current = true
  }, [stored, hasChosen])

  // Keep keyboard and screen-reader users oriented when the card changes, and land every new card the same way:
  // its top just below the site header
  useEffect(() => {
    if (moveFocusToHeading.current || (finished && resumedAtEnd.current)) {
      moveFocusToHeading.current = false
      resumedAtEnd.current = false
      const heading = headingRef.current
      if (!heading) return
      heading.focus({ preventScroll: true })
      const card = heading.parentElement ?? heading
      window.scrollTo({ top: window.scrollY + card.getBoundingClientRect().top - headerBottom() - QUESTION_GAP_PX, behavior: 'auto' })
    } else if (moveFocusToChoices.current) {
      moveFocusToChoices.current = false
      firstChoiceRef.current?.focus()
    }
  }, [currentDilemmaIndex, finished, hasVoted])

  // On a phone the result sits below the fold; bring it up rather than leave the player hunting, but never
  // so far that the question slides under the header. Next stays reachable in the bar pinned to the bottom.
  // Again once the counts arrive, since their bars make the result taller.
  useEffect(() => {
    const end = resultEndRef.current
    const question = headingRef.current
    if (!hasVoted || !revealResult.current || !end || !question) return
    const wanted = window.scrollY + end.getBoundingClientRect().bottom + 16 - window.innerHeight
    const ceiling = window.scrollY + question.getBoundingClientRect().top - headerBottom() - QUESTION_GAP_PX
    const top = Math.min(wanted, ceiling)
    if (top > window.scrollY) window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [hasVoted, displayResults, reduceMotion])

  const recordAnswer = (dilemmaId: string, answer: Answer | null) => {
    const next = { ...answers }
    if (answer) next[dilemmaId] = answer
    else delete next[dilemmaId]
    setAnswers(next)
    store(ANSWERS_KEY, next)
    return next
  }

  const handleChoice = async (choiceId: ChoiceId) => {
    if (hasVoted) return
    setHasChosen(true)
    revealResult.current = true

    const dilemmaId = currentDilemma.id
    recordAnswer(dilemmaId, choiceId)

    // A dilemma answered again (changed, or after starting fresh) is not counted twice.
    const counted = keepKnownIds(readStored(COUNTED_KEY))
    if (counted.includes(dilemmaId)) {
      if (!votes[dilemmaId]) await loadResults(dilemmaId)
      return
    }

    expectOwnVote(dilemmaId, choiceId)
    try {
      const response = await fetch('/api/hard-choices/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dilemmaId, choice: choiceId })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit vote: ${response.status}`)
      }
      const data = await response.json()
      seedVotes(dilemmaId, data.results.choiceA, data.results.choiceB)
      store(COUNTED_KEY, [...counted, dilemmaId])
    } catch {
      cancelOwnVote(dilemmaId, choiceId)
    }
  }

  const navigate = (index: number) => {
    moveFocusToHeading.current = true
    showDilemma(index, answers)
  }

  const handleNext = () => {
    if (currentDilemmaIndex === DILEMMAS.length - 1) {
      moveFocusToHeading.current = true
      setFinished(true)
    } else {
      navigate(currentDilemmaIndex + 1)
    }
  }

  const handleSkip = () => {
    setHasChosen(true)
    recordAnswer(currentDilemma.id, 'skip')
    handleNext()
  }

  const handleChangeAnswer = () => {
    revealResult.current = false
    moveFocusToChoices.current = true
    recordAnswer(currentDilemma.id, null)
  }

  const handleStartFresh = () => {
    localStorage.removeItem(ANSWERS_KEY)
    setAnswers({})
    moveFocusToHeading.current = true
    showDilemma(0, {})
  }

  const percentA = (() => {
    if (!displayResults) return 0
    const total = displayResults.choiceA + displayResults.choiceB
    return total === 0 ? 50 : Math.round((displayResults.choiceA / total) * 100)
  })()
  const percentages: Record<ChoiceId, number> = { A: percentA, B: 100 - percentA }
  const counts: Record<ChoiceId, number> = {
    A: displayResults?.choiceA ?? 0,
    B: displayResults?.choiceB ?? 0,
  }
  const choices: Array<{ id: ChoiceId; choice: Choice }> = [
    { id: 'A', choice: currentDilemma.choiceA },
    { id: 'B', choice: currentDilemma.choiceB },
  ]

  return (
    <div className={styles.wrap}>
      <div>
        <div className={styles.head}>
          <div className={styles.place}>
            <span data-dilemma-at={finished ? 'end' : currentDilemmaIndex + 1}>
              {finished ? 'The whole set' : dilemmaInWords(currentDilemmaIndex, DILEMMAS.length)}
            </span>
            {isRealtimeConnected && showResults && !finished && (
              <span className={styles.live}>
                <span className={styles.liveDot} aria-hidden="true" />
                Live
                <span className="sr-only"> updates active</span>
              </span>
            )}
          </div>
          {!finished && <span>{currentDilemma.category}</span>}
        </div>
        {/* Twelve seed marks: where you are, never how many. The question itself is named in the heading below. */}
        <ul className={styles.seeds} aria-hidden="true">
          {DILEMMAS.map((dilemma, index) => (
            <li
              key={dilemma.id}
              className={cn(styles.seed, (finished || answers[dilemma.id]) && styles.seedDone, !finished && index === currentDilemmaIndex && styles.seedHere)}
            />
          ))}
        </ul>

        {finished ? (
          <div className={cn(styles.sheet, styles.card)}>
            <h2 ref={headingRef} tabIndex={-1} className={styles.ending}>
              What you chose to protect
            </h2>
            <Portrait answers={answers} onRevisit={navigate} />
            <div className={styles.endActions}>
              <Stamp onClick={() => navigate(0)}>Look back from the start</Stamp>
              <QuietButton onClick={handleStartFresh}>Clear my answers and start fresh</QuietButton>
            </div>
          </div>
        ) : (
          <>
            <div className={cn(styles.sheet, styles.card)}>
              <p className={styles.context}>{currentDilemma.context}</p>
              <h2 ref={headingRef} tabIndex={-1} className={styles.scenario}>
                {currentDilemma.scenario}
              </h2>

              <ul className={styles.answers} aria-label="The two answers">
                {choices.map(({ id, choice }, index) => {
                  const selected = selectedChoice === id
                  const perspectiveId = `perspective-${id}`
                  return (
                    <li key={id} className={cn(styles.answer, selected && styles.answerChosen, !hasVoted && styles.answerOpen)}>
                      <button
                        ref={index === 0 ? firstChoiceRef : undefined}
                        onClick={() => handleChoice(id)}
                        aria-disabled={hasVoted}
                        aria-label={`Choice ${id}: ${choice.text}`}
                        aria-pressed={selected}
                        aria-describedby={showResults ? perspectiveId : undefined}
                        className={cn(styles.pick, hasVoted && styles.pickDone)}
                      >
                        <span aria-hidden="true" className={cn(styles.letter, selected && styles.letterChosen)}>
                          {selected ? <Icon name="done" size={12} /> : id}
                        </span>
                        <span className={styles.pickText}>
                          {choice.text}
                          {selected && <span className={styles.chosenWord}>Your choice</span>}
                        </span>
                      </button>
                      {showResults && (
                        <div className={styles.after}>
                          <p id={perspectiveId} className={styles.perspective}>
                            {choice.perspective}
                          </p>
                          {displayResults && (
                            <div className={styles.crowd}>
                              <div className={styles.crowdLine}>
                                <span>{percentages[id]}% chose this</span>
                                <span className={pulseChoice === id ? styles.crowdStrong : undefined}>
                                  {counts[id]} {counts[id] === 1 ? 'vote' : 'votes'}
                                </span>
                              </div>
                              <div className={styles.track} aria-hidden="true">
                                <div className={cn(styles.bar, selected && styles.barMine)} style={{ width: `${percentages[id]}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>

              {/* Not atomic: counts arriving later are read alone, not with the whole result again.
                  The perspectives are on screen and describe each choice, so they are not read out here. */}
              <div role="status" aria-atomic="false">
                {showResults && selectedChoice && (
                  <div className={styles.result}>
                    <p className={styles.resultLine}>
                      You chose <strong>{currentDilemma[selectedChoice === 'A' ? 'choiceA' : 'choiceB'].value}</strong>.
                      {displayResults && <span> {crowdLine(percentages[selectedChoice])}</span>}
                    </p>
                    <p>{currentDilemma.carry}</p>
                  </div>
                )}
              </div>

              {currentAnswer === 'skip' && (
                <p className={styles.passed}>
                  You let this one pass earlier. You can answer it now, or keep moving.
                </p>
              )}
            </div>

            <StickyTray pinned={showResults || currentAnswer === 'skip'} className="flex flex-wrap items-center gap-3">
              {currentDilemmaIndex > 0 && <Stamp onClick={() => navigate(currentDilemmaIndex - 1)}>Previous</Stamp>}
              {(showResults || currentAnswer === 'skip') && (
                <Go onClick={handleNext} onward className="flex-1">
                  {currentDilemmaIndex === DILEMMAS.length - 1 ? 'Finish' : 'Next Dilemma'}
                </Go>
              )}
            </StickyTray>
            <div ref={resultEndRef} className="scroll-mb-4" aria-hidden="true" />

            <div className={styles.below}>
              {hasVoted ? (
                <QuietButton onClick={handleChangeAnswer}>Change my answer</QuietButton>
              ) : (
                <>
                  <p>Choose the option that feels truer to you. There is no judgment, only reflection.</p>
                  {currentAnswer !== 'skip' && <QuietButton onClick={handleSkip}>Let this one pass</QuietButton>}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
