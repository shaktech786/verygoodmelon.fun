import { NextResponse } from 'next/server'
import { generateText, initializeGemini, isAIAvailable } from '@/lib/ai/gemini'

// Cache wisdom per day to avoid regenerating on every request
const wisdomCache = new Map<string, { text: string; generatedAt: number }>()

function getTodayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// Deterministic fallback pool — used when Gemini is unavailable
const FALLBACK_WISDOM = [
  'The things you worry about most rarely happen. The things that change you most are never on the list.',
  'Clarity doesn\'t come from thinking harder. It comes from giving your mind permission to be still.',
  'You don\'t need to solve everything today. Some answers only arrive after you stop looking.',
  'The kindest thing you can do for your future self is to rest without guilt right now.',
  'Every person you meet is carrying something invisible. That thought alone can soften a whole day.',
  'Progress sometimes looks like sitting quietly and not making things worse.',
  'The gap between who you are and who you want to be is smaller than it feels.',
]

/**
 * GET /api/daily-wisdom
 *
 * Returns a single piece of original wisdom for today.
 * Generated fresh each day via Gemini, cached for the rest of the day.
 * Falls back to a curated pool if AI is unavailable.
 */
export async function GET() {
  const todayKey = getTodayKey()

  // Return cached wisdom if available
  const cached = wisdomCache.get(todayKey)
  if (cached) {
    return NextResponse.json({ wisdom: cached.text, cached: true })
  }

  // Try to generate fresh wisdom via Gemini
  initializeGemini()

  if (isAIAvailable()) {
    try {
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
      )

      const text = await generateText(
        `Generate one original, thoughtful piece of wisdom for day ${dayOfYear} of the year.

Requirements:
- 1-2 sentences maximum
- Feels handcrafted, not fortune-cookie
- Reduces anxiety or provides gentle perspective
- Never preachy or moralizing
- Speaks to the reader warmly, like a wise friend
- Not a quote from anyone — fully original
- Surprising or insightful, not obvious
- Topics: patience, perspective, self-compassion, curiosity, impermanence, wonder, rest, connection

Just return the wisdom text, nothing else.`,
        {
          temperature: 0.9,
          maxTokens: 150,
          systemInstruction: 'You are a gentle, wise voice that helps people feel less anxious. Your words are original, warm, and insightful. Never use cliches. Never moralize. Speak like a thoughtful friend, not a guru.',
        }
      )

      if (text) {
        // Clean up any surrounding quotes
        const cleaned = text.replace(/^["']|["']$/g, '').trim()
        wisdomCache.set(todayKey, { text: cleaned, generatedAt: Date.now() })
        return NextResponse.json({ wisdom: cleaned, cached: false })
      }
    } catch (error) {
      console.error('Failed to generate daily wisdom:', error)
    }
  }

  // Fallback: deterministic selection from curated pool
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )
  const fallback = FALLBACK_WISDOM[dayOfYear % FALLBACK_WISDOM.length]
  wisdomCache.set(todayKey, { text: fallback, generatedAt: Date.now() })

  return NextResponse.json({ wisdom: fallback, cached: false })
}
