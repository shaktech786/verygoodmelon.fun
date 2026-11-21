'use client'

import { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { Lightbulb } from 'lucide-react'

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
  const [revealed, setRevealed] = useState(false)
  const [keyboardStates, setKeyboardStates] = useState<Map<string, LetterState>>(new Map())
  const [revealedData, setRevealedData] = useState<RevealedWord | null>(null)
  const [commentary, setCommentary] = useState<string>('')
  const [showCommentary, setShowCommentary] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingCommentary, setIsFetchingCommentary] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [currentHint, setCurrentHint] = useState<string>('')
  const [revealedLetters, setRevealedLetters] = useState<Map<number, string>>(new Map())
  const [isFetchingHint, setIsFetchingHint] = useState(false)

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

              if (state.gameState !== 'playing' && state.revealedData) {
                setRevealedData(state.revealedData)
                setRevealed(true)
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

  // Update keyboard states based on guesses
  const updateKeyboardStates = useCallback((letterStates: LetterTile[]) => {
    setKeyboardStates(prev => mergeKeyStates(new Map(prev), letterStates))
  }, [])

  // Fetch hint from API
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

  const showCommentaryBubble = useCallback(async (
    guess: string,
    letterStates: LetterTile[],
    isCorrect: boolean
  ) => {
    if (isFetchingCommentary) return

    setIsFetchingCommentary(true)
    setShowCommentary(false)
    try {
      const response = await fetch('/api/hope-daily/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guess,
          letterStates,
          isCorrect
        })
      })

      const data = response.ok ? await response.json() : null
      if (data?.commentary) {
        setCommentary(data.commentary)
        setShowCommentary(true)
      }
    } catch (error) {
      console.error('Failed to fetch commentary:', error)
    } finally {
      setIsFetchingCommentary(false)
    }
  }, [isFetchingCommentary])

  // Submit guess to server
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

      // Process response
      const letterStates: LetterTile[] = data.letterStates.map((state: { letter: string; state: LetterState }) => ({
        letter: state.letter,
        state: state.state
      }))

      updateKeyboardStates(letterStates)

      const newGuesses = [...guesses, letterStates]
      const guessWord = currentGuess // Save before clearing
      setGuesses(newGuesses)
      setCurrentGuess('')
      setMessage('')

      // Check win
      if (data.isCorrect) {
        setGameState('won')
        setRevealedData({ word: data.word, fact: data.fact, category: data.category })
        setTimeout(() => setRevealed(true), 1500)

        const encouragements = [
          'Amazing!',
          'Brilliant!',
          'Fantastic!',
          'Excellent!',
          'Perfect!'
        ]
        setMessage(encouragements[Math.floor(Math.random() * encouragements.length)])

        // Show victory commentary
        showCommentaryBubble(guessWord, letterStates, true)
      } else if (newGuesses.length >= MAX_GUESSES) {
        setGameState('lost')
        setShowCommentary(false)
        setMessage('That was the last guess.')
        const revealData: unknown = await fetch('/api/hope-daily', { method: 'PUT' })
          .then(revealResponse => (revealResponse.ok ? revealResponse.json() : null))
          .catch(() => null)
        if (isRevealedWord(revealData)) {
          setRevealedData(revealData)
          setMessage(`The word was ${revealData.word}`)
          setTimeout(() => setRevealed(true), 1500)
        }
      } else {
        showCommentaryBubble(guessWord, letterStates, false)
      }
    } catch (error) {
      console.error('Failed to submit guess:', error)
      rejectGuess(GUESS_ERROR)
    } finally {
      setIsSubmitting(false)
    }
  }, [currentGuess, metadata, guesses, showCommentaryBubble, updateKeyboardStates, isSubmitting])

  // Handle key press
  const handleKeyPress = useCallback((key: string, hasModifier = false) => {
    if (gameState !== 'playing' || !metadata) return

    // Don't allow typing if modifier keys are pressed
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

    // Reset all game state
    setGuesses([])
    setCurrentGuess('')
    setGameState('playing')
    setMessage('')
    setShake(false)
    setRevealed(false)
    setKeyboardStates(new Map())
    setRevealedData(null)
    setCommentary('')
    setShowCommentary(false)
    setHintsUsed(0)
    setCurrentHint('')
    setRevealedLetters(new Map())
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

  // Render empty tiles for remaining guesses
  const remainingGuesses = MAX_GUESSES - guesses.length - (currentGuess ? 1 : 0)
  const emptyRows = Array.from({ length: remainingGuesses }, () =>
    Array.from({ length: metadata.wordLength }, () => ({ letter: '', state: 'empty' as LetterState }))
  )

  // Current guess tiles
  const currentGuessTiles: LetterTile[] = Array.from({ length: metadata.wordLength }, (_, i) => ({
    letter: currentGuess[i] || '',
    state: 'empty' as LetterState
  }))

  const allRows = [
    ...guesses,
    ...(gameState === 'playing' && currentGuess ? [currentGuessTiles] : []),
    ...emptyRows
  ]

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-0">
      <p className="mb-2 text-center text-xs sm:text-sm text-foreground/70">
        Today&apos;s theme: <span className="font-medium text-foreground">{metadata.category}</span> · {metadata.wordLength} letters
      </p>

      {/* Game Board */}
      <div
        className="mb-2 sm:mb-3 flex flex-col gap-1 sm:gap-1.5"
        role="application"
        aria-label="Hope Daily Word Game"
      >
        {allRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={`flex gap-1 sm:gap-1 justify-center ${
              shake && rowIndex === guesses.length ? 'animate-shake' : ''
            }`}
          >
            {row.map((tile, colIndex) => (
              <div
                key={colIndex}
                className={`
                  w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border-2 rounded flex items-center justify-center
                  text-base sm:text-lg md:text-xl font-bold transition-all duration-300
                  ${tile.state === 'correct' ? 'bg-[#74c69d] border-[#74c69d] text-white' : ''}
                  ${tile.state === 'present' ? 'bg-[#f59e0b] border-[#f59e0b] text-white' : ''}
                  ${tile.state === 'absent' ? 'bg-foreground/60 border-transparent text-background' : ''}
                  ${tile.state === 'empty' ? 'border-foreground/20' : ''}
                  ${tile.letter && tile.state === 'empty' ? 'border-foreground/40 scale-105' : ''}
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

      {/* Message */}
      {message && (
        <div
          className="text-center mb-2 text-base sm:text-lg font-medium animate-fade"
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      )}

      {showCommentary && commentary && (
        <div
          className="flex justify-center mb-2 animate-fade"
          role="status"
          aria-live="polite"
        >
          <div className="relative max-w-sm">
            <div className="bg-gradient-to-r from-accent/10 to-success/10 border-2 border-accent/30 rounded-2xl px-3 py-2 shadow-lg backdrop-blur-sm">
              <p className="text-xs sm:text-sm text-foreground font-medium text-center">
                {commentary}
              </p>
            </div>
            {/* Speech bubble tail */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-accent/30"></div>
          </div>
        </div>
      )}

      {/* Hint Section */}
      {gameState === 'playing' && (
        <div className="mb-3 flex flex-col items-center gap-2">
          {/* Hint Button */}
          <button
            onClick={fetchHint}
            disabled={hintsUsed >= MAX_HINTS || isFetchingHint}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200
              ${hintsUsed >= MAX_HINTS
                ? 'bg-foreground/5 text-foreground/30 cursor-not-allowed'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/30'
              }
            `}
            aria-label={`Get hint (${MAX_HINTS - hintsUsed} remaining)`}
          >
            <Lightbulb size={16} className={isFetchingHint ? 'animate-pulse' : ''} />
            {isFetchingHint ? 'One moment...' : `Hint (${MAX_HINTS - hintsUsed} left)`}
          </button>

          {/* Current Hint Display */}
          {currentHint && (
            <div className="max-w-sm text-center animate-fade" role="status" aria-live="polite">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  💡 {currentHint}
                </p>
              </div>
            </div>
          )}

          {/* Revealed Letters Display */}
          {revealedLetters.size > 0 && (
            <div className="flex flex-wrap justify-center gap-1 text-xs text-foreground/70">
              <span>Revealed:</span>
              {Array.from(revealedLetters.entries()).sort(([a], [b]) => a - b).map(([pos, letter]) => (
                <span key={pos} className="font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">
                  letter {pos + 1} is {letter}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visual Keyboard */}
      <div className="mb-2 sm:mb-3 space-y-0.5 sm:space-y-1">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-0.5 sm:gap-1">
            {row.map((key) => {
              const keyState = keyboardStates.get(key)
              const isSpecialKey = key === 'ENTER' || key === 'BACK'

              return (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key === 'BACK' ? 'Backspace' : key === 'ENTER' ? 'Enter' : key)}
                  disabled={gameState !== 'playing'}
                  className={`
                    ${isSpecialKey ? 'px-2 sm:px-3 text-[10px] sm:text-xs' : 'w-7 sm:w-8 md:w-9'}
                    h-10 sm:h-10 md:h-12 rounded font-bold text-[10px] sm:text-xs md:text-sm
                    transition-all duration-200
                    ${keyState === 'correct' ? 'bg-[#74c69d] text-white border-[#74c69d]' : ''}
                    ${keyState === 'present' ? 'bg-[#f59e0b] text-white border-[#f59e0b]' : ''}
                    ${keyState === 'absent' ? 'bg-foreground/60 text-background border-transparent' : ''}
                    ${!keyState ? 'bg-foreground/10 hover:bg-foreground/20 border-foreground/20' : ''}
                    border-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    active:scale-95
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

      {/* Color Legend and Start Over */}
      <div className="mb-2 sm:mb-3 px-2">
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 text-[10px] sm:text-xs mb-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#74c69d] rounded border-2 border-[#74c69d]"></div>
            <span className="whitespace-nowrap"><strong className="font-semibold">Growth</strong>: right spot</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#f59e0b] rounded border-2 border-[#f59e0b]"></div>
            <span className="whitespace-nowrap"><strong className="font-semibold">Hope</strong>: wrong spot</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-foreground/60 rounded"></div>
            <span className="whitespace-nowrap"><strong className="font-semibold">Absent</strong>: not in the word</span>
          </div>
        </div>

        {/* Once today's word is revealed, replaying it would only repeat the answer. */}
        {guesses.length > 0 && gameState === 'playing' && (
          <div className="flex justify-center">
            <button
              onClick={handleStartOver}
              className="px-4 py-1.5 text-xs sm:text-sm bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-lg transition-colors border border-foreground/20"
              aria-label="Start over"
            >
              Start Over
            </button>
          </div>
        )}
      </div>

      {/* Educational Fact - Revealed after winning */}
      {revealed && revealedData && gameState === 'won' && (
        <div
          className="mt-4 p-5 bg-gradient-to-br from-[#74c69d]/15 to-[#74c69d]/5 border-2 border-[#74c69d] rounded-xl animate-fade relative overflow-hidden"
          role="region"
          aria-label="Educational fact"
        >
          {/* Subtle celebration sparkles */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 right-4 w-2 h-2 bg-[#74c69d]/60 rounded-full animate-ping" style={{ animationDelay: '0ms' }} />
            <div className="absolute top-6 right-12 w-1.5 h-1.5 bg-[#74c69d]/40 rounded-full animate-ping" style={{ animationDelay: '200ms' }} />
            <div className="absolute bottom-4 left-8 w-1 h-1 bg-[#74c69d]/50 rounded-full animate-ping" style={{ animationDelay: '400ms' }} />
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg" aria-hidden="true">🌱</span>
              <div className="text-xs font-semibold text-melon-green uppercase tracking-wide">
                {revealedData.category}
              </div>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-foreground">
              {revealedData.fact}
            </p>
            <p className="mt-3 text-xs text-melon-green/80 italic">
              The world is getting better, one fact at a time.
            </p>
          </div>
        </div>
      )}

      {/* Loss state - show fact too (but still encouraging) */}
      {revealed && revealedData && gameState === 'lost' && (
        <div
          className="mt-4 p-5 bg-gradient-to-br from-foreground/5 to-foreground/3 border-2 border-foreground/20 rounded-xl animate-fade"
          role="region"
          aria-label="Educational fact"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg" aria-hidden="true">💭</span>
            <div className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
              {revealedData.category}
            </div>
          </div>
          <p className="mb-2 text-sm sm:text-base text-foreground">
            The word was <strong className="font-semibold tracking-wide">{revealedData.word}</strong>.
          </p>
          <p className="text-sm sm:text-base leading-relaxed text-foreground">
            {revealedData.fact}
          </p>
          <p className="mt-3 text-xs text-foreground/50 italic">
            Not all puzzles need to be solved. Learning is the real win.
          </p>
        </div>
      )}

      {/* Instructions */}
      {guesses.length === 0 && !currentGuess && (
        <div className="mt-3 text-center text-xs sm:text-sm text-foreground/70 space-y-1">
          <p>Guess the {metadata.wordLength}-letter word about global progress in {MAX_GUESSES} tries.</p>
          <p className="text-[10px] sm:text-xs">
            Type or tap letters, then press Enter.
          </p>
        </div>
      )}

      {/* Game state info */}
      {gameState !== 'playing' && (
        <div className="mt-3 text-center text-xs sm:text-sm text-foreground/70">
          <p>Come back tomorrow for a new word!</p>
        </div>
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
