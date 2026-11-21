'use client'

import { useState, useEffect } from 'react'
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
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timers = REVEAL_MS.map((ms, i) => setTimeout(() => setPhase(i + 1), ms))
    return () => timers.forEach(clearTimeout)
  }, [])

  const canPlayAgain = phase >= 3

  // Enter only: Space may still be held from the final wave
  useEffect(() => {
    if (!canPlayAgain) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || isControlTarget(e.target)) return
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
      className="col-start-1 row-start-1 z-20 flex flex-col items-center justify-center px-4 py-8 bg-card-bg"
      role="dialog"
      aria-label={gameName ? `Your game is finished. It is called ${gameName}.` : 'Your game is finished.'}
    >
      <div className="text-center w-full max-w-md">
        {phase >= 1 && (
          <p className={`text-xs tracking-[0.2em] uppercase mb-3 text-foreground/70 ${fade}`}>
            Your game is finished. It is called
          </p>
        )}

        {phase >= 1 && gameName && (
          <div className={fade}>
            <h2 className={`text-base sm:text-2xl leading-relaxed mb-2 break-words text-melon-green ${retroFont}`}>
              {gameName}
            </h2>
            {tagline && <p className="text-sm italic text-foreground/80 break-words">{tagline}</p>}
          </div>
        )}

        {phase >= 2 && (
          <div className={fade}>
            <p className="text-sm sm:text-base text-foreground mt-5 mb-5 leading-relaxed">{closingLine}</p>

            <dl className="grid grid-cols-3 gap-2 mb-5 py-3 px-2 rounded-lg bg-background border border-card-border">
              {[
                ['light', String(score)],
                [statLabel, String(statValue)],
                ['time', `${minutes}:${seconds.toString().padStart(2, '0')}`],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="text-xs mt-0.5 text-foreground/70">{label}</dt>
                  <dd className="text-lg font-semibold text-foreground tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="text-left mb-5">
              <p className="text-xs tracking-[0.15em] uppercase mb-2 text-foreground/70">How it grew</p>
              <ol>
                {mutations.map((m, i) => (
                  <li key={i} className="flex items-center gap-3 py-1.5 border-b border-card-border last:border-b-0">
                    <span className="w-5 flex justify-center text-melon-green shrink-0">
                      <MechanicIcon id={m.id} />
                    </span>
                    <span className="text-sm text-foreground/85 flex-1 break-words">{m.title}</span>
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
              className={`text-xs sm:text-sm tracking-[0.15em] px-6 py-3 rounded-lg cursor-pointer bg-melon-green text-card-bg hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${retroFont}`}
            >
              PLAY AGAIN
            </button>
            <p className="text-xs mt-4 text-foreground/70">
              No one else will ever play this exact game.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
