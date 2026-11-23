'use client'

import { useEffect, useRef } from 'react'
import { isControlTarget } from './controls'

interface TitleScreenProps {
  onStart: () => void
  retroFont: string
  isTouch: boolean
  /** After Play Again, so keyboard focus lands on the game instead of the page. */
  focusBegin: boolean
}

export default function TitleScreen({ onStart, retroFont, isTouch, focusBegin }: TitleScreenProps) {
  const beginRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (focusBegin) beginRef.current?.focus({ preventScroll: true })
  }, [focusBegin])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat || isControlTarget(e.target)) return
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      onStart()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onStart])

  return (
    <div
      className="col-start-1 row-start-1 z-20 flex flex-col items-center justify-center px-5 py-8 animate-fade cursor-pointer bg-card-bg"
      onClick={onStart}
      role="dialog"
      aria-label="The Shapeshifter"
    >
      <div className="text-center max-w-sm">
        <h2 className={`text-lg sm:text-3xl tracking-[0.12em] sm:tracking-[0.2em] mb-3 text-melon-green leading-relaxed ${retroFont}`}>
          THE SHAPESHIFTER
        </h2>

        <p className="text-sm sm:text-base text-foreground/80 mb-6 sm:mb-8">
          a little game that keeps changing its mind
        </p>

        <button
          ref={beginRef}
          type="button"
          className={`text-xs sm:text-sm tracking-[0.15em] px-6 py-3 rounded-lg cursor-pointer bg-melon-green text-card-bg hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ${retroFont}`}
        >
          BEGIN
        </button>

        <p className="mt-6 sm:mt-8 text-sm text-foreground/80 leading-relaxed">
          Six rules are hidden in it. Play, wander or simply rest, and they will show themselves. Nothing here can hurt you.
        </p>
        <p className="mt-1 text-xs text-foreground/70">
          {isTouch ? 'Tap to begin.' : 'Enter, Space or click to begin.'}
        </p>
      </div>
    </div>
  )
}
