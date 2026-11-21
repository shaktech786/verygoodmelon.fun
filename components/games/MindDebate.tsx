'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Swords, RotateCcw, Trophy, Loader2, Square, Play } from 'lucide-react'

interface DebateEntry {
  speaker: string
  argument: string
  round: number
}

interface Verdict {
  winner: string
  summary: string
}

type GamePhase = 'setup' | 'debating' | 'stopped' | 'judging' | 'verdict'

const TOTAL_ROUNDS = 6
const CHAR_DELAY_MS = 18
const TURN_PAUSE_MS = 400
const NAME_MAX = 60
const TOPIC_MAX = 120

const FALLBACK_VERDICT: Verdict = {
  winner: 'draw',
  summary: 'No clear winner this time. Both held their ground, and the question stays open for you to decide.',
}

function speakerFor(round: number, first: string, second: string): string {
  return round % 2 === 1 ? first : second
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true })
  })
}

export default function MindDebate() {
  const [person1, setPerson1] = useState('')
  const [person2, setPerson2] = useState('')
  const [topic, setTopic] = useState('')
  const [phase, setPhase] = useState<GamePhase>('setup')
  const [history, setHistory] = useState<DebateEntry[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [typingText, setTypingText] = useState('')
  const [interruption, setInterruption] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const debateRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the media query is only readable after mount
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (debateRef.current) {
      debateRef.current.scrollTop = debateRef.current.scrollHeight
    }
  }, [history, typingText, phase])

  const person1Name = person1.trim()
  const person2Name = person2.trim()
  const topicName = topic.trim()
  const canStart = person1Name.length > 0 && person2Name.length > 0 && topicName.length > 0

  const typeText = useCallback(
    (text: string, signal: AbortSignal): Promise<void> => {
      return new Promise((resolve) => {
        if (prefersReducedMotion || signal.aborted) {
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
        signal.addEventListener('abort', () => { clearInterval(interval); resolve() }, { once: true })
      })
    },
    [prefersReducedMotion]
  )

  const fetchTurn = useCallback(
    async (round: number, priorHistory: DebateEntry[], signal: AbortSignal): Promise<DebateEntry> => {
      const res = await fetch('/api/mind-debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person1: person1Name,
          person2: person2Name,
          topic: topicName,
          history: priorHistory.map((h) => ({ speaker: h.speaker, argument: h.argument })),
          round,
          totalRounds: TOTAL_ROUNDS,
        }),
        signal,
      })
      if (!res.ok) throw new Error(`turn ${res.status}`)
      const data = await res.json()
      if (typeof data.argument !== 'string' || !data.argument.trim()) throw new Error('empty turn')
      return { speaker: speakerFor(round, person1Name, person2Name), argument: data.argument.trim(), round }
    },
    [person1Name, person2Name, topicName]
  )

  const fetchVerdict = useCallback(
    async (debateHistory: DebateEntry[], signal: AbortSignal): Promise<Verdict> => {
      try {
        const res = await fetch('/api/mind-debate/judge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            person1: person1Name,
            person2: person2Name,
            topic: topicName,
            history: debateHistory.map((h) => ({ speaker: h.speaker, argument: h.argument })),
          }),
          signal,
        })
        if (!res.ok) throw new Error(`judge ${res.status}`)
        const data = await res.json()
        if (typeof data.winner !== 'string' || typeof data.summary !== 'string' || !data.summary) {
          throw new Error('bad verdict')
        }
        return data
      } catch {
        return FALLBACK_VERDICT
      }
    },
    [person1Name, person2Name, topicName]
  )

  const runDebate = useCallback(async (startHistory: DebateEntry[]) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const { signal } = controller

    setPhase('debating')
    setInterruption(null)
    setVerdict(null)
    setHistory(startHistory)
    let runningHistory = startHistory

    for (let round = startHistory.length + 1; round <= TOTAL_ROUNDS; round++) {
      setCurrentRound(round)
      setTypingText('')

      let entry: DebateEntry
      try {
        entry = await fetchTurn(round, runningHistory, signal)
      } catch {
        if (signal.aborted) return
        setPhase('stopped')
        setInterruption(`${speakerFor(round, person1Name, person2Name)} lost their train of thought.`)
        return
      }
      if (signal.aborted) return

      await typeText(entry.argument, signal)
      if (signal.aborted) return

      runningHistory = [...runningHistory, entry]
      setHistory(runningHistory)
      setTypingText('')

      if (round < TOTAL_ROUNDS) await wait(TURN_PAUSE_MS, signal)
      if (signal.aborted) return
    }

    setPhase('judging')
    const result = await fetchVerdict(runningHistory, signal)
    if (signal.aborted) return
    setVerdict(result)
    setPhase('verdict')
  }, [fetchTurn, typeText, fetchVerdict, person1Name, person2Name])

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canStart) return
    setCurrentRound(0)
    runDebate([])
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setTypingText('')
    setInterruption(null)
    setPhase('stopped')
  }

  const handleNewDebate = () => {
    abortRef.current?.abort()
    setPhase('setup')
    setHistory([])
    setCurrentRound(0)
    setTypingText('')
    setInterruption(null)
    setVerdict(null)
  }


  if (phase === 'setup') {
    return (
      <div className="max-w-xl mx-auto animate-fade" role="region" aria-label="Debate setup">
        <form onSubmit={handleStart} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="person1" className="block text-sm font-medium text-foreground/70 mb-1.5">
                First debater
              </label>
              <input
                id="person1"
                type="text"
                value={person1}
                onChange={(e) => setPerson1(e.target.value)}
                placeholder="e.g. Socrates"
                maxLength={NAME_MAX}
                className="w-full px-4 py-2.5 rounded-lg border border-card-border bg-card-bg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="person2" className="block text-sm font-medium text-foreground/70 mb-1.5">
                Second debater
              </label>
              <input
                id="person2"
                type="text"
                value={person2}
                onChange={(e) => setPerson2(e.target.value)}
                placeholder="e.g. Nietzsche"
                maxLength={NAME_MAX}
                className="w-full px-4 py-2.5 rounded-lg border border-card-border bg-card-bg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-foreground/70 mb-1.5">
              Topic
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Is free will an illusion?"
              maxLength={TOPIC_MAX}
              className="w-full px-4 py-2.5 rounded-lg border border-card-border bg-card-bg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
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

        <p className="text-center text-foreground/60 text-sm mt-6">
          Pick any two people, real or fictional, and a topic for them to argue.
        </p>
      </div>
    )
  }

  const nextSpeaker = speakerFor(currentRound, person1Name, person2Name)
  const waitingForTurn = phase === 'debating' && !typingText

  return (
    <div
      className="max-w-4xl mx-auto animate-fade"
      role="region"
      aria-label={`Debate: ${person1Name} vs ${person2Name}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="text-center sm:text-left min-w-0 max-w-full">
          <p className="text-sm text-foreground/70 break-words">
            {person1Name} <span className="text-accent font-semibold">vs</span> {person2Name}
          </p>
          <p className="text-xs text-foreground/60 mt-0.5 break-words">&ldquo;{topicName}&rdquo;</p>
        </div>

        {(phase === 'debating' || phase === 'stopped') && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-foreground/70">
              Round {currentRound}/{TOTAL_ROUNDS}
            </span>
            <div
              className="flex gap-1"
              role="progressbar"
              aria-valuenow={history.length}
              aria-valuemin={0}
              aria-valuemax={TOTAL_ROUNDS}
              aria-label={`${history.length} of ${TOTAL_ROUNDS} rounds finished`}
            >
              {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${i < history.length ? 'bg-accent' : 'bg-foreground/15'}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        ref={debateRef}
        className="bg-card-bg border border-card-border rounded-xl p-4 sm:p-6 min-h-[300px] max-h-[60vh] overflow-y-auto space-y-4"
      >
        <div role="log" aria-live="polite" aria-label="Debate transcript" className="space-y-4">
          {history.map((entry) => (
            <DebateBubble key={entry.round} entry={entry} isLeft={entry.round % 2 === 1} />
          ))}

          {phase === 'verdict' && verdict && (
            <div className="mt-4 border-t border-card-border pt-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Trophy size={20} className="text-accent" aria-hidden="true" />
                <span className="text-sm font-semibold text-foreground/80 break-words">
                  {verdict.winner === 'draw' ? 'Draw' : `${verdict.winner} wins`}
                </span>
              </div>
              <p className="text-sm text-foreground/70 text-center leading-relaxed max-w-lg mx-auto">
                {verdict.summary}
              </p>
            </div>
          )}

          {phase === 'stopped' && (
            <p className="text-center text-sm text-foreground/70 py-3">
              {interruption ?? 'The debate is paused.'}
            </p>
          )}
        </div>

        {phase === 'debating' && typingText && (
          <div aria-hidden="true">
            <DebateBubble
              entry={{ speaker: nextSpeaker, argument: typingText, round: currentRound }}
              isLeft={currentRound % 2 === 1}
              typing
            />
          </div>
        )}

        {waitingForTurn && (
          <div className="flex items-center justify-center gap-2 py-3 text-foreground/60">
            <Loader2 size={18} className={prefersReducedMotion ? '' : 'animate-spin'} aria-hidden="true" />
            <span className="text-sm break-words">{nextSpeaker} is thinking...</span>
          </div>
        )}

        {phase === 'judging' && (
          <div className="flex items-center justify-center gap-2 py-6 text-foreground/60">
            <Loader2 size={18} className={prefersReducedMotion ? '' : 'animate-spin'} aria-hidden="true" />
            <span className="text-sm">Weighing the arguments...</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-5">
        {phase === 'debating' && (
          <Button onClick={handleStop} variant="secondary" className="flex items-center gap-2">
            <Square size={16} aria-hidden="true" />
            Stop
          </Button>
        )}
        {phase === 'stopped' && history.length < TOTAL_ROUNDS && (
          <Button onClick={() => runDebate(history)} variant="primary" className="flex items-center gap-2">
            <Play size={16} aria-hidden="true" />
            {interruption ? 'Try again' : 'Continue'}
          </Button>
        )}
        <Button onClick={handleNewDebate} variant="secondary" className="flex items-center gap-2">
          <RotateCcw size={16} aria-hidden="true" />
          New Debate
        </Button>
      </div>
    </div>
  )
}

function DebateBubble({ entry, isLeft, typing = false }: { entry: DebateEntry; isLeft: boolean; typing?: boolean }) {
  return (
    <div className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] min-w-0 rounded-xl px-4 py-3 ${
          isLeft
            ? 'bg-accent/10 border border-accent/20 rounded-tl-sm'
            : 'bg-success/10 border border-success/20 rounded-tr-sm'
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5 min-w-0">
          <span className={`text-xs font-semibold break-words min-w-0 ${isLeft ? 'text-accent' : 'text-melon-green'}`}>
            {entry.speaker}
          </span>
          <span className="text-xs text-foreground/60 shrink-0">Round {entry.round}</span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed break-words">
          {entry.argument}
          {typing && <span className="inline-block w-0.5 h-4 bg-foreground/40 ml-0.5 align-middle" />}
        </p>
      </div>
    </div>
  )
}
