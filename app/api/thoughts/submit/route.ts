import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_THEMES = [
  'patience',
  'wonder',
  'impermanence',
  'creativity',
  'rest',
  'connection',
  'perspective',
] as const

const submitSchema = z.object({
  body: z
    .string()
    .min(20, 'Your thought needs at least 20 characters.')
    .max(2000, 'Please keep your thought under 2,000 characters.'),
  theme: z.enum(VALID_THEMES, {
    message: 'Please choose a valid theme.',
  }),
  authorName: z
    .string()
    .max(100, 'Name must be 100 characters or fewer.')
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
})

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per IP)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 3

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

function cleanStaleEntries() {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip)
    }
  }
}

// ---------------------------------------------------------------------------
// POST /api/thoughts/submit
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'You can submit up to 3 thoughts per hour. Please try again later.' },
        { status: 429 }
      )
    }

    // Clean stale entries periodically
    if (rateLimitMap.size > 1000) {
      cleanStaleEntries()
    }

    // Parse and validate body
    const raw = await request.json()
    const result = submitSchema.safeParse(raw)

    if (!result.success) {
      const firstError = result.error.issues[0]?.message ?? 'Invalid input.'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { body, theme, authorName } = result.data

    // Check Supabase configuration
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return NextResponse.json(
        {
          error:
            'Thought submissions are not available right now. Please try again later.',
        },
        { status: 503 }
      )
    }

    const supabase = await createClient()

    const { error: insertError } = await supabase
      .from('user_thoughts')
      .insert({
        body,
        theme,
        author_name: authorName,
      })

    if (insertError) {
      console.error('Error inserting user thought:', insertError)
      return NextResponse.json(
        { error: 'Something went wrong saving your thought. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you. Your thought will be reviewed.',
    })
  } catch (error) {
    console.error('Error in thoughts submit API:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
