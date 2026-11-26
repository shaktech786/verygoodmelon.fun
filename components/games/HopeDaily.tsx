'use client'

import { EXTRA_TIMEOUT_MS, REPLY_TIMEOUT_MS } from '@/lib/games/reply-timeout'
import { useState, useEffect, useMemo, useRef, type CSSProperties, type FormEvent } from 'react'
import { Keepsake } from '@/components/games/Keepsake'
import { optimistKeepsake } from '@/lib/keepsake/optimist'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { playTones, wakeTones } from '@/components/games/gentleCues'
import { LIVE_COMMENTARY_GUESSES, fallbackCommentary } from '@/lib/games/hope-daily/commentary'
import {
  buildLadder,
  describeGuess,
  describeLetter,
  restoreProgress,
  storyText,
  type KnownLetter,
  type PlacedLetter,
  type Progress,
  type Reveal,
  type Status,
  type StoryPart,
  type Unfolded,
} from '@/lib/games/hope-daily/puzzle'
import {
  LETTER_DROP_MS,
  SOLVED_CHIME_HZ,
  SOLVED_CHIME_LOUDNESS,
  SOLVED_CHIME_SECONDS,
  letterDropDelayMs,
  lettersLandAfterSeconds,
} from '@/lib/games/hope-daily/solved'
import { Icon } from '@/components/seedpress/icons/Icon'
import { Go } from '@/components/seedpress/Go'
import { Stamp } from '@/components/seedpress/Stamp'
import { QuietButton } from '@/components/seedpress/QuietButton'
import { InlineConfirm } from '@/components/seedpress/InlineConfirm'
import { Note } from '@/components/seedpress/Note'
import { WritingSlip } from '@/components/seedpress/WritingSlip'
import { cn } from '@/lib/utils/cn'
import styles from './HopeDaily.module.css'

interface Puzzle {
  category: string
  wordLength: number
  clue: string
  story: StoryPart[]
}

const STORAGE_KEY = 'hope-daily-state'
const SHARE_LINK = 'verygoodmelon.fun/games/the-silver-lining'
const GUESS_ERROR = 'That guess did not go through. Give it another try in a moment.'
const LETTER_ERROR = 'No letter just now. Try again in a moment.'
const FRESH: Progress = { guesses: [], known: [], unfolded: 1, status: 'playing', reveal: null }

// The word changes at midnight UTC on the server, so the saved game is keyed the same way.
const todayKey = () => new Date().toISOString().slice(0, 10)

function isPuzzle(data: unknown): data is Puzzle {
  const puzzle = data as Puzzle
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof puzzle.wordLength === 'number' &&
    puzzle.wordLength > 0 &&
    typeof puzzle.clue === 'string' &&
    Array.isArray(puzzle.story) &&
    puzzle.story.length > 0
  )
}

function isReveal(data: unknown): data is Reveal {
  const reveal = data as Reveal
  return typeof data === 'object' && data !== null && typeof reveal.word === 'string' && Array.isArray(reveal.story)
}

function isPlacedLetter(data: unknown): data is PlacedLetter {
  const letter = data as PlacedLetter
  return typeof data === 'object' && data !== null && Number.isInteger(letter.position) && typeof letter.letter === 'string'
}

function sourceName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function addKnown(known: KnownLetter[], letters: KnownLetter[]): KnownLetter[] {
  return [...new Map([...known, ...letters]).entries()].sort(([a], [b]) => a - b)
}

export default function HopeDaily() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [progress, setProgress] = useState<Progress>(FRESH)
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'look' | 'info'>('info')
  const [commentary, setCommentary] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmingTell, setConfirmingTell] = useState(false)
  const [shareNote, setShareNote] = useState('')
  const [freshPart, setFreshPart] = useState<number | null>(null)
  const [foundNow, setFoundNow] = useState(false)
  const reduceMotion = useReducedMotion()
  // Only the newest guess may speak: a slow reply for an earlier guess is dropped.
  const commentaryRequestRef = useRef(0)
  const endingHeadingRef = useRef<HTMLHeadingElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const finishedThisVisitRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    fetch('/api/hope-daily')
      .then(response => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        if (cancelled) return
        if (!isPuzzle(data)) {
          setLoadFailed(true)
          return
        }
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          const restored = saved ? restoreProgress(JSON.parse(saved), todayKey(), data.wordLength) : null
          if (restored) setProgress(restored)
          else if (saved) localStorage.removeItem(STORAGE_KEY)
        } catch {
          localStorage.removeItem(STORAGE_KEY)
        }
        setPuzzle(data)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [loadAttempt])

  useEffect(() => {
    if (!puzzle) return
    const untouched = progress.guesses.length === 0 && progress.unfolded === 1 && progress.known.length === 0 && progress.status === 'playing'
    if (untouched) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, date: todayKey(), ...progress }))
    } catch {
      // Private browsing can refuse storage; the game still plays, it just will not be remembered.
    }
  }, [puzzle, progress])

  // A finished day whose good news never arrived (offline at the end) asks again, on this visit or the next.
  useEffect(() => {
    if (!puzzle || progress.status === 'playing' || progress.reveal) return
    let cancelled = false
    fetch('/api/hope-daily', { method: 'PUT' })
      .then(response => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        if (!cancelled && isReveal(data)) setProgress(previous => ({ ...previous, reveal: data }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [puzzle, progress.status, progress.reveal])

  // Focus follows the player into the ending, because the controls they were using are gone.
  useEffect(() => {
    if (progress.status !== 'playing' && finishedThisVisitRef.current) {
      endingHeadingRef.current?.focus()
    }
  }, [progress.status])

  if (!puzzle && loadFailed) {
    return (
      <div className={styles.waiting} role="status" aria-live="polite">
        <p>Today&apos;s good news is taking a moment to arrive.</p>
        <Stamp
          onClick={() => {
            setLoadFailed(false)
            setLoadAttempt(attempt => attempt + 1)
          }}
        >
          Try again
        </Stamp>
      </div>
    )
  }

  if (!puzzle) {
    return (
      <div className={styles.waiting} role="status" aria-live="polite">
        <p>Unfolding today&apos;s good news...</p>
      </div>
    )
  }

  const wordLength = puzzle.wordLength
  const ladder = buildLadder(puzzle.story.length)
  const unfolded = Math.min(progress.unfolded, ladder.length)
  const shownSteps = ladder.slice(0, unfolded)
  const shownParts = new Set(shownSteps.flatMap(step => (step.kind === 'story' ? [step.index] : [])))
  const clueShown = shownSteps.some(step => step.kind === 'clue')
  const ladderDone = unfolded >= ladder.length
  const knownMap = new Map(progress.known)
  const isPlaying = progress.status === 'playing'
  const allKnown = progress.known.length >= wordLength

  const say = (text: string, kind: 'look' | 'info' = 'look') => {
    setTone(kind)
    setMessage(text)
  }

  const finish = (status: Exclude<Status, 'playing'>, reveal: Reveal | null) => {
    finishedThisVisitRef.current = true
    commentaryRequestRef.current++
    setCommentary('')
    setMessage('')
    setConfirmingTell(false)
    setProgress(previous => ({ ...previous, status, reveal }))
    if (status !== 'found') return
    setFoundNow(true)
    // Silent unless the visitor turned this page's sound on; it rings as the last letter lands.
    playTones([{ hz: SOLVED_CHIME_HZ, at: lettersLandAfterSeconds(wordLength, !reduceMotion), seconds: SOLVED_CHIME_SECONDS }], SOLVED_CHIME_LOUDNESS)
  }

  const nextStep = (): Unfolded => {
    if (ladderDone) return null
    const step = ladder[unfolded]
    setFreshPart(step.kind === 'story' ? step.index : null)
    setProgress(previous => ({ ...previous, unfolded: unfolded + 1 }))
    return step
  }

  const placeLetters = (letters: KnownLetter[]) => {
    const known = addKnown(progress.known, letters)
    setProgress(previous => ({ ...previous, known }))
    if (known.length < wordLength) return
    // Every letter is out, but saying the word is still the player's moment, so it waits in the box.
    const spelled = new Map(known)
    setDraft(Array.from({ length: wordLength }, (_, position) => spelled.get(position) ?? '').join(''))
    setMessage(previous => `${previous} Every letter is showing. Press Try this word to finish.`.trim())
    inputRef.current?.focus()
  }

  const speakAbout = async (guess: string, guessNumber: number) => {
    const request = ++commentaryRequestRef.current
    setCommentary('')
    if (guessNumber > LIVE_COMMENTARY_GUESSES) {
      setCommentary(fallbackCommentary(guess, guessNumber))
      return
    }
    try {
      const response = await fetch('/api/hope-daily/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guess, guessNumber }),
        signal: AbortSignal.timeout(EXTRA_TIMEOUT_MS),
      })
      const data = response.ok ? await response.json() : null
      if (request !== commentaryRequestRef.current) return
      setCommentary(typeof data?.commentary === 'string' ? data.commentary : fallbackCommentary(guess, guessNumber))
    } catch {
      if (request === commentaryRequestRef.current) setCommentary(fallbackCommentary(guess, guessNumber))
    }
  }

  const readOn = async () => {
    if (busy) return
    setConfirmingTell(false)
    const step = nextStep()
    if (step) {
      say(step.kind === 'clue' ? 'The clue is now showing.' : 'The story unfolds a little more.', 'info')
      return
    }

    setBusy(true)
    try {
      const response = await fetch('/api/hope-daily/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ known: progress.known.map(([position]) => position) }),
        signal: AbortSignal.timeout(REPLY_TIMEOUT_MS),
      })
      const data: unknown = response.ok ? await response.json() : null
      if (!isPlacedLetter(data)) {
        say(LETTER_ERROR)
        return
      }
      say(describeLetter(data), 'info')
      placeLetters([[data.position, data.letter]])
    } catch {
      say(LETTER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  const submitGuess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Audio may only start inside the tap itself, and the answer arrives after it.
    wakeTones()
    // A tap on Try it would otherwise leave focus on a button that is about to be disabled, and so on the page itself
    inputRef.current?.focus()
    if (busy) return
    const guess = draft.toUpperCase()

    if (!guess) {
      say('Type a word first.')
      return
    }
    if (guess.length !== wordLength) {
      say(`Today’s word has ${wordLength} letters.`)
      return
    }
    if (progress.guesses.includes(guess)) {
      say(`You tried ${guess} already.`)
      return
    }

    setBusy(true)
    setConfirmingTell(false)
    try {
      const response = await fetch('/api/hope-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guess, wantLetter: ladderDone, known: progress.known.map(([position]) => position) }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(data?.inPlace)) {
        say(response.status === 400 && typeof data?.error === 'string' ? data.error : GUESS_ERROR)
        return
      }

      setDraft('')
      setProgress(previous => ({ ...previous, guesses: [...previous.guesses, guess] }))

      if (data.isCorrect) {
        finish('found', isReveal(data.reveal) ? data.reveal : null)
        return
      }

      const inPlace = data.inPlace as KnownLetter[]
      const newlyPlaced = inPlace.filter(([position]) => !knownMap.has(position))
      const letter = isPlacedLetter(data.letter) ? data.letter : null
      const step: Unfolded = nextStep() ?? (letter ? { kind: 'letter', ...letter } : null)

      say(describeGuess(guess, newlyPlaced, step))
      placeLetters(letter ? [...inPlace, [letter.position, letter.letter]] : inPlace)
      speakAbout(guess, progress.guesses.length + 1)
    } catch {
      say(GUESS_ERROR)
    } finally {
      setBusy(false)
    }
  }

  const passItOn = async (reveal: Reveal) => {
    try {
      await navigator.clipboard.writeText(`${storyText(reveal.story)} Source: ${reveal.source} (Found in The Optimist, ${SHARE_LINK})`)
      setShareNote('Copied. Thank you for passing it on.')
    } catch {
      setShareNote('Copying is not available here, but the good news is yours to tell.')
    }
  }

  const arrive = (index: number) => ({ className: styles.arrive, style: { '--i': index } as CSSProperties })

  const remainingParts = puzzle.story.length - shownParts.size

  return (
    <div className={styles.wrap}>
      {isPlaying && <p className={styles.intro}>Name the missing word, or just read on. Every step unfolds a little more.</p>}

      {isPlaying && (
        <article aria-labelledby="optimist-clipping-title" className={styles.clipping}>
          <h2 id="optimist-clipping-title" className={styles.kicker}>
            Today&apos;s good news · {puzzle.category}
          </h2>

          <p className="sr-only">
            {progress.known.length === 0
              ? 'No letters known yet.'
              : `Known so far: ${progress.known.map(([position, letter]) => `letter ${position + 1} is ${letter}`).join(', ')}.`}
          </p>
          <div className={styles.slots} aria-hidden="true" data-testid="word-slots">
            {Array.from({ length: wordLength }, (_, position) => (
              <span key={position} className={cn(styles.slot, knownMap.has(position) && styles.slotKnown)}>
                {knownMap.get(position) ?? ''}
              </span>
            ))}
          </div>
          <p className={styles.slotsNote} aria-hidden="true">
            Letters in place appear here.
          </p>

          <div className={styles.story} data-testid="story">
            {puzzle.story.map((part, index) =>
              shownParts.has(index) ? (
                <span key={index} {...(index === freshPart ? arrive(0) : {})}>
                  {part.map((piece, pieceIndex) =>
                    piece.word ? (
                      <span key={pieceIndex} className={styles.gap}>
                        <span className="sr-only">(missing word)</span>
                      </span>
                    ) : (
                      <span key={pieceIndex}>{piece.text}</span>
                    )
                  )}
                </span>
              ) : (
                <span key={index} aria-hidden="true">
                  {part.flatMap(piece => piece.text.split(/\s+/).filter(Boolean).map(token => token.length)).map((size, wordIndex) => (
                    <span key={wordIndex} data-testid="folded-word" className={styles.folded} style={{ width: `${Math.min(size, 12) * 0.5}em` }} />
                  ))}
                </span>
              )
            )}
          </div>
          {remainingParts > 0 && (
            <p className="sr-only">
              {remainingParts === 1 ? 'One more part of the story is still folded.' : 'More of the story is still folded.'}
            </p>
          )}

          {clueShown && (
            <p className={styles.clue}>
              <b>Clue:</b> {puzzle.clue}
            </p>
          )}
          <div className={styles.actions}>
            {!(ladderDone && allKnown) && (
              <Stamp onClick={readOn} disabled={busy}>
                {ladderDone ? 'Show a letter' : 'Read on'}
              </Stamp>
            )}

            {ladderDone && !confirmingTell && <QuietButton onClick={() => setConfirmingTell(true)}>Tell me the word</QuietButton>}
          </div>

          {confirmingTell && (
            <div className={styles.confirm}>
              <InlineConfirm
                question="This ends today's puzzle and shows the word with its good news."
                keepLabel="Keep playing"
                confirmLabel="Yes, show me"
                onKeep={() => setConfirmingTell(false)}
                onConfirm={() => finish('shown', null)}
              />
            </div>
          )}
        </article>
      )}

      {isPlaying && (
        <>
          <form onSubmit={submitGuess} noValidate>
            <div className={styles.guessRow}>
              <WritingSlip
                ref={inputRef}
                line
                label="Your guess"
                hint={`${wordLength} letters. No limit on guesses.`}
                value={draft}
                onChange={event => {
                  setDraft(event.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, wordLength))
                }}
                maxLength={wordLength}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="go"
              />
              <Go type="submit" loading={busy}>
                Try this word
              </Go>
            </div>
          </form>

          <div className={styles.status} role="status" aria-live="polite">
            {message && <Note tone={tone}>{message}</Note>}
          </div>
          <p className={styles.commentary} aria-live="polite">
            {commentary}
          </p>

          {progress.guesses.length > 0 && (
            <p className={styles.tried}>
              <b>Tried:</b>{' '}
              {progress.guesses.map((guess, index) => (
                <span key={guess}>
                  {index > 0 && ', '}
                  <span>{guess}</span>
                </span>
              ))}
            </p>
          )}
        </>
      )}

      {!isPlaying && (
        <section className={styles.ending} aria-labelledby="optimist-ending-title">
          {foundNow && !reduceMotion && <style>{LETTER_DROP_CSS}</style>}
          <p className={styles.kicker}>{progress.status === 'found' ? 'You found it' : 'Here is today’s word'}</p>
          <h2 id="optimist-ending-title" ref={endingHeadingRef} tabIndex={-1} className={styles.endingTitle}>
            {progress.reveal ? <SolvedWord word={progress.reveal.word} dropping={foundNow && !reduceMotion} /> : 'Today’s good news'}
          </h2>

          {progress.reveal ? (
            <>
              <EndingStory reveal={progress.reveal} arrive={arrive} shareNote={shareNote} onShare={passItOn} pressing={foundNow} />
              <Clipping reveal={progress.reveal} />
            </>
          ) : (
            <p className={styles.source} role="status" aria-live="polite">
              The good news is on its way.
            </p>
          )}

          <p className={styles.done}>That is today&apos;s puzzle, complete. A new piece of good news arrives tomorrow.</p>
        </section>
      )}
    </div>
  )
}

const LETTER_DROP_CSS = `
@keyframes optimist-letter-drop {
  from { transform: translateY(-0.9em); opacity: 0; }
  70% { transform: translateY(0.06em); opacity: 1; }
  to { transform: none; opacity: 1; }
}`

/** The word set into slots like the ones it was guessed in; when just found, each letter drops into place in turn. */
function SolvedWord({ word, dropping }: { word: string; dropping: boolean }) {
  return (
    <>
      <span className="sr-only">{word}</span>
      <span aria-hidden="true" className={styles.solved} style={{ fontSize: `min(1em, calc((100vw - 7rem) / ${word.length * 1.3}))` }} data-testid="solved-word">
        {[...word].map((letter, position) => (
          <span key={position} className={styles.solvedSlot}>
            <span
              className={styles.solvedLetter}
              style={dropping ? { animation: `optimist-letter-drop ${LETTER_DROP_MS}ms cubic-bezier(0.3, 0, 0.3, 1) ${letterDropDelayMs(position)}ms both` } : undefined}
            >
              {letter}
            </span>
          </span>
        ))}
      </span>
    </>
  )
}

/** The day's good news as a clipping to keep, with the word inked into its gap. */
function Clipping({ reveal }: { reveal: Reveal }) {
  const [day] = useState(() => new Date())
  const plan = useMemo(() => optimistKeepsake({ reveal, day }), [reveal, day])
  return <Keepsake plan={plan} label="Today’s clipping, to keep" className={styles.rule} />
}

interface EndingStoryProps {
  reveal: Reveal
  arrive: (index: number) => { className: string; style: CSSProperties }
  shareNote: string
  onShare: (reveal: Reveal) => void
  /** The word was found just now: it presses into its sentence once the letters have landed, then seeds settle beside it. */
  pressing: boolean
}

function EndingStory({ reveal, arrive, shareNote, onShare, pressing }: EndingStoryProps) {
  const reduceMotion = useReducedMotion()
  const landMs = Math.round(lettersLandAfterSeconds(reveal.word.length, !reduceMotion) * 1000)
  const press = pressing ? ({ '--land': `${landMs}ms` } as CSSProperties) : undefined
  return (
    <div>
      <p className={styles.category}>
        {reveal.category} · {reveal.kind === 'progress' ? 'the world getting better' : 'something hopeful to know'}
      </p>
      <p className={styles.goodNews} data-testid="good-news">
        {reveal.story.map((part, index) => (
          <span key={index} {...arrive(index)}>
            {part.map((piece, pieceIndex) =>
              piece.word ? (
                <span key={pieceIndex}>
                  <strong className={cn(styles.word, pressing && styles.pressed)} style={press}>
                    {piece.text}
                  </strong>
                  {pressing && (
                    <span className={cn(styles.seedsBeside, styles.settled)} style={press} aria-hidden="true">
                      <i style={{ '--n': 0 } as CSSProperties} />
                      <i style={{ '--n': 1 } as CSSProperties} />
                      <i style={{ '--n': 2 } as CSSProperties} />
                    </span>
                  )}
                </span>
              ) : (
                <span key={pieceIndex}>{piece.text}</span>
              )
            )}
          </span>
        ))}
      </p>
      <p className={styles.source}>
        Source:{' '}
        <a href={reveal.source} target="_blank" rel="noopener noreferrer" className="sp-link">
          {sourceName(reveal.source)}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>

      <p className={styles.reflection}>{reveal.reflection}</p>

      <div className={styles.passOn}>
        <Go onClick={() => onShare(reveal)}>
          <Icon name="share" size={12} /> Pass the good news on
        </Go>
        <p className={styles.source} role="status" aria-live="polite">
          {shareNote}
        </p>
      </div>
    </div>
  )
}
