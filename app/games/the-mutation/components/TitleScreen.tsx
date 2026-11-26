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
      className="shapeshifter-cover shapeshifter-arrive col-start-1 row-start-1 z-20 flex flex-col items-center justify-center px-5 py-8 cursor-pointer"
      onClick={onStart}
      role="dialog"
      aria-label="The Shapeshifter"
    >
      <div className="text-center max-w-sm">
        <h2 className={`text-body sm:text-h2 mb-3 leading-relaxed shapeshifter-title shapeshifter-title-wide ${retroFont}`}>
          THE SHAPESHIFTER
        </h2>

        <p className="text-meta sm:text-small mb-6 sm:mb-8 shapeshifter-dim">
          a little game that keeps changing its mind
        </p>

        <button data-go=""
          ref={beginRef}
          type="button"
          className={`shapeshifter-go ${retroFont}`}
        >
          BEGIN
        </button>

        <p className="mt-6 sm:mt-8 text-meta leading-relaxed shapeshifter-dim">
          A few rules are hidden in it. Play, wander or simply rest, and they will show themselves. Nothing here can hurt you.
        </p>
        <p className="mt-1 text-meta shapeshifter-dim">
          {isTouch ? 'Tap to begin.' : 'Enter, Space or click to begin.'}
        </p>
      </div>
    </div>
  )
}
