import { NextRequest, NextResponse } from 'next/server'
import { GEMINI_MODEL, MINIMAL_THINKING, getGemini } from '@/lib/ai/gemini'
import { VISITOR_RULE } from '@/lib/ai/visitor-rule'
import { getThinkerById } from '@/lib/games/timeless-minds/thinkers'
import {
  MAX_FAREWELL_LENGTH,
  SAFETY_GUIDANCE,
  farewellFallback,
  sanitizeHistory,
  tidyLine,
} from '@/lib/games/timeless-minds/conversation'
import { plainText } from '@/lib/games/timeless-minds/plain-text'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const thinker = typeof body?.thinkerId === 'string' ? getThinkerById(body.thinkerId) : undefined
  if (!thinker) {
    return NextResponse.json({ error: 'Thinker not found' }, { status: 404 })
  }

  const fallback = farewellFallback(thinker)
  const history = sanitizeHistory(body?.conversationHistory)
  if (!history.some(turn => turn.role === 'user')) {
    return NextResponse.json({ farewell: fallback })
  }

  try {
    const transcript = history
      .map(turn => `${turn.role === 'user' ? 'Visitor' : thinker.name}: ${turn.content}`)
      .join('\n')

    const result = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: `Here is the conversation so far:\n${transcript}\n\nThe visitor is saying goodbye now.`,
      config: {
        systemInstruction: `You are ${thinker.name} (${thinker.era}), ${thinker.bio}
Style: ${thinker.conversationStyle}

Write your parting words to the visitor: one or two sentences, at most 40 words in total.
Distil the single most useful thought from this conversation into something they can carry with them today, in your own voice.
Be warm and grounded. No questions, no flattery, no lists, no quotation marks.

${VISITOR_RULE}

${SAFETY_GUIDANCE}`,
        temperature: 0.7,
        maxOutputTokens: 120,
        ...MINIMAL_THINKING,
      },
    })

    const farewell = tidyLine(plainText(result.text ?? ''), MAX_FAREWELL_LENGTH)
    return NextResponse.json({ farewell: farewell || fallback })
  } catch (error) {
    console.error('Timeless Minds farewell error:', error)
    return NextResponse.json({ farewell: fallback })
  }
}
