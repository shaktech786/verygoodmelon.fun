'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MutationResult } from '../engine/types'

interface MutationScreenProps {
  mutation: MutationResult
  waveNumber: number
  onContinue: () => void
  retroFont: string
}

// Control hint mapping
const DEFAULT_HINTS: Record<string, string> = {
  arrow_keys: 'ARROW KEYS / WASD to move',
  mouse_follow: 'MOUSE to move',
  stars: 'Touch stars to collect',
  pulse_gems: 'Catch gems while they glow',
  chasers: 'Avoid the red squares!',
  sweepers: 'Dodge the beams!',
  blaster: 'SPACE to shoot',
  phase_dash: 'SPACE to dash',
  combo_chain: 'Chain actions for multiplier',
  gravity_well: 'Collectibles drift toward you',
  score_rush: 'Everything is amplified!',
}

export default function MutationScreen({ mutation, waveNumber, onContinue, retroFont }: MutationScreenProps) {
  const [phase, setPhase] = useState<'glitch' | 'reveal' | 'ready'>('glitch')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 600)
    const t2 = setTimeout(() => setPhase('ready'), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const handleContinue = useCallback(() => {
    if (phase === 'ready') onContinue()
  }, [phase, onContinue])

  // Any key to continue
  useEffect(() => {
    if (phase !== 'ready') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab') return
      onContinue()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, onContinue])

  const controlHint = mutation.controlHint || DEFAULT_HINTS[mutation.mechanicId] || ''

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center rounded-lg z-20"
      style={{ background: 'rgba(8,8,16,0.92)' }}
      onClick={handleContinue}
      role="dialog"
      aria-live="assertive"
      aria-label={`Mutation ${waveNumber}: ${mutation.title}. ${mutation.description}`}
    >
      {/* Glitch phase */}
      {phase === 'glitch' && (
        <div className="text-center">
          <p
            className={`text-lg sm:text-xl tracking-[0.5em] ${retroFont}`}
            style={{
              color: '#ff00ff',
              textShadow: '-2px 0 #ff0000, 2px 0 #00ffff',
              animation: 'cascadeGlitch 0.15s infinite',
            }}
          >
            MUTATION
          </p>
        </div>
      )}

      {/* Reveal phase */}
      {(phase === 'reveal' || phase === 'ready') && (
        <div className="text-center max-w-sm px-4">
          <p
            className="text-[10px] tracking-[0.3em] mb-4 opacity-40"
            style={{ color: '#ff00ff', fontFamily: 'monospace' }}
          >
            MUTATION {waveNumber} / 6
          </p>

          <h2
            className={`text-xl sm:text-2xl mb-4 ${retroFont}`}
            style={{
              color: '#00ff88',
              textShadow: '0 0 16px rgba(0,255,136,0.5)',
            }}
          >
            {mutation.title}
          </h2>

          <p
            className="text-sm mb-3 leading-relaxed"
            style={{ color: '#ccddee', fontFamily: 'monospace' }}
          >
            {mutation.description}
          </p>

          {mutation.flavorText && (
            <p
              className="text-xs mb-5 italic opacity-50"
              style={{ color: '#8899aa', fontFamily: 'monospace' }}
            >
              &ldquo;{mutation.flavorText}&rdquo;
            </p>
          )}

          {controlHint && (
            <p
              className="text-[10px] tracking-[0.1em] mb-6 py-2 px-4 rounded border inline-block"
              style={{
                color: '#ffd700',
                borderColor: 'rgba(255,215,0,0.2)',
                fontFamily: 'monospace',
              }}
            >
              {controlHint}
            </p>
          )}

          {phase === 'ready' && (
            <p
              className={`text-xs tracking-[0.15em] mt-6 opacity-60 ${retroFont}`}
              style={{
                color: '#556677',
                animation: 'cascadePulse 1.2s ease-in-out infinite',
              }}
            >
              PRESS ANY KEY
            </p>
          )}
        </div>
      )}
    </div>
  )
}
