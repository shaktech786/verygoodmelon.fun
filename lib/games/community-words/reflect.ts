import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { GEMINI_MODEL, MINIMAL_THINKING, getGemini } from '@/lib/ai/gemini'
import { MAX_SUBMISSION_LENGTH, moderateSubmission, soundsLikeDistress } from './moderation'
import { clientAddress, createRateLimiter } from './rateLimit'

/** Said, word for word, to anyone whose words sound like they may be in danger. */
export const CARE_REFLECTION =
  'Thank you for trusting this page with something that heavy. You matter, and you deserve someone who can listen to you properly, right now.'

const REFLECTIONS_PER_CLIENT = { max: 10, windowMs: 60_000 }
const SELF_DISCLOSURE = /\b(?:AI|A\.I\.|language model|as an assistant|chatbot)\b/i

const requestSchema = z.object({
  message: z.string().trim().min(1).max(MAX_SUBMISSION_LENGTH),
})

interface ReflectionVoice {
  /** Builds the instruction around the player's words. */
  prompt: (words: string) => string
  /** Written by hand; used whenever a fresh reflection is not available. */
  fallbacks: readonly string[]
  logLabel: string
}

function pick(options: readonly string[]): string {
  return options[Math.floor(Math.random() * options.length)]
}

// Phrase matching misses danger said sideways, so every reply also carries the model's own judgement.
const RISK_INSTRUCTION = `Before writing, judge whether their words suggest they may be at risk of harming themselves or no longer wanting to live, including indirect signs such as being tired of everything, wanting it all to be over, not wanting to go back, or feeling nobody would notice if they were gone.

Return only JSON, with no other text: {"risk": true or false, "reply": "your two sentences"}`

interface JudgedReply {
  risk: boolean
  reply: string
}

function parseJudgedReply(text: string): JudgedReply {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object') {
      const { risk, reply } = parsed as Record<string, unknown>
      return { risk: risk === true, reply: typeof reply === 'string' ? reply : '' }
    }
  } catch {}
  return { risk: false, reply: text }
}

/** A reflection is only passed on if it would be fit for the shared cloud and never gives itself away. */
function usable(text: string): string | null {
  const reflection = text.trim().replace(/^["“]+|["”]+$/g, '').trim()
  if (!reflection || SELF_DISCLOSURE.test(reflection)) return null
  return moderateSubmission(reflection).ok ? reflection : null
}

export function createReflectHandler(voice: ReflectionVoice) {
  const isLimited = createRateLimiter(REFLECTIONS_PER_CLIENT)

  return async function POST(request: NextRequest) {
    const parsed = requestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const words = parsed.data.message

    if (soundsLikeDistress(words)) {
      return NextResponse.json({ reflection: CARE_REFLECTION, care: true })
    }
    if (isLimited(clientAddress(request))) {
      return NextResponse.json({ reflection: pick(voice.fallbacks) })
    }

    try {
      const result = await getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: `${voice.prompt(words)}\n\n${RISK_INSTRUCTION}`,
        config: { temperature: 0.8, topP: 0.9, maxOutputTokens: 200, ...MINIMAL_THINKING },
      })
      const judged = parseJudgedReply(result.text ?? '')
      if (judged.risk) {
        return NextResponse.json({ reflection: CARE_REFLECTION, care: true })
      }
      const reflection = usable(judged.reply)
      if (reflection) return NextResponse.json({ reflection })
    } catch (error) {
      console.error(`${voice.logLabel} reflect error:`, error)
    }
    return NextResponse.json({ reflection: pick(voice.fallbacks) })
  }
}
