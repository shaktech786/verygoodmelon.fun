/**
 * useAmbientSound Hook
 *
 * Manages procedural ambient soundscapes for game pages.
 * Integrates with the existing accessibility settings (mute, volume)
 * and respects browser autoplay policy.
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { SoundscapeEngine } from '@/lib/audio/soundscape-engine'
import {
  getSoundscapeForGame,
  getReducedMotionSoundscape,
} from '@/lib/audio/soundscape-presets'
import { useAccessibility } from '@/lib/hooks/useAccessibility'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseAmbientSoundOptions {
  /** Game route slug, e.g. "breathing-patterns". Used to select the preset. */
  gameId: string
  /**
   * If true, start playback automatically on the first qualifying user
   * interaction (click / keydown). Defaults to false.
   */
  autoStart?: boolean
}

export interface UseAmbientSoundReturn {
  /** Whether the soundscape is currently audible. */
  isPlaying: boolean
  /** Whether the AudioContext has been created (requires user gesture). */
  isReady: boolean
  /** Toggle playback on/off. Safe to call before user interaction. */
  toggle: () => void
  /** Start playback. Requires prior user interaction (browser policy). */
  start: () => void
  /** Stop playback with a 1-second fade-out. */
  stop: () => void
  /** Set volume (0-1). Independent of the accessibility global volume. */
  setVolume: (volume: number) => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAmbientSound(
  options: UseAmbientSoundOptions,
): UseAmbientSoundReturn {
  const { gameId, autoStart = false } = options

  const { settings } = useAccessibility()
  const engineRef = useRef<SoundscapeEngine | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const hasInteractedRef = useRef(false)
  const wantsPlayRef = useRef(autoStart)

  // -----------------------------------------------------------------------
  // Lazily create engine
  // -----------------------------------------------------------------------
  const getEngine = useCallback((): SoundscapeEngine => {
    if (!engineRef.current) {
      engineRef.current = new SoundscapeEngine()
    }
    return engineRef.current
  }, [])

  // -----------------------------------------------------------------------
  // Compute effective volume: local volume scaled by global accessibility
  // settings. Volume setting is 0-100 in accessibility, we need 0-1.
  // -----------------------------------------------------------------------
  const effectiveVolume = useCallback(
    (localVol = 1): number => {
      if (settings.muted) return 0
      return localVol * (settings.volume / 100)
    },
    [settings.muted, settings.volume],
  )

  // -----------------------------------------------------------------------
  // Determine which layers to use (full vs reduced-motion)
  // -----------------------------------------------------------------------
  const getLayersForGame = useCallback(() => {
    const preset = getSoundscapeForGame(gameId)
    if (settings.reduceMotion) {
      return getReducedMotionSoundscape(preset).layers
    }
    return preset.layers
  }, [gameId, settings.reduceMotion])

  // -----------------------------------------------------------------------
  // Start / stop helpers
  // -----------------------------------------------------------------------
  const start = useCallback(() => {
    if (!hasInteractedRef.current) {
      // Defer until a user interaction triggers the engine
      wantsPlayRef.current = true
      return
    }

    const engine = getEngine()
    const layers = getLayersForGame()

    engine.start(layers, 2) // 2-second fade-in
    engine.setVolume(effectiveVolume())
    setIsReady(true)
    setIsPlaying(true)
  }, [getEngine, getLayersForGame, effectiveVolume])

  const stop = useCallback(() => {
    wantsPlayRef.current = false
    const engine = engineRef.current
    if (!engine) {
      setIsPlaying(false)
      return
    }
    void engine.stop(1).then(() => {
      setIsPlaying(false)
    })
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop()
    } else {
      start()
    }
  }, [isPlaying, start, stop])

  const setVolume = useCallback(
    (vol: number) => {
      engineRef.current?.setVolume(effectiveVolume(vol))
    },
    [effectiveVolume],
  )

  // -----------------------------------------------------------------------
  // Sync accessibility mute/volume changes to running engine
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!engineRef.current || !isPlaying) return

    if (settings.muted) {
      engineRef.current.mute()
    } else {
      engineRef.current.unmute(settings.volume / 100)
    }
  }, [settings.muted, settings.volume, isPlaying])

  // -----------------------------------------------------------------------
  // autoStart: listen for first user interaction to satisfy browser policy
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (hasInteractedRef.current) return

    const handleInteraction = () => {
      hasInteractedRef.current = true

      // Ensure AudioContext is created inside user gesture
      const engine = getEngine()
      engine.init()
      setIsReady(true)

      if (wantsPlayRef.current) {
        start()
      }

      // Clean up listeners
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }

    window.addEventListener('click', handleInteraction, { once: false })
    window.addEventListener('keydown', handleInteraction, { once: false })
    window.addEventListener('touchstart', handleInteraction, { once: false })

    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }
  }, [getEngine, start])

  // -----------------------------------------------------------------------
  // Cleanup on unmount
  // -----------------------------------------------------------------------
  useEffect(() => {
    return () => {
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [])

  return {
    isPlaying,
    isReady,
    toggle,
    start,
    stop,
    setVolume,
  }
}
