/**
 * Text-to-Speech Integration
 *
 * Uses Web Speech API (browser built-in) for now.
 * Can be enhanced with ElevenLabs, Google Cloud TTS, or Azure in the future.
 */

import type { AvatarEmotion } from './avatar-provider'

export interface VoiceCharacteristics {
  pitch: number // 0-2, default 1
  rate: number // 0.1-10, default 1
  volume: number // 0-1, default 1
}

// Voice profiles for different thinkers (pitch, rate, volume)
const VOICE_PROFILES: Record<string, VoiceCharacteristics> = {
  // Ancient thinkers - slower, deeper
  'socrates': { pitch: 0.8, rate: 0.9, volume: 1 },
  'plato': { pitch: 0.85, rate: 0.95, volume: 1 },
  'aristotle': { pitch: 0.9, rate: 1.0, volume: 1 },
  'buddha': { pitch: 0.75, rate: 0.85, volume: 0.95 },

  // Renaissance - expressive
  'leonardo-da-vinci': { pitch: 1.0, rate: 1.05, volume: 1 },
  'michelangelo': { pitch: 0.95, rate: 1.0, volume: 1 },
  'shakespeare': { pitch: 1.05, rate: 1.1, volume: 1 },

  // Scientists - clear, measured
  'galileo': { pitch: 1.0, rate: 1.0, volume: 1 },
  'isaac-newton': { pitch: 0.9, rate: 0.95, volume: 1 },
  'charles-darwin': { pitch: 0.95, rate: 1.0, volume: 1 },
  'marie-curie': { pitch: 1.15, rate: 1.0, volume: 1 },
  'albert-einstein': { pitch: 0.95, rate: 1.05, volume: 1 },
  'carl-sagan': { pitch: 0.9, rate: 0.95, volume: 1 },
  'stephen-hawking': { pitch: 0.85, rate: 0.9, volume: 1 },

  // Modern thinkers - energetic
  'steve-jobs': { pitch: 1.05, rate: 1.1, volume: 1 },
  'neil-degrasse-tyson': { pitch: 1.0, rate: 1.15, volume: 1 },

  // Activists - passionate
  'mahatma-gandhi': { pitch: 0.85, rate: 0.9, volume: 0.95 },
  'martin-luther-king-jr': { pitch: 0.95, rate: 1.05, volume: 1 },
  'malcolm-x': { pitch: 1.0, rate: 1.1, volume: 1 },
  'nelson-mandela': { pitch: 0.9, rate: 0.95, volume: 1 },

  // Women leaders - varied
  'helen-keller': { pitch: 1.1, rate: 1.0, volume: 1 },
  'eleanor-roosevelt': { pitch: 1.15, rate: 1.0, volume: 1 },
  'rosa-parks': { pitch: 1.1, rate: 0.95, volume: 1 },
  'mother-teresa': { pitch: 1.2, rate: 0.9, volume: 0.95 },
  'maya-angelou': { pitch: 1.1, rate: 1.0, volume: 1 },
  'ruth-bader-ginsburg': { pitch: 1.15, rate: 1.05, volume: 1 },

  // Default profile
  'default': { pitch: 1.0, rate: 1.0, volume: 1 }
}

// Emotion modifiers
const EMOTION_MODIFIERS: Record<AvatarEmotion, Partial<VoiceCharacteristics>> = {
  'neutral': {},
  'happy': { pitch: 1.1, rate: 1.1 },
  'excited': { pitch: 1.15, rate: 1.15, volume: 1.05 },
  'thoughtful': { pitch: 0.95, rate: 0.9 },
  'concerned': { pitch: 0.9, rate: 0.95 },
  'sad': { pitch: 0.85, rate: 0.85, volume: 0.95 }
}

/**
 * Synthesize speech using Web Speech API
 */
export function synthesizeSpeech(
  text: string,
  thinkerId: string,
  emotion: AvatarEmotion = 'neutral',
  onEnd?: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'))
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    // Get voice profile
    const baseProfile = VOICE_PROFILES[thinkerId] || VOICE_PROFILES['default']
    const emotionMod = EMOTION_MODIFIERS[emotion]

    // Apply voice characteristics
    utterance.pitch = emotionMod.pitch || baseProfile.pitch
    utterance.rate = emotionMod.rate || baseProfile.rate
    utterance.volume = emotionMod.volume || baseProfile.volume

    // Try to select a suitable voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v =>
      v.lang.startsWith('en-') && v.name.includes('Natural')
    ) || voices.find(v => v.lang.startsWith('en-'))

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onend = () => {
      onEnd?.()
      resolve()
    }

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error)
      reject(error)
    }

    window.speechSynthesis.speak(utterance)
  })
}

/**
 * Stop any ongoing speech
 */
export function stopSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Check if speech synthesis is supported
 */
export function isSpeechSynthesisSupported(): boolean {
  return 'speechSynthesis' in window
}

/**
 * Load voices (needed for some browsers)
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      resolve(voices)
      return
    }

    // Some browsers need this event
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices())
    }
  })
}
