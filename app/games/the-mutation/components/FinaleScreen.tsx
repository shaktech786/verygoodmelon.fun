'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Keepsake } from '@/components/games/Keepsake'
import { shapeshifterKeepsake } from '@/lib/keepsake/shapeshifter'
import type { MutationRecord, PathPoint } from '../engine/types'
import { isControlTarget } from './controls'

interface FinaleScreenProps {
  /** Empty until the name has been chosen. */
  gameName: string
  tagline: string
  closingLine: string
  mutations: MutationRecord[]
  path: readonly PathPoint[]
  field: { w: number; h: number }
  onPlayAgain: () => void
  retroFont: string
  reducedMotion: boolean
}

const REVEAL_MS = [300, 900, 1600]

export default function FinaleScreen({
  gameName,
  tagline,
  closingLine,
  mutations,
  path,
  field,
  onPlayAgain,
  retroFont,
  reducedMotion,
}: FinaleScreenProps) {
  const [phase, setPhase] = useState(reducedMotion ? REVEAL_MS.length : 0)
  const [day] = useState(() => new Date())
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (reducedMotion) return
    const timers = REVEAL_MS.map((ms, i) => setTimeout(() => setPhase(i + 1), ms))
    return () => timers.forEach(clearTimeout)
  }, [reducedMotion])

  // Focus waits for the name, so a screen reader hears the whole sentence once
  const named = phase >= 1 && gameName !== ''
  useEffect(() => {
    if (named) headingRef.current?.focus({ preventScroll: true })
  }, [named])

  const canPlayAgain = phase >= 3

  // Enter only: Space may still be held from the final wave
  useEffect(() => {
    if (!canPlayAgain) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || isControlTarget(e.target)) return
      // Otherwise the same key press also activates BEGIN once the title takes focus, skipping it
      e.preventDefault()
      onPlayAgain()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [canPlayAgain, onPlayAgain])

  const plan = useMemo(
    () => (gameName ? shapeshifterKeepsake({ path, rules: mutations, field, name: gameName, day }) : null),
    [gameName, path, mutations, field, day],
  )

  const fade = reducedMotion ? '' : 'animate-fade'

  return (
    <div
      className="col-start-1 row-start-1 z-20 flex flex-col items-center justify-center px-4 py-5 sm:py-6 bg-card-bg"
      role="dialog"
      aria-label="Your game is finished"
    >
      <div className="w-full grid gap-x-8 gap-y-4 sm:grid-cols-[minmax(0,26rem)_1fr] sm:items-center">
        <div className="text-center sm:col-start-2 sm:row-start-1">
          {phase >= 1 && (
            <p className={`text-xs tracking-[0.15em] uppercase mb-2 text-foreground/70 ${fade}`} aria-hidden="true">
              Your game is finished. It is called
            </p>
          )}

          {named ? (
            <div className={fade}>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className={`text-base sm:text-lg leading-relaxed mb-1 break-words text-melon-green focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded ${retroFont}`}
              >
                <span className="sr-only">Your game is finished. It is called </span>
                {gameName}
              </h2>
              {tagline && <p className="text-base italic text-foreground/80 break-words">{tagline}</p>}
            </div>
          ) : (
            phase >= 1 && <p className="text-sm text-foreground/70 py-2">Finding its name…</p>
          )}

          {phase >= 2 && (
            <p className={`text-base text-foreground mt-3 leading-relaxed ${fade}`}>{closingLine}</p>
          )}

          {canPlayAgain && (
            <div className={`mt-4 ${fade}`}>
              <button
                type="button"
                onClick={onPlayAgain}
                className={`text-xs sm:text-sm tracking-[0.15em] px-6 py-3 rounded-lg cursor-pointer bg-melon-green text-card-bg hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ${retroFont}`}
              >
                PLAY AGAIN
              </button>
              <p className="text-base mt-2 text-foreground/70">
                Play again and its rules will arrive in a different order.
              </p>
            </div>
          )}
        </div>

        {phase >= 2 && plan && (
          <Keepsake
            plan={plan}
            label="The path you took, one colour and shape for each rule"
            hideLabel
            className={`w-full mx-auto sm:col-start-1 sm:row-start-1 [&_canvas]:max-w-none ${fade}`}
          />
        )}
      </div>
    </div>
  )
}
