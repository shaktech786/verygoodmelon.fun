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

interface DebateTurnRequest {
  person1: string
  person2: string
  topic: string
  history: DebateHistoryEntry[]
  round: number
  totalRounds: number
}

export async function POST(request: NextRequest) {
  try {
    const body: DebateTurnRequest = await request.json()
    const { person1, person2, topic, history, round, totalRounds } = body

    if (!person1 || !person2 || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (round < 1 || round > totalRounds) {
      return NextResponse.json(
        { error: 'Invalid round number' },
        { status: 400 }
      )
    }

    // Determine whose turn it is (odd rounds = person1, even = person2)
    const currentSpeaker = round % 2 === 1 ? person1 : person2
    const opponent = round % 2 === 1 ? person2 : person1

    const historyText = history.length > 0
      ? history.map(h => `${h.speaker}: "${h.argument}"`).join('\n')
      : 'No arguments yet. This is the opening statement.'

    const roundContext = round === 1
      ? 'This is the opening statement. Set the tone and stake your position.'
      : round === totalRounds
        ? 'This is the final round. Make your strongest closing argument.'
        : `This is round ${round} of ${totalRounds}. Build on or counter previous arguments.`

    const systemPrompt = `You are simulating a debate. You must now speak AS ${currentSpeaker}, arguing about: "${topic}"

YOUR ROLE: You ARE ${currentSpeaker}. Argue from their known perspective, beliefs, personality, and communication style.

OPPONENT: ${opponent}

DEBATE HISTORY:
${historyText}

ROUND CONTEXT: ${roundContext}

RULES:
- Write 2-4 sentences ONLY. Be punchy, persuasive, and in-character.
- Use ${currentSpeaker}'s actual known views, manner of speaking, and rhetorical style.
- If ${currentSpeaker} is fictional, use their established characterization.
- Address previous arguments directly when relevant.
- Be witty and engaging, not dry or academic.
- No meta-commentary. No "As ${currentSpeaker}, I think..." - just speak as them directly.
- Never break character or acknowledge being an AI.
- Keep it respectful but spirited. This should be fun to watch.

Respond with ONLY the argument text. No labels, no formatting, no speaker name prefix.`

    const model = getGenAI().getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 256,
      },
    })

    const result = await model.generateContent(systemPrompt)
    const argument = result.response.text().trim()

    return NextResponse.json({
      speaker: currentSpeaker,
      argument,
      round,
    })
  } catch (error) {
    console.error('Mind Debate turn error:', error)

    let errorMessage = 'Failed to generate debate turn'
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
