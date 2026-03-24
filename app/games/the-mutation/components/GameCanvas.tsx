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

interface GameCanvasProps {
  isPlaying: boolean
  activeMechanics: Array<{ id: string; params: Record<string, number> }>
  onMutationReady: () => void
  onGameComplete: () => void
  onScoreChange: (score: number) => void
  onComboChange: (combo: number, multiplier: number) => void
  onWaveChange: (wave: number) => void
  onRushTimerChange: (timer: number) => void
  gameStateRef: React.MutableRefObject<GameState | null>
  reducedMotion: boolean
}

export default function GameCanvas({
  isPlaying,
  activeMechanics,
  onMutationReady,
  onGameComplete,
  onScoreChange,
  onComboChange,
  onWaveChange,
  onRushTimerChange,
  gameStateRef,
  reducedMotion,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState | null>(null)
  const animRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const lastScoreRef = useRef<number>(0)
  const lastComboRef = useRef<number>(0)
  const lastWaveRef = useRef<number>(0)

  // Initialize game state
  useEffect(() => {
    const state = createState()
    stateRef.current = state
    gameStateRef.current = state
  }, [gameStateRef])

  // Apply mechanics when they change
  useEffect(() => {
    const s = stateRef.current
    if (!s) return
    for (const m of activeMechanics) {
      activateMechanic(s, m.id, m.params)
    }
  }, [activeMechanics])

  // Coordinate transform: display → logical
  const toLogical = useCallback((clientX: number, clientY: number): [number, number] => {
    const canvas = canvasRef.current
    if (!canvas) return [GAME_W / 2, GAME_H / 2]
    const rect = canvas.getBoundingClientRect()
    const scaleX = GAME_W / rect.width
    const scaleY = GAME_H / rect.height
    return [
      (clientX - rect.left) * scaleX,
      (clientY - rect.top) * scaleY,
    ]
  }, [])

  // Input handlers
  useEffect(() => {
    const s = stateRef.current
    if (!s) return

    const onKeyDown = (e: KeyboardEvent) => {
      s.keys.add(e.key)
      // Prevent page scroll with arrow keys/space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      s.keys.delete(e.key)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Mouse/touch handlers on canvas
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = stateRef.current
    if (!s) return
    const [x, y] = toLogical(e.clientX, e.clientY)
    s.mx = x
    s.my = y
  }, [toLogical])

  const handleMouseDown = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    s.mDown = true
    s.clickThisFrame = true
  }, [])

  const handleMouseUp = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    s.mDown = false
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const s = stateRef.current
    if (!s || !e.touches[0]) return
    e.preventDefault()
    const [x, y] = toLogical(e.touches[0].clientX, e.touches[0].clientY)
    s.mx = x
    s.my = y
  }, [toLogical])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const s = stateRef.current
    if (!s || !e.touches[0]) return
    e.preventDefault()
    const [x, y] = toLogical(e.touches[0].clientX, e.touches[0].clientY)
    s.mx = x
    s.my = y
    s.mDown = true
    s.clickThisFrame = true
  }, [toLogical])

  const handleTouchEnd = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    s.mDown = false
  }, [])

  // Game loop
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animRef.current)
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    lastTimeRef.current = performance.now()

    const loop = (time: number) => {
      const s = stateRef.current
      if (!s) return

      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = time

      // Update
      updateEngine(s, dt)

      // Render
      renderEngine(ctx, s)

      // Notify React of state changes (throttled — only when values change)
      if (Math.floor(s.score) !== lastScoreRef.current) {
        lastScoreRef.current = Math.floor(s.score)
        onScoreChange(lastScoreRef.current)
      }
      if (s.combo !== lastComboRef.current) {
        lastComboRef.current = s.combo
        onComboChange(s.combo, s.multiplier)
      }
      if (s.wave !== lastWaveRef.current) {
        lastWaveRef.current = s.wave
        onWaveChange(s.wave)
      }
      if (s.rushActive) {
        onRushTimerChange(Math.max(0, Math.ceil(s.rushTimer)))
      }

      // Check mutation trigger
      if (shouldMutate(s)) {
        advanceWave(s)
        onMutationReady()
        return // stop loop, orchestrator will restart
      }

      // Check game complete
      if (isGameComplete(s)) {
        onGameComplete()
        return
      }

      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, onMutationReady, onGameComplete, onScoreChange, onComboChange, onWaveChange, onRushTimerChange])

  return (
    <div className="relative select-none">
      <canvas
        ref={canvasRef}
        width={GAME_W}
        height={GAME_H}
        className="w-full max-w-[640px] mx-auto block rounded-lg"
        style={{
          aspectRatio: '4/3',
          imageRendering: 'pixelated',
          boxShadow: `0 0 40px ${COLORS.playerGlow}, inset 0 0 60px rgba(0,0,0,0.4)`,
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="application"
        aria-label="Cascade game area"
        tabIndex={0}
      />
      {/* CRT Scanlines */}
      {!reducedMotion && (
        <div
          className="absolute inset-0 pointer-events-none rounded-lg max-w-[640px] mx-auto"
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
