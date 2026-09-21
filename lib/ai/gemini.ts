/**
 * Google Gemini AI Integration
 *
 * IMPORTANT: AI must be completely invisible to users.
 * Never expose "AI" or "Powered by..." labels in the UI.
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai'

/**
 * Single source of truth for the Gemini model. Google retires model IDs on a
 * schedule (https://ai.google.dev/gemini-api/docs/deprecations); when that
 * happens, change it here and deploy.
 *
 * Deliberately not overridable by env var: a forgotten GOOGLE_GEMINI_MODEL
 * pinned to a retired model once took every AI feature down and would have
 * silently shadowed the fix.
 */
export const GEMINI_MODEL = 'gemini-3.6-flash'

/**
 * Gemini 3 models think before answering, and thinking tokens are billed
 * against maxOutputTokens. Our limits are tiny (100-300 tokens), so without
 * this the visible reply gets truncated or comes back empty.
 */
export const MINIMAL_THINKING = {
  thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
} as const

/**
 * Client for API routes. Throws when the key is missing so the route's own
 * catch block can serve its deterministic fallback.
 */
export function getGemini(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not configured')
  }
  return new GoogleGenAI({ apiKey })
}

let genAI: GoogleGenAI | null = null

/**
 * Initialize the Gemini client
 * Call this once at app startup
 */
export function initializeGemini(): void {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.warn('GOOGLE_GEMINI_API_KEY not found. AI features will use fallback behavior.')
    return
  }

  genAI = getGemini()
}

/**
 * Check if AI is available
 */
export function isAIAvailable(): boolean {
  return genAI !== null
}

/**
 * Generate text from a prompt
 *
 * @param prompt - The input prompt
 * @param options - Generation options
 * @returns Generated text or null if AI unavailable
 */
export async function generateText(
  prompt: string,
  options?: {
    temperature?: number
    maxTokens?: number
    systemInstruction?: string
  }
): Promise<string | null> {
  if (!genAI) {
    console.warn('AI not available, returning null')
    return null
  }

  try {
    const result = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: options?.temperature ?? 0.9,
        maxOutputTokens: options?.maxTokens ?? 1024,
        systemInstruction: options?.systemInstruction,
        ...MINIMAL_THINKING,
      },
    })

    return result.text ?? null
  } catch (error) {
    console.error('Error generating text:', error)
    return null
  }
}

/**
 * Generate text with streaming (for longer responses)
 *
 * @param prompt - The input prompt
 * @param onChunk - Callback for each text chunk
 * @param options - Generation options
 * @returns Full generated text or null if AI unavailable
 */
export async function generateTextStream(
  prompt: string,
  onChunk: (chunk: string) => void,
  options?: {
    temperature?: number
    maxTokens?: number
  }
): Promise<string | null> {
  if (!genAI) {
    console.warn('AI not available, returning null')
    return null
  }

  try {
    const stream = await genAI.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: options?.temperature ?? 0.9,
        maxOutputTokens: options?.maxTokens ?? 2048,
        ...MINIMAL_THINKING,
      },
    })

    let fullText = ''

    for await (const chunk of stream) {
      const chunkText = chunk.text ?? ''
      fullText += chunkText
      onChunk(chunkText)
    }

    return fullText
  } catch (error) {
    console.error('Error generating text stream:', error)
    return null
  }
}

/**
 * Multi-turn conversation
 * Maintains conversation history for context
 */
export class GeminiConversation {
  private history: Array<{ role: 'user' | 'model'; text: string }> = []

  /**
   * Send a message and get a response
   */
  async sendMessage(message: string): Promise<string | null> {
    if (!genAI) {
      return null
    }

    try {
      // Add user message to history
      this.history.push({ role: 'user', text: message })

      // Build conversation context
      const contents = this.history.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }))

      const result = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: MINIMAL_THINKING,
      })
      const response = result.text ?? ''

      // Add model response to history
      this.history.push({ role: 'model', text: response })

      return response
    } catch (error) {
      console.error('Error in conversation:', error)
      return null
    }
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return [...this.history]
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.history = []
  }
}

/**
 * Helper: Generate creative game content
 *
 * Example: "Generate a whimsical story about a watermelon"
 */
export async function generateGameContent(
  type: 'story' | 'riddle' | 'description' | 'dialogue',
  context: string,
  options?: {
    style?: 'playful' | 'mysterious' | 'calming' | 'thoughtful'
    length?: 'short' | 'medium' | 'long'
  }
): Promise<string | null> {
  const lengthMap = {
    short: '1-2 sentences',
    medium: '3-5 sentences',
    long: '1-2 paragraphs',
  }

  const prompt = `Generate a ${options?.style || 'thoughtful'} ${type} ${
    options?.length ? `(${lengthMap[options.length]})` : ''
  } based on: ${context}

Important:
- Keep it light and engaging
- Avoid anxiety-inducing content
- Make it accessible and clear
- Add a touch of whimsy or curiosity`

  return generateText(prompt, {
    temperature: 0.9,
    maxTokens: options?.length === 'long' ? 512 : 256,
  })
}

/**
 * Helper: Make content more accessible
 * Simplifies complex text for better understanding
 */
export async function simplifyText(text: string): Promise<string | null> {
  const prompt = `Simplify this text to be more accessible and clear, while keeping its meaning:

"${text}"

Make it:
- Easy to understand
- Concise and direct
- Neurodivergent-friendly
- Warm and welcoming`

  return generateText(prompt, { temperature: 0.3 })
}

/**
 * Helper: Generate variations
 * Creates similar but different content for replayability
 */
export async function generateVariation(
  originalContent: string,
  variationHint?: string
): Promise<string | null> {
  const prompt = `Create a variation of this content that's similar but different:

Original: "${originalContent}"

${variationHint ? `Variation hint: ${variationHint}` : ''}

Keep the same tone and length, but change the details to make it fresh.`

  return generateText(prompt, { temperature: 1.0 })
}

// Initialize on module load (server-side only)
if (typeof window === 'undefined') {
  initializeGemini()
}
