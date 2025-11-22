/**
 * Emotion Detection for Avatar Expressions
 *
 * Analyzes conversation context to determine appropriate avatar emotions
 */

import type { AvatarEmotion } from './avatar-provider'

export interface EmotionAnalysisResult {
  emotion: AvatarEmotion
  confidence: number
  reasoning?: string
}

/**
 * Detect emotion from conversation context
 */
export async function detectEmotion(
  message: string
): Promise<EmotionAnalysisResult> {
  // Use simple keyword-based detection for now
  // Can be enhanced with AI/ML in the future

  const lowerMessage = message.toLowerCase()

  // Excited keywords
  if (/(amazing|wonderful|fantastic|brilliant|excellent|exciting)/i.test(lowerMessage)) {
    return { emotion: 'excited', confidence: 0.8 }
  }

  // Happy keywords
  if (/(happy|joy|glad|pleased|delighted|fun|laugh)/i.test(lowerMessage)) {
    return { emotion: 'happy', confidence: 0.75 }
  }

  // Thoughtful keywords
  if (/(think|consider|ponder|reflect|contemplate|interesting|curious)/i.test(lowerMessage)) {
    return { emotion: 'thoughtful', confidence: 0.7 }
  }

  // Concerned keywords
  if (/(concern|worry|problem|difficult|challenge|troubling)/i.test(lowerMessage)) {
    return { emotion: 'concerned', confidence: 0.75 }
  }

  // Sad keywords
  if (/(sad|sorrow|grief|unfortunate|tragic|painful)/i.test(lowerMessage)) {
    return { emotion: 'sad', confidence: 0.8 }
  }

  // Default to neutral
  return { emotion: 'neutral', confidence: 0.6 }
}

/**
 * Enhanced emotion detection using AI (Google Gemini)
 */
export async function detectEmotionWithAI(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<EmotionAnalysisResult> {
  try {
    const response = await fetch('/api/timeless-minds/detect-emotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationHistory })
    })

    if (!response.ok) {
      // Fallback to simple detection
      return detectEmotion(message)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('AI emotion detection failed:', error)
    // Fallback to simple detection
    return detectEmotion(message)
  }
}
