import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

const GEMINI_MODEL = 'gemini-2.0-flash'

function getGenAI() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not configured')
  }
  return new GoogleGenerativeAI(apiKey)
}

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

const elementSchema = z.object({
  type: z.string().min(1).max(50),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  variant: z.string().min(1).max(50),
})

const requestSchema = z.object({
  elements: z.array(elementSchema).min(1).max(200),
  canvasWidth: z.number().positive(),
  canvasHeight: z.number().positive(),
})

// ---------------------------------------------------------------------------
// All valid plant type IDs
// ---------------------------------------------------------------------------

const VALID_TYPES = [
  'daisy', 'tulip', 'poppy', 'lavender', 'sunflower',
  'oak', 'pine', 'willow',
  'round-stone', 'flat-stone', 'crystal',
  'toadstool', 'cluster',
  'round-bush', 'berry-bush',
]

// ---------------------------------------------------------------------------
// Fallback suggestion (deterministic random, avoids existing positions)
// ---------------------------------------------------------------------------

function fallbackSuggestion(
  elements: z.infer<typeof requestSchema>['elements'],
): { type: string; x: number; y: number; reason: string } {
  // Pick a random type
  const type = VALID_TYPES[Math.floor(Math.random() * VALID_TYPES.length)]

  // Find a position that's not too close to existing elements
  let bestX = 0.5
  let bestY = 0.6
  let bestMinDist = 0

  for (let attempt = 0; attempt < 20; attempt++) {
    const cx = 0.05 + Math.random() * 0.9
    const cy = 0.3 + Math.random() * 0.65

    let minDist = Infinity
    for (const el of elements) {
      const dx = cx - el.x
      const dy = cy - el.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minDist) minDist = dist
    }

    if (minDist > bestMinDist) {
      bestMinDist = minDist
      bestX = cx
      bestY = cy
    }
  }

  return {
    type,
    x: Math.round(bestX * 100) / 100,
    y: Math.round(bestY * 100) / 100,
    reason: 'This spot could use some life.',
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
    cleanStaleEntries()
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input.' },
        { status: 400 },
      )
    }

    const { elements } = parsed.data

    // Build a description of what the user has placed
    const elementSummary = elements
      .map(el => `${el.type} at position (${(el.x * 100).toFixed(0)}%, ${(el.y * 100).toFixed(0)}%)`)
      .join('; ')

    const prompt = `You are a garden composition advisor. A user is building a meditative garden by placing elements on a canvas.

The canvas uses normalized coordinates: x goes from 0 (left) to 1 (right), y goes from 0 (top) to 1 (bottom). The ground starts at approximately y=0.25 (above that is sky). Elements should only be placed on the ground area (y between 0.3 and 0.95).

Current garden elements: ${elementSummary}

Available element types: ${VALID_TYPES.join(', ')}

Analyze the garden layout and suggest ONE element to add that would improve the visual balance, color harmony, and overall composition. Consider:
- Visual balance (is the garden weighted to one side?)
- Variety (what types are missing?)
- Spacing (don't crowd existing elements)
- Depth (use y-position for foreground/background)

Respond with ONLY valid JSON in this exact format:
{"type": "element-type-id", "x": 0.5, "y": 0.6, "reason": "brief reason"}

The type must be one of the valid types listed above. x must be 0.05-0.95, y must be 0.3-0.95. Keep the reason under 15 words.`

    const model = getGenAI().getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        maxOutputTokens: 100,
      },
    })

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // Parse the JSON response
    const jsonMatch = text.match(/\{[^}]+\}/)
    if (!jsonMatch) {
      throw new Error('No JSON in AI response')
    }

    const suggestion = JSON.parse(jsonMatch[0]) as {
      type: string
      x: number
      y: number
      reason: string
    }

    // Validate the suggestion
    if (
      !VALID_TYPES.includes(suggestion.type) ||
      typeof suggestion.x !== 'number' ||
      typeof suggestion.y !== 'number' ||
      suggestion.x < 0.05 || suggestion.x > 0.95 ||
      suggestion.y < 0.3 || suggestion.y > 0.95
    ) {
      throw new Error('Invalid suggestion from AI')
    }

    return NextResponse.json({
      suggestion: {
        type: suggestion.type,
        x: Math.round(suggestion.x * 100) / 100,
        y: Math.round(suggestion.y * 100) / 100,
        reason: suggestion.reason || 'A nice addition.',
      },
    })
  } catch (error) {
    console.error('Calm garden suggest error:', error)

    // Graceful fallback
    try {
      const body = await request.clone().json()
      const parsed = requestSchema.safeParse(body)
      const elements = parsed.success ? parsed.data.elements : []
      return NextResponse.json({
        suggestion: fallbackSuggestion(elements),
      })
    } catch {
      return NextResponse.json({
        suggestion: {
          type: VALID_TYPES[Math.floor(Math.random() * VALID_TYPES.length)],
          x: 0.3 + Math.random() * 0.4,
          y: 0.4 + Math.random() * 0.4,
          reason: 'This spot feels right.',
        },
      })
    }
  }
}
