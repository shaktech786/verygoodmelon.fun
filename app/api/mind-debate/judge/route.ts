import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_MODEL = 'gemini-2.0-flash'

function getGenAI() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not configured')
  return new GoogleGenerativeAI(apiKey)
}

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

export async function POST(request: NextRequest) {
  try {
    const body: JudgeRequest = await request.json()
    const { person1, person2, topic, history } = body

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

Respond ONLY in this JSON format (no markdown, no code blocks):
{
  "winner": "${person1}" or "${person2}" or "draw",
  "summary": "A 2-3 sentence verdict explaining who won and why. Be specific about which arguments were strongest. If it's a draw, explain why neither clearly won."
}`

    const model = getGenAI().getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 300,
      },
    })

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid judge response format')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate winner field
    const validWinners = [person1, person2, 'draw']
    if (!validWinners.includes(parsed.winner)) {
      parsed.winner = 'draw'
    }

    return NextResponse.json({
      winner: parsed.winner,
      summary: parsed.summary || 'Both debaters made compelling arguments.',
    })
  } catch (error) {
    console.error('Mind Debate judge error:', error)

    let errorMessage = 'Failed to judge debate'
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'API configuration error'
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = 'Service temporarily unavailable'
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
