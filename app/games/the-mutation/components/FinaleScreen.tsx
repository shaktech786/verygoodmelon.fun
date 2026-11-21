'use client'

import { useState, useEffect } from 'react'
import type { MutationRecord } from '../engine/types'
import { isControlTarget } from './controls'

interface FinaleScreenProps {
  score: number
  statValue: number
  statLabel: string
  /** Empty until the name has been chosen. */
  gameName: string
  tagline: string
  mutations: MutationRecord[]
  totalTime: number
  onPlayAgain: () => void
  retroFont: string
}

const CATEGORY_ICONS: Record<string, string> = {
  arrow_keys: '🕹️',
  mouse_follow: '🖱️',
  stars: '⭐',
  pulse_gems: '💎',
  chasers: '👾',
  sweepers: '⚡',
  blaster: '🔫',
  phase_dash: '💨',
  combo_chain: '🔥',
  gravity_well: '🧲',
  score_rush: '🚀',
}

const LABEL_STYLE = { color: '#8899aa', fontFamily: 'monospace' } as const

export default function FinaleScreen({
  score,
  statValue,
  statLabel,
  gameName,
  tagline,
  mutations,
  totalTime,
  onPlayAgain,
  retroFont,
}: FinaleScreenProps) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
    ]
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

  return (
    <div
      className="col-start-1 row-start-1 z-20 flex flex-col items-center justify-center rounded-lg px-4 py-8"
      style={{ background: 'rgba(8,8,16,0.97)' }}
      role="dialog"
      aria-label={gameName ? `Game complete. Your game: ${gameName}. Score: ${score}` : `Game complete. Score: ${score}`}
    >
      <div className="text-center w-full max-w-md">
        {phase >= 1 && (
          <p
            className="text-[11px] tracking-[0.3em] mb-4"
            style={{ color: '#d977d9', fontFamily: 'monospace' }}
          >
            YOUR GAME IS COMPLETE
          </p>
        )}

        {phase >= 1 && gameName && (
          <>
            <h2
              className={`text-lg sm:text-2xl leading-snug mb-2 break-words ${retroFont}`}
              style={{
                color: '#00ff88',
                textShadow: '0 0 20px rgba(0,255,136,0.5)',
              }}
            >
              {gameName}
            </h2>
            {tagline && (
              <p className="text-xs mb-6 italic" style={LABEL_STYLE}>
                {tagline}
              </p>
            )}
          </>
        )}

        {phase >= 2 && (
          <>
            <div
              className="grid grid-cols-3 gap-3 mb-6 py-3 px-2 rounded"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div>
                <p className={`text-sm sm:text-lg ${retroFont}`} style={{ color: '#ffd700' }}>
                  {score}
                </p>
                <p className="text-[10px] mt-1" style={LABEL_STYLE}>SCORE</p>
              </div>
              <div>
                <p className={`text-sm sm:text-lg ${retroFont}`} style={{ color: '#ff66ff' }}>
                  {statValue}
                </p>
                <p className="text-[10px] mt-1" style={LABEL_STYLE}>{statLabel}</p>
              </div>
              <div>
                <p className={`text-sm sm:text-lg ${retroFont}`} style={{ color: '#00ccff' }}>
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </p>
                <p className="text-[10px] mt-1" style={LABEL_STYLE}>TIME</p>
              </div>
            </div>

            <div className="text-left mb-6">
              <p className="text-[10px] tracking-[0.2em] mb-2" style={LABEL_STYLE}>
                EVOLUTION LOG
              </p>
              <ol>
                {mutations.map((m, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 py-1.5 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <span className="text-sm w-6 text-center" aria-hidden="true">
                      {CATEGORY_ICONS[m.id] || '🔧'}
                    </span>
                    <span
                      className="text-[11px] flex-1"
                      style={{ color: '#aabbcc', fontFamily: 'monospace' }}
                    >
                      {m.title}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}

        {canPlayAgain && (
          <>
            <button
              type="button"
              onClick={onPlayAgain}
              className={`text-sm tracking-[0.15em] border px-6 py-3 rounded cursor-pointer transition-transform hover:scale-105 ${retroFont}`}
              style={{
                color: '#00ff88',
                borderColor: 'rgba(0,255,136,0.4)',
                background: 'rgba(0,255,136,0.06)',
                textShadow: '0 0 10px rgba(0,255,136,0.3)',
              }}
            >
              PLAY AGAIN
            </button>
            <p className="text-[11px] mt-5" style={LABEL_STYLE}>
              No one else will ever play this exact game.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
