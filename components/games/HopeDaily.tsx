'use client'

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { Lightbulb, Share2 } from 'lucide-react'

type LetterState = 'correct' | 'present' | 'absent' | 'empty'

interface LetterTile {
  letter: string
  state: LetterState
}

interface GameMetadata {
  wordLength: number
  category: string
}

interface RevealedWord {
  word: string
  fact: string
  category: string
}

interface SavedGame {
  date: string
  guesses: LetterTile[][]
  gameState: 'playing' | 'won' | 'lost'
  revealedData: RevealedWord | null
  hintsUsed?: number
  currentHint?: string
  revealedLetters?: Array<[number, string]>
}

const MAX_GUESSES = 6
const MAX_HINTS = 3
const STORAGE_KEY = 'hope-daily-state'
const GUESS_ERROR = 'That guess did not go through. Give it another try in a moment.'
const HINT_ERROR = 'No hint just now. Try again in a moment.'
const SHARE_LINK = 'verygoodmelon.fun/games/the-silver-lining'

// Filled tiles: dark green and warm amber differ in lightness as well as hue,
// so they stay apart for colour-blind players; letters already carry their state in words.
const TILE_COLOURS: Record<LetterState, string> = {
  correct: 'bg-melon-green border-melon-green text-background',
  present: 'bg-warm border-warm text-[#1a1a1a]',
  absent: 'bg-foreground/10 border-transparent text-foreground/70',
  empty: 'border-foreground/20',
}

// Used-up keys step back and are struck through, so they read as spent without relying on colour.
const ABSENT_KEY = 'bg-transparent border-foreground/10 text-foreground/60 line-through'

const REFLECTIONS: Record<string, string> = {
  Energy: 'Every light powered by sun or wind is a small vote for tomorrow.',
  Nature: 'Forests come back when enough people decide they should.',
  Health: 'Behind numbers like these are families who got more time together.',
  Rights: 'Changes like this were once called impossible by sensible people.',
  Peace: 'Peace is mostly patient, unglamorous work, and people keep doing it.',
  Tech: 'Tools made by curious people keep turning into help for strangers.',
}
const DEFAULT_REFLECTION = 'Good news travels slower than bad news. You just helped it along.'

// The word changes at midnight UTC on the server, so the saved game is keyed the same way.
const todayKey = () => new Date().toISOString().slice(0, 10)

function isGameMetadata(data: unknown): data is GameMetadata {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as GameMetadata).wordLength === 'number' &&
    (data as GameMetadata).wordLength > 0
  )
}

function isRevealedWord(data: unknown): data is RevealedWord {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as RevealedWord).word === 'string' &&
    typeof (data as RevealedWord).fact === 'string'
  )
}

// Priority: correct > present > absent
function mergeKeyStates(states: Map<string, LetterState>, tiles: LetterTile[]): Map<string, LetterState> {
  tiles.forEach(tile => {
    const currentState = states.get(tile.letter)
    if (tile.state === 'correct' ||
        (tile.state === 'present' && currentState !== 'correct') ||
        (tile.state === 'absent' && !currentState)) {
      states.set(tile.letter, tile.state)
    }
  })
  return states
}
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
]

export default function HopeDaily() {
  const [metadata, setMetadata] = useState<GameMetadata | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [guesses, setGuesses] = useState<LetterTile[][]>([])
  const [currentGuess, setCurrentGuess] = useState<string>('')
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing')
  const [message, setMessage] = useState<string>('')
  const [shake, setShake] = useState(false)
  const [keyboardStates, setKeyboardStates] = useState<Map<string, LetterState>>(new Map())
  const [revealedData, setRevealedData] = useState<RevealedWord | null>(null)
  const [commentary, setCommentary] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [currentHint, setCurrentHint] = useState<string>('')
  const [revealedLetters, setRevealedLetters] = useState<Map<number, string>>(new Map())
  const [isFetchingHint, setIsFetchingHint] = useState(false)
  const [shareNote, setShareNote] = useState('')
  // Only the newest guess may speak: a slow reply for an earlier row is dropped.
  const commentaryRequestRef = useRef(0)
  const endingHeadingRef = useRef<HTMLHeadingElement>(null)
  const finishedThisVisitRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const initGame = async () => {
      try {
        const response = await fetch('/api/hope-daily')
        const data: unknown = response.ok ? await response.json() : null
        if (cancelled) return

        if (!isGameMetadata(data)) {
          setLoadFailed(true)
          return
        }

        const savedState = localStorage.getItem(STORAGE_KEY)
        if (savedState) {
          try {
            const state: SavedGame = JSON.parse(savedState)
            const fitsToday =
              state.date === todayKey() &&
              Array.isArray(state.guesses) &&
              state.guesses.every(guess => guess.length === data.wordLength)

            if (fitsToday) {
              setGuesses(state.guesses)
              setGameState(state.gameState)
              setHintsUsed(state.hintsUsed ?? 0)
              setCurrentHint(state.currentHint ?? '')
              setRevealedLetters(new Map(state.revealedLetters ?? []))

              const savedKeyStates = new Map<string, LetterState>()
              state.guesses.forEach(guess => mergeKeyStates(savedKeyStates, guess))
              setKeyboardStates(savedKeyStates)

              if (state.gameState !== 'playing' && isRevealedWord(state.revealedData)) {
                setRevealedData(state.revealedData)
              }
            } else {
              localStorage.removeItem(STORAGE_KEY)
            }
          } catch {
            localStorage.removeItem(STORAGE_KEY)
          }
        }

        setMetadata(data)
      } catch (error) {
        console.error('Failed to initialize game:', error)
        if (!cancelled) setLoadFailed(true)
      }
    }

    initGame()
    return () => {
      cancelled = true
    }
  }, [loadAttempt])

  useEffect(() => {
    if (!metadata) return
    if (guesses.length === 0 && gameState === 'playing' && hintsUsed === 0) return

    const state: SavedGame = {
      date: todayKey(),
      guesses,
      gameState,
      revealedData,
      hintsUsed,
      currentHint,
      revealedLetters: Array.from(revealedLetters.entries())
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [metadata, guesses, gameState, revealedData, hintsUsed, currentHint, revealedLetters])

  // A finished day whose word never arrived (offline at the end) asks once more on the next visit.
  useEffect(() => {
    if (!metadata || gameState !== 'lost' || revealedData) return
    let cancelled = false
    fetch('/api/hope-daily', { method: 'PUT' })
      .then(response => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        if (!cancelled && isRevealedWord(data)) setRevealedData(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [metadata, gameState, revealedData])

  // Focus follows the player into the ending, because the keys they were using are gone.
  useEffect(() => {
    if (gameState !== 'playing' && finishedThisVisitRef.current) {
      endingHeadingRef.current?.focus()
    }
  }, [gameState])

  const updateKeyboardStates = useCallback((letterStates: LetterTile[]) => {
    setKeyboardStates(prev => mergeKeyStates(new Map(prev), letterStates))
  }, [])

  const fetchHint = useCallback(async () => {
    if (isFetchingHint || hintsUsed >= MAX_HINTS || gameState !== 'playing') return

    // A letter the player already placed correctly would be a wasted hint.
    const knownPositions = new Set(revealedLetters.keys())
    guesses.forEach(guess => guess.forEach((tile, position) => {
      if (tile.state === 'correct') knownPositions.add(position)
    }))

    setIsFetchingHint(true)
    setMessage('')
    try {
      const response = await fetch('/api/hope-daily/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hintNumber: hintsUsed + 1,
          revealedPositions: Array.from(knownPositions)
        })
      })

      const data = response.ok ? await response.json() : null
      if (!data?.hint) {
        setMessage(HINT_ERROR)
        return
      }

      setHintsUsed(prev => prev + 1)

      // Letter hints are listed under "Revealed", so the clue stays on screen.
      if (!data.revealedLetter) {
        setCurrentHint(data.hint)
      } else {
        setRevealedLetters(prev => {
          const newMap = new Map(prev)
          newMap.set(data.revealedLetter.position, data.revealedLetter.letter)
          return newMap
        })
      }
    } catch (error) {
      console.error('Failed to fetch hint:', error)
      setMessage(HINT_ERROR)
    } finally {
      setIsFetchingHint(false)
    }
  }, [isFetchingHint, hintsUsed, gameState, revealedLetters, guesses])

  const requestCommentary = useCallback(async (
    guess: string,
    letterStates: LetterTile[],
    isCorrect: boolean,
    guessNumber: number
  ) => {
    const request = ++commentaryRequestRef.current
    setCommentary('')
    try {
      const response = await fetch('/api/hope-daily/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guess, letterStates, isCorrect, guessNumber })
      })

      const data = response.ok ? await response.json() : null
      if (request === commentaryRequestRef.current && typeof data?.commentary === 'string') {
        setCommentary(data.commentary)
      }
    } catch (error) {
      console.error('Failed to fetch commentary:', error)
    }
  }, [])

  const submitGuess = useCallback(async () => {
    if (!currentGuess || !metadata || isSubmitting) return

    const rejectGuess = (reason: string) => {
      setMessage(reason)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }

    if (currentGuess.length < metadata.wordLength) {
      rejectGuess(`Not enough letters yet. The word has ${metadata.wordLength}.`)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/hope-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guess: currentGuess })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(data?.letterStates)) {
        rejectGuess(response.status === 400 && data?.error ? data.error : GUESS_ERROR)
        return
      }

      const letterStates: LetterTile[] = data.letterStates.map((state: { letter: string; state: LetterState }) => ({
        letter: state.letter,
        state: state.state
      }))

      updateKeyboardStates(letterStates)

      const newGuesses = [...guesses, letterStates]
      const guessWord = currentGuess
      setGuesses(newGuesses)
      setCurrentGuess('')
      setMessage('')

      if (data.isCorrect) {
        finishedThisVisitRef.current = true
        setGameState('won')
        if (isRevealedWord(data)) setRevealedData({ word: data.word, fact: data.fact, category: data.category })
        requestCommentary(guessWord, letterStates, true, newGuesses.length)
      } else if (newGuesses.length >= MAX_GUESSES) {
        finishedThisVisitRef.current = true
        commentaryRequestRef.current++
        setCommentary('')
        setGameState('lost')
      } else {
        requestCommentary(guessWord, letterStates, false, newGuesses.length)
      }
    } catch (error) {
      console.error('Failed to submit guess:', error)
      rejectGuess(GUESS_ERROR)
    } finally {
      setIsSubmitting(false)
    }
  }, [currentGuess, metadata, guesses, requestCommentary, updateKeyboardStates, isSubmitting])

  const handleKeyPress = useCallback((key: string, hasModifier = false) => {
    if (gameState !== 'playing' || !metadata) return

    if (hasModifier && /^[A-Za-z]$/.test(key)) return

    if (key === 'Backspace' || key === 'BACK') {
      setCurrentGuess(prev => prev.slice(0, -1))
      setMessage('')
    } else if (key === 'Enter' || key === 'ENTER') {
      submitGuess()
    } else if (/^[A-Za-z]$/.test(key)) {
      // Length is checked against the queued state: right after a guess is scored, this
      // listener can still hold the previous guess, and the first new letter would be lost.
      setCurrentGuess(prev => (prev.length < metadata.wordLength ? prev + key.toUpperCase() : prev))
      setMessage('')
    }
  }, [gameState, metadata, submitGuess])

  const handleStartOver = () => {
    localStorage.removeItem(STORAGE_KEY)
    commentaryRequestRef.current++

    setGuesses([])
    setCurrentGuess('')
    setGameState('playing')
    setMessage('')
    setShake(false)
    setKeyboardStates(new Map())
    setRevealedData(null)
    setCommentary('')
    setHintsUsed(0)
    setCurrentHint('')
    setRevealedLetters(new Map())
  }

  const passItOn = async () => {
    if (!revealedData) return
    try {
      await navigator.clipboard.writeText(`${revealedData.fact} (Found in The Optimist, ${SHARE_LINK})`)
      setShareNote('Copied. Thank you for passing it on.')
    } catch {
      setShareNote('Copying is not available here, but the fact is yours to tell.')
    }
  }

  // A layout effect re-subscribes during the commit, so a key pressed as soon as a
  // result appears never reaches a handler holding the previous state.
  useLayoutEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null
      const onLetterKey = target?.closest('[data-letter-key]') != null

      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === 'Enter' && !onLetterKey && target?.closest('button, a')) return
      // After tapping a letter, a physical Enter submits instead of pressing that letter again.
      if (e.key === 'Enter' && onLetterKey) e.preventDefault()

      handleKeyPress(e.key, e.ctrlKey || e.metaKey || e.altKey)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleKeyPress])

  if (!metadata && loadFailed) {
    return (
      <div className="text-center text-foreground/70 py-12" role="status" aria-live="polite">
        <p className="mb-4">Today&apos;s word is taking a moment to arrive.</p>
        <button
          onClick={() => {
            setLoadFailed(false)
            setLoadAttempt(attempt => attempt + 1)
          }}
          className="px-4 py-2 text-sm bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-lg transition-colors border border-foreground/20"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!metadata) {
    return (
      <div className="text-center text-foreground/70 py-12" role="status" aria-live="polite">
        <div className="inline-block w-6 h-6 border-2 border-foreground/20 border-t-foreground/60 rounded-full animate-spin mb-3" />
        <p>Loading today&apos;s word...</p>
      </div>
    )
  }

  const isPlaying = gameState === 'playing'
  const wordLength = metadata.wordLength

  // A finished board keeps only the rows that were played.
  const remainingGuesses = isPlaying ? MAX_GUESSES - guesses.length - (currentGuess ? 1 : 0) : 0
  const emptyRows = Array.from({ length: remainingGuesses }, () =>
    Array.from({ length: wordLength }, () => ({ letter: '', state: 'empty' as LetterState }))
  )

  const currentGuessTiles: LetterTile[] = Array.from({ length: wordLength }, (_, i) => ({
    letter: currentGuess[i] || '',
    state: 'empty' as LetterState
  }))

  const allRows = [
    ...guesses,
    ...(isPlaying && currentGuess ? [currentGuessTiles] : []),
    ...emptyRows
  ]

  const tileText = wordLength > 10 ? 'text-sm sm:text-lg' : wordLength > 7 ? 'text-base sm:text-xl' : 'text-lg sm:text-2xl'

  return (
    <div className="max-w-2xl mx-auto">
      <p className="mb-3 text-center text-sm text-foreground/70">
        Today&apos;s theme: <span className="font-medium text-foreground">{metadata.category}</span> · {wordLength} letters
      </p>

      <div
        className="mx-auto mb-3 flex flex-col gap-1 sm:gap-1.5"
        style={{ maxWidth: `${wordLength * 3.4}rem` }}
        role="grid"
        aria-label="Today's guesses"
      >
        {allRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            role="row"
            className={`grid gap-1 sm:gap-1.5 ${shake && rowIndex === guesses.length ? 'animate-shake' : ''}`}
            style={{ gridTemplateColumns: `repeat(${wordLength}, minmax(0, 1fr))` }}
          >
            {row.map((tile, colIndex) => (
              <div
                key={colIndex}
                className={`
                  aspect-square border-2 rounded-md flex items-center justify-center
                  font-bold transition-colors duration-300 ${tileText}
                  ${TILE_COLOURS[tile.state]}
                  ${tile.letter && tile.state === 'empty' ? 'border-foreground/50' : ''}
                `}
                role="gridcell"
                aria-label={
                  tile.letter
                    ? `${tile.letter}${tile.state !== 'empty' ? ` - ${tile.state}` : ''}`
                    : 'empty'
                }
              >
                {tile.letter}
              </div>
            ))}
          </div>
        ))}
      </div>

      {message && (
        <p className="text-center mb-2 text-base font-medium animate-fade" role="status" aria-live="polite">
          {message}
        </p>
      )}

      {isPlaying && (
        <>
          <div className="min-h-[2.75rem] mb-2 flex justify-center items-center" role="status" aria-live="polite">
            {commentary && (
              <p className="max-w-sm px-4 py-2 rounded-2xl bg-card-bg border border-card-border text-sm text-foreground text-center animate-fade">
                {commentary}
              </p>
            )}
          </div>

          <div className="mb-3 flex flex-col items-center gap-2">
            <button
              onClick={fetchHint}
              disabled={hintsUsed >= MAX_HINTS || isFetchingHint}
              className={`
                flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium
                transition-colors duration-200
                ${hintsUsed >= MAX_HINTS
                  ? 'bg-foreground/5 text-foreground/60 cursor-not-allowed'
                  : 'bg-warm/25 hover:bg-warm/40 text-foreground border border-warm/60'
                }
              `}
              aria-label={`Get hint (${MAX_HINTS - hintsUsed} remaining)`}
            >
              <Lightbulb size={16} aria-hidden="true" />
              {isFetchingHint ? 'One moment...' : `Hint (${MAX_HINTS - hintsUsed} left)`}
            </button>

            {currentHint && (
              <p className="max-w-sm text-center text-sm text-foreground bg-warm/15 border border-warm/40 rounded-lg px-4 py-2 animate-fade" role="status" aria-live="polite">
                {currentHint}
              </p>
            )}

            {revealedLetters.size > 0 && (
              <div className="flex flex-wrap justify-center gap-1 text-xs text-foreground/70">
                <span>Revealed:</span>
                {Array.from(revealedLetters.entries()).sort(([a], [b]) => a - b).map(([pos, letter]) => (
                  <span key={pos} className="font-mono bg-warm/25 text-foreground px-1.5 py-0.5 rounded">
                    letter {pos + 1} is {letter}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-3 space-y-1.5" aria-label="Letter keys" role="group">
            {KEYBOARD_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-1 sm:gap-1.5">
                {row.map((key) => {
                  const keyState = keyboardStates.get(key)
                  const isSpecialKey = key === 'ENTER' || key === 'BACK'

                  return (
                    <button
                      key={key}
                      onClick={() => handleKeyPress(key === 'BACK' ? 'Backspace' : key === 'ENTER' ? 'Enter' : key)}
                      className={`
                        ${isSpecialKey ? 'flex-[1.5] max-w-[4.5rem] text-xs' : 'flex-1 max-w-[2.75rem] text-sm sm:text-base'}
                        h-12 sm:h-14 rounded-md font-bold border-2 transition-colors duration-200
                        ${keyState === 'absent' ? ABSENT_KEY : keyState ? TILE_COLOURS[keyState] : 'bg-foreground/10 hover:bg-foreground/20 border-foreground/15 text-foreground'}
                      `}
                      aria-label={key === 'BACK' ? 'Backspace' : key}
                      data-letter-key
                    >
                      {key === 'BACK' ? '⌫' : key}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-foreground/80">
            <span className="flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded border-2 ${TILE_COLOURS.correct}`} aria-hidden="true" />
              <span><strong className="font-semibold">Growth</strong>: right spot</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded border-2 ${TILE_COLOURS.present}`} aria-hidden="true" />
              <span><strong className="font-semibold">Hope</strong>: in the word, other spot</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded border-2 ${TILE_COLOURS.absent}`} aria-hidden="true" />
              <span><strong className="font-semibold">Resting</strong>: not in the word</span>
            </span>
          </div>

          {guesses.length === 0 && !currentGuess ? (
            <p className="text-center text-sm text-foreground/70">
              Guess today&apos;s {wordLength}-letter word in {MAX_GUESSES} tries; any letters count. Type or tap, then press Enter.
            </p>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleStartOver}
                className="px-4 py-2 text-sm bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-lg transition-colors border border-foreground/20"
                aria-label="Start over"
              >
                Start Over
              </button>
            </div>
          )}
        </>
      )}

      {!isPlaying && (
        <section
          className={`mt-4 p-5 sm:p-7 rounded-2xl border-2 animate-fade ${
            gameState === 'won' ? 'border-melon-green bg-melon-green/5' : 'border-card-border bg-card-bg'
          }`}
          aria-labelledby="optimist-ending-title"
        >
          <h2
            id="optimist-ending-title"
            ref={endingHeadingRef}
            tabIndex={-1}
            className="text-sm font-semibold uppercase tracking-wide text-foreground/70 focus-visible:shadow-none!"
          >
            {gameState === 'won' ? 'You found it' : "Today's word"}
          </h2>

          {revealedData ? (
            <div role="region" aria-label="Educational fact">
              <p className="mt-2 text-3xl sm:text-4xl font-semibold tracking-wider text-foreground">
                {revealedData.word}
              </p>
              {gameState === 'won' && commentary && (
                <p className="mt-1 text-sm text-foreground/70 italic">{commentary}</p>
              )}
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-melon-green">
                {revealedData.category} · good news
              </p>
              <p className="mt-1 text-base sm:text-lg leading-relaxed text-foreground">
                {revealedData.fact}
              </p>
              <p className="mt-4 text-sm text-foreground/70">
                {gameState === 'lost' && 'Not every word gives itself up, and the good news is true either way. '}
                {REFLECTIONS[revealedData.category] ?? DEFAULT_REFLECTION}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={passItOn}
                  className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium bg-melon-green text-background hover:opacity-90 transition-opacity"
                >
                  <Share2 size={16} aria-hidden="true" />
                  Pass the good news on
                </button>
                <p className="text-sm text-foreground/70" role="status" aria-live="polite">{shareNote}</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-foreground/70" role="status" aria-live="polite">
              The word is on its way.
            </p>
          )}

          <p className="mt-5 pt-4 border-t border-card-border text-sm text-foreground/70">
            That is today&apos;s puzzle, complete. A new word and a new piece of good news arrive tomorrow.
          </p>
        </section>
      )}

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  )
}
