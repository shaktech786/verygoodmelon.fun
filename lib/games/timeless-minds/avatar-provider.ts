/**
 * Avatar Provider Abstraction Layer
 *
 * Platform-agnostic interface for AI avatar services.
 * Supports HeyGen, D-ID, ElevenLabs, Tavus, or custom implementations.
 */

export type AvatarEmotion = 'neutral' | 'happy' | 'thoughtful' | 'excited' | 'concerned' | 'sad'

export interface AvatarFrame {
  /** Base64 encoded image or video frame URL */
  imageData: string
  /** Optional video URL for animated avatars */
  videoUrl?: string
  /** Duration of the frame in milliseconds */
  duration?: number
}

export interface SpeechSynthesisOptions {
  text: string
  /** Thinker ID to determine voice characteristics */
  thinkerId: string
  /** Emotion to express in speech */
  emotion?: AvatarEmotion
  /** Voice provider: 'elevenlabs', 'google', 'azure', 'openai' */
  provider?: string
}

export interface SpeechSynthesisResult {
  /** Audio data (base64 or URL) */
  audioUrl: string
  /** Duration in milliseconds */
  duration: number
  /** Transcript with timing information */
  transcript?: {
    text: string
    words?: Array<{
      word: string
      start: number
      end: number
    }>
  }
}

export interface AvatarVideoOptions {
  /** Text to synthesize */
  text: string
  /** Thinker ID */
  thinkerId: string
  /** Emotion to express */
  emotion?: AvatarEmotion
  /** Whether to include lip-sync */
  lipSync?: boolean
}

export interface AvatarVideoResult {
  /** Video URL or base64 */
  videoUrl: string
  /** Audio URL or base64 */
  audioUrl: string
  /** Duration in milliseconds */
  duration: number
}

/**
 * Abstract interface for avatar providers
 */
export interface IAvatarProvider {
  /** Provider name (e.g., 'heygen', 'did', 'elevenlabs') */
  name: string

  /** Initialize the provider with API credentials */
  initialize(config: Record<string, string>): Promise<void>

  /** Generate speech audio from text */
  synthesizeSpeech(options: SpeechSynthesisOptions): Promise<SpeechSynthesisResult>

  /** Generate avatar video with speech (optional for providers that support it) */
  generateVideo?(options: AvatarVideoOptions): Promise<AvatarVideoResult>

  /** Get static avatar image for a thinker with emotion */
  getAvatarImage(thinkerId: string, emotion?: AvatarEmotion): Promise<AvatarFrame>
}

/**
 * Default mock provider for development/testing
 */
export class MockAvatarProvider implements IAvatarProvider {
  name = 'mock'

  async initialize(): Promise<void> {
    // No-op for mock
  }

  async synthesizeSpeech(options: SpeechSynthesisOptions): Promise<SpeechSynthesisResult> {
    // Return mock audio URL (could use browser's built-in speech synthesis)
    return {
      audioUrl: '', // Empty for now, will use browser TTS
      duration: options.text.length * 50, // Rough estimate
      transcript: {
        text: options.text
      }
    }
  }

  async getAvatarImage(thinkerId: string): Promise<AvatarFrame> {
    // Return static image
    const baseImage = `/games/timeless-minds/avatars/${thinkerId}.png`
    return {
      imageData: baseImage,
      duration: 0
    }
  }
}

/**
 * Avatar provider registry
 */
class AvatarProviderRegistry {
  private providers = new Map<string, IAvatarProvider>()
  private activeProvider: IAvatarProvider | null = null

  register(provider: IAvatarProvider) {
    this.providers.set(provider.name, provider)
  }

  async setActive(providerName: string, config?: Record<string, string>) {
    const provider = this.providers.get(providerName)
    if (!provider) {
      throw new Error(`Avatar provider '${providerName}' not found`)
    }

    if (config) {
      await provider.initialize(config)
    }

    this.activeProvider = provider
  }

  getActive(): IAvatarProvider {
    if (!this.activeProvider) {
      // Fallback to mock provider
      const mockProvider = new MockAvatarProvider()
      this.activeProvider = mockProvider
    }
    return this.activeProvider
  }
}

// Global registry instance
export const avatarProviderRegistry = new AvatarProviderRegistry()

// Register default mock provider
avatarProviderRegistry.register(new MockAvatarProvider())
avatarProviderRegistry.setActive('mock')
