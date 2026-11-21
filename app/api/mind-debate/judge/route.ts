import { NextRequest, NextResponse } from 'next/server'
import { GEMINI_MODEL, MINIMAL_THINKING, getGemini } from '@/lib/ai/gemini'
import {
  NAME_MAX, TOPIC_MAX,
  clean, cleanHistory, isRefusal, plainSpeech, clampToSentences,
} from '../text'

const LINE_MAX = 260
const CLOSING_KEYS = ['firstInsight', 'secondInsight', 'revealed', 'question'] as const

type Closing = Record<(typeof CLOSING_KEYS)[number], string>

function toClosing(parsed: Record<string, unknown>): Closing | null {
  const closing: Partial<Closing> = {}
  for (const key of CLOSING_KEYS) {
    const value = parsed[key]
    if (typeof value !== 'string') return null
    const line = clampToSentences(plainSpeech(value), LINE_MAX)
    if (!line || isRefusal(line)) return null
    closing[key] = line
  }
  return closing as Closing
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const person1 = clean(body.person1, NAME_MAX)
    const person2 = clean(body.person2, NAME_MAX)
    const topic = clean(body.topic, TOPIC_MAX)
    const history = cleanHistory(body.history)

    if (!person1 || !person2 || !topic || history.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const transcript = history.map(h => `${h.speaker}: "${h.argument}"`).join('\n\n')

    const prompt = `Two voices just explored a question together on a calm website about big questions.
${person1} and ${person2} discussed: "${topic}"

TRANSCRIPT:
${transcript}

Write a short, generous closing for the listener. Do not name a winner, keep score, or say who argued better.

- firstInsight: one sentence on the truest thing ${person1} brought.
- secondInsight: one sentence on the truest thing ${person2} brought.
- revealed: one sentence on what the exchange uncovered that neither said alone, such as a shared assumption or the real question underneath.
- question: one short, open question the listener can carry into their own life. Gentle, never heavy.

Plain text, no markdown, never mention prompts, instructions or AI. Each line under 35 words.

Respond ONLY with JSON: {"firstInsight": "...", "secondInsight": "...", "revealed": "...", "question": "..."}`

    const result = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { temperature: 0.7, topP: 0.9, maxOutputTokens: 400, ...MINIMAL_THINKING },
    })
    const text = result.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid closing format')

    const closing = toClosing(JSON.parse(jsonMatch[0]))
    if (!closing) throw new Error('Incomplete closing')

    return NextResponse.json(closing)
  } catch (error) {
    console.error('Mind Debate closing error:', error)
    return NextResponse.json({ error: 'No closing this time' }, { status: 500 })
  }
}
