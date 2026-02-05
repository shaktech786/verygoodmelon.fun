/**
 * Avatar Provider Type System
 *
 * Shared interfaces for all avatar providers (TalkingHead, Simli, Static).
 * Every provider component must accept AvatarComponentProps and expose AvatarHandle.
 */

import type { AvatarEmotion } from '../avatar-provider'

/** Supported avatar provider types — controlled by NEXT_PUBLIC_AVATAR_PROVIDER env var */
export type AvatarProviderType = 'talkinghead' | 'simli' | 'static'

/**
 * Props shared by all avatar provider components.
 * The parent (TimelessMinds) passes these regardless of which provider is active.
 */
export interface AvatarComponentProps {
  /** Provider-specific avatar identifier (face UUID, GLB URL, or PNG path) */
  avatarId: string
  /** Whether the avatar is actively rendering */
  isActive: boolean
  /** Mute audio output (lip-sync still works, playback is muted) */
  audioMuted?: boolean
  /** Current emotion for the avatar to express */
  emotion?: AvatarEmotion
  /** Called when the provider's connection/readiness state changes */
  onConnectionChange?: (connected: boolean) => void
  /** Called when the avatar starts/stops speaking */
  onSpeakingChange?: (speaking: boolean) => void
  /** Called on errors */
  onError?: (error: string) => void
  /** CSS class for the container */
  className?: string
}

/**
 * Imperative handle exposed by avatar components via forwardRef + useImperativeHandle.
 * The parent uses this to drive audio/speech into the avatar.
 */
export interface AvatarHandle {
  /** Send raw PCM16 audio data for lip-sync (ElevenLabs → Simli path) */
  sendAudio: (audioBuffer: ArrayBuffer) => void
  /** Use the provider's built-in TTS for better lip-sync (TalkingHead path) */
  speakText: (text: string) => void
  /** Clear any buffered audio/speech */
  clearBuffer: () => void
  /** Check if the provider is connected and ready */
  isConnected: () => boolean
}
