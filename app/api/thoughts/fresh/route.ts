import { NextResponse } from 'next/server'
import { generateText, initializeGemini, isAIAvailable } from '@/lib/ai/gemini'

// ---------------------------------------------------------------------------
// In-memory cache — stores a fresh thought for 6 hours
// ---------------------------------------------------------------------------

interface CachedThought {
  title: string
  body: string
  theme: string
  generatedAt: number
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000
let cachedThought: CachedThought | null = null

function isCacheValid(): boolean {
  if (!cachedThought) return false
  return Date.now() - cachedThought.generatedAt < SIX_HOURS_MS
}

// ---------------------------------------------------------------------------
// Themes we rotate through
// ---------------------------------------------------------------------------

const THEMES = [
  'patience',
  'wonder',
  'impermanence',
  'creativity',
  'rest',
  'connection',
  'perspective',
] as const

function pickTheme(): string {
  const hour = new Date().getHours()
  return THEMES[hour % THEMES.length]
}

// ---------------------------------------------------------------------------
// GET /api/thoughts/fresh
// ---------------------------------------------------------------------------

export async function GET() {
  // Return cached thought if still fresh
  if (isCacheValid() && cachedThought) {
    return NextResponse.json({
      thought: {
        title: cachedThought.title,
        body: cachedThought.body,
        theme: cachedThought.theme,
      },
      cached: true,
    })
  }

  // Try generating a new thought via Gemini
  initializeGemini()

  if (!isAIAvailable()) {
    return NextResponse.json({ thought: null })
  }

  const theme = pickTheme()

  try {
    const raw = await generateText(
      `Write a short philosophical reflection on the theme of "${theme}".

Requirements:
- Title: 2-5 words, evocative, not generic
- Body: 2-3 short paragraphs (3-5 sentences each)
- Warm, personal tone — like a thoughtful friend writing in a journal
- Never preachy, never moralizing, never fortune-cookie
- Should gently reduce anxiety or offer perspective
- Original observations, not quotes or platitudes
- Simple, accessible language

Return ONLY valid JSON in this exact format (no markdown, no code fences):
{"title": "...", "body": "...", "theme": "${theme}"}

Use \\n\\n to separate paragraphs in the body.`,
      {
        temperature: 0.95,
        maxTokens: 600,
        systemInstruction:
          'You are a warm, observant writer who notices small truths about being human. You write short reflections that feel like journal entries — personal, unhurried, quietly insightful. You never lecture. You never use cliches. Your words help people feel a little less alone.',
      }
    )

    if (!raw) {
      return NextResponse.json({ thought: null })
    }

    // Parse the JSON response
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned) as { title: string; body: string; theme: string }

    if (!parsed.title || !parsed.body) {
      return NextResponse.json({ thought: null })
    }

    cachedThought = {
      title: parsed.title,
      body: parsed.body,
      theme: parsed.theme || theme,
      generatedAt: Date.now(),
    }

    return NextResponse.json({
      thought: {
        title: cachedThought.title,
        body: cachedThought.body,
        theme: cachedThought.theme,
      },
      cached: false,
    })
  } catch (error) {
    console.error('Failed to generate fresh thought:', error)
    return NextResponse.json({ thought: null })
  }
}
