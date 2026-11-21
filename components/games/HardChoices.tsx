'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { useRealtimeVotes } from '@/lib/hooks/useRealtimeVotes'

type ChoiceId = 'A' | 'B'

interface Choice {
  id: ChoiceId
  text: string
  perspective?: string
}

interface Dilemma {
  id: string
  scenario: string
  context?: string
  choiceA: Choice
  choiceB: Choice
  category?: string
}

const DILEMMAS: Dilemma[] = [
  // EXISTENTIAL & MORTALITY
  {
    id: 'mortality-awareness',
    scenario: 'If you knew the exact date of your death...',
    context: 'A reliable oracle offers to tell you when you will die',
    choiceA: {
      id: 'A',
      text: 'Learn the date and live intentionally',
      perspective: 'Knowledge is power. Knowing your timeline could help you prioritize what truly matters and avoid wasting time on the trivial.'
    },
    choiceB: {
      id: 'B',
      text: 'Remain uncertain and live freely',
      perspective: 'The beauty of life is in its unpredictability. Knowing might paralyze you with countdown anxiety rather than liberating you.'
    },
    category: 'existential'
  },
  {
    id: 'legacy-vs-experience',
    scenario: 'How would you spend your final year?',
    context: 'You have one year left to live, fully healthy',
    choiceA: {
      id: 'A',
      text: 'Create something that outlives you',
      perspective: 'Leaving a lasting impact—art, writing, a foundation—extends your influence beyond your physical existence.'
    },
    choiceB: {
      id: 'B',
      text: 'Experience everything you\'ve postponed',
      perspective: 'Life is for living, not performing. The experiences you have are yours alone, and that\'s enough.'
    },
    category: 'existential'
  },
  // ETHICS & MORALITY
  {
    id: 'trolley-personal',
    scenario: 'Would you sacrifice one to save many?',
    context: 'You can save five strangers by pushing one person in front of a train',
    choiceA: {
      id: 'A',
      text: 'Push the one person to save five',
      perspective: 'Utilitarian math: five lives saved outweighs one lost. Sometimes the hardest choices are numerically simple.'
    },
    choiceB: {
      id: 'B',
      text: 'Refuse to directly cause a death',
      perspective: 'There\'s a moral difference between letting something happen and making it happen. You didn\'t create this situation.'
    },
    category: 'ethics'
  },
  {
    id: 'lying-for-good',
    scenario: 'Is a lie ever truly kind?',
    context: 'A dying friend asks if they lived a meaningful life—but you think they wasted their potential',
    choiceA: {
      id: 'A',
      text: 'Tell them what they need to hear',
      perspective: 'Truth is contextual. Bringing peace to someone\'s final moments is a gift, not a deception.'
    },
    choiceB: {
      id: 'B',
      text: 'Be honest, gently',
      perspective: 'Even at the end, people deserve to be treated as capable of handling reality. Patronizing kindness isn\'t kindness.'
    },
    category: 'ethics'
  },
  // MEANING & PURPOSE
  {
    id: 'happiness-vs-meaning',
    scenario: 'Which would you choose for your life?',
    context: 'You can only optimize for one',
    choiceA: {
      id: 'A',
      text: 'Constant happiness, less meaning',
      perspective: 'What good is purpose if you\'re miserable? Happiness is the actual feeling of life being good.'
    },
    choiceB: {
      id: 'B',
      text: 'Deep meaning, less happiness',
      perspective: 'Meaning sustains us through suffering. A deeply meaningful life can include hardship and still be worth living.'
    },
    category: 'meaning'
  },
  {
    id: 'simulation-knowledge',
    scenario: 'If reality isn\'t what you think...',
    context: 'You discover evidence that we\'re living in a simulation',
    choiceA: {
      id: 'A',
      text: 'Accept it and keep living normally',
      perspective: 'Simulated or not, your experiences feel real. Love is still love, pain still hurts. The substrate doesn\'t matter.'
    },
    choiceB: {
      id: 'B',
      text: 'Try to find ways to "break out" or transcend',
      perspective: 'If there\'s a higher reality, shouldn\'t we strive to reach it? Comfort shouldn\'t stop us from seeking truth.'
    },
    category: 'metaphysics'
  },
  // RELATIONSHIPS & LOVE
  {
    id: 'love-or-freedom',
    scenario: 'What matters more to you?',
    context: 'Your soulmate wants to move abroad; you want to stay',
    choiceA: {
      id: 'A',
      text: 'Follow love, sacrifice your roots',
      perspective: 'People are irreplaceable; places aren\'t. Love that deep is rare and worth restructuring your life around.'
    },
    choiceB: {
      id: 'B',
      text: 'Stay true to yourself, even if alone',
      perspective: 'Losing yourself for someone else breeds resentment. The right person would find a way to make it work.'
    },
    category: 'love'
  },
  {
    id: 'forgiveness-limits',
    scenario: 'Can you forgive the unforgivable?',
    context: 'Someone who deeply betrayed you genuinely seeks your forgiveness',
    choiceA: {
      id: 'A',
      text: 'Forgive to free yourself from the weight',
      perspective: 'Holding onto anger is like drinking poison. Forgiveness is a gift to yourself, not just them.'
    },
    choiceB: {
      id: 'B',
      text: 'Some actions forfeit the right to forgiveness',
      perspective: 'Not all wounds heal. Pretending otherwise diminishes the gravity of what happened to you.'
    },
    category: 'relationships'
  },
  // ORIGINAL PRACTICAL DILEMMAS (refined)
  {
    id: 'career-passion',
    scenario: 'How do you want to spend your working life?',
    context: 'You have two paths ahead',
    choiceA: {
      id: 'A',
      text: 'Financial security doing unfulfilling work',
      perspective: 'Money buys freedom, safety, and options. You can find meaning outside the 9-5.'
    },
    choiceB: {
      id: 'B',
      text: 'Meaningful work with financial uncertainty',
      perspective: 'You spend a third of your life working. That time should feel like more than just trading hours for money.'
    },
    category: 'career'
  },
  {
    id: 'children-climate',
    scenario: 'Would you bring new life into this world?',
    context: 'Climate change and global uncertainty weigh on you',
    choiceA: {
      id: 'A',
      text: 'Yes—hope is an act of defiance',
      perspective: 'Every generation has faced existential threats. Children bring joy and might be the ones who solve our problems.'
    },
    choiceB: {
      id: 'B',
      text: 'No—it wouldn\'t be fair to them',
      perspective: 'Choosing not to create suffering is an ethical choice. There are other ways to nurture and contribute.'
    },
    category: 'ethics'
  },
  {
    id: 'memory-erasure',
    scenario: 'Would you erase your most painful memory?',
    context: 'Perfect technology exists to remove one traumatic memory forever',
    choiceA: {
      id: 'A',
      text: 'Yes—remove the source of suffering',
      perspective: 'Why carry unnecessary pain? The memory serves no purpose but to hurt you.'
    },
    choiceB: {
      id: 'B',
      text: 'No—pain is part of who I am',
      perspective: 'Our struggles shape us. Erasing the memory might erase the lessons and growth that came with it.'
    },
    category: 'identity'
  },
  {
    id: 'radical-honesty',
    scenario: 'Could you live with complete transparency?',
    context: 'Everyone can see your every thought for one week',
    choiceA: {
      id: 'A',
      text: 'Accept it—nothing to hide',
      perspective: 'Living authentically means not needing privacy for shame. This could liberate you from performing.'
    },
    choiceB: {
      id: 'B',
      text: 'Refuse—some thoughts are just noise',
      perspective: 'Not every passing thought reflects who we are. Privacy protects us from being judged by our worst impulses.'
    },
    category: 'identity'
  }
]

const ANSWERS_KEY = 'hardChoicesVotes'
const COUNTED_KEY = 'hardChoicesCounted'

type Answers = Record<string, ChoiceId>

function readStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function firstUnansweredIndex(answers: Answers): number {
  return DILEMMAS.findIndex((dilemma) => !answers[dilemma.id])
}

const CHOICE_STYLES: Record<ChoiceId, { bar: string; glow: string; pulse: string }> = {
  A: { bar: 'bg-accent', glow: 'shadow-[0_0_8px_rgba(230,57,70,0.4)]', pulse: 'text-accent font-medium' },
  B: { bar: 'bg-success', glow: 'shadow-[0_0_8px_rgba(116,198,157,0.4)]', pulse: 'text-melon-green font-medium' },
}

export default function HardChoices() {
  const [currentDilemmaIndex, setCurrentDilemmaIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [finished, setFinished] = useState(false)
  const [pulseChoice, setPulseChoice] = useState<ChoiceId | null>(null)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const moveFocusToHeading = useRef(false)
  const hasChosen = useRef(false)

  const currentDilemma = DILEMMAS[currentDilemmaIndex]
  const selectedChoice = answers[currentDilemma.id] ?? null
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

  // Cleanup pulse timeout
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
    setFinished(false)
    setCurrentDilemmaIndex(index)
    if (knownAnswers[dilemma.id] && !votes[dilemma.id]) {
      loadResults(dilemma.id)
    }
  }

  // Pick up where the player left off
  useEffect(() => {
    const stored = readStored<Answers>(ANSWERS_KEY, {})
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
    }
  }, [currentDilemmaIndex, finished])

  const handleChoice = async (choiceId: ChoiceId) => {
    if (hasVoted) return
    hasChosen.current = true

    const dilemmaId = currentDilemma.id
    const nextAnswers = { ...answers, [dilemmaId]: choiceId }
    setAnswers(nextAnswers)
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(nextAnswers))

    // A dilemma answered again after starting fresh is not counted twice.
    const counted = readStored<string[]>(COUNTED_KEY, [])
    if (counted.includes(dilemmaId)) {
      await loadResults(dilemmaId)
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
      localStorage.setItem(COUNTED_KEY, JSON.stringify([...counted, dilemmaId]))
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-3xl">
        <div className="animate-fade">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-semibold mb-3">The Dilemma</h1>
            <p className="text-foreground/60 text-base sm:text-lg">
              Life&apos;s deepest questions have no easy answers. But thinking through them makes us wiser.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-foreground/60 mb-2">
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
                <span className="text-xs uppercase tracking-wide">{currentDilemma.category}</span>
              )}
            </div>
            <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${((currentDilemmaIndex + 1) / DILEMMAS.length) * 100}%` }}
              />
            </div>
          </div>

          {finished ? (
            <div className="bg-card-bg border border-card-border rounded-lg p-6 sm:p-8 mb-6 text-center">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-xl sm:text-2xl font-medium mb-3 focus:outline-none"
              >
                You&apos;ve sat with all {DILEMMAS.length} dilemmas
              </h2>
              <p className="text-foreground/60 mb-6">
                There were no right answers, only yours. They may change with time, and that&apos;s part of it.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate(0)} variant="primary">
                  Revisit your answers
                </Button>
                <Button onClick={handleStartFresh} variant="secondary">
                  Clear my answers and start fresh
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Dilemma card */}
              <div className="bg-card-bg border border-card-border rounded-lg p-4 sm:p-8 mb-6">
                {currentDilemma.context && (
                  <p className="text-foreground/60 mb-4 text-sm uppercase tracking-wide">
                    {currentDilemma.context}
                  </p>
                )}
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-xl sm:text-2xl font-medium mb-6 sm:mb-8 focus:outline-none"
                >
                  {currentDilemma.scenario}
                </h2>

                {/* Choices */}
                <div className="space-y-4">
                  {choices.map(({ id, choice }) => (
                    <button
                      key={id}
                      onClick={() => handleChoice(id)}
                      aria-disabled={hasVoted}
                      className={`
                        w-full text-left p-4 sm:p-6 rounded-lg border-2 transition-all
                        focus:outline-none focus:ring-2 focus:ring-accent
                        ${hasVoted ? 'cursor-default' : 'hover:border-accent hover:bg-accent/5 cursor-pointer'}
                        ${selectedChoice === id ? 'border-accent bg-accent/5' : 'border-foreground/10'}
                      `}
                      aria-label={`Choice ${id}: ${choice.text}`}
                      aria-pressed={selectedChoice === id}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`
                          flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold
                          ${selectedChoice === id
                            ? 'border-accent bg-accent text-white'
                            : 'border-foreground/20 text-foreground/60'
                          }
                        `}>
                          {id}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-lg mb-2">
                            {choice.text}
                            {selectedChoice === id && (
                              <span className="ml-2 text-xs uppercase tracking-wide text-foreground/60">Your choice</span>
                            )}
                          </p>
                          {showResults && choice.perspective && (
                            <p className="text-sm text-foreground/60 mb-3 italic">
                              {choice.perspective}
                            </p>
                          )}
                          {showResults && displayResults && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-foreground/60">
                                  {percentages[id]}% chose this
                                </span>
                                <span
                                  className={`transition-colors duration-300 ${
                                    pulseChoice === id ? CHOICE_STYLES[id].pulse : 'text-foreground/60'
                                  }`}
                                >
                                  {counts[id]} {counts[id] === 1 ? 'vote' : 'votes'}
                                </span>
                              </div>
                              <div className="h-2 bg-foreground/5 rounded-full overflow-hidden">
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
                      </div>
                    </button>
                  ))}
                </div>

                <div role="status">

                  {/* Results message - deeper reflection */}
                  {showResults && (
                    <div className="mt-6 p-5 bg-gradient-to-br from-accent/5 to-transparent border border-accent/10 rounded-lg">
                      <p className="sr-only">
                        You chose {selectedChoice}.
                        {displayResults && ` ${percentages.A}% chose A, ${percentages.B}% chose B.`}
                      </p>
                      {displayResults && (
                        <p className="text-sm text-foreground/80 text-center leading-relaxed mb-2">
                          {percentages.A > 60 || percentages.B > 60 ? (
                            <>
                              <span className="font-medium">Interesting.</span> Most people lean one way here—but the minority perspective often holds wisdom worth considering.
                            </>
                          ) : (
                            <>
                              <span className="font-medium">A true dilemma.</span> Humanity is genuinely split on this one. That&apos;s what makes it worth thinking about.
                            </>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-foreground/60 text-center italic">
                        Your answer reveals something about your values. Neither choice is wrong.
                      </p>
                    </div>
                  )}
                </div>
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
                {showResults && (
                  <Button
                    onClick={handleNext}
                    variant="primary"
                    className="flex-1 py-4"
                  >
                    {currentDilemmaIndex === DILEMMAS.length - 1 ? 'Finish' : 'Next Dilemma'}
                  </Button>
                )}
              </div>

              {/* Instructions */}
              {!hasVoted && (
                <div className="mt-8 text-center text-sm text-foreground/60">
                  <p>Choose the option that resonates with you. There&apos;s no judgment—just reflection.</p>
                </div>
              )}
            </>
          )}

          {/* Back Home Button */}
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
