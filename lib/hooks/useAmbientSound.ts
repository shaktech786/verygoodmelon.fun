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
import { isLayerHushed, subscribeToHush } from '@/lib/audio/ambient-hush'

const HUSH_FADE_SECONDS = 1.5

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseAmbientSoundOptions {
  /** Game route slug, e.g. "breathing-patterns". Used to select the preset. */
  gameId: string
}

export interface UseAmbientSoundReturn {
  /** Whether the soundscape is currently audible. */
  isPlaying: boolean
  /** Toggle playback on/off. Call it from the user's own gesture, which browsers require for audio. */
  toggle: () => void
  /** Start playback. Call it from a user gesture. */
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
  const { gameId } = options

  const { settings } = useAccessibility()
  const engineRef = useRef<SoundscapeEngine | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

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
  // No audio context exists until the player asks for sound
  const start = useCallback(() => {
    const engine = getEngine()
    const layers = getLayersForGame()

    engine.start(layers, 2) // 2-second fade-in
    engine.setVolume(effectiveVolume())
    engine.hush(isLayerHushed, 0)
    setIsPlaying(true)
  }, [getEngine, getLayersForGame, effectiveVolume])

  const stop = useCallback(() => {
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
  // A game can ask for quiet (see ambient-hush); fade layers out and back
  // -----------------------------------------------------------------------
  useEffect(() => {
    return subscribeToHush(() => engineRef.current?.hush(isLayerHushed, HUSH_FADE_SECONDS))
  }, [])

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
    toggle,
    start,
    stop,
    setVolume,
  }
}
