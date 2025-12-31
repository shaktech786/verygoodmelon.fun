'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'

interface Choice {
  id: string
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

interface VoteResults {
  choiceA: number
  choiceB: number
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

export default function HardChoices() {
  const [currentDilemmaIndex, setCurrentDilemmaIndex] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [voteResults, setVoteResults] = useState<VoteResults | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const currentDilemma = DILEMMAS[currentDilemmaIndex]

  useEffect(() => {
    const checkVoteStatus = async () => {
      // Check if user has already voted on this dilemma
      const votedDilemmas = JSON.parse(localStorage.getItem('hardChoicesVotes') || '{}')
      if (votedDilemmas[currentDilemma.id]) {
        setHasVoted(true)
        setSelectedChoice(votedDilemmas[currentDilemma.id])
        await loadResults()
      } else {
        setHasVoted(false)
        setSelectedChoice(null)
        setShowResults(false)
        setVoteResults(null)
      }
    }
    checkVoteStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDilemmaIndex, currentDilemma.id]) // loadResults is stable, doesn't need to be in deps

  const loadResults = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/hard-choices/votes?dilemmaId=${currentDilemma.id}`)
      if (response.ok) {
        const data = await response.json()
        setVoteResults(data)
        setShowResults(true)
      } else {
        throw new Error(`Failed to load results: ${response.statusText}`)
      }
    } catch (err) {
      console.error('Error loading results:', err)
      setError(err instanceof Error ? err : new Error('Failed to load results'))
    } finally {
      setLoading(false)
    }
  }

  const handleChoice = async (choiceId: string) => {
    if (hasVoted) return

    setSelectedChoice(choiceId)
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/hard-choices/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dilemmaId: currentDilemma.id,
          choice: choiceId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setVoteResults(data.results)
        setShowResults(true)
        setHasVoted(true)

        // Save to local storage
        const votedDilemmas = JSON.parse(localStorage.getItem('hardChoicesVotes') || '{}')
        votedDilemmas[currentDilemma.id] = choiceId
        localStorage.setItem('hardChoicesVotes', JSON.stringify(votedDilemmas))
      } else {
        throw new Error(`Failed to submit vote: ${response.statusText}`)
      }
    } catch (err) {
      console.error('Error submitting vote:', err)
      setError(err instanceof Error ? err : new Error('Failed to submit vote'))
      setSelectedChoice(null) // Reset selection on error
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    const nextIndex = (currentDilemmaIndex + 1) % DILEMMAS.length
    setCurrentDilemmaIndex(nextIndex)
    setError(null) // Clear error when moving to next dilemma
  }

  const handleRetry = async () => {
    setError(null)
    if (hasVoted) {
      await loadResults()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, choiceId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleChoice(choiceId)
    }
  }

  const getPercentage = (choice: 'A' | 'B') => {
    if (!voteResults) return 0
    const total = voteResults.choiceA + voteResults.choiceB
    if (total === 0) return 50
    const count = choice === 'A' ? voteResults.choiceA : voteResults.choiceB
    return Math.round((count / total) * 100)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <div className="animate-fade">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-semibold mb-3">The Dilemma</h1>
            <p className="text-foreground/60 text-lg">
              Life&apos;s deepest questions have no easy answers. But thinking through them makes us wiser.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-foreground/60 mb-2">
              <span>Dilemma {currentDilemmaIndex + 1} of {DILEMMAS.length}</span>
              <span className="text-xs uppercase tracking-wide">{currentDilemma.category}</span>
            </div>
            <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${((currentDilemmaIndex + 1) / DILEMMAS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="mb-6">
              <ErrorState
                title="Couldn't Load This Dilemma"
                description="We had trouble connecting to the server. Your choice wasn't submitted."
                error={error}
                onRetry={handleRetry}
                showDetails={true}
              />
            </div>
          )}

          {/* Dilemma card */}
          <div className="bg-card-bg border border-card-border rounded-lg p-8 mb-6">
            {currentDilemma.context && (
              <p className="text-foreground/60 mb-4 text-sm uppercase tracking-wide">
                {currentDilemma.context}
              </p>
            )}
            <h2 className="text-2xl font-medium mb-8">
              {currentDilemma.scenario}
            </h2>

            {/* Choices */}
            <div className="space-y-4">
              {/* Choice A */}
              <button
                onClick={() => handleChoice('A')}
                onKeyDown={(e) => handleKeyDown(e, 'A')}
                disabled={hasVoted || loading}
                className={`
                  w-full text-left p-6 rounded-lg border-2 transition-all
                  ${hasVoted
                    ? 'cursor-default'
                    : 'hover:border-accent hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer'
                  }
                  ${selectedChoice === 'A'
                    ? 'border-accent bg-accent/5'
                    : 'border-foreground/10'
                  }
                `}
                aria-label={`Choice A: ${currentDilemma.choiceA.text}`}
                aria-pressed={selectedChoice === 'A'}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold
                    ${selectedChoice === 'A'
                      ? 'border-accent bg-accent text-white'
                      : 'border-foreground/20 text-foreground/60'
                    }
                  `}>
                    A
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-lg mb-2">{currentDilemma.choiceA.text}</p>
                    {showResults && currentDilemma.choiceA.perspective && (
                      <p className="text-sm text-foreground/60 mb-3 italic">
                        {currentDilemma.choiceA.perspective}
                      </p>
                    )}
                    {showResults && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-foreground/60">
                            {getPercentage('A')}% chose this
                          </span>
                          <span className="text-foreground/40">
                            {voteResults?.choiceA || 0} votes
                          </span>
                        </div>
                        <div className="h-2 bg-foreground/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all duration-500"
                            style={{ width: `${getPercentage('A')}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Choice B */}
              <button
                onClick={() => handleChoice('B')}
                onKeyDown={(e) => handleKeyDown(e, 'B')}
                disabled={hasVoted || loading}
                className={`
                  w-full text-left p-6 rounded-lg border-2 transition-all
                  ${hasVoted
                    ? 'cursor-default'
                    : 'hover:border-accent hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer'
                  }
                  ${selectedChoice === 'B'
                    ? 'border-accent bg-accent/5'
                    : 'border-foreground/10'
                  }
                `}
                aria-label={`Choice B: ${currentDilemma.choiceB.text}`}
                aria-pressed={selectedChoice === 'B'}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold
                    ${selectedChoice === 'B'
                      ? 'border-accent bg-accent text-white'
                      : 'border-foreground/20 text-foreground/60'
                    }
                  `}>
                    B
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-lg mb-2">{currentDilemma.choiceB.text}</p>
                    {showResults && currentDilemma.choiceB.perspective && (
                      <p className="text-sm text-foreground/60 mb-3 italic">
                        {currentDilemma.choiceB.perspective}
                      </p>
                    )}
                    {showResults && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-foreground/60">
                            {getPercentage('B')}% chose this
                          </span>
                          <span className="text-foreground/40">
                            {voteResults?.choiceB || 0} votes
                          </span>
                        </div>
                        <div className="h-2 bg-foreground/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success transition-all duration-500"
                            style={{ width: `${getPercentage('B')}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </div>

            {/* Results message - deeper reflection */}
            {showResults && (
              <div className="mt-6 p-5 bg-gradient-to-br from-accent/5 to-transparent border border-accent/10 rounded-lg">
                <p className="text-sm text-foreground/80 text-center leading-relaxed">
                  {getPercentage('A') > 60 || getPercentage('B') > 60 ? (
                    <>
                      <span className="font-medium">Interesting.</span> Most people lean one way here—but the minority perspective often holds wisdom worth considering.
                    </>
                  ) : (
                    <>
                      <span className="font-medium">A true dilemma.</span> Humanity is genuinely split on this one. That&apos;s what makes it worth thinking about.
                    </>
                  )}
                </p>
                <p className="text-xs text-foreground/50 text-center mt-2 italic">
                  Your answer reveals something about your values. Neither choice is wrong.
                </p>
              </div>
            )}
          </div>

          {/* Next button */}
          {showResults && (
            <Button
              onClick={handleNext}
              variant="primary"
              className="w-full py-4"
            >
              Next Dilemma
            </Button>
          )}

          {/* Instructions */}
          {!hasVoted && (
            <div className="mt-8 text-center text-sm text-foreground/60">
              <p>Choose the option that resonates with you. There&apos;s no judgment—just reflection.</p>
            </div>
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
