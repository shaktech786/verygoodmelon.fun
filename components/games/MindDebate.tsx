'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button, buttonClassName } from '@/components/ui/Button'
import { MessagesSquare, RotateCcw, Loader2, Square, Play, Shuffle, UserRound, HelpCircle } from 'lucide-react'
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
type DeclineReason = 'voice' | 'topic' | null
type FocusTarget = 'transcript' | 'person1' | 'topic' | 'start'
type Side = 'left' | 'right'

const TOTAL_ROUNDS = 6
const CHAR_DELAY_MS = 18
const TURN_PAUSE_MS = 400
const NAME_MAX = 60
const TOPIC_MAX = 120
const STICK_TO_BOTTOM_PX = 48
const ABORTED = Symbol('aborted')
const ACTION = 'flex items-center gap-2'

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

const DECLINE_LINES: Record<'voice' | 'topic' | 'unknown', string> = {
  voice: 'The Arena will not give voice to one of these speakers. The question can stay: try it with someone else.',
  topic: 'This is a question The Arena will not hold, whoever is asking. The voices can stay: try them on a different question.',
  unknown: 'This conversation is one The Arena will sit out. Try another pair or question, or let it surprise you.',
}

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

const sideOf = (round: number): Side => (round % 2 === 1 ? 'left' : 'right')

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true })
  })
}

/** Stops waiting on a promise when the signal aborts, without cancelling the promise itself. */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T | typeof ABORTED> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return resolve(ABORTED)
    signal.addEventListener('abort', () => resolve(ABORTED), { once: true })
    promise.then(resolve, reject)
  })
}

const focusLost = () => !document.activeElement || document.activeElement === document.body

class Declined extends Error {
  constructor(readonly reason: DeclineReason) {
    super('declined')
  }
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
  const [declineReason, setDeclineReason] = useState<DeclineReason>(null)
  const [closing, setClosing] = useState<Closing | null>(null)
  const reducedMotion = useReducedMotion()

  const regionRef = useRef<HTMLDivElement>(null)
  const debateRef = useRef<HTMLDivElement>(null)
  const person1Ref = useRef<HTMLInputElement>(null)
  const topicRef = useRef<HTMLInputElement>(null)
  const startRef = useRef<HTMLButtonElement>(null)
  const stopRef = useRef<HTMLButtonElement>(null)
  const continueRef = useRef<HTMLButtonElement>(null)
  const declineActionRef = useRef<HTMLButtonElement>(null)
  const closingHeadingRef = useRef<HTMLHeadingElement>(null)
  const focusNextRef = useRef<FocusTarget | null>(null)

  const stickToBottomRef = useRef(true)
  // The session covers a whole debate; play covers what is being shown now, so Stop can pause the show without dropping a reply already paid for
  const sessionRef = useRef<AbortController | null>(null)
  const playRef = useRef<AbortController | null>(null)
  const historyRef = useRef<DebateEntry[]>([])
  const pendingRef = useRef<{ round: number; reply: Promise<DebateEntry> } | null>(null)
  const pairingRef = useRef(-1)

  useEffect(() => () => {
    sessionRef.current?.abort()
    playRef.current?.abort()
  }, [])

  // Follows new text only while the reader is already at the bottom, so scrolling back to reread is never yanked away
  useEffect(() => {
    const el = debateRef.current
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight
  }, [history, typingText, phase])

  // Whatever control was just pressed usually disappears with the phase it belonged to, so focus moves to the next sensible place
  useEffect(() => {
    const target = focusNextRef.current
    focusNextRef.current = null
    if (target === 'transcript') debateRef.current?.focus()
    else if (target === 'person1') person1Ref.current?.focus()
    else if (target === 'topic') topicRef.current?.focus()
    else if (target === 'start') startRef.current?.focus()
    else if (phase === 'closing' || phase === 'declined') {
      // An ending the reader would otherwise have to go looking for
      if (focusLost() || regionRef.current?.contains(document.activeElement)) {
        if (phase === 'closing') closingHeadingRef.current?.focus()
        else declineActionRef.current?.focus()
      }
    } else if (focusLost()) {
      if (phase === 'debating') stopRef.current?.focus()
      else if (phase === 'stopped') continueRef.current?.focus()
    }
  }, [phase])

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
      if (data.declined === true) throw new Declined(data.reason === 'voice' || data.reason === 'topic' ? data.reason : null)
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

  const commit = useCallback((entry: DebateEntry) => {
    if (historyRef.current.length !== entry.round - 1) return
    historyRef.current = [...historyRef.current, entry]
    setHistory(historyRef.current)
  }, [])

  // One request per round: a reply still on its way when the reader pressed Stop is reused by Continue
  const requestTurn = useCallback((round: number, session: AbortSignal): Promise<DebateEntry> => {
    const pending = pendingRef.current
    if (pending && pending.round === round) return pending.reply
    const request = { round, reply: fetchTurn(round, historyRef.current, session) }
    pendingRef.current = request
    const settle = () => { if (pendingRef.current === request) pendingRef.current = null }
    request.reply.then(settle, settle)
    return request.reply
  }, [fetchTurn])

  const runDebate = useCallback(async () => {
    const session = sessionRef.current?.signal
    if (!session) return
    playRef.current?.abort()
    const play = new AbortController()
    playRef.current = play

    stickToBottomRef.current = true
    setPhase('debating')
    setInterruption(null)
    setDeclineReason(null)
    setClosing(null)

    for (let round = historyRef.current.length + 1; round <= TOTAL_ROUNDS; round = historyRef.current.length + 1) {
      setCurrentRound(round)
      setTypingText('')

      const reply = requestTurn(round, session)
      let entry: DebateEntry
      try {
        const result = await untilAborted(reply, play.signal)
        if (result === ABORTED) {
          // Paused while this turn was on its way: it joins the transcript whole when it lands
          reply.then((late) => { if (!session.aborted) commit(late) }, () => {})
          return
        }
        entry = result
      } catch (error) {
        if (session.aborted || play.signal.aborted) return
        if (error instanceof Declined) {
          setDeclineReason(error.reason)
          setPhase('declined')
          return
        }
        setPhase('stopped')
        setInterruption(`${speakerFor(round, person1Name, person2Name)} lost their train of thought.`)
        return
      }

      if (historyRef.current.length < round) {
        await typeText(entry.argument, play.signal)
        if (session.aborted) return
        // Stopping part way through still keeps the whole turn the reader was following
        commit(entry)
        setTypingText('')
        if (play.signal.aborted) return
      }

      if (round < TOTAL_ROUNDS) await wait(TURN_PAUSE_MS, play.signal)
      if (play.signal.aborted) return
    }

    setPhase('judging')
    const result = await fetchClosing(historyRef.current, session)
    if (session.aborted) return
    setClosing(result)
    setPhase('closing')
  }, [requestTurn, commit, typeText, fetchClosing, person1Name, person2Name])

  const resetDebate = () => {
    sessionRef.current?.abort()
    playRef.current?.abort()
    sessionRef.current = null
    pendingRef.current = null
    historyRef.current = []
    setHistory([])
    setCurrentRound(0)
    setTypingText('')
    setInterruption(null)
    setDeclineReason(null)
    setClosing(null)
  }

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canStart) return
    resetDebate()
    sessionRef.current = new AbortController()
    focusNextRef.current = 'transcript'
    runDebate()
  }

  const handleStop = () => {
    playRef.current?.abort()
    setTypingText('')
    setInterruption(null)
    setPhase('stopped')
  }

  const backToSetup = (focus?: FocusTarget) => {
    resetDebate()
    focusNextRef.current = focus ?? null
    setPhase('setup')
  }

  const handleSurprise = () => {
    let next = Math.floor(Math.random() * PAIRINGS.length)
    if (next === pairingRef.current) next = (next + 1) % PAIRINGS.length
    pairingRef.current = next
    const pairing = PAIRINGS[next]
    setPerson1(pairing.first)
    setPerson2(pairing.second)
    setTopic(pairing.topic)
    if (phase !== 'setup') backToSetup('start')
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
                ref={person1Ref}
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
              ref={topicRef}
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
            <button
              ref={startRef}
              type="submit"
              disabled={!canStart}
              className={buttonClassName('primary', 'md', 'flex-1 flex items-center justify-center gap-2')}
            >
              <MessagesSquare size={18} aria-hidden="true" />
              Start debate
            </button>
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

        <p className="text-center text-foreground/75 text-sm mt-6">
          Pick any two minds, real or imagined, and a question for them to explore.
        </p>
      </div>
    )
  }

  // In the short pause after a turn lands, nobody is speaking or thinking yet
  const turnInProgress = phase === 'debating' && currentRound > history.length
  const activeSide: Side | null = turnInProgress ? sideOf(currentRound) : null
  const activeState = typingText ? 'speaking' : 'thinking'
  const nextSpeaker = speakerFor(currentRound, person1Name, person2Name)
  const waitingForTurn = turnInProgress && !typingText

  return (
    <div
      ref={regionRef}
      className="max-w-4xl mx-auto animate-fade"
      role="region"
      aria-label={`Debate: ${person1Name} and ${person2Name}`}
    >
      <section
        aria-labelledby="arena-question"
        className="bg-card-bg border border-card-border rounded-xl px-4 pt-5 pb-4 sm:px-8 sm:pt-6 mb-4"
      >
        <p className="text-sm text-foreground/75 text-center">The question</p>
        <h2 id="arena-question" className="mt-1 text-xl sm:text-2xl font-semibold text-center text-foreground break-words">
          {/* A question turned down for what it says is not echoed back in large type */}
          {phase === 'declined' && declineReason === 'topic' ? 'A question set aside' : <>&ldquo;{topicName}&rdquo;</>}
        </h2>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-6">
          <Speaker name={person1Name} side="left" state={activeSide === 'left' ? activeState : null} reducedMotion={reducedMotion} />
          <span className="self-center pb-8 text-xl sm:text-2xl font-semibold text-foreground/60" aria-hidden="true">&amp;</span>
          <Speaker name={person2Name} side="right" state={activeSide === 'right' ? activeState : null} reducedMotion={reducedMotion} />
        </div>
        <p className="mt-3 text-sm text-foreground/75 text-center">Imagined voices, not real quotes.</p>
      </section>

      {(phase === 'debating' || phase === 'stopped') && (
        <div className="flex items-center justify-center gap-2 mb-3">
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

      <div
        ref={debateRef}
        onScroll={handleTranscriptScroll}
        tabIndex={0}
        role="log"
        aria-live="polite"
        aria-label="Debate transcript"
        className="bg-card-bg border border-card-border rounded-xl p-4 sm:p-6 min-h-[240px] max-h-[60vh] overflow-y-auto space-y-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {history.map((entry) => (
          <DebateBubble key={entry.round} entry={entry} side={sideOf(entry.round)} />
        ))}

        {phase === 'debating' && typingText && (
          <div aria-hidden="true">
            <DebateBubble
              entry={{ speaker: nextSpeaker, argument: typingText, round: currentRound }}
              side={sideOf(currentRound)}
              typing
            />
          </div>
        )}

        {waitingForTurn && (
          <div className="flex items-center justify-center gap-2 py-3 text-foreground/75">
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
          <p className="text-center text-sm text-foreground/80 leading-relaxed py-4 max-w-md mx-auto">
            {DECLINE_LINES[declineReason ?? 'unknown']}
          </p>
        )}

        {phase === 'judging' && (
          <div className="flex items-center justify-center gap-2 py-6 text-foreground/75">
            <Loader2 size={18} className={reducedMotion ? '' : 'animate-spin'} aria-hidden="true" />
            <span className="text-sm">Letting it settle...</span>
          </div>
        )}
      </div>

      {phase === 'closing' && closing && (
        <ClosingThoughts closing={closing} first={person1Name} second={person2Name} headingRef={closingHeadingRef} />
      )}

      <div className="flex flex-wrap justify-center gap-3 mt-5">
        {phase === 'debating' && (
          <button ref={stopRef} type="button" onClick={handleStop} className={buttonClassName('secondary', 'md', ACTION)}>
            <Square size={16} aria-hidden="true" />
            Stop
          </button>
        )}
        {phase === 'stopped' && history.length < TOTAL_ROUNDS && (
          <button ref={continueRef} type="button" onClick={runDebate} className={buttonClassName('primary', 'md', ACTION)}>
            <Play size={16} aria-hidden="true" />
            {interruption ? 'Try again' : 'Continue'}
          </button>
        )}
        {phase === 'declined' && declineReason === 'voice' && (
          <button ref={declineActionRef} type="button" onClick={() => backToSetup('person1')} className={buttonClassName('primary', 'md', ACTION)}>
            <UserRound size={16} aria-hidden="true" />
            Choose other voices
          </button>
        )}
        {phase === 'declined' && declineReason === 'topic' && (
          <button ref={declineActionRef} type="button" onClick={() => backToSetup('topic')} className={buttonClassName('primary', 'md', ACTION)}>
            <HelpCircle size={16} aria-hidden="true" />
            Ask another question
          </button>
        )}
        {(phase === 'declined' || phase === 'closing') && (
          <button
            ref={phase === 'declined' && declineReason === null ? declineActionRef : undefined}
            type="button"
            onClick={handleSurprise}
            className={buttonClassName(phase === 'declined' && declineReason !== null ? 'secondary' : 'primary', 'md', ACTION)}
          >
            <Shuffle size={16} aria-hidden="true" />
            Surprise me
          </button>
        )}
        <Button onClick={() => backToSetup()} variant="secondary" className={ACTION}>
          <RotateCcw size={16} aria-hidden="true" />
          New debate
        </Button>
      </div>
    </div>
  )
}

// A pixel watermelon slice with a face, drawn facing right; the right-hand speaker is mirrored so the two face each other
const FACE = [
  '....GGGGGG....',
  '..GGLLLLLLGG..',
  '.GLLRRRRRRLLG.',
  '.GLRRRRRRRRLG.',
  'GLRRSRRRRRRRLG',
  'GLRRRRRERRERLG',
  'GLRRRRRERRERLG',
  'GLRSRRRRRRRRLG',
  'GLRRRRRRMMRRLG',
  'GLRRRRRROORRLG',
  '.GLRRSRRRRRLG.',
  '.GLLRRRRRRLLG.',
  '..GGLLLLLLGG..',
  '....GGGGGG....',
]

function pixelPath(cells: string): string {
  const d: string[] = []
  FACE.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (cells.includes(row[x])) d.push(`M${x} ${y}h1v1h-1z`)
  })
  return d.join('')
}

const RIND = pixelPath('G')
const INNER_RIND = pixelPath('L')
const FLESH = pixelPath('RO')
const SEEDS = pixelPath('SEM')
const OPEN_MOUTH = pixelPath('O')

function Medallion({ side, speaking }: { side: Side; speaking: boolean }) {
  return (
    <svg
      viewBox="0 0 14 14"
      shapeRendering="crispEdges"
      className="w-16 h-16 sm:w-24 sm:h-24"
      style={side === 'right' ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
    >
      <path d={RIND} fill="var(--melon-green)" />
      <path d={INNER_RIND} fill="var(--melon-green-light)" />
      <path d={FLESH} fill={side === 'left' ? 'var(--melon-red)' : 'var(--warm)'} />
      <path d={SEEDS} fill="var(--foreground)" />
      {speaking && <path d={OPEN_MOUTH} fill="var(--foreground)" />}
    </svg>
  )
}

function Speaker({
  name,
  side,
  state,
  reducedMotion,
}: {
  name: string
  side: Side
  state: 'speaking' | 'thinking' | null
  reducedMotion: boolean
}) {
  const active = state !== null
  return (
    <div className="flex flex-col items-center text-center min-w-0">
      <div
        className={`rounded-full p-1.5 border-2 ${active ? 'border-foreground/50' : 'border-transparent'} ${
          reducedMotion ? '' : 'transition-transform duration-300'
        } ${active && !reducedMotion ? '-translate-y-1' : ''}`}
      >
        <Medallion side={side} speaking={state === 'speaking'} />
      </div>
      <p className="mt-2 text-base sm:text-lg font-medium text-foreground break-words max-w-full">{name}</p>
      <p className="text-sm text-foreground/75 min-h-[1.25rem]" aria-hidden="true">
        {state === 'speaking' ? 'speaking' : state === 'thinking' ? 'thinking' : ''}
      </p>
    </div>
  )
}

function ClosingThoughts({
  closing,
  first,
  second,
  headingRef,
}: {
  closing: Closing
  first: string
  second: string
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  return (
    <section
      aria-labelledby="closing-heading"
      className="mt-6 bg-card-bg border border-card-border rounded-xl px-4 py-6 sm:px-8 sm:py-8 space-y-6 animate-fade"
    >
      <h2
        id="closing-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-xl sm:text-2xl font-semibold text-center text-foreground focus:outline-none focus-visible:shadow-none!"
      >
        Closing thoughts
      </h2>

      <div>
        <h3 className="text-base font-semibold text-foreground/80 text-center mb-3">What each got right</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 min-w-0">
            <p className="text-sm font-semibold text-accent break-words mb-1">{first}</p>
            <p className="text-base text-foreground/90 leading-relaxed break-words">{closing.firstInsight}</p>
          </div>
          <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 min-w-0">
            <p className="text-sm font-semibold text-melon-green break-words mb-1">{second}</p>
            <p className="text-base text-foreground/90 leading-relaxed break-words">{closing.secondInsight}</p>
          </div>
        </div>
      </div>

      <div className="text-center max-w-xl mx-auto">
        <h3 className="text-base font-semibold text-foreground/80 mb-2">What the conversation revealed</h3>
        <p className="text-base text-foreground/90 leading-relaxed break-words">{closing.revealed}</p>
      </div>

      <div className="text-center max-w-xl mx-auto">
        <h3 className="text-base font-semibold text-foreground/80 mb-2">To take with you</h3>
        <p className="text-lg text-foreground italic leading-relaxed break-words">{closing.question}</p>
      </div>
    </section>
  )
}

function DebateBubble({ entry, side, typing = false }: { entry: DebateEntry; side: Side; typing?: boolean }) {
  const isLeft = side === 'left'
  return (
    <div className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[88%] sm:max-w-[72%] min-w-0 rounded-xl px-4 py-3 ${
          isLeft
            ? 'bg-accent/10 border border-accent/20 rounded-tl-sm'
            : 'bg-success/10 border border-success/20 rounded-tr-sm'
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isLeft ? 'bg-accent' : 'bg-success'}`} aria-hidden="true" />
          <span className="text-sm font-semibold break-words min-w-0 text-foreground">
            {entry.speaker}
          </span>
          <span className="text-xs text-foreground/75 shrink-0">Round {entry.round}</span>
        </div>
        <p className="text-[15px] sm:text-base text-foreground/90 leading-relaxed break-words">
          {entry.argument}
          {typing && <span className="inline-block w-0.5 h-4 bg-foreground/40 ml-0.5 align-middle" />}
        </p>
      </div>
    </div>
  )
}
