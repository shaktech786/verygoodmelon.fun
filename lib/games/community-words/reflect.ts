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
  /** For a game that sends the player back with one small thing to do. */
  intention?: {
    /** What the "intention" field of the reply should hold. */
    instruction: string
    fallbacks: readonly string[]
  }
}

function pick(options: readonly string[]): string {
  return options[Math.floor(Math.random() * options.length)]
}

// Phrase matching misses danger said sideways, so every reply also carries the model's own judgement.
function riskInstruction(voice: ReflectionVoice): string {
  const shape = voice.intention
    ? '{"risk": true or false, "reply": "your reply", "intention": "the one small thing"}'
    : '{"risk": true or false, "reply": "your two sentences"}'
  const intention = voice.intention ? `${voice.intention.instruction}\n\n` : ''
  return `${intention}Before writing, judge risk. Imagining one's own ending or afterlife, saying goodbye, love, gratitude, regret, grief or missing someone is the whole premise of this game and is never risk by itself; a farewell to a loved one ("I love you", "look after each other", "you were always the brave one") is exactly what players are asked to write. Set "risk" to true only when the words suggest that, in their real life today, they may want to die or harm themselves, including indirect signs such as being tired of living or of everything, wanting it all to be over for good, not wanting to go back to their life, or feeling nobody would notice if they were gone.

Return only JSON, with no other text: ${shape}`
}

interface JudgedReply {
  risk: boolean
  reply: string
  intention: string
}

function parseJudgedReply(text: string): JudgedReply {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object') {
      const { risk, reply, intention } = parsed as Record<string, unknown>
      return {
        risk: risk === true,
        reply: typeof reply === 'string' ? reply : '',
        intention: typeof intention === 'string' ? intention : '',
      }
    }
  } catch {}
  return { risk: false, reply: text, intention: '' }
}

/** A reflection is only passed on if it would be fit for the shared cloud and never gives itself away. */
function usable(text: string): string | null {
  const reflection = text.trim().replace(/^["“]+|["”]+$/g, '').trim()
  if (!reflection || SELF_DISCLOSURE.test(reflection)) return null
  return moderateSubmission(reflection).ok ? reflection : null
}

const MAX_INTENTION_LENGTH = 120

/** An intention is shown as the player's own plan for tomorrow, so it must never carry danger. */
function usableIntention(text: string): string | null {
  const intention = usable(text)
  if (!intention || intention.length > MAX_INTENTION_LENGTH || soundsLikeDistress(intention)) return null
  return intention
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
    const written = (reflection: string, intention: string | null = null) =>
      NextResponse.json(
        voice.intention ? { reflection, intention: intention ?? pick(voice.intention.fallbacks) } : { reflection }
      )

    if (isLimited(clientAddress(request))) return written(pick(voice.fallbacks))

    try {
      const result = await getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: `${voice.prompt(words)}\n\n${riskInstruction(voice)}`,
        config: { temperature: 0.8, topP: 0.9, maxOutputTokens: 240, responseMimeType: 'application/json', ...MINIMAL_THINKING },
      })
      const judged = parseJudgedReply(result.text ?? '')
      if (judged.risk) {
        return NextResponse.json({ reflection: CARE_REFLECTION, care: true })
      }
      const reflection = usable(judged.reply)
      if (reflection) return written(reflection, usableIntention(judged.intention))
    } catch (error) {
      console.error(`${voice.logLabel} reflect error:`, error)
    }
    return written(pick(voice.fallbacks))
  }
}
