/**
 * Avatar Provider Registry
 *
 * Reads NEXT_PUBLIC_AVATAR_PROVIDER to determine which provider to use.
 * Provides metadata about each provider's capabilities.
 */

import type { AvatarProviderType } from './types'

interface ProviderMeta {
  /** Provider needs server-side TTS audio (ElevenLabs PCM16) piped via sendAudio() */
  needsServerAudio: boolean
  /** Provider can render speech from text alone (built-in TTS) */
  canSpeakText: boolean
  /** Whether the Simli API key is required */
  requiresApiKey: boolean
}

const PROVIDER_META: Record<AvatarProviderType, ProviderMeta> = {
  talkinghead: {
    needsServerAudio: false,
    canSpeakText: true,
    requiresApiKey: false,
  },
  simli: {
    needsServerAudio: true,
    canSpeakText: false,
    requiresApiKey: true,
  },
  static: {
    needsServerAudio: false,
    canSpeakText: false,
    requiresApiKey: false,
  },
}

/** Read the active provider from env, defaulting to 'static' */
export function getActiveProvider(): AvatarProviderType {
  const env = process.env.NEXT_PUBLIC_AVATAR_PROVIDER || 'static'

  if (env in PROVIDER_META) {
    return env as AvatarProviderType
  }

  console.warn(`[AvatarRegistry] Unknown provider "${env}", falling back to static`)
  return 'static'
}

/** Get capability metadata for a provider */
export function getProviderMeta(provider: AvatarProviderType): ProviderMeta {
  return PROVIDER_META[provider]
}
