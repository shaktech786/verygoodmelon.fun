'use client'

import { useState, useEffect } from 'react'
import type { MutationRecord } from '../engine/types'

interface FinaleScreenProps {
  score: number
  maxCombo: number
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

export default function FinaleScreen({
  score,
  maxCombo,
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
      setTimeout(() => setPhase(1), 400),   // "YOUR GAME"
      setTimeout(() => setPhase(2), 1200),   // Game name
      setTimeout(() => setPhase(3), 2200),   // Stats + mutations
      setTimeout(() => setPhase(4), 3200),   // Play again
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const minutes = Math.floor(totalTime / 60)
  const seconds = Math.floor(totalTime % 60)

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center rounded-lg z-20 overflow-y-auto py-6"
      style={{ background: 'rgba(8,8,16,0.97)' }}
      role="dialog"
      aria-label={`Game complete. Your game: ${gameName}. Score: ${score}`}
    >
      <div className="text-center max-w-md px-4">
        {/* Header */}
        {phase >= 1 && (
          <p
            className="text-[10px] tracking-[0.4em] mb-4 opacity-40"
            style={{ color: '#ff00ff', fontFamily: 'monospace' }}
          >
            YOUR GAME IS COMPLETE
          </p>
        )}

        {/* Game name */}
        {phase >= 2 && (
          <>
            <h2
              className={`text-xl sm:text-2xl mb-2 ${retroFont}`}
              style={{
                color: '#00ff88',
                textShadow: '0 0 20px rgba(0,255,136,0.5)',
              }}
            >
              {gameName || 'UNNAMED CREATION'}
            </h2>
            {tagline && (
              <p
                className="text-xs mb-6 italic opacity-50"
                style={{ color: '#8899aa', fontFamily: 'monospace' }}
              >
                {tagline}
              </p>
            )}
          </>
        )}

        {/* Stats */}
        {phase >= 3 && (
          <>
            <div
              className="grid grid-cols-3 gap-3 mb-6 py-3 px-4 rounded"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div>
                <p className={`text-lg ${retroFont}`} style={{ color: '#ffd700' }}>
                  {Math.floor(score)}
                </p>
                <p className="text-[9px] opacity-40 mt-1" style={{ color: '#556677', fontFamily: 'monospace' }}>
                  SCORE
                </p>
              </div>
              <div>
                <p className={`text-lg ${retroFont}`} style={{ color: '#ff00ff' }}>
                  {maxCombo}x
                </p>
                <p className="text-[9px] opacity-40 mt-1" style={{ color: '#556677', fontFamily: 'monospace' }}>
                  MAX COMBO
                </p>
              </div>
              <div>
                <p className={`text-lg ${retroFont}`} style={{ color: '#00ccff' }}>
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </p>
                <p className="text-[9px] opacity-40 mt-1" style={{ color: '#556677', fontFamily: 'monospace' }}>
                  TIME
                </p>
              </div>
            </div>

            {/* Mutation timeline */}
            <div className="text-left mb-6">
              <p
                className="text-[9px] tracking-[0.2em] mb-2 opacity-30"
                style={{ color: '#556677', fontFamily: 'monospace' }}
              >
                EVOLUTION LOG
              </p>
              {mutations.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 py-1.5 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                >
                  <span className="text-sm w-6 text-center">{CATEGORY_ICONS[m.id] || '🔧'}</span>
                  <span
                    className="text-[10px] flex-1"
                    style={{ color: '#aabbcc', fontFamily: 'monospace' }}
                  >
                    {m.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Uniqueness message */}
            <p
              className="text-[10px] mb-6 opacity-25"
              style={{ color: '#556677', fontFamily: 'monospace' }}
            >
              No one else will ever play this exact game.
            </p>
          </>
        )}

        {/* Play again */}
        {phase >= 4 && (
          <button
            onClick={onPlayAgain}
            className={`text-sm tracking-[0.15em] border px-6 py-3 rounded cursor-pointer transition-all hover:scale-105 ${retroFont}`}
            style={{
              color: '#00ff88',
              borderColor: 'rgba(0,255,136,0.3)',
              background: 'rgba(0,255,136,0.05)',
              textShadow: '0 0 10px rgba(0,255,136,0.3)',
            }}
          >
            PLAY AGAIN
          </button>
        )}
      </div>
    </div>
  )
}
