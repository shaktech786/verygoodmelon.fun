'use client'

import { useState, useEffect, useRef } from 'react'
import type { MutationRecord } from '../engine/types'
import { isControlTarget } from './controls'
import { MechanicIcon } from './MechanicIcon'

interface FinaleScreenProps {
  score: number
  statValue: number
  statLabel: string
  /** Empty until the name has been chosen. */
  gameName: string
  tagline: string
  closingLine: string
  mutations: MutationRecord[]
  totalTime: number
  onPlayAgain: () => void
  retroFont: string
  reducedMotion: boolean
}

const REVEAL_MS = [300, 900, 1600]

export default function FinaleScreen({
  score,
  statValue,
  statLabel,
  gameName,
  tagline,
  closingLine,
  mutations,
  totalTime,
  onPlayAgain,
  retroFont,
  reducedMotion,
}: FinaleScreenProps) {
  const [phase, setPhase] = useState(reducedMotion ? REVEAL_MS.length : 0)
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

  const minutes = Math.floor(totalTime / 60)
  const seconds = Math.floor(totalTime % 60)
  const fade = reducedMotion ? '' : 'animate-fade'

  return (
    <div
      className="col-start-1 row-start-1 z-20 flex flex-col items-center justify-center px-4 py-5 sm:py-6 bg-card-bg"
      role="dialog"
      aria-label="Your game is finished"
    >
      <div className="text-center w-full max-w-md">
        {phase >= 1 && (
          <p className={`text-xs tracking-[0.2em] uppercase mb-2 text-foreground/70 ${fade}`} aria-hidden="true">
            Your game is finished. It is called
          </p>
        )}

        {named ? (
          <div className={fade}>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className={`text-base sm:text-xl leading-relaxed mb-1 break-words text-melon-green focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded ${retroFont}`}
            >
              <span className="sr-only">Your game is finished. It is called </span>
              {gameName}
            </h2>
            {tagline && <p className="text-sm italic text-foreground/80 break-words">{tagline}</p>}
          </div>
        ) : (
          phase >= 1 && <p className="text-sm text-foreground/70 py-2">Finding its name…</p>
        )}

        {phase >= 2 && (
          <div className={fade}>
            <p className="text-sm text-foreground mt-3 mb-3 leading-relaxed">{closingLine}</p>

            <dl className="grid grid-cols-3 gap-2 mb-3 py-2 px-2 rounded-lg bg-background border border-card-border">
              {[
                ['light', String(score)],
                [statLabel, String(statValue)],
                ['time', `${minutes}:${seconds.toString().padStart(2, '0')}`],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="text-xs mt-0.5 text-foreground/70">{label}</dt>
                  <dd className="text-base font-semibold text-foreground tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="text-left mb-3">
              <p className="text-xs tracking-[0.15em] uppercase mb-1 text-foreground/70">How it grew, in order</p>
              <ol className="grid grid-cols-2 gap-x-4">
                {mutations.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 py-1 border-b border-card-border min-w-0">
                    <span className="w-4 flex justify-center text-melon-green shrink-0">
                      <MechanicIcon id={m.id} size={14} />
                    </span>
                    <span className="text-xs sm:text-sm text-foreground/85 break-words min-w-0">{m.title}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {canPlayAgain && (
          <div className={fade}>
            <button
              type="button"
              onClick={onPlayAgain}
              className={`text-xs sm:text-sm tracking-[0.15em] px-6 py-3 rounded-lg cursor-pointer bg-melon-green text-card-bg hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ${retroFont}`}
            >
              PLAY AGAIN
            </button>
            <p className="text-xs mt-2 text-foreground/70">
              Play again and its rules will arrive in a different order.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
