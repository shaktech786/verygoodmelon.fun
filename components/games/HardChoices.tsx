'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

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
  {
    id: 'career-passion',
    scenario: 'Which path would you choose?',
    context: 'You have two job offers',
    choiceA: {
      id: 'A',
      text: 'High-paying job you find boring',
      perspective: 'Financial security can reduce stress and create opportunities for passion projects outside work.'
    },
    choiceB: {
      id: 'B',
      text: 'Lower-paying job you&apos;re passionate about',
      perspective: 'Spending 40+ hours a week doing meaningful work can lead to greater life satisfaction.'
    },
    category: 'career'
  },
  {
    id: 'relationship-honesty',
    scenario: 'What would you do?',
    context: 'Your best friend asks if they look good in an outfit you think is unflattering',
    choiceA: {
      id: 'A',
      text: 'Tell a white lie to protect their feelings',
      perspective: 'Small kindnesses can strengthen relationships and boost someone\'s confidence when it matters.'
    },
    choiceB: {
      id: 'B',
      text: 'Be honest, even if it might hurt',
      perspective: 'True friends value honesty, and your feedback could save them from embarrassment later.'
    },
    category: 'relationships'
  },
  {
    id: 'time-investment',
    scenario: 'How would you spend your limited free time?',
    context: 'You have 2 hours of unexpected free time',
    choiceA: {
      id: 'A',
      text: 'Work on a personal project or skill',
      perspective: 'Investing in yourself compounds over time and can lead to future opportunities.'
    },
    choiceB: {
      id: 'B',
      text: 'Rest and do absolutely nothing',
      perspective: 'Rest is productive. Your mind and body need recovery to perform well long-term.'
    },
    category: 'personal'
  },
  {
    id: 'health-convenience',
    scenario: 'Which approach would you take?',
    context: 'You\'re exhausted after a long day',
    choiceA: {
      id: 'A',
      text: 'Order takeout (easy but less healthy)',
      perspective: 'Sometimes convenience is self-care. Energy management matters more than perfection.'
    },
    choiceB: {
      id: 'B',
      text: 'Cook a healthy meal (more effort)',
      perspective: 'Nourishing your body well, even when tired, can improve energy and mood tomorrow.'
    },
    category: 'health'
  },
  {
    id: 'social-boundaries',
    scenario: 'What would you choose?',
    context: 'A friend invites you out but you&apos;re feeling drained',
    choiceA: {
      id: 'A',
      text: 'Go anyway to maintain the friendship',
      perspective: 'Showing up for friends builds trust and creates memories, even when you&apos;re not 100%.'
    },
    choiceB: {
      id: 'B',
      text: 'Decline and prioritize your mental health',
      perspective: 'Setting boundaries protects your energy and models healthy behavior for others.'
    },
    category: 'social'
  },
  {
    id: 'financial-security',
    scenario: 'How would you use unexpected money?',
    context: 'You receive a $1,000 bonus',
    choiceA: {
      id: 'A',
      text: 'Save it for emergencies or future goals',
      perspective: 'Financial cushions reduce anxiety and give you freedom to take risks later.'
    },
    choiceB: {
      id: 'B',
      text: 'Spend it on something you\'ve been wanting',
      perspective: 'Life is short. Enjoying the fruits of your labor can boost motivation and happiness.'
    },
    category: 'finance'
  },
  {
    id: 'learning-depth',
    scenario: 'How would you approach learning?',
    context: 'You want to learn something new',
    choiceA: {
      id: 'A',
      text: 'Master one skill deeply',
      perspective: 'Deep expertise is valuable and can make you irreplaceable in your niche.'
    },
    choiceB: {
      id: 'B',
      text: 'Learn multiple skills at a surface level',
      perspective: 'Broad knowledge helps you connect ideas and adapt to changing opportunities.'
    },
    category: 'learning'
  },
  {
    id: 'confrontation',
    scenario: 'How would you handle this?',
    context: 'A coworker takes credit for your idea in a meeting',
    choiceA: {
      id: 'A',
      text: 'Address it directly and publicly',
      perspective: 'Standing up for yourself sets boundaries and earns respect from others.'
    },
    choiceB: {
      id: 'B',
      text: 'Let it go to avoid workplace conflict',
      perspective: 'Choosing your battles wisely can preserve working relationships and reduce stress.'
    },
    category: 'workplace'
  }
]

export default function HardChoices() {
  const [currentDilemmaIndex, setCurrentDilemmaIndex] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [voteResults, setVoteResults] = useState<VoteResults | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [loading, setLoading] = useState(false)

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
    try {
      const response = await fetch(`/api/hard-choices/votes?dilemmaId=${currentDilemma.id}`)
      if (response.ok) {
        const data = await response.json()
        setVoteResults(data)
        setShowResults(true)
      }
    } catch (error) {
      console.error('Error loading results:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChoice = async (choiceId: string) => {
    if (hasVoted) return

    setSelectedChoice(choiceId)
    setLoading(true)

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
      }
    } catch (error) {
      console.error('Error submitting vote:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    const nextIndex = (currentDilemmaIndex + 1) % DILEMMAS.length
    setCurrentDilemmaIndex(nextIndex)
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
            <h1 className="text-4xl font-semibold mb-3">Hard Choices</h1>
            <p className="text-foreground/60 text-lg">
              Practice critical thinking through thoughtful life dilemmas. There&apos;s no right answer—just different perspectives.
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

            {/* Results message */}
            {showResults && (
              <div className="mt-6 p-4 bg-foreground/5 rounded-lg">
                <p className="text-sm text-foreground/70 text-center">
                  There&apos;s no right answer. Both choices have merit—it depends on your values, circumstances, and what matters most to you.
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
            <a
              href="/"
              className="inline-block px-4 py-2 sm:px-6 sm:py-3 bg-card-bg text-foreground border border-card-border rounded-lg font-medium hover:bg-hover-bg transition-colors text-sm sm:text-base"
            >
              ← Back Home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
