'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { DiscoveryEvent, GameState } from '../engine/types'
import {
  createState,
  update as updateEngine,
  render as renderEngine,
  isGameComplete,
  activateMechanic,
} from '../engine/engine'
import { isControlTarget } from './controls'
import { useScreen } from './useScreen'

interface GameCanvasProps {
  width: number
  height: number
  isTouch: boolean
  isPlaying: boolean
  activeMechanics: Array<{ id: string; params: Record<string, number> }>
  onDiscovery: (event: DiscoveryEvent) => void
  onGameComplete: () => void
  gameStateRef: React.MutableRefObject<GameState | null>
  reducedMotion: boolean
}

type CascadeWindow = Window & { __cascadeState?: GameState }

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key
}

export default function GameCanvas({
  width,
  height,
  isTouch,
  isPlaying,
  activeMechanics,
  onDiscovery,
  onGameComplete,
  gameStateRef,
  reducedMotion,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState | null>(null)
  const playingRef = useRef(false)
  const callbacksRef = useRef({ onDiscovery, onGameComplete })
  const screen = useScreen(canvasRef)
  const screenRef = useRef(screen)

  useEffect(() => {
    callbacksRef.current = { onDiscovery, onGameComplete }
  })

  // A theme or sense change while the game is paused or between waves still repaints the frozen frame
  useEffect(() => {
    screenRef.current = screen
    const s = stateRef.current
    const ctx = canvasRef.current?.getContext('2d')
    if (s && ctx) renderEngine(ctx, s, screen.palette, reducedMotion, screen.neon)
  }, [screen, reducedMotion])

  useEffect(() => {
    const state = createState(width, height, isTouch)
    stateRef.current = state
    gameStateRef.current = state
    // Lets the e2e suite fast-forward clues instead of waiting out real rests
    if (process.env.NODE_ENV !== 'production') {
      (window as CascadeWindow).__cascadeState = state
    }
  }, [gameStateRef, width, height, isTouch])

  useEffect(() => {
    const s = stateRef.current
    if (!s) return
    for (const m of activeMechanics) {
      activateMechanic(s, m.id, m.params)
    }
  }, [activeMechanics])

  const toLogical = useCallback((clientX: number, clientY: number): [number, number] => {
    const canvas = canvasRef.current
    if (!canvas) return [width / 2, height / 2]
    const rect = canvas.getBoundingClientRect()
    return [
      (clientX - rect.left) * (width / rect.width),
      (clientY - rect.top) * (height / rect.height),
    ]
  }, [width, height])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current
      if (!s || !playingRef.current || isControlTarget(e.target) || e.repeat) return
      const key = normalizeKey(e.key)
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

    const loop = (time: number) => {
      const s = stateRef.current
      if (!s) return

      const dt = Math.min(Math.max(time - lastTime, 0) / 1000, 0.1)
      lastTime = time

      updateEngine(s, dt)
      renderEngine(ctx, s, screenRef.current.palette, reducedMotion, screenRef.current.neon)

      const cb = callbacksRef.current
      const events = s.events.splice(0)
      for (const event of events) cb.onDiscovery(event)

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
    <div className="shapeshifter-crt relative select-none">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        style={{ aspectRatio: `${width} / ${height}`, touchAction: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={release}
        onMouseLeave={release}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={release}
        onTouchCancel={release}
        role="application"
        aria-label="The Shapeshifter game area"
        aria-describedby="shapeshifter-controls"
        tabIndex={0}
      />
      <p id="shapeshifter-controls" className="sr-only">
        Space pulses the orb. Once it can move, the arrow keys move it. Go to a clue to choose it, or rest and let it be. C tells you where the clues are. Escape pauses.
      </p>
    </div>
  )
}
