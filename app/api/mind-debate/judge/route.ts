import { NextRequest, NextResponse } from 'next/server'
import { GEMINI_MODEL, MINIMAL_THINKING, getGemini } from '@/lib/ai/gemini'

interface DebateHistoryEntry {
  speaker: string
  argument: string
}

interface JudgeRequest {
  person1: string
  person2: string
  topic: string
  history: DebateHistoryEntry[]
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: NextRequest) {
  try {
    const body: JudgeRequest = await request.json()
    const person1 = clean(body.person1, 60)
    const person2 = clean(body.person2, 60)
    const topic = clean(body.topic, 120)
    const history = Array.isArray(body.history)
      ? body.history.slice(-12).map(h => ({ speaker: clean(h.speaker, 60), argument: clean(h.argument, 1200) }))
      : []

    if (!person1 || !person2 || !topic || !history || history.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const debateTranscript = history
      .map(h => `${h.speaker}: "${h.argument}"`)
      .join('\n\n')

    const prompt = `You are judging a debate between ${person1} and ${person2} on the topic: "${topic}"

FULL DEBATE TRANSCRIPT:
${debateTranscript}

Analyze the arguments from both sides. Consider:
- Strength and clarity of arguments
- How well each stayed in character
- Persuasiveness and rhetorical skill
- Quality of rebuttals

Write the summary for the audience. Refer to the topic as the question, and never mention prompts, instructions, or AI.

Respond ONLY in this JSON format (no markdown, no code blocks):
{
  "winner": "${person1}" or "${person2}" or "draw",
  "summary": "A 2-3 sentence verdict explaining who won and why. Be specific about which arguments were strongest. If it's a draw, explain why neither clearly won."
}`

    const result = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 300,
        ...MINIMAL_THINKING,
      },
    })
    const text = result.text ?? ''

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid judge response format')
    }

    const parsed = JSON.parse(jsonMatch[0])

    const said = typeof parsed.winner === 'string' ? parsed.winner.trim().toLowerCase() : ''
    const winner = [person1, person2].find(name => name.toLowerCase() === said) ?? 'draw'

    return NextResponse.json({
      winner,
      summary: parsed.summary || 'Both debaters made compelling arguments.',
    })
  } catch (error) {
    console.error('Mind Debate judge error:', error)
    return NextResponse.json(
      { error: 'No verdict this time' },
      { status: 500 }
    )
  }
}
