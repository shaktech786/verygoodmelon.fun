import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { generateText, initializeGemini, isAIAvailable } from '@/lib/ai/gemini'

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

interface FreshThought {
  title: string
  body: string
  theme: string
}

const ONE_DAY_SECONDS = 24 * 60 * 60

/** "2026-11-23": one thought per UTC day, shared by every visitor. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function themeFor(day: string): string {
  const daysSinceEpoch = Math.floor(Date.parse(day) / 86_400_000)
  return THEMES[daysSinceEpoch % THEMES.length]
}

/** Writes the day's thought. Throws when nothing usable comes back, so a failure is never cached. */
async function writeThought(day: string): Promise<FreshThought> {
  initializeGemini()
  if (!isAIAvailable()) throw new Error('Fresh thought unavailable')
  const theme = themeFor(day)

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
  if (!raw) throw new Error('Fresh thought came back empty')

  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const parsed = JSON.parse(cleaned) as Partial<FreshThought>
  if (!parsed.title || !parsed.body) throw new Error('Fresh thought was incomplete')
  return { title: parsed.title, body: parsed.body, theme: parsed.theme || theme }
}

// Kept in Next's data cache, which outlives any one server instance, so the day's thought is
// written once and every visit that day reads it back. The day is part of the key.
const thoughtOfTheDay = unstable_cache(writeThought, ['fresh-thought-v1'], { revalidate: ONE_DAY_SECONDS })

const RETRY_AFTER_FAILURE_SECONDS = 10 * 60

// A failure is never written to the daily cache, so on its own an outage would send every visit
// to the model. This short cache remembers the miss for a few minutes; once the day's thought
// exists it is read straight back from the daily cache.
const thoughtOrNothing = unstable_cache(
  async (day: string): Promise<FreshThought | null> => {
    try {
      return await thoughtOfTheDay(day)
    } catch (error) {
      console.error('Failed to generate fresh thought:', error)
      return null
    }
  },
  ['fresh-thought-attempt-v1'],
  { revalidate: RETRY_AFTER_FAILURE_SECONDS }
)

// ---------------------------------------------------------------------------
// GET /api/thoughts/fresh
// ---------------------------------------------------------------------------

export async function GET() {
  const thought = await thoughtOrNothing(today())
  if (!thought) {
    return NextResponse.json(
      { thought: null },
      { headers: { 'Cache-Control': `public, s-maxage=${RETRY_AFTER_FAILURE_SECONDS}` } }
    )
  }
  return NextResponse.json({ thought }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}
