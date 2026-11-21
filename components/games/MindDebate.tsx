'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { MessagesSquare, RotateCcw, Loader2, Square, Play, Shuffle } from 'lucide-react'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

interface DebateEntry {
  speaker: string
  argument: string
  round: number
}

interface Closing {
  firstInsight: string
  secondInsight: string
  revealed: string
  question: string
}

interface Pairing {
  first: string
  second: string
  topic: string
}

type GamePhase = 'setup' | 'debating' | 'stopped' | 'declined' | 'judging' | 'closing'

const TOTAL_ROUNDS = 6
const CHAR_DELAY_MS = 18
const TURN_PAUSE_MS = 400
const NAME_MAX = 60
const TOPIC_MAX = 120
const STICK_TO_BOTTOM_PX = 48

const PAIRINGS: readonly Pairing[] = [
  { first: 'Marcus Aurelius', second: 'Oscar Wilde', topic: 'Should you care what others think?' },
  { first: 'A cat', second: 'A dog', topic: 'Is a nap a waste of a day?' },
  { first: 'The Moon', second: 'The Sun', topic: 'Is it better to shine or to reflect?' },
  { first: 'Socrates', second: 'Nietzsche', topic: 'Is free will an illusion?' },
  { first: 'Jane Austen', second: 'Sherlock Holmes', topic: 'Can you reason your way into love?' },
  { first: 'Lao Tzu', second: 'Benjamin Franklin', topic: 'Is doing nothing ever the wise choice?' },
  { first: 'The Tortoise', second: 'The Hare', topic: 'Is slow and steady overrated?' },
  { first: 'Ada Lovelace', second: 'Mary Shelley', topic: 'Should we fear what we create?' },
  { first: 'Winnie-the-Pooh', second: 'Seneca', topic: 'Is it enough to want very little?' },
  { first: 'An old oak tree', second: 'A mayfly', topic: 'Is a short life a lesser life?' },
  { first: 'Hypatia', second: 'Carl Sagan', topic: 'Does the universe mind that we are here?' },
  { first: 'Epicurus', second: 'A busy parent', topic: 'Is a simple life a happy life?' },
]

function fallbackClosing(first: string, second: string): Closing {
  return {
    firstInsight: `${first} held to what they believed and said it plainly.`,
    secondInsight: `${second} kept pressing on the question underneath.`,
    revealed: 'Neither voice held the whole answer, which is often where the best questions live.',
    question: 'If you had joined them, what would you have added?',
  }
}

function isClosing(data: unknown): data is Closing {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return ['firstInsight', 'secondInsight', 'revealed', 'question'].every(
    (key) => typeof d[key] === 'string' && (d[key] as string).trim() !== ''
  )
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

class Declined extends Error {}

export default function MindDebate() {
  const [person1, setPerson1] = useState('')
  const [person2, setPerson2] = useState('')
  const [topic, setTopic] = useState('')
  const [phase, setPhase] = useState<GamePhase>('setup')
  const [history, setHistory] = useState<DebateEntry[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [typingText, setTypingText] = useState('')
  const [interruption, setInterruption] = useState<string | null>(null)
  const [closing, setClosing] = useState<Closing | null>(null)
  const reducedMotion = useReducedMotion()

  const debateRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const abortRef = useRef<AbortController | null>(null)
  const pairingRef = useRef(-1)

  useEffect(() => () => abortRef.current?.abort(), [])

  // Follows new text only while the reader is already at the bottom, so scrolling back to reread is never yanked away
  useEffect(() => {
    const el = debateRef.current
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight
  }, [history, typingText, phase])

  const handleTranscriptScroll = () => {
    const el = debateRef.current
    if (el) stickToBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - STICK_TO_BOTTOM_PX
  }

  const person1Name = person1.trim()
  const person2Name = person2.trim()
  const topicName = topic.trim()
  const canStart = person1Name.length > 0 && person2Name.length > 0 && topicName.length > 0

  const typeText = useCallback(
    (text: string, signal: AbortSignal): Promise<void> => {
      return new Promise((resolve) => {
        if (reducedMotion || signal.aborted) {
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
    [reducedMotion]
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
      if (data.declined === true) throw new Declined()
      if (typeof data.argument !== 'string' || !data.argument.trim()) throw new Error('empty turn')
      return { speaker: speakerFor(round, person1Name, person2Name), argument: data.argument.trim(), round }
    },
    [person1Name, person2Name, topicName]
  )

  const fetchClosing = useCallback(
    async (debateHistory: DebateEntry[], signal: AbortSignal): Promise<Closing> => {
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
        if (!res.ok) throw new Error(`closing ${res.status}`)
        const data: unknown = await res.json()
        if (!isClosing(data)) throw new Error('bad closing')
        return data
      } catch {
        return fallbackClosing(person1Name, person2Name)
      }
    },
    [person1Name, person2Name, topicName]
  )

  const runDebate = useCallback(async (startHistory: DebateEntry[]) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const { signal } = controller

    stickToBottomRef.current = true
    setPhase('debating')
    setInterruption(null)
    setClosing(null)
    setHistory(startHistory)
    let runningHistory = startHistory

    for (let round = startHistory.length + 1; round <= TOTAL_ROUNDS; round++) {
      setCurrentRound(round)
      setTypingText('')

      let entry: DebateEntry
      try {
        entry = await fetchTurn(round, runningHistory, signal)
      } catch (error) {
        if (signal.aborted) return
        if (error instanceof Declined) {
          setPhase('declined')
          return
        }
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
    const result = await fetchClosing(runningHistory, signal)
    if (signal.aborted) return
    setClosing(result)
    setPhase('closing')
  }, [fetchTurn, typeText, fetchClosing, person1Name, person2Name])

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

  const backToSetup = () => {
    abortRef.current?.abort()
    setPhase('setup')
    setHistory([])
    setCurrentRound(0)
    setTypingText('')
    setInterruption(null)
    setClosing(null)
  }

  const handleSurprise = () => {
    let next = Math.floor(Math.random() * PAIRINGS.length)
    if (next === pairingRef.current) next = (next + 1) % PAIRINGS.length
    pairingRef.current = next
    const pairing = PAIRINGS[next]
    setPerson1(pairing.first)
    setPerson2(pairing.second)
    setTopic(pairing.topic)
    if (phase !== 'setup') backToSetup()
  }

  if (phase === 'setup') {
    return (
      <div className="max-w-xl mx-auto animate-fade" role="region" aria-label="Debate setup">
        <form onSubmit={handleStart} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="person1" className="block text-sm font-medium text-foreground/80 mb-1.5">
                First debater
              </label>
              <input
                id="person1"
                type="text"
                value={person1}
                onChange={(e) => setPerson1(e.target.value)}
                placeholder="e.g. Socrates"
                maxLength={NAME_MAX}
                className="w-full px-4 py-2.5 rounded-lg border border-card-border bg-card-bg text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="person2" className="block text-sm font-medium text-foreground/80 mb-1.5">
                Second debater
              </label>
              <input
                id="person2"
                type="text"
                value={person2}
                onChange={(e) => setPerson2(e.target.value)}
                placeholder="e.g. Nietzsche"
                maxLength={NAME_MAX}
                className="w-full px-4 py-2.5 rounded-lg border border-card-border bg-card-bg text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-foreground/80 mb-1.5">
              Topic
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Is free will an illusion?"
              maxLength={TOPIC_MAX}
              className="w-full px-4 py-2.5 rounded-lg border border-card-border bg-card-bg text-foreground placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
              autoComplete="off"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={!canStart}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <MessagesSquare size={18} aria-hidden="true" />
              Start Debate
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSurprise}
              className="flex items-center justify-center gap-2"
            >
              <Shuffle size={18} aria-hidden="true" />
              Surprise me
            </Button>
          </div>
        </form>

        <p className="text-center text-foreground/70 text-sm mt-6">
          Pick any two minds, real or imagined, and a question for them to explore.
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
      aria-label={`Debate: ${person1Name} and ${person2Name}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="text-center sm:text-left min-w-0 max-w-full">
          <p className="text-sm text-foreground/80 break-words">
            {person1Name} <span className="text-accent font-semibold" aria-hidden="true">&amp;</span>
            <span className="sr-only">and</span> {person2Name}
          </p>
          <p className="text-xs text-foreground/70 mt-0.5 break-words">&ldquo;{topicName}&rdquo;</p>
          <p className="text-xs text-foreground/70 mt-0.5">Imagined voices, not real quotes.</p>
        </div>

        {(phase === 'debating' || phase === 'stopped') && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-foreground/80">
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
        onScroll={handleTranscriptScroll}
        tabIndex={0}
        role="log"
        aria-live="polite"
        aria-label="Debate transcript"
        className="bg-card-bg border border-card-border rounded-xl p-4 sm:p-6 min-h-[300px] max-h-[60vh] overflow-y-auto space-y-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {history.map((entry) => (
          <DebateBubble key={entry.round} entry={entry} isLeft={entry.round % 2 === 1} />
        ))}

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
          <div className="flex items-center justify-center gap-2 py-3 text-foreground/70">
            <Loader2 size={18} className={reducedMotion ? '' : 'animate-spin'} aria-hidden="true" />
            <span className="text-sm break-words">{nextSpeaker} is thinking...</span>
          </div>
        )}

        {phase === 'stopped' && (
          <p className="text-center text-sm text-foreground/80 py-3">
            {interruption ?? 'The debate is paused.'}
          </p>
        )}

        {phase === 'declined' && (
          <div className="text-center py-4 max-w-md mx-auto">
            <p className="text-sm text-foreground/80 leading-relaxed">
              This conversation is one The Arena will sit out. Some voices are better left unspoken here.
            </p>
            <p className="text-sm text-foreground/80 mt-2">Try another pair, or let it surprise you.</p>
          </div>
        )}

        {phase === 'judging' && (
          <div className="flex items-center justify-center gap-2 py-6 text-foreground/70">
            <Loader2 size={18} className={reducedMotion ? '' : 'animate-spin'} aria-hidden="true" />
            <span className="text-sm">Letting it settle...</span>
          </div>
        )}

        {phase === 'closing' && closing && (
          <ClosingThoughts closing={closing} first={person1Name} second={person2Name} />
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
        {phase === 'declined' && (
          <Button onClick={handleSurprise} variant="primary" className="flex items-center gap-2">
            <Shuffle size={16} aria-hidden="true" />
            Surprise me
          </Button>
        )}
        <Button onClick={backToSetup} variant="secondary" className="flex items-center gap-2">
          <RotateCcw size={16} aria-hidden="true" />
          New Debate
        </Button>
      </div>
    </div>
  )
}

function ClosingThoughts({ closing, first, second }: { closing: Closing; first: string; second: string }) {
  return (
    <section aria-label="Closing thoughts" className="mt-2 border-t border-card-border pt-5 space-y-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/70 text-center mb-3">
          What each got right
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 min-w-0">
            <p className="text-xs font-semibold text-accent break-words mb-1">{first}</p>
            <p className="text-sm text-foreground/85 leading-relaxed break-words">{closing.firstInsight}</p>
          </div>
          <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 min-w-0">
            <p className="text-xs font-semibold text-melon-green break-words mb-1">{second}</p>
            <p className="text-sm text-foreground/85 leading-relaxed break-words">{closing.secondInsight}</p>
          </div>
        </div>
      </div>

      <div className="text-center max-w-lg mx-auto">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-2">
          What the conversation revealed
        </h2>
        <p className="text-sm text-foreground/85 leading-relaxed break-words">{closing.revealed}</p>
      </div>

      <div className="text-center max-w-lg mx-auto pb-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-2">
          To take with you
        </h2>
        <p className="text-base text-foreground italic leading-relaxed break-words">{closing.question}</p>
      </div>
    </section>
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
          <span className={`w-2 h-2 rounded-full shrink-0 ${isLeft ? 'bg-accent' : 'bg-success'}`} aria-hidden="true" />
          <span className="text-xs font-semibold break-words min-w-0 text-foreground">
            {entry.speaker}
          </span>
          <span className="text-xs text-foreground/70 shrink-0">Round {entry.round}</span>
        </div>
        <p className="text-sm text-foreground/85 leading-relaxed break-words">
          {entry.argument}
          {typing && <span className="inline-block w-0.5 h-4 bg-foreground/40 ml-0.5 align-middle" />}
        </p>
      </div>
    </div>
  )
}
