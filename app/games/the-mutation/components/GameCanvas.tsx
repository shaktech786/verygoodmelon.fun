'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { GameState } from '../engine/types'
import { GAME_W, GAME_H, COLORS } from '../engine/types'
import {
  createState,
  update as updateEngine,
  render as renderEngine,
  shouldMutate,
  isGameComplete,
  activateMechanic,
  advanceWave,
} from '../engine/engine'
import { isControlTarget } from './controls'

interface GameCanvasProps {
  isPlaying: boolean
  activeMechanics: Array<{ id: string; params: Record<string, number> }>
  onMutationReady: () => void
  onGameComplete: () => void
  onScoreChange: (score: number) => void
  onMultiplierChange: (multiplier: number) => void
  onRushTimerChange: (timer: number) => void
  gameStateRef: React.MutableRefObject<GameState | null>
  reducedMotion: boolean
}

type CascadeWindow = Window & { __cascadeState?: GameState }

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '])

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key
}

export default function GameCanvas({
  isPlaying,
  activeMechanics,
  onMutationReady,
  onGameComplete,
  onScoreChange,
  onMultiplierChange,
  onRushTimerChange,
  gameStateRef,
  reducedMotion,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState | null>(null)
  const playingRef = useRef(false)
  const callbacksRef = useRef({ onMutationReady, onGameComplete, onScoreChange, onMultiplierChange, onRushTimerChange })

  useEffect(() => {
    callbacksRef.current = { onMutationReady, onGameComplete, onScoreChange, onMultiplierChange, onRushTimerChange }
  })

  useEffect(() => {
    const state = createState()
    stateRef.current = state
    gameStateRef.current = state
    // Lets the e2e suite fast-forward waves instead of waiting out real timers
    if (process.env.NODE_ENV !== 'production') {
      (window as CascadeWindow).__cascadeState = state
    }
  }, [gameStateRef])

  useEffect(() => {
    const s = stateRef.current
    if (!s) return
    for (const m of activeMechanics) {
      activateMechanic(s, m.id, m.params)
    }
  }, [activeMechanics])

  const toLogical = useCallback((clientX: number, clientY: number): [number, number] => {
    const canvas = canvasRef.current
    if (!canvas) return [GAME_W / 2, GAME_H / 2]
    const rect = canvas.getBoundingClientRect()
    return [
      (clientX - rect.left) * (GAME_W / rect.width),
      (clientY - rect.top) * (GAME_H / rect.height),
    ]
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current
      if (!s || !playingRef.current || isControlTarget(e.target)) return
      const key = normalizeKey(e.key)
      if (SCROLL_KEYS.has(key)) e.preventDefault()
      if (e.repeat) return
      s.keys.add(key)
      // Before any mechanic exists the orb can only be pulsed, so the keyboard gets a way to do it
      if (s.activeMechanics.length === 0 && (key === ' ' || key === 'Enter')) {
        s.mx = s.px
        s.my = s.py
        s.clickThisFrame = true
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current?.keys.delete(normalizeKey(e.key))
    }
    const releaseAll = () => {
      const s = stateRef.current
      if (!s) return
      s.keys.clear()
      s.mDown = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', releaseAll)
    }
  }, [])

  const pointTo = useCallback((clientX: number, clientY: number) => {
    const s = stateRef.current
    if (!s) return
    const [x, y] = toLogical(clientX, clientY)
    s.mx = x
    s.my = y
  }, [toLogical])

  const press = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    s.mDown = true
    s.clickThisFrame = true
  }, [])

  const release = useCallback(() => {
    const s = stateRef.current
    if (s) s.mDown = false
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    pointTo(e.clientX, e.clientY)
  }, [pointTo])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    pointTo(e.clientX, e.clientY)
    press()
  }, [pointTo, press])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0]
    if (touch) pointTo(touch.clientX, touch.clientY)
  }, [pointTo])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0]
    if (!touch) return
    pointTo(touch.clientX, touch.clientY)
    press()
  }, [pointTo, press])

  useEffect(() => {
    playingRef.current = isPlaying
    if (!isPlaying) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // Keeps Space and Enter on the game instead of re-pressing whichever button was clicked last
    canvas.focus({ preventScroll: true })

    let frame = 0
    let lastTime = performance.now()
    let lastScore = -1
    let lastMultiplier = -1
    let lastRush = -1

    const loop = (time: number) => {
      const s = stateRef.current
      if (!s) return

      const dt = Math.min(Math.max(time - lastTime, 0) / 1000, 0.1)
      lastTime = time

      updateEngine(s, dt)
      renderEngine(ctx, s, reducedMotion)

      const cb = callbacksRef.current
      const score = Math.floor(s.score)
      if (score !== lastScore) {
        lastScore = score
        cb.onScoreChange(score)
      }
      if (s.multiplier !== lastMultiplier) {
        lastMultiplier = s.multiplier
        cb.onMultiplierChange(s.multiplier)
      }
      const rush = s.rushActive ? Math.max(0, Math.ceil(s.rushTimer)) : 0
      if (rush !== lastRush) {
        lastRush = rush
        cb.onRushTimerChange(rush)
      }

      if (shouldMutate(s)) {
        advanceWave(s)
        cb.onMutationReady()
        return
      }

      if (isGameComplete(s)) {
        cb.onGameComplete()
        return
      }

      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, reducedMotion])

  return (
    <div className="relative select-none">
      <canvas
        ref={canvasRef}
        width={GAME_W}
        height={GAME_H}
        className="w-full block rounded-lg"
        style={{
          aspectRatio: '4/3',
          imageRendering: 'pixelated',
          touchAction: 'none',
          boxShadow: `0 0 40px ${COLORS.playerGlow}, inset 0 0 60px rgba(0,0,0,0.4)`,
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={release}
        onMouseLeave={release}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={release}
        onTouchCancel={release}
        role="application"
        aria-label="Cascade game area"
        tabIndex={0}
      />
      {!reducedMotion && (
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.12) 2px,
              rgba(0,0,0,0.12) 4px
            )`,
          }}
        />
      )}
    </div>
  )
}
