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

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10

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

// Clean stale entries on each check (avoids setInterval in serverless)
function cleanStaleEntries() {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip)
    }
  }
}

const requestSchema = z.object({
  message: z.string().min(1).max(500),
})

const FALLBACK_REFLECTIONS = [
  'What we imagine saying first reveals the deepest corners of who we are.',
  'The words we choose at the threshold say everything about what we carried with us.',
  'There is a quiet courage in imagining what lies beyond and greeting it with words.',
]

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
    cleanStaleEntries()
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input. Please provide a message.' },
        { status: 400 }
      )
    }

    const { message } = parsed.data

    const model = getGenAI().getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.85,
        topP: 0.9,
        maxOutputTokens: 150,
      },
    })

    const prompt = `Someone imagines arriving in an afterlife—whatever form that takes for them—and their first words are:

"${message}"

Offer a brief, warm reflection (2-3 sentences) on what this reveals about what matters most to them. Be gentle and philosophical. Never religious or prescriptive. Don't quote them back. Don't moralize. Don't use phrases like "It's clear that" or "This shows that." Speak directly and gently, like a wise friend.

Return ONLY the reflection text, no quotes, no labels, no formatting.`

    const result = await model.generateContent(prompt)
    const reflection = result.response.text().trim()

    if (!reflection) {
      throw new Error('Empty AI response')
    }

    return NextResponse.json({ reflection })
  } catch (error) {
    console.error('First words reflect error:', error)

    // Graceful fallback - return a generic reflection, not an error
    const fallback = FALLBACK_REFLECTIONS[Math.floor(Math.random() * FALLBACK_REFLECTIONS.length)]
    return NextResponse.json({ reflection: fallback })
  }
}
