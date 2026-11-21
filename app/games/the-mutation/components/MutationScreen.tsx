'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MutationResult } from '../engine/types'
import { isControlTarget } from './controls'

interface MutationScreenProps {
  /** Null while the next mutation is still being chosen. */
  mutation: MutationResult | null
  waveNumber: number
  onContinue: () => void
  retroFont: string
  isTouch: boolean
  reducedMotion: boolean
}

const GLITCH_MS = 600
// Long enough that a click or key press meant for the game cannot dismiss the card unread
const READ_GUARD_MS = 800

const KEYBOARD_HINTS: Record<string, string> = {
  arrow_keys: 'ARROW KEYS / WASD to move',
  mouse_follow: 'Move the MOUSE (or ARROW KEYS) to guide the orb',
  stars: 'Touch stars to collect them',
  pulse_gems: 'Catch gems while they glow',
  chasers: 'Avoid the red squares. A hit costs 25 points',
  sweepers: 'Dodge the beams. A hit costs 25 points',
  blaster: 'Hold SPACE or CLICK to shoot',
  phase_dash: 'SPACE or CLICK to dash through danger',
  combo_chain: 'Chain pickups without getting hit',
  gravity_well: 'Nearby collectibles drift to you',
  score_rush: 'Everything counts triple until the timer ends',
}

const TOUCH_HINTS: Record<string, string> = {
  mouse_follow: 'DRAG your finger to guide the orb',
  blaster: 'The orb shoots while you touch the screen',
  phase_dash: 'The orb dashes while you touch the screen',
}

export default function MutationScreen({
  mutation,
  waveNumber,
  onContinue,
  retroFont,
  isTouch,
  reducedMotion,
}: MutationScreenProps) {
  const [glitchDone, setGlitchDone] = useState(reducedMotion)
  const [ready, setReady] = useState(false)
  const revealed = mutation !== null && glitchDone

  useEffect(() => {
    const t = setTimeout(() => setGlitchDone(true), GLITCH_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!revealed) return
    const t = setTimeout(() => setReady(true), READ_GUARD_MS)
    return () => clearTimeout(t)
  }, [revealed])

  const handleContinue = useCallback(() => {
    if (ready) onContinue()
  }, [ready, onContinue])

  // Enter only: Space and the arrow keys are game controls a player may still be holding
  useEffect(() => {
    if (!ready) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || isControlTarget(e.target)) return
      onContinue()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [ready, onContinue])

  const controlHint = mutation
    ? (isTouch && TOUCH_HINTS[mutation.mechanicId]) || KEYBOARD_HINTS[mutation.mechanicId] || ''
    : ''

  return (
    <div
      className="col-start-1 row-start-1 z-20 flex flex-col items-center justify-center rounded-lg px-4 py-6"
      style={{ background: 'rgba(8,8,16,0.94)' }}
      onClick={handleContinue}
      role="dialog"
      aria-live="assertive"
      aria-label={
        mutation
          ? `Mutation ${waveNumber} of 6: ${mutation.title}. ${mutation.description} ${controlHint}`
          : 'A new mutation is coming'
      }
    >
      {!revealed && (
        <p
          className={`text-lg sm:text-xl tracking-[0.5em] ${retroFont}`}
          style={{
            color: '#ff00ff',
            textShadow: '-2px 0 #ff0000, 2px 0 #00ffff',
            animation: reducedMotion ? 'none' : 'cascadeGlitch 0.15s infinite',
          }}
        >
          MUTATION
        </p>
      )}

      {revealed && mutation && (
        <div className="text-center max-w-sm">
          <p
            className="text-[11px] tracking-[0.3em] mb-3"
            style={{ color: '#d977d9', fontFamily: 'monospace' }}
          >
            MUTATION {waveNumber} / 6
          </p>

          <h2
            className={`text-base sm:text-2xl leading-snug mb-3 break-words ${retroFont}`}
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
              className="text-xs mb-4 italic"
              style={{ color: '#8899aa', fontFamily: 'monospace' }}
            >
              &ldquo;{mutation.flavorText}&rdquo;
            </p>
          )}

          {controlHint && (
            <p
              className="text-xs tracking-[0.05em] py-2 px-4 rounded border inline-block"
              style={{
                color: '#ffd700',
                borderColor: 'rgba(255,215,0,0.3)',
                fontFamily: 'monospace',
              }}
            >
              {controlHint}
            </p>
          )}

          <div className="mt-5 min-h-[40px]">
            {ready && (
              <button
                type="button"
                className={`text-[11px] sm:text-xs tracking-[0.15em] border px-4 py-3 rounded cursor-pointer ${retroFont}`}
                style={{
                  color: '#00ff88',
                  borderColor: 'rgba(0,255,136,0.4)',
                  background: 'rgba(0,255,136,0.06)',
                }}
              >
                {isTouch ? 'TAP TO CONTINUE' : 'PRESS ENTER'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
