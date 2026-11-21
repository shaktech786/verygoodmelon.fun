import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { GEMINI_MODEL, MINIMAL_THINKING, getGemini } from '@/lib/ai/gemini'
import { PLANT_TYPES, seasonAt, type PlantType } from '@/lib/games/calm-garden/garden'
import { buildSuggestionPrompt, parseSuggestionReply, settleSpot, suggestLocally } from '@/lib/games/calm-garden/suggest'

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per IP)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5

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
// Request validation
// ---------------------------------------------------------------------------

const requestSchema = z.object({
  elements: z
    .array(
      z.object({
        type: z.enum(PLANT_TYPES as [PlantType, ...PlantType[]]),
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
      }),
    )
    .min(1)
    .max(120),
})

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  cleanStaleEntries()
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
  }
  const plants = parsed.data.elements

  try {
    const result = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: buildSuggestionPrompt(plants, seasonAt(new Date())),
      config: {
        temperature: 0.8,
        topP: 0.9,
        maxOutputTokens: 160,
        ...MINIMAL_THINKING,
      },
    })
    const suggestion = parseSuggestionReply(result.text ?? '')
    if (!suggestion) throw new Error('Unusable garden suggestion reply')
    return NextResponse.json({ suggestion: settleSpot(suggestion, plants) })
  } catch (error) {
    console.error('Calm garden suggest error:', error)
    return NextResponse.json({ suggestion: suggestLocally(plants, Math.random()) })
  }
}
