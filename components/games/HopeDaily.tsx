'use client'

import { useState, useEffect, useRef, useId, type FormEvent } from 'react'
import { Share2 } from 'lucide-react'
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
  const inputRef = useRef<HTMLInputElement>(null)
  const finishedThisVisitRef = useRef(false)
  const inputId = useId()
  const hintId = useId()

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
      <div className="text-center text-foreground/70 py-12" role="status" aria-live="polite">
        <p className="mb-4">Today&apos;s good news is taking a moment to arrive.</p>
        <button
          type="button"
          onClick={() => {
            setLoadFailed(false)
            setLoadAttempt(attempt => attempt + 1)
          }}
          className="px-4 py-2 min-h-[44px] text-sm bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-lg transition-colors border border-foreground/20"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!puzzle) {
    return (
      <div className="text-center text-foreground/70 py-12" role="status" aria-live="polite">
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
    setMessage(previous => `${previous} Every letter is showing. Press Try it to finish.`.trim())
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
      setMessage(step.kind === 'clue' ? 'The clue is now showing.' : 'The story unfolds a little more.')
      return
    }

    setBusy(true)
    try {
      const response = await fetch('/api/hope-daily/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ known: progress.known.map(([position]) => position) }),
      })
      const data: unknown = response.ok ? await response.json() : null
      if (!isPlacedLetter(data)) {
        setMessage(LETTER_ERROR)
        return
      }
      setMessage(describeLetter(data))
      placeLetters([[data.position, data.letter]])
    } catch {
      setMessage(LETTER_ERROR)
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
      setMessage('Type a word first.')
      return
    }
    if (guess.length !== wordLength) {
      setMessage(`Today’s word has ${wordLength} letters.`)
      return
    }
    if (progress.guesses.includes(guess)) {
      setMessage(`You tried ${guess} already.`)
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
        setMessage(response.status === 400 && typeof data?.error === 'string' ? data.error : GUESS_ERROR)
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

      setMessage(describeGuess(guess, newlyPlaced, step))
      placeLetters(letter ? [...inPlace, [letter.position, letter.letter]] : inPlace)
      speakAbout(guess, progress.guesses.length + 1)
    } catch {
      setMessage(GUESS_ERROR)
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

  const fadeIn = (index: number) =>
    reduceMotion ? undefined : { className: 'animate-fade', style: { animationDelay: `${index * 350}ms`, animationFillMode: 'both' as const } }

  const remainingParts = puzzle.story.length - shownParts.size

  return (
    <div className="max-w-xl mx-auto">
      {isPlaying && (
        <p className="mb-4 text-center text-sm sm:text-base text-foreground/80">
          Name the missing word, or just read on. Every step unfolds a little more.
        </p>
      )}

      {isPlaying && (
        <article
          aria-labelledby="optimist-clipping-title"
          className="rounded-2xl border border-card-border bg-card-bg px-5 py-5 sm:px-7 sm:py-6 shadow-sm"
        >
          <h2 id="optimist-clipping-title" className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
            Today&apos;s good news · {puzzle.category}
          </h2>

          <p className="sr-only">
            {progress.known.length === 0
              ? 'No letters known yet.'
              : `Known so far: ${progress.known.map(([position, letter]) => `letter ${position + 1} is ${letter}`).join(', ')}.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true" data-testid="word-slots">
            {Array.from({ length: wordLength }, (_, position) => (
              <span
                key={position}
                className={`flex h-9 w-6 sm:w-7 items-end justify-center border-b-2 pb-0.5 text-xl font-bold ${
                  knownMap.has(position) ? 'border-foreground text-foreground' : 'border-foreground/40'
                }`}
              >
                {knownMap.get(position) ?? ''}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-foreground/70" aria-hidden="true">
            Letters in place appear here.
          </p>

          <div className="mt-5 font-serif text-lg sm:text-xl leading-relaxed text-foreground" data-testid="story">
            {puzzle.story.map((part, index) =>
              shownParts.has(index) ? (
                <span key={index} {...(index === freshPart ? fadeIn(0) : {})}>
                  {part.map((piece, pieceIndex) =>
                    piece.word ? (
                      <span
                        key={pieceIndex}
                        className="mx-0.5 inline-block h-[1.1em] w-[4.5em] rounded-md border-2 border-dashed border-foreground/60 bg-foreground/5 align-[-0.2em]"
                      >
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
                    <span
                      key={wordIndex}
                      data-testid="folded-word"
                      className="mr-[0.3em] inline-block h-[0.8em] rounded-sm bg-foreground/10 [html[data-contrast=high]_&]:bg-foreground/30 [html[data-contrast=extra-high]_&]:bg-foreground/45 align-middle"
                      style={{ width: `${Math.min(size, 12) * 0.5}em` }}
                    />
                  ))}
                </span>
              )
            )}
          </div>
          {remainingParts > 0 && (
            <p className="sr-only">
              {remainingParts === 1 ? 'One more part of the story is still folded.' : `${remainingParts} more parts of the story are still folded.`}
            </p>
          )}

          {clueShown && (
            <p className="mt-4 border-t border-card-border pt-3 text-sm sm:text-base text-foreground">
              <span className="font-semibold">Clue:</span> {puzzle.clue}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!(ladderDone && allKnown) && (
              <button
                type="button"
                onClick={readOn}
                disabled={busy}
                className="rounded-lg border border-foreground/25 bg-foreground/5 px-4 py-2 min-h-[44px] text-sm font-medium text-foreground hover:bg-foreground/10 transition-colors disabled:opacity-60"
              >
                {ladderDone ? 'Show a letter' : 'Read on'}
              </button>
            )}

            {ladderDone && !confirmingTell && (
              <button
                type="button"
                onClick={() => setConfirmingTell(true)}
                className="rounded-lg px-3 py-2 min-h-[44px] text-sm text-foreground/80 underline underline-offset-4 hover:text-foreground"
              >
                Tell me the word
              </button>
            )}
          </div>

          {confirmingTell && (
            <div className="mt-3 rounded-lg border border-card-border bg-card-bg p-3 text-sm text-foreground" role="group" aria-label="Tell me the word">
              <p>This ends today&apos;s puzzle and shows the word with its good news.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => finish('shown', null)}
                  className="rounded-lg bg-foreground/10 px-3 py-2 min-h-[44px] font-medium hover:bg-foreground/20"
                >
                  Yes, show me
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingTell(false)}
                  className="rounded-lg px-3 py-2 min-h-[44px] underline underline-offset-4"
                >
                  Keep playing
                </button>
              </div>
            </div>
          )}

        </article>
      )}

      {isPlaying && (
        <>
          <form onSubmit={submitGuess} className="mt-5" noValidate>
            <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
              Your guess
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                ref={inputRef}
                id={inputId}
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
                aria-describedby={hintId}
                className="min-w-0 flex-1 rounded-lg border-2 border-foreground/30 bg-background px-3 py-2 font-mono text-lg uppercase tracking-[0.2em] text-foreground focus:border-foreground"
              />
              <button
                type="submit"
                disabled={busy}
                className="shrink-0 rounded-lg bg-melon-green px-4 py-2 min-h-[44px] font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                Try it
              </button>
            </div>
            <p id={hintId} className="mt-1 text-xs text-foreground/70">
              {wordLength} letters. No limit on guesses.
            </p>
          </form>

          <p className="mt-3 text-sm sm:text-base font-medium text-foreground" role="status" aria-live="polite">
            {message}
          </p>
          <p className="text-sm italic text-foreground/70" aria-live="polite">
            {commentary}
          </p>

          {progress.guesses.length > 0 && (
            <p className="mt-4 text-sm text-foreground/80">
              <span className="font-medium">Tried:</span>{' '}
              {progress.guesses.map((guess, index) => (
                <span key={guess}>
                  {index > 0 && ', '}
                  <span className="font-mono tracking-wider">{guess}</span>
                </span>
              ))}
            </p>
          )}
        </>
      )}

      {!isPlaying && (
        <section
          className="p-5 sm:p-7 rounded-2xl border-2 border-melon-green bg-card-bg"
          aria-labelledby="optimist-ending-title"
        >
          {foundNow && !reduceMotion && <style>{LETTER_DROP_CSS}</style>}
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
            {progress.status === 'found' ? 'You found it' : 'Here is today’s word'}
          </p>
          <h2
            id="optimist-ending-title"
            ref={endingHeadingRef}
            tabIndex={-1}
            className="mt-1 text-3xl sm:text-4xl font-semibold tracking-wider text-foreground focus-visible:shadow-none!"
          >
            {progress.reveal ? <SolvedWord word={progress.reveal.word} dropping={foundNow && !reduceMotion} /> : 'Today’s good news'}
          </h2>

          {progress.reveal ? (
            <EndingStory reveal={progress.reveal} fadeIn={fadeIn} shareNote={shareNote} onShare={passItOn} />
          ) : (
            <p className="mt-3 text-foreground/70" role="status" aria-live="polite">
              The good news is on its way.
            </p>
          )}

          <p className="mt-5 pt-4 border-t border-card-border text-sm text-foreground/70">
            That is today&apos;s puzzle, complete. A new piece of good news arrives tomorrow.
          </p>
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
}
@media (prefers-reduced-motion: reduce) {
  [data-testid="solved-word"] span { animation: none !important; }
}`

/** The word set into slots like the ones it was guessed in; when just found, each letter drops into place in turn. */
function SolvedWord({ word, dropping }: { word: string; dropping: boolean }) {
  return (
    <>
      <span className="sr-only">{word}</span>
      <span
        aria-hidden="true"
        className="mt-1 flex gap-[0.2em]"
        style={{ fontSize: `min(1em, calc((100vw - 7rem) / ${word.length * 1.3}))` }}
        data-testid="solved-word"
      >
        {[...word].map((letter, position) => (
          <span key={position} className="flex h-[1.45em] w-[1.05em] items-end justify-center border-b-2 border-melon-green pb-0.5 overflow-hidden">
            <span
              className="inline-block leading-none tracking-normal"
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

interface EndingStoryProps {
  reveal: Reveal
  fadeIn: (index: number) => { className: string; style: { animationDelay: string; animationFillMode: 'both' } } | undefined
  shareNote: string
  onShare: (reveal: Reveal) => void
}

function EndingStory({ reveal, fadeIn, shareNote, onShare }: EndingStoryProps) {
  return (
    <div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-melon-green">
        {reveal.category} · {reveal.kind === 'progress' ? 'the world getting better' : 'something hopeful to know'}
      </p>
      <p className="mt-2 font-serif text-lg sm:text-xl leading-relaxed text-foreground" data-testid="good-news">
        {reveal.story.map((part, index) => (
          <span key={index} {...fadeIn(index)}>
            {part.map((piece, pieceIndex) =>
              piece.word ? (
                <strong key={pieceIndex} className="font-bold underline decoration-2 underline-offset-4">
                  {piece.text}
                </strong>
              ) : (
                <span key={pieceIndex}>{piece.text}</span>
              )
            )}
          </span>
        ))}
      </p>
      <p className="mt-2 text-sm text-foreground/80">
        Source:{' '}
        <a
          href={reveal.source}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          {sourceName(reveal.source)}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>

      <p className="mt-5 border-l-4 border-melon-green pl-4 text-base text-foreground">{reveal.reflection}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onShare(reveal)}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium bg-melon-green text-background hover:opacity-90 transition-opacity"
        >
          <Share2 size={16} aria-hidden="true" />
          Pass the good news on
        </button>
        <p className="text-sm text-foreground/70" role="status" aria-live="polite">{shareNote}</p>
      </div>
    </div>
  )
}
