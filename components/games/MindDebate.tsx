'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Swords, RotateCcw, Trophy, Loader2 } from 'lucide-react'

interface DebateEntry {
  speaker: string
  argument: string
  round: number
}

interface Verdict {
  winner: string
  summary: string
}

type GamePhase = 'setup' | 'debating' | 'judging' | 'verdict'

const TOTAL_ROUNDS = 6
const CHAR_DELAY_MS = 18

export default function MindDebate() {
  const [person1, setPerson1] = useState('')
  const [person2, setPerson2] = useState('')
  const [topic, setTopic] = useState('')
  const [phase, setPhase] = useState<GamePhase>('setup')
  const [history, setHistory] = useState<DebateEntry[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [typingText, setTypingText] = useState('')
  const [typingSpeaker, setTypingSpeaker] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const debateRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Detect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Scroll to latest entry
  useEffect(() => {
    if (debateRef.current) {
      debateRef.current.scrollTop = debateRef.current.scrollHeight
    }
  }, [history, typingText])

  const typeText = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (prefersReducedMotion) {
          setTypingText(text)
          resolve()
          return
        }
        let i = 0
        const interval = setInterval(() => {
          i++
          setTypingText(text.slice(0, i))
          if (i >= text.length) {
            clearInterval(interval)
            resolve()
          }
        }, CHAR_DELAY_MS)

        // Store cleanup for abort
        abortRef.current?.signal.addEventListener('abort', () => {
          clearInterval(interval)
          resolve()
        })
      })
    },
    [prefersReducedMotion]
  )

  const fetchTurn = useCallback(
    async (
      round: number,
      currentHistory: DebateEntry[]
    ): Promise<DebateEntry | null> => {
      try {
        const res = await fetch('/api/mind-debate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            person1: person1.trim(),
            person2: person2.trim(),
            topic: topic.trim(),
            history: currentHistory.map((h) => ({
              speaker: h.speaker,
              argument: h.argument,
            })),
            round,
            totalRounds: TOTAL_ROUNDS,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to generate turn')
        }

        const data = await res.json()
        return {
          speaker: data.speaker,
          argument: data.argument,
          round: data.round,
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Something went wrong')
        }
        return null
      }
    },
    [person1, person2, topic]
  )

  const fetchVerdict = useCallback(
    async (debateHistory: DebateEntry[]) => {
      setPhase('judging')
      try {
        const res = await fetch('/api/mind-debate/judge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            person1: person1.trim(),
            person2: person2.trim(),
            topic: topic.trim(),
            history: debateHistory.map((h) => ({
              speaker: h.speaker,
              argument: h.argument,
            })),
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to judge debate')
        }

        const data = await res.json()
        setVerdict(data)
        setPhase('verdict')
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Failed to determine a winner')
        }
        setPhase('verdict')
      }
    },
    [person1, person2, topic]
  )

  const runDebate = useCallback(async () => {
    setPhase('debating')
    setHistory([])
    setError(null)
    setVerdict(null)

    abortRef.current = new AbortController()
    let runningHistory: DebateEntry[] = []

    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      if (abortRef.current.signal.aborted) break

      setCurrentRound(round)
      const speaker = round % 2 === 1 ? person1.trim() : person2.trim()
      setTypingSpeaker(speaker)
      setTypingText('')

      const entry = await fetchTurn(round, runningHistory)
      if (!entry) break

      await typeText(entry.argument)

      runningHistory = [...runningHistory, entry]
      setHistory([...runningHistory])
      setTypingText('')
      setTypingSpeaker('')

      // Brief pause between turns
      if (round < TOTAL_ROUNDS) {
        await new Promise((r) => setTimeout(r, 400))
      }
    }

    if (!abortRef.current.signal.aborted && runningHistory.length === TOTAL_ROUNDS) {
      await fetchVerdict(runningHistory)
    }
  }, [person1, person2, fetchTurn, typeText, fetchVerdict])

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault()
    if (!person1.trim() || !person2.trim() || !topic.trim()) return
    runDebate()
  }

  const handleNewDebate = () => {
    abortRef.current?.abort()
    setPhase('setup')
    setPerson1('')
    setPerson2('')
    setTopic('')
    setHistory([])
    setCurrentRound(0)
    setTypingText('')
    setTypingSpeaker('')
    setError(null)
    setVerdict(null)
  }

  const canStart =
    person1.trim().length > 0 &&
    person2.trim().length > 0 &&
    topic.trim().length > 0

  // --- Setup Phase ---
  if (phase === 'setup') {
    return (
      <div
        className="max-w-xl mx-auto animate-fade"
        role="region"
        aria-label="Debate setup"
      >
        <form onSubmit={handleStart} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="person1"
                className="block text-sm font-medium text-foreground/70 mb-1.5"
              >
                First debater
              </label>
              <input
                id="person1"
                type="text"
                value={person1}
                onChange={(e) => setPerson1(e.target.value)}
                placeholder="e.g. Socrates"
                maxLength={60}
                className="w-full px-4 py-2.5 rounded-lg border border-card-border bg-card-bg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                autoComplete="off"
              />
            </div>
            <div>
              <label
                htmlFor="person2"
                className="block text-sm font-medium text-foreground/70 mb-1.5"
              >
                Second debater
              </label>
              <input
                id="person2"
                type="text"
                value={person2}
                onChange={(e) => setPerson2(e.target.value)}
                placeholder="e.g. Nietzsche"
                maxLength={60}
                className="w-full px-4 py-2.5 rounded-lg border border-card-border bg-card-bg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-foreground/70 mb-1.5"
            >
              Topic
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Is free will an illusion?"
              maxLength={120}
              className="w-full px-4 py-2.5 rounded-lg border border-card-border bg-card-bg text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
              autoComplete="off"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={!canStart}
              className="w-full flex items-center justify-center gap-2"
            >
              <Swords size={18} aria-hidden="true" />
              Start Debate
            </Button>
          </div>
        </form>

        <p className="text-center text-foreground/40 text-sm mt-6">
          Pick any two people -- real or fictional -- and watch them debate.
        </p>
      </div>
    )
  }

  // --- Debate / Judging / Verdict Phases ---
  const person1Name = person1.trim()
  const person2Name = person2.trim()
  const topicName = topic.trim()

  return (
    <div
      className="max-w-4xl mx-auto animate-fade"
      role="region"
      aria-label={`Debate: ${person1Name} vs ${person2Name}`}
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="text-center sm:text-left">
          <p className="text-sm text-foreground/50">
            {person1Name}{' '}
            <span className="text-accent font-semibold">vs</span>{' '}
            {person2Name}
          </p>
          <p className="text-xs text-foreground/40 mt-0.5">
            &ldquo;{topicName}&rdquo;
          </p>
        </div>

        {phase === 'debating' && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground/60">
              Round {currentRound}/{TOTAL_ROUNDS}
            </span>
            <div
              className="flex gap-1"
              role="progressbar"
              aria-valuenow={currentRound}
              aria-valuemin={1}
              aria-valuemax={TOTAL_ROUNDS}
              aria-label={`Round ${currentRound} of ${TOTAL_ROUNDS}`}
            >
              {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i < currentRound
                      ? 'bg-accent'
                      : 'bg-foreground/15'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Debate area */}
      <div
        ref={debateRef}
        className="bg-card-bg border border-card-border rounded-xl p-4 sm:p-6 min-h-[300px] max-h-[60vh] overflow-y-auto space-y-4"
      >
        {history.map((entry, i) => {
          const isLeft = entry.speaker === person1Name
          return (
            <div
              key={i}
              className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-xl px-4 py-3 ${
                  isLeft
                    ? 'bg-accent/10 border border-accent/20 rounded-tl-sm'
                    : 'bg-success/10 border border-success/20 rounded-tr-sm'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-xs font-semibold ${
                      isLeft ? 'text-accent' : 'text-success'
                    }`}
                  >
                    {entry.speaker}
                  </span>
                  <span className="text-xs text-foreground/30">
                    Round {entry.round}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {entry.argument}
                </p>
              </div>
            </div>
          )
        })}

        {/* Currently typing */}
        {typingSpeaker && typingText && (
          <div
            className={`flex ${
              typingSpeaker === person1Name ? 'justify-start' : 'justify-end'
            }`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[70%] rounded-xl px-4 py-3 ${
                typingSpeaker === person1Name
                  ? 'bg-accent/10 border border-accent/20 rounded-tl-sm'
                  : 'bg-success/10 border border-success/20 rounded-tr-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`text-xs font-semibold ${
                    typingSpeaker === person1Name
                      ? 'text-accent'
                      : 'text-success'
                  }`}
                >
                  {typingSpeaker}
                </span>
                <span className="text-xs text-foreground/30">
                  Round {currentRound}
                </span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {typingText}
                <span
                  className="inline-block w-0.5 h-4 bg-foreground/40 ml-0.5 animate-pulse align-middle"
                  aria-hidden="true"
                />
              </p>
            </div>
          </div>
        )}

        {/* Loading indicator while waiting for next turn */}
        {phase === 'debating' && !typingText && currentRound > 0 && history.length < TOTAL_ROUNDS && (
          <div className="flex justify-center py-3">
            <Loader2
              size={20}
              className="animate-spin text-foreground/30"
              aria-label="Generating next argument"
            />
          </div>
        )}

        {/* Judging state */}
        {phase === 'judging' && (
          <div className="flex justify-center py-6">
            <div className="flex items-center gap-2 text-foreground/50">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              <span className="text-sm">Deliberating...</span>
            </div>
          </div>
        )}

        {/* Verdict */}
        {phase === 'verdict' && verdict && (
          <div className="mt-4 border-t border-card-border pt-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Trophy
                size={20}
                className="text-accent"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-foreground/80">
                {verdict.winner === 'draw'
                  ? 'Draw'
                  : `${verdict.winner} wins`}
              </span>
            </div>
            <p className="text-sm text-foreground/60 text-center leading-relaxed max-w-lg mx-auto">
              {verdict.summary}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-4">
            <p className="text-sm text-accent">{error}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-center mt-5">
        <Button
          onClick={handleNewDebate}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <RotateCcw size={16} aria-hidden="true" />
          New Debate
        </Button>
      </div>
    </div>
  )
}
