'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Keepsake } from '@/components/games/Keepsake'
import { shapeshifterKeepsake } from '@/lib/keepsake/shapeshifter'
import type { MutationRecord, PathPoint, Sleeping } from '../engine/types'
import { isControlTarget } from './controls'

interface FinaleScreenProps {
  /** Empty until the name has been chosen. */
  gameName: string
  tagline: string
  closingLine: string
  mutations: MutationRecord[]
  path: readonly PathPoint[]
  /** Clues the player let be, still asleep in the field. */
  sleeping: readonly Sleeping[]
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
  sleeping,
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
    () => (gameName ? shapeshifterKeepsake({ path, rules: mutations, sleeping, field, name: gameName, day }) : null),
    [gameName, path, mutations, sleeping, field, day],
  )

  const fade = 'shapeshifter-arrive'

  return (
    <div
      className="col-start-1 row-start-1 z-20 flex flex-col items-center justify-center px-4 py-5 sm:py-6"
      role="dialog"
      aria-label="Your game is finished"
    >
      <div className="w-full grid gap-x-8 gap-y-4 sm:grid-cols-[minmax(0,26rem)_1fr] sm:items-center">
        <div className="text-center sm:col-start-2 sm:row-start-1">
          {phase >= 1 && (
            <p className={`text-meta mb-2 text-[var(--ink-soft)] ${fade}`} aria-hidden="true">
              Your game is finished. It is called
            </p>
          )}

          {named ? (
            <div className={fade}>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className={`text-small sm:text-body leading-relaxed mb-1 break-words text-[var(--rind)] focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] rounded-stamp ${retroFont}`}
              >
                <span className="sr-only">Your game is finished. It is called </span>
                {gameName}
              </h2>
              {tagline && <p className="text-small text-[var(--ink-soft)] break-words">{tagline}</p>}
            </div>
          ) : (
            phase >= 1 && <p className="text-meta text-[var(--ink-soft)] py-2">Finding its name…</p>
          )}

          {phase >= 2 && (
            <p className={`text-small mt-3 leading-relaxed ${fade}`}>{closingLine}</p>
          )}

          {canPlayAgain && (
            <div className={`mt-4 ${fade}`}>
              <button data-go=""
                type="button"
                onClick={onPlayAgain}
                className={`sp-go shapeshifter-pixel ${retroFont}`}
              >
                PLAY AGAIN
              </button>
              <p className="text-small mt-2 text-[var(--ink-soft)]">
                Play again and choose other clues, or rest through them, and it will end another way.
              </p>
            </div>
          )}
        </div>

        {phase >= 2 && plan && (
          <Keepsake
            plan={plan}
            label="The path you took, one colour and shape for each rule"
            hideLabel
            className={`w-full mx-auto sm:col-start-1 sm:row-start-1 [--print-max:none] ${fade}`}
          />
        )}
      </div>
    </div>
  )
}
