'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MutationResult } from '../engine/types'
import { MECHANIC_CATEGORIES } from '../engine/types'
import { isControlTarget } from './controls'
import { MechanicIcon } from './MechanicIcon'

interface MutationScreenProps {
  /** Null while the next rule is still being chosen. */
  mutation: MutationResult | null
  waveNumber: number
  onContinue: () => void
  retroFont: string
  isTouch: boolean
  reducedMotion: boolean
}

const SHIFT_COUNT = MECHANIC_CATEGORIES.length
const SETTLE_MS = 700
// Long enough that a click or key press meant for the game cannot dismiss the card unread
const READ_GUARD_MS = 800

const KEYBOARD_HINTS: Record<string, string> = {
  arrow_keys: 'Arrow keys or WASD to move.',
  mouse_follow: 'Move the mouse, or use the arrow keys.',
  stars: 'Touch a star to gather it.',
  pulse_gems: 'Gather one while it shines. There is no hurry.',
  chasers: 'A touch only nudges you. Nothing is lost.',
  sweepers: 'If one carries you, let it. Nothing is lost.',
  blaster: 'Hold Space or click to send light.',
  phase_dash: 'Press Space or click to glide.',
  combo_chain: 'A pause only lowers your glow one step.',
  gravity_well: 'No need to chase.',
  score_rush: 'Every light counts triple until it fades.',
}

const TOUCH_HINTS: Record<string, string> = {
  mouse_follow: 'Drag your finger to guide the orb.',
  blaster: 'Keep a finger down to send light.',
  phase_dash: 'Tap to glide.',
}

export default function MutationScreen({
  mutation,
  waveNumber,
  onContinue,
  retroFont,
  isTouch,
  reducedMotion,
}: MutationScreenProps) {
  const [settled, setSettled] = useState(reducedMotion)
  const [ready, setReady] = useState(false)
  const revealed = mutation !== null && settled

  useEffect(() => {
    const t = setTimeout(() => setSettled(true), SETTLE_MS)
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
      className="col-start-1 row-start-1 z-20 flex flex-col items-center justify-center px-5 py-6 bg-card-bg/95"
      onClick={handleContinue}
      role="dialog"
      aria-live="polite"
      aria-label={
        mutation
          ? `Shift ${waveNumber} of ${SHIFT_COUNT}: ${mutation.title}. ${mutation.description} ${controlHint}`
          : 'The game is shifting'
      }
    >
      {!revealed && (
        <p className={`text-sm sm:text-base tracking-[0.3em] text-foreground/80 ${reducedMotion ? '' : 'animate-pulse'} ${retroFont}`}>
          SHIFTING
        </p>
      )}

      {revealed && mutation && (
        <div className={`text-center max-w-sm ${reducedMotion ? '' : 'animate-fade'}`}>
          <p className="text-xs tracking-[0.2em] uppercase mb-3 text-foreground/70">
            Shift {waveNumber} of {SHIFT_COUNT}
          </p>

          <div className="flex justify-center mb-3 text-melon-green" aria-hidden="true">
            <MechanicIcon id={mutation.mechanicId} size={28} />
          </div>

          <h2 className={`text-sm sm:text-xl leading-relaxed mb-3 break-words text-melon-green ${retroFont}`}>
            {mutation.title}
          </h2>

          <p className="text-sm sm:text-base mb-2 leading-relaxed text-foreground break-words">
            {mutation.description}
          </p>

          {mutation.flavorText && (
            <p className="text-sm mb-4 italic text-foreground/70 break-words">
              {mutation.flavorText}
            </p>
          )}

          {controlHint && (
            <p className="text-sm py-2 px-4 rounded-lg border border-card-border bg-background text-foreground inline-block">
              {controlHint}
            </p>
          )}

          <div className="mt-5 min-h-[44px]">
            {ready && (
              <button
                type="button"
                className={`text-[11px] sm:text-xs tracking-[0.15em] px-5 py-3 rounded-lg cursor-pointer bg-melon-green text-card-bg hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${retroFont}`}
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
