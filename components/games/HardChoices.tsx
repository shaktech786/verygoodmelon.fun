'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRealtimeVotes } from '@/lib/hooks/useRealtimeVotes'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { DILEMMAS, type Choice, type ChoiceId } from '@/lib/games/hard-choices/dilemmas'
import { keepKnownAnswers, keepKnownIds, type Answer, type Answers } from '@/lib/games/hard-choices/answers'
import { groupChoices, readChoices } from '@/lib/games/hard-choices/reading'

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
  const raw = readStored(ANSWERS_KEY)
  const answers = keepKnownAnswers(raw)
  if (raw !== null && JSON.stringify(raw) !== JSON.stringify(answers)) store(ANSWERS_KEY, answers)
  const rawCounted = readStored(COUNTED_KEY)
  const counted = keepKnownIds(rawCounted)
  if (rawCounted !== null && JSON.stringify(rawCounted) !== JSON.stringify(counted)) store(COUNTED_KEY, counted)
  return answers
}

function firstUnansweredIndex(answers: Answers): number {
  return DILEMMAS.findIndex((dilemma) => !answers[dilemma.id])
}

const isChoice = (answer: Answer | undefined): answer is ChoiceId => answer === 'A' || answer === 'B'

/** How the player's answer sits among everyone's, without ranking anyone. */
function crowdLine(ownPercent: number): string {
  if (ownPercent >= LEANING_PERCENT) return 'Most people chose this too.'
  if (ownPercent <= 100 - LEANING_PERCENT) return `Fewer people chose this: ${ownPercent}% did. You are in thoughtful company.`
  return 'People are almost evenly split on this one.'
}

const CHOICE_STYLES: Record<ChoiceId, { bar: string; glow: string; pulse: string }> = {
  A: { bar: 'bg-accent', glow: 'shadow-[0_0_8px_rgba(230,57,70,0.4)]', pulse: 'text-accent font-medium' },
  B: { bar: 'bg-success', glow: 'shadow-[0_0_8px_rgba(116,198,157,0.4)]', pulse: 'text-melon-green font-medium' },
}

function Portrait({ answers, onRevisit }: { answers: Answers; onRevisit: (index: number) => void }) {
  const chosen = DILEMMAS.flatMap((dilemma, index) => {
    const answer = answers[dilemma.id]
    if (!isChoice(answer)) return []
    const choice = answer === 'A' ? dilemma.choiceA : dilemma.choiceB
    return [{ dilemma, index, choice }]
  })
  const passed = DILEMMAS.length - chosen.length
  const reading = readChoices(chosen.map(({ choice }) => choice))
  const groups = groupChoices(chosen.map(({ choice }) => choice))

  return (
    <div className="space-y-5 text-left">
      {chosen.length > 0 ? (
        <>
          <p className="text-foreground/80 text-center">Across these questions, this is what you reached for:</p>
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.title} className="text-center">
                <p className="text-sm font-semibold text-foreground/80 mb-1.5" aria-hidden="true">{group.title}</p>
                <ul className="flex flex-wrap justify-center gap-2" aria-label={group.title}>
                  {group.values.map((value) => (
                    <li
                      key={value}
                      className="rounded-full border border-card-border bg-background px-3 py-1 text-sm sm:text-base text-foreground"
                    >
                      {value}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <section aria-labelledby="reading-heading" className="rounded-lg bg-background border border-card-border px-4 py-4 sm:px-6 space-y-2">
            <h3 id="reading-heading" className="text-sm font-semibold text-foreground/80 text-center">
              A reading
            </h3>
            {reading.map((line) => (
              <p key={line} className="text-foreground leading-relaxed text-center">{line}</p>
            ))}
          </section>
        </>
      ) : (
        <p className="text-foreground/80 text-center">You let every question pass today. Some days are like that.</p>
      )}

      {passed > 0 && chosen.length > 0 && (
        <p className="text-sm text-primary-light text-center">
          You let {passed === 1 ? 'one question' : `${passed} questions`} pass. That is allowed too.
        </p>
      )}

      <p className="text-foreground/85 text-center leading-relaxed">
        None of this is a verdict on who you are. It is what mattered to you today, and it is allowed to change.
      </p>
      <p className="text-sm text-primary-light text-center">
        Revisit any answer and the reading changes with it. The same questions often land differently on another day.
      </p>

      <details className="rounded-lg border border-card-border bg-background">
        <summary className="cursor-pointer select-none px-4 py-3 font-medium text-foreground rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          See or change each answer
        </summary>
        <ol className="divide-y divide-card-border">
          {DILEMMAS.map((dilemma, index) => {
            const answer = answers[dilemma.id]
            const choice: Choice | null = isChoice(answer) ? (answer === 'A' ? dilemma.choiceA : dilemma.choiceB) : null
            return (
              <li key={dilemma.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-primary-light">{dilemma.scenario}</p>
                  <p className="text-foreground">
                    {choice ? <><span className="font-medium">{choice.value}</span>: {choice.text}</> : 'Let it pass'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRevisit(index)}
                  aria-label={`Revisit: ${dilemma.scenario}`}
                  className="shrink-0 text-sm text-foreground underline underline-offset-4 rounded px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Revisit
                </button>
              </li>
            )
          })}
        </ol>
      </details>
    </div>
  )
}

export default function HardChoices() {
  const [currentDilemmaIndex, setCurrentDilemmaIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [finished, setFinished] = useState(false)
  const [pulseChoice, setPulseChoice] = useState<ChoiceId | null>(null)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstChoiceRef = useRef<HTMLButtonElement>(null)
  const moveFocusToHeading = useRef(false)
  const moveFocusToChoices = useRef(false)
  const hasChosen = useRef(false)
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

  // Trigger pulse animation when a realtime update arrives for the current dilemma
  useEffect(() => {
    const update = recentlyUpdated[currentDilemma.id]
    if (update && showResults) {
      setPulseChoice(update)
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
      pulseTimeoutRef.current = setTimeout(() => {
        setPulseChoice(null)
      }, 600)
      clearUpdated(currentDilemma.id)
    }
  }, [recentlyUpdated, currentDilemma.id, showResults, clearUpdated])

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    }
  }, [])

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
  useEffect(() => {
    const stored = loadAnswers()
    const resumeIndex = firstUnansweredIndex(stored)
    setAnswers((current) => ({ ...stored, ...current }))
    // A choice made while the page was still hydrating keeps the player where they are
    if (hasChosen.current) return
    if (resumeIndex === -1) {
      setCurrentDilemmaIndex(DILEMMAS.length - 1)
      setFinished(true)
    } else {
      setCurrentDilemmaIndex(resumeIndex)
    }
  }, [])

  // Keep keyboard and screen-reader users oriented when the card changes
  useEffect(() => {
    if (moveFocusToHeading.current) {
      moveFocusToHeading.current = false
      headingRef.current?.focus()
    } else if (moveFocusToChoices.current) {
      moveFocusToChoices.current = false
      firstChoiceRef.current?.focus()
    }
  }, [currentDilemmaIndex, finished, hasVoted])

  // On a phone the result and Next sit below the fold; bring them up rather than leave the player hunting.
  // Again once the counts arrive, since their bars push Next further down.
  useEffect(() => {
    const end = resultEndRef.current
    if (!hasVoted || !revealResult.current || !end) return
    // The way on matters more than the question just answered, so Next always comes into view
    const top = window.scrollY + end.getBoundingClientRect().bottom + 16 - window.innerHeight
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
    hasChosen.current = true
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
    hasChosen.current = true
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
  const answeredCount = Object.keys(answers).filter((id) => DILEMMAS.some((d) => d.id === id)).length

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-3xl">
        <div className="animate-fade">
          <div className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-semibold mb-3">The Dilemma</h1>
            <p className="text-foreground/75 text-base sm:text-lg max-w-2xl mx-auto">
              Twelve everyday questions with no right answer. Choose, skip or change your mind, and at the end see what you chose to protect.
            </p>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-foreground/70 mb-2">
              <div className="flex items-center gap-2">
                <span>
                  {finished
                    ? `All ${DILEMMAS.length} dilemmas`
                    : `Dilemma ${currentDilemmaIndex + 1} of ${DILEMMAS.length}`}
                </span>
                {isRealtimeConnected && showResults && !finished && (
                  <span className="inline-flex items-center gap-1 text-xs">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
                    Live
                    <span className="sr-only"> updates active</span>
                  </span>
                )}
              </div>
              {!finished && (
                <span className="text-xs">{currentDilemma.category}</span>
              )}
            </div>
            <div className="h-1 bg-foreground/10 rounded-full overflow-hidden" aria-hidden="true">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${(finished ? 1 : answeredCount / DILEMMAS.length) * 100}%` }}
              />
            </div>
          </div>

          {finished ? (
            <div className="bg-card-bg border border-card-border rounded-lg p-5 sm:p-8 mb-6">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-xl sm:text-2xl font-medium mb-4 text-center focus:outline-none focus-visible:shadow-none!"
              >
                What you chose to protect
              </h2>
              <Portrait answers={answers} onRevisit={navigate} />
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate(0)} variant="secondary">
                  Look back from the start
                </Button>
                <Button onClick={handleStartFresh} variant="ghost">
                  Clear my answers and start fresh
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-card-bg border border-card-border rounded-lg p-4 sm:p-8 mb-6">
                <p className="text-foreground/70 mb-3 text-sm sm:text-base">{currentDilemma.context}</p>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-xl sm:text-2xl font-medium mb-6 sm:mb-8 focus:outline-none focus-visible:shadow-none!"
                >
                  {currentDilemma.scenario}
                </h2>

                <ul className="space-y-4" aria-label="The two answers">
                  {choices.map(({ id, choice }, index) => {
                    const selected = selectedChoice === id
                    const perspectiveId = `perspective-${id}`
                    return (
                      <li
                        key={id}
                        className={`rounded-lg border-2 transition-colors ${
                          selected ? 'border-melon-green bg-success/10' : 'border-foreground/15'
                        } ${hasVoted ? '' : 'hover:border-foreground/40 hover:bg-hover-bg'}`}
                      >
                        <button
                          ref={index === 0 ? firstChoiceRef : undefined}
                          onClick={() => handleChoice(id)}
                          aria-disabled={hasVoted}
                          aria-label={`Choice ${id}: ${choice.text}`}
                          aria-pressed={selected}
                          aria-describedby={showResults ? perspectiveId : undefined}
                          className={`w-full text-left p-4 sm:p-6 rounded-lg flex items-start gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                            hasVoted ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold ${
                              selected ? 'border-melon-green bg-melon-green text-background' : 'border-foreground/25 text-foreground/75'
                            }`}
                          >
                            {selected ? <Check size={18} strokeWidth={3} /> : id}
                          </span>
                          <span className="flex-1 pt-0.5 text-lg">
                            {choice.text}
                            {selected && (
                              <span className="block mt-1 text-sm font-medium text-foreground/80">Your choice</span>
                            )}
                          </span>
                        </button>
                        {showResults && (
                          <div className="px-4 pb-4 sm:px-6 sm:pb-6 pl-16 sm:pl-[4.5rem] -mt-1 sm:-mt-2">
                            <p id={perspectiveId} className="text-foreground/80 italic leading-relaxed">
                              {choice.perspective}
                            </p>
                            {displayResults && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-foreground/75">
                                    {percentages[id]}% chose this
                                  </span>
                                  <span
                                    className={`transition-colors duration-300 ${
                                      pulseChoice === id ? CHOICE_STYLES[id].pulse : 'text-foreground/75'
                                    }`}
                                  >
                                    {counts[id]} {counts[id] === 1 ? 'vote' : 'votes'}
                                  </span>
                                </div>
                                <div className="h-2 bg-foreground/5 rounded-full overflow-hidden" aria-hidden="true">
                                  <div
                                    className={`h-full transition-all duration-300 ${CHOICE_STYLES[id].bar} ${
                                      pulseChoice === id ? CHOICE_STYLES[id].glow : ''
                                    }`}
                                    style={{ width: `${percentages[id]}%` }}
                                  />
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
                    <div className="mt-6 p-5 bg-background border border-card-border rounded-lg text-center">
                      <p className="text-sm text-foreground/75 mb-2">
                        You chose <span className="font-medium text-foreground">{currentDilemma[selectedChoice === 'A' ? 'choiceA' : 'choiceB'].value}</span>.
                        {displayResults && <span> {crowdLine(percentages[selectedChoice])}</span>}
                      </p>
                      <p className="text-foreground/90 leading-relaxed">{currentDilemma.carry}</p>
                    </div>
                  )}
                </div>

                {currentAnswer === 'skip' && (
                  <p className="mt-6 text-sm text-foreground/70 text-center">
                    You let this one pass earlier. You can answer it now, or keep moving.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                {currentDilemmaIndex > 0 && (
                  <Button
                    onClick={() => navigate(currentDilemmaIndex - 1)}
                    variant="secondary"
                    className="py-4"
                  >
                    Previous
                  </Button>
                )}
                {(showResults || currentAnswer === 'skip') && (
                  <Button
                    onClick={handleNext}
                    variant="primary"
                    className="flex-1 py-4"
                  >
                    {currentDilemmaIndex === DILEMMAS.length - 1 ? 'Finish' : 'Next Dilemma'}
                  </Button>
                )}
              </div>
              <div ref={resultEndRef} className="scroll-mb-4" aria-hidden="true" />

              <div className="mt-6 text-center text-sm text-foreground/70">
                {hasVoted ? (
                  <Button variant="ghost" size="sm" onClick={handleChangeAnswer}>
                    Change my answer
                  </Button>
                ) : (
                  <>
                    <p>Choose the option that feels truer to you. There is no judgment, only reflection.</p>
                    {currentAnswer !== 'skip' && (
                      <Button variant="ghost" size="sm" className="mt-2" onClick={handleSkip}>
                        Let this one pass
                      </Button>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-block px-4 py-2 sm:px-6 sm:py-3 bg-card-bg text-foreground border border-card-border rounded-lg font-medium hover:bg-hover-bg transition-colors text-sm sm:text-base"
            >
              ← Back Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
