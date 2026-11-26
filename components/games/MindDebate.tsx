'use client'

import { REPLY_TIMEOUT_MS } from '@/lib/games/reply-timeout'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Go } from '@/components/seedpress/Go'
import { Stamp } from '@/components/seedpress/Stamp'
import { QuietButton } from '@/components/seedpress/QuietButton'
import { Loading } from '@/components/seedpress/Loading'
import { CareBlock } from '@/components/seedpress/CareBlock'
import { StickyTray } from '@/components/seedpress/StickyTray'
import { cn } from '@/lib/utils/cn'
import styles from './Arena.module.css'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { PAIRINGS, pairingIndexOf, type EmblemId } from '@/lib/games/arena-pairings'
import { Emblem, OWN_CARD, PairingDeck, VOICE, VoiceMarker, voiceTint } from '@/components/games/ArenaPairingDeck'
import { Keepsake } from '@/components/games/Keepsake'
import { arenaKeepsake } from '@/lib/keepsake/arena'
import { useCareMode } from '@/components/games/CareMode'
import { OwnSupportMark } from '@/components/games/OwnSupport'
import { soundsLikeDistress } from '@/lib/games/community-words/moderation'

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

// Care is its own phase, never a decline: a question that sounds like someone in danger is met with support, not a refusal
type GamePhase = 'setup' | 'debating' | 'stopped' | 'declined' | 'judging' | 'closing' | 'care'
type DeclineReason = 'voice' | 'topic' | null
type FocusTarget = 'transcript' | 'person1' | 'topic' | 'start'
type Side = 'left' | 'right'

const TOTAL_ROUNDS = 6
// About 200 words a minute, an easy reading pace, with a breath between speakers.
const WORD_DELAY_MS = 300
const TURN_PAUSE_MS = 1500
const NAME_MAX = 60
const TOPIC_MAX = 120
// The row that says a turn is on its way sits below the last turn and grows the page by itself, so a little room below still counts as the bottom
const STICK_TO_BOTTOM_PX = 160
// Below this width the transcript grows with the page instead of scrolling in a box of its own
const TRANSCRIPT_BOX_QUERY = '(min-width: 640px)'
const ABORTED = Symbol('aborted')

/** Where the debate stands, in words, so nothing on screen or in a screen reader counts rounds. */
function debateInWords(finished: number, currentRound: number): string {
  if (finished >= TOTAL_ROUNDS) return 'Every turn has been heard'
  if (currentRound >= TOTAL_ROUNDS) return 'Last round'
  if (finished < 2) return 'Near the start'
  if (finished >= TOTAL_ROUNDS - 2) return 'Nearing the end'
  return 'Midway through'
}

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

/** The lowest point of the screen not covered by the action bar resting on it. */
function visibleBottom(bar: HTMLElement | null): number {
  return Math.min(window.innerHeight, bar?.getBoundingClientRect().top ?? window.innerHeight)
}

const focusLost = () => !document.activeElement || document.activeElement === document.body

class Declined extends Error {
  constructor(readonly reason: DeclineReason) {
    super('declined')
  }
}

class NeedsCare extends Error {
  constructor() {
    super('care')
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
  const [turnByTurnChoice, setTurnByTurnChoice] = useState<boolean | null>(null)
  const [awaitingReader, setAwaitingReader] = useState(false)
  const [writingOwn, setWritingOwn] = useState(false)
  const reducedMotion = useReducedMotion()
  const { enterCareMode } = useCareMode()
  const turnByTurn = turnByTurnChoice ?? reducedMotion

  const regionRef = useRef<HTMLDivElement>(null)
  const debateRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const person1Ref = useRef<HTMLInputElement>(null)
  const topicRef = useRef<HTMLInputElement>(null)
  const startRef = useRef<HTMLButtonElement>(null)
  const stopRef = useRef<HTMLButtonElement>(null)
  const continueRef = useRef<HTMLButtonElement>(null)
  const declineActionRef = useRef<HTMLButtonElement>(null)
  const closingHeadingRef = useRef<HTMLHeadingElement>(null)
  const careHeadingRef = useRef<HTMLHeadingElement>(null)
  const focusNextRef = useRef<FocusTarget | null>(null)

  const stickToBottomRef = useRef(true)
  // The session covers a whole debate; play covers what is being shown now, so Stop can pause the show without dropping a reply already paid for
  const sessionRef = useRef<AbortController | null>(null)
  const playRef = useRef<AbortController | null>(null)
  const historyRef = useRef<DebateEntry[]>([])
  const pendingRef = useRef<{ round: number; reply: Promise<DebateEntry> } | null>(null)
  const pairingRef = useRef(-1)
  const turnByTurnRef = useRef(turnByTurn)
  const advanceRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    turnByTurnRef.current = turnByTurn
  }, [turnByTurn])

  useEffect(() => () => {
    sessionRef.current?.abort()
    playRef.current?.abort()
  }, [])

  // Follows new text only while the reader is already at the bottom, so scrolling back to reread is never yanked away
  useEffect(() => {
    const el = debateRef.current
    if (!el || !stickToBottomRef.current) return
    if (window.matchMedia(TRANSCRIPT_BOX_QUERY).matches) {
      el.scrollTop = el.scrollHeight
      return
    }
    const hidden = el.getBoundingClientRect().bottom - visibleBottom(barRef.current)
    if (hidden > 0) window.scrollBy({ top: hidden })
  }, [history, typingText, phase, currentRound, awaitingReader])

  // Whatever control was just pressed usually disappears with the phase it belonged to, so focus moves to the next sensible place
  useEffect(() => {
    const target = focusNextRef.current
    focusNextRef.current = null
    if (target === 'transcript') debateRef.current?.focus()
    else if (target === 'person1') person1Ref.current?.focus()
    else if (target === 'topic') topicRef.current?.focus()
    else if (target === 'start') startRef.current?.focus()
    else if (phase === 'care') {
      careHeadingRef.current?.focus({ preventScroll: true })
      careHeadingRef.current?.closest('section')?.scrollIntoView({ block: 'start' })
    } else if (phase === 'closing' || phase === 'declined') {
      // An ending the reader would otherwise have to go looking for
      if (focusLost() || regionRef.current?.contains(document.activeElement)) {
        if (phase === 'closing') closingHeadingRef.current?.focus({ preventScroll: true })
        else declineActionRef.current?.focus()
      }
      // The closing is the ending: it opens at the top of the screen, not under the controls at its foot
      if (phase === 'closing') closingHeadingRef.current?.closest('section')?.scrollIntoView({ block: 'start' })
    } else if (focusLost()) {
      if (phase === 'debating') stopRef.current?.focus()
      else if (phase === 'stopped') continueRef.current?.focus()
    }
  }, [phase])

  const handleTranscriptScroll = useCallback(() => {
    const el = debateRef.current
    if (!el) return
    stickToBottomRef.current = window.matchMedia(TRANSCRIPT_BOX_QUERY).matches
      ? el.scrollTop + el.clientHeight >= el.scrollHeight - STICK_TO_BOTTOM_PX
      : el.getBoundingClientRect().bottom <= visibleBottom(barRef.current) + STICK_TO_BOTTOM_PX
    // Reading back pauses the debate; coming back down to the newest turn lets it go on
    if (stickToBottomRef.current && !turnByTurnRef.current) advanceRef.current?.()
  }, [])

  // On a phone the page itself scrolls, so reading back is noticed there
  useEffect(() => {
    if (phase !== 'debating') return
    window.addEventListener('scroll', handleTranscriptScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleTranscriptScroll)
  }, [phase, handleTranscriptScroll])

  const chooseTurnByTurn = (on: boolean) => {
    setTurnByTurnChoice(on)
    turnByTurnRef.current = on
    if (!on && stickToBottomRef.current) advanceRef.current?.()
  }

  const handleNextTurn = () => {
    if (!advanceRef.current) return
    advanceRef.current()
    stickToBottomRef.current = true
    if (!turnByTurnRef.current) stopRef.current?.focus()
  }

  const person1Name = person1.trim()
  const person2Name = person2.trim()
  const topicName = topic.trim()
  const canStart = person1Name.length > 0 && person2Name.length > 0 && topicName.length > 0
  const pairingIndex = pairingIndexOf(person1, person2, topic)
  const selectedCard =
    pairingIndex !== -1 ? pairingIndex : writingOwn || person1 || person2 || topic ? OWN_CARD : null
  const emblems = pairingIndex !== -1 ? PAIRINGS[pairingIndex].emblems : null

  const typeText = useCallback(
    (text: string, signal: AbortSignal): Promise<void> => {
      return new Promise((resolve) => {
        if (reducedMotion || signal.aborted) {
          resolve()
          return
        }
        const words = text.match(/\S+\s*/g) ?? [text]
        let i = 0
        const interval = setInterval(() => {
          i++
          setTypingText(words.slice(0, i).join(''))
          if (i >= words.length) {
            clearInterval(interval)
            resolve()
          }
        }, WORD_DELAY_MS)
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
        // A turn that never comes reads as a lost train of thought, never an endless wait
        signal: AbortSignal.any([signal, AbortSignal.timeout(REPLY_TIMEOUT_MS)]),
      })
      if (!res.ok) throw new Error(`turn ${res.status}`)
      const data = await res.json()
      if (data.declined === true && data.reason === 'care') throw new NeedsCare()
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
          signal: AbortSignal.any([signal, AbortSignal.timeout(REPLY_TIMEOUT_MS)]),
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

  const waitForReader = useCallback((signal: AbortSignal): Promise<void> => {
    return new Promise((resolve) => {
      const done = () => {
        if (advanceRef.current !== done) return
        advanceRef.current = null
        setAwaitingReader(false)
        resolve()
      }
      advanceRef.current = done
      setAwaitingReader(true)
      signal.addEventListener('abort', done, { once: true })
    })
  }, [])

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
        if (error instanceof NeedsCare) {
          enterCareMode()
          setPhase('care')
          return
        }
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

      if (round < TOTAL_ROUNDS) {
        if (!turnByTurnRef.current) await wait(TURN_PAUSE_MS, play.signal)
        if (play.signal.aborted) return
        if (turnByTurnRef.current || !stickToBottomRef.current) await waitForReader(play.signal)
      }
      if (play.signal.aborted) return
    }

    setPhase('judging')
    const result = await fetchClosing(historyRef.current, session)
    if (session.aborted) return
    setClosing(result)
    setPhase('closing')
  }, [requestTurn, commit, typeText, waitForReader, fetchClosing, enterCareMode, person1Name, person2Name])

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
    // Words that sound like someone in danger are never sent off to be debated
    if ([person1Name, person2Name, topicName].some(soundsLikeDistress)) {
      enterCareMode()
      setPhase('care')
      return
    }
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
    // Words that called for care are not left waiting in the boxes; the topic goes too when the care came from the reply, since nothing here can tell which words prompted it
    if (phase === 'care') {
      if (soundsLikeDistress(person1)) setPerson1('')
      if (soundsLikeDistress(person2)) setPerson2('')
      setTopic('')
    }
    focusNextRef.current = focus ?? null
    setPhase('setup')
  }

  const pickPairing = (index: number) => {
    const pairing = PAIRINGS[index]
    pairingRef.current = index
    setPerson1(pairing.first)
    setPerson2(pairing.second)
    setTopic(pairing.topic)
    setWritingOwn(false)
  }

  const writeOwn = () => {
    if (pairingIndex !== -1) {
      setPerson1('')
      setPerson2('')
      setTopic('')
    }
    setWritingOwn(true)
    person1Ref.current?.focus()
  }

  const handleSurprise = () => {
    let next = Math.floor(Math.random() * PAIRINGS.length)
    if (next === pairingRef.current) next = (next + 1) % PAIRINGS.length
    pickPairing(next)
    if (phase !== 'setup') backToSetup('start')
  }

  if (phase === 'setup') {
    return (
      <div className={cn(styles.arena, 'max-w-3xl mx-auto')} role="region" aria-label="Debate setup">
        <p id="deck-hint" className="text-center mb-3 sm:mb-4">
          Pick two minds and a question, or write your own.
        </p>
        <PairingDeck selected={selectedCard} onPick={pickPairing} onWriteOwn={writeOwn} />

        <form onSubmit={handleStart} className="mt-5 sm:mt-6 max-w-xl mx-auto space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="sp-slip min-w-0">
              <label htmlFor="person1" className="sp-slip__label">
                <span className={styles.fieldLabel}>
                  <VoiceMarker second={false} />
                  First debater
                </span>
              </label>
              <input
                ref={person1Ref}
                id="person1"
                type="text"
                value={person1}
                onChange={(e) => setPerson1(e.target.value)}
                placeholder="e.g. Socrates"
                maxLength={NAME_MAX}
                className="sp-slip__input"
                autoComplete="off"
              />
            </div>
            <div className="sp-slip min-w-0">
              <label htmlFor="person2" className="sp-slip__label">
                <span className={styles.fieldLabel}>
                  <VoiceMarker second />
                  Second debater
                </span>
              </label>
              <input
                id="person2"
                type="text"
                value={person2}
                onChange={(e) => setPerson2(e.target.value)}
                placeholder="e.g. Nietzsche"
                maxLength={NAME_MAX}
                className="sp-slip__input"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="sp-slip">
            <label htmlFor="topic" className="sp-slip__label">
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
              className="sp-slip__input"
              autoComplete="off"
            />
          </div>

          <PaceToggle checked={turnByTurn} onChange={chooseTurnByTurn} />

          <StickyTray className="flex flex-wrap items-center gap-3">
            <Go ref={startRef} type="submit" unavailable={canStart ? undefined : 'Pick two minds and a question first.'}>
              Begin
            </Go>
            <Stamp icon="dice" onClick={handleSurprise}>
              Surprise me
            </Stamp>
          </StickyTray>
        </form>
      </div>
    )
  }

  if (phase === 'care') {
    return (
      <div className="max-w-2xl mx-auto" role="region" aria-label="Support">
        <OwnSupportMark />
        <section aria-labelledby="arena-care-heading" className="grid gap-4">
          <h2 id="arena-care-heading" ref={careHeadingRef} tabIndex={-1} className={cn(styles.careTitle, 'scroll-mt-20')}>
            You don&apos;t have to hold this alone
          </h2>
          <CareBlock lead="If this question is close to home, please talk to someone who can listen." />
          <p className="m-0">This is not one for a debate. The Arena will be here whenever you want a lighter question.</p>
          <div>
            <QuietButton onClick={() => backToSetup('topic')}>Back to the start</QuietButton>
          </div>
        </section>
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
      className={cn(styles.arena, 'max-w-4xl mx-auto')}
      role="region"
      aria-label={`Debate: ${person1Name} and ${person2Name}`}
    >
      <section aria-labelledby="arena-question" className={cn(styles.sheet, styles.stage, 'mb-3 sm:mb-4')}>
        <p className={cn(styles.caption, 'hidden sm:block')}>The question</p>
        <h2 id="arena-question" className={cn(styles.question, 'sm:mt-1')}>
          {/* A question turned down for what it says is not echoed back in large type */}
          {phase === 'declined' && declineReason === 'topic' ? 'A question set aside' : <>&ldquo;{topicName}&rdquo;</>}
        </h2>
        <div className="mt-2 sm:mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-6">
          <Speaker name={person1Name} side="left" emblem={emblems?.[0]} state={activeSide === 'left' ? activeState : null} />
          <span className={cn(styles.amp, 'pb-6 sm:pb-8')} aria-hidden="true">&amp;</span>
          <Speaker name={person2Name} side="right" emblem={emblems?.[1]} state={activeSide === 'right' ? activeState : null} />
        </div>
        <p className={cn(styles.caption, 'mt-1 sm:mt-3')}>Imagined voices, not real quotes.</p>
      </section>

      {(phase === 'debating' || phase === 'stopped') && (
        <div className="flex items-center justify-center mb-3">
          <div
            className={styles.marks}
            role="img"
            data-testid="debate-dots"
            aria-label={debateInWords(history.length, currentRound)}
          >
            {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
              <div key={i} className={cn(styles.mark, i < history.length && styles.markDone)} />
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
        className={cn(styles.sheet, styles.transcript, 'sm:max-h-[60vh] sm:overflow-y-auto space-y-4')}
      >
        {history.map((entry) => (
          <DebateBubble key={entry.round} entry={entry} side={sideOf(entry.round)} />
        ))}

        {phase === 'debating' && typingText && (
          <div aria-hidden="true">
            <DebateBubble
              entry={{ speaker: nextSpeaker, argument: typingText, round: currentRound }}
              side={sideOf(currentRound)}
            />
          </div>
        )}

        {waitingForTurn && (
          <div className={cn(styles.waiting, 'flex justify-center')}>
            <Loading>{`${nextSpeaker} is thinking...`}</Loading>
          </div>
        )}

        {phase === 'stopped' && (
          <p className={cn(styles.note, 'py-3')}>
            {interruption ?? 'The debate is paused.'}
          </p>
        )}

        {phase === 'declined' && (
          <p className={cn(styles.note, 'py-4')}>
            {DECLINE_LINES[declineReason ?? 'unknown']}
          </p>
        )}

        {phase === 'judging' && (
          <div className={cn(styles.waiting, 'flex justify-center py-4')}>
            <Loading>Letting it settle...</Loading>
          </div>
        )}
      </div>

      {phase === 'debating' && awaitingReader && !turnByTurn && (
        <p className={cn(styles.note, 'mt-3')}>
          Paused while you read back. Scroll down, or press Next turn, to go on.
        </p>
      )}

      {phase === 'closing' && closing && (
        <ClosingThoughts
          closing={closing}
          first={person1Name}
          second={person2Name}
          topic={topicName}
          emblems={emblems}
          headingRef={closingHeadingRef}
        />
      )}

      <StickyTray ref={barRef} pinned={phase !== 'closing'} className="mt-2 sm:mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {phase === 'closing' && (
          <Stamp icon="dice" onClick={handleSurprise}>
            Surprise me
          </Stamp>
        )}
        {phase === 'declined' && declineReason !== null && (
          <Stamp icon="dice" onClick={handleSurprise}>
            Surprise me
          </Stamp>
        )}
        {phase === 'debating' && (turnByTurn || awaitingReader) && (
          <Go onClick={handleNextTurn} aria-disabled={awaitingReader ? undefined : true}>
            Next turn
          </Go>
        )}
        {phase === 'debating' && (
          <Stamp ref={stopRef} icon="stop" onClick={handleStop}>
            Stop
          </Stamp>
        )}
        {phase === 'stopped' && history.length < TOTAL_ROUNDS && (
          <Go ref={continueRef} onClick={runDebate}>
            {interruption ? 'Try again' : 'Continue'}
          </Go>
        )}
        {phase === 'declined' && declineReason === 'voice' && (
          <Go ref={declineActionRef} onClick={() => backToSetup('person1')}>
            Choose other voices
          </Go>
        )}
        {phase === 'declined' && declineReason === 'topic' && (
          <Go ref={declineActionRef} onClick={() => backToSetup('topic')}>
            Ask another question
          </Go>
        )}
        {phase === 'declined' && declineReason === null && (
          <Go ref={declineActionRef} onClick={handleSurprise}>
            Surprise me
          </Go>
        )}
        {phase === 'closing' ? (
          <Go onClick={() => backToSetup()}>New debate</Go>
        ) : (
          <QuietButton onClick={() => backToSetup()}>New debate</QuietButton>
        )}
      </StickyTray>

      {(phase === 'debating' || phase === 'stopped') && (
        <div className="mt-2 flex justify-center">
          <PaceToggle checked={turnByTurn} onChange={chooseTurnByTurn} />
        </div>
      )}
    </div>
  )
}

function PaceToggle({ checked, onChange }: { checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className={styles.pace}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        Turn by turn <span className={styles.soft}>(each reply waits for Next turn)</span>
      </span>
    </label>
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

/** A written-by-hand pairing gets the melon, printed in the speaker's own ink. */
function Medallion({ side, speaking }: { side: Side; speaking: boolean }) {
  return (
    <svg
      viewBox="0 0 14 14"
      shapeRendering="crispEdges"
      className="w-12 h-12 sm:w-24 sm:h-24"
      style={side === 'right' ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
    >
      <path d={RIND} style={{ fill: 'var(--voice)' }} />
      <path d={INNER_RIND} style={{ fill: voiceTint('var(--voice)', 40) }} />
      <path d={FLESH} style={{ fill: voiceTint('var(--voice)', 14) }} />
      <path d={SEEDS} style={{ fill: 'var(--ink)' }} />
      {speaking && <path d={OPEN_MOUTH} style={{ fill: 'var(--ink)' }} />}
    </svg>
  )
}

function Speaker({
  name,
  side,
  emblem,
  state,
}: {
  name: string
  side: Side
  /** The picture from the pairing's card; a pairing written by hand gets the melon. */
  emblem?: EmblemId
  state: 'speaking' | 'thinking' | null
}) {
  const active = state !== null
  const voice = side === 'left' ? VOICE.a : VOICE.b
  return (
    <div className={cn(styles.speaker, side === 'left' ? styles.tintA : styles.tintB)}>
      <div className={cn(styles.medal, active && styles.medalActive)}>
        {emblem ? (
          <Emblem id={emblem} color={voice} className="w-12 h-12 sm:w-24 sm:h-24" />
        ) : (
          <Medallion side={side} speaking={state === 'speaking'} />
        )}
      </div>
      <p className={cn(styles.voiceName, 'mt-1 sm:mt-2')}>
        <VoiceMarker second={side === 'right'} />
        <span className={styles.voiceText}>{name}</span>
      </p>
      <p className={styles.state} aria-hidden="true">
        {state === 'speaking' ? 'speaking' : state === 'thinking' ? 'thinking' : ''}
      </p>
    </div>
  )
}

function ClosingThoughts({
  closing,
  first,
  second,
  topic,
  emblems,
  headingRef,
}: {
  closing: Closing
  first: string
  second: string
  topic: string
  emblems: readonly [EmblemId, EmblemId] | null
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  const [day] = useState(() => new Date())
  const plan = useMemo(
    () => arenaKeepsake({ first, second, topic, question: closing.question, emblems, day }),
    [first, second, topic, closing.question, emblems, day],
  )
  return (
    <section aria-labelledby="closing-heading" className={cn(styles.sheet, styles.closing)}>
      <h2 id="closing-heading" ref={headingRef} tabIndex={-1} className={styles.closingTitle}>
        Closing thoughts
      </h2>

      <div>
        <h3 className={styles.partTitle}>What each got right</h3>
        <div className={styles.insights}>
          <Insight name={first} insight={closing.firstInsight} second={false} />
          <Insight name={second} insight={closing.secondInsight} second />
        </div>
      </div>

      <div>
        <h3 className={styles.partTitle}>What the conversation revealed</h3>
        <p className={styles.readable}>{closing.revealed}</p>
      </div>

      <div>
        <h3 className={styles.partTitle}>To take with you</h3>
        <p className={styles.question2}>{closing.question}</p>
      </div>

      <Keepsake plan={plan} label="A keepsake of this debate" />
    </section>
  )
}

function Insight({ name, insight, second }: { name: string; insight: string; second: boolean }) {
  return (
    <div className={cn(styles.insight, second && styles.insightSecond, second ? styles.tintB : styles.tintA)}>
      <p className={styles.insightName}>
        <VoiceMarker second={second} />
        <span className={styles.voiceText}>{name}</span>
      </p>
      <p className="m-0 leading-relaxed">{insight}</p>
    </div>
  )
}

function DebateBubble({ entry, side }: { entry: DebateEntry; side: Side }) {
  const isLeft = side === 'left'
  return (
    <div className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}>
      <div className={cn(styles.bubble, isLeft ? styles.bubbleLeft : styles.bubbleRight, isLeft ? styles.tintA : styles.tintB)}>
        <div className={styles.bubbleHead}>
          <VoiceMarker second={!isLeft} />
          <span className={cn(styles.bubbleName, styles.voiceText, 'font-bold')}>{entry.speaker}</span>
        </div>
        <p className={styles.bubbleText}>{entry.argument}</p>
      </div>
    </div>
  )
}
