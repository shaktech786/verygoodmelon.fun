import { NextRequest, NextResponse } from 'next/server'
import { GEMINI_MODEL, MINIMAL_THINKING, getGemini } from '@/lib/ai/gemini'

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

const NAME_MAX = 60
const TOPIC_MAX = 120
const ARGUMENT_MAX = 1200
const MAX_HISTORY = 12
const MAX_ROUNDS = 12

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

// The model sometimes prefixes its reply with the speaker's name or wraps it in quotes.
function stripSpeakerLabel(text: string, speaker: string): string {
  let out = text
  if (out.toLowerCase().startsWith(`${speaker.toLowerCase()}:`)) out = out.slice(speaker.length + 1).trim()
  if (out.length > 1 && out.startsWith('"') && out.endsWith('"')) out = out.slice(1, -1).trim()
  return out
}

export async function POST(request: NextRequest) {
  try {
    const body: DebateTurnRequest = await request.json()
    const person1 = clean(body.person1, NAME_MAX)
    const person2 = clean(body.person2, NAME_MAX)
    const topic = clean(body.topic, TOPIC_MAX)
    const { round, totalRounds } = body
    const history = Array.isArray(body.history)
      ? body.history.slice(-MAX_HISTORY).map(h => ({ speaker: clean(h.speaker, NAME_MAX), argument: clean(h.argument, ARGUMENT_MAX) }))
      : []

    if (!person1 || !person2 || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(round) || !Number.isInteger(totalRounds) || round < 1 || round > totalRounds || totalRounds > MAX_ROUNDS) {
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

    const result = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: systemPrompt,
      config: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 256,
        ...MINIMAL_THINKING,
      },
    })
    const argument = stripSpeakerLabel((result.text ?? '').trim(), currentSpeaker)
    if (!argument) throw new Error('Empty debate turn')

    return NextResponse.json({
      speaker: currentSpeaker,
      argument,
      round,
    })
  } catch (error) {
    console.error('Mind Debate turn error:', error)
    return NextResponse.json(
      { error: 'The debate could not continue' },
      { status: 500 }
    )
  }
}
