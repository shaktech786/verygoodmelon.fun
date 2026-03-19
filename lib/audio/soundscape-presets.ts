/**
 * Soundscape Presets
 *
 * Pre-configured combinations of sound primitives mapped to game IDs.
 * Each preset creates a unique ambient atmosphere tailored to the
 * emotional tone of the game.
 */

import { SoundLayerConfig } from './soundscape-engine'

export interface SoundscapePreset {
  /** Human-readable label (not shown to users — AI is invisible). */
  label: string
  layers: SoundLayerConfig[]
}

/**
 * Map from game route slug to its ambient soundscape preset.
 */
export const SOUNDSCAPE_PRESETS: Record<string, SoundscapePreset> = {
  // The Harmonist — breathing / stillness
  'breathing-patterns': {
    label: 'The Still Point',
    layers: [
      { type: 'drone', volume: 0.15, params: { baseFreq: 110, detune: 3 } },
      { type: 'ocean-waves', volume: 0.2, params: { cycleTime: 8 } },
    ],
  },

  // The Patient One — unhurried contemplation
  'the-unrusher': {
    label: 'The Patient One',
    layers: [
      { type: 'rain', volume: 0.25, params: { intensity: 0.3 } },
      { type: 'drone', volume: 0.1, params: { baseFreq: 85 } },
    ],
  },

  // The Sage — timeless wisdom
  'timeless-minds': {
    label: 'The Sage',
    layers: [
      {
        type: 'gentle-piano',
        volume: 0.15,
        params: { scale: 'pentatonic', interval: [4000, 8000] },
      },
      { type: 'drone', volume: 0.08, params: { baseFreq: 130 } },
    ],
  },

  // The Dilemma — weighty choices
  'hard-choices': {
    label: 'The Dilemma',
    layers: [
      { type: 'drone', volume: 0.12, params: { baseFreq: 100 } },
      { type: 'chimes', volume: 0.1, params: { interval: [6000, 12000] } },
    ],
  },

  // The Final Word — mortality, reflection
  'last-words': {
    label: 'The Final Word',
    layers: [
      { type: 'ocean-waves', volume: 0.2, params: { cycleTime: 10 } },
      { type: 'wind', volume: 0.1, params: { speed: 0.3 } },
    ],
  },

  // The Awakening — new beginnings
  'first-words': {
    label: 'The Awakening',
    layers: [
      { type: 'chimes', volume: 0.15, params: { interval: [3000, 6000] } },
      { type: 'drone', volume: 0.1, params: { baseFreq: 165 } },
    ],
  },

  // The Optimist — daily hope
  'hope-daily': {
    label: 'The Optimist',
    layers: [
      {
        type: 'gentle-piano',
        volume: 0.12,
        params: { scale: 'major-pentatonic', interval: [3000, 6000] },
      },
    ],
  },

  // The Alchemist — creative experimentation
  'idea-lab': {
    label: 'The Alchemist',
    layers: [
      { type: 'crackling-fire', volume: 0.15, params: { intensity: 0.4 } },
      { type: 'drone', volume: 0.08, params: { baseFreq: 120 } },
    ],
  },

  // The Gardener — nature, growth
  'calm-garden': {
    label: 'The Gardener',
    layers: [
      { type: 'wind', volume: 0.12, params: { speed: 0.2 } },
      { type: 'chimes', volume: 0.08, params: { interval: [5000, 10000] } },
      { type: 'drone', volume: 0.06, params: { baseFreq: 140 } },
    ],
  },

  // The Philosopher — deep thought
  'thought-pockets': {
    label: 'The Philosopher',
    layers: [
      { type: 'drone', volume: 0.1, params: { baseFreq: 95 } },
      { type: 'heartbeat', volume: 0.08, params: { bpm: 60 } },
    ],
  },
}

/**
 * Fallback soundscape used when no game-specific preset is found.
 * A gentle, universally calming drone.
 */
export const DEFAULT_SOUNDSCAPE: SoundscapePreset = {
  label: 'Default Ambient',
  layers: [
    { type: 'drone', volume: 0.1, params: { baseFreq: 110, detune: 2 } },
  ],
}

/**
 * Get the soundscape preset for a given game ID.
 * Falls back to a minimal drone if no preset is defined.
 */
export function getSoundscapeForGame(gameId: string): SoundscapePreset {
  return SOUNDSCAPE_PRESETS[gameId] ?? DEFAULT_SOUNDSCAPE
}

/**
 * Returns a reduced-motion version of a preset.
 * Strips everything except drone layers for a simpler auditory experience
 * (motion !== sound, but we simplify as requested).
 */
export function getReducedMotionSoundscape(
  preset: SoundscapePreset,
): SoundscapePreset {
  const droneLayers = preset.layers.filter((l) => l.type === 'drone')

  if (droneLayers.length === 0) {
    return DEFAULT_SOUNDSCAPE
  }

  return {
    label: preset.label,
    layers: droneLayers,
  }
}
