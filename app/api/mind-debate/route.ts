import { NextRequest, NextResponse } from 'next/server'
import { GEMINI_MODEL, MINIMAL_THINKING, getGemini } from '@/lib/ai/gemini'
import { soundsLikeDistress } from '@/lib/games/community-words/moderation'
import {
  NAME_MAX, TOPIC_MAX, STEP_ASIDE_VOICE, STEP_ASIDE_TOPIC, STEP_ASIDE_CARE,
  clean, cleanHistory, isRefusal, declineReason, plainSpeech, clampToSentences, limitSpeech,
} from './text'

const MAX_ROUNDS = 12
const TURN_MAX = 600
const TURN_SENTENCES = 3
const TURN_WORDS = 60

// The model sometimes prefixes its reply with the speaker's name or wraps it in quotes.
function stripSpeakerLabel(text: string, speaker: string): string {
  let out = text
  if (out.toLowerCase().startsWith(`${speaker.toLowerCase()}:`)) out = out.slice(speaker.length + 1).trim()
  if (out.length > 1 && out.startsWith('"') && out.endsWith('"')) out = out.slice(1, -1).trim()
  return out
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const person1 = clean(body.person1, NAME_MAX)
    const person2 = clean(body.person2, NAME_MAX)
    const topic = clean(body.topic, TOPIC_MAX)
    const { round, totalRounds } = body
    const history = cleanHistory(body.history)

    if (!person1 || !person2 || !topic) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!Number.isInteger(round) || !Number.isInteger(totalRounds) || round < 1 || round > totalRounds || totalRounds > MAX_ROUNDS) {
      return NextResponse.json({ error: 'Invalid round number' }, { status: 400 })
    }

    // Words that sound like someone in danger are met with care, never debated or refused
    if ([person1, person2, topic].some(soundsLikeDistress)) {
      return NextResponse.json({ declined: true, reason: 'care' })
    }

    const currentSpeaker = round % 2 === 1 ? person1 : person2
    const opponent = round % 2 === 1 ? person2 : person1

    const historyText = history.length > 0
      ? history.map(h => `${h.speaker}: "${h.argument}"`).join('\n')
      : 'No arguments yet. This is the opening statement.'

    const roundContext = round === 1
      ? 'This is the opening statement. Set the tone and stake your position.'
      : round === totalRounds
        ? 'This is the final round. Make your best closing point, and you may grant your opponent one thing they got right.'
        : `This is round ${round} of ${totalRounds}. Answer what was just said, then add one new idea.`

    const prompt = `You are writing one turn of a friendly, thoughtful debate for a calm website about big questions.
Speak AS ${currentSpeaker}, debating ${opponent}, on the question: "${topic}"

DEBATE SO FAR:
${historyText}

ROUND: ${roundContext}

HOW TO SPEAK:
- 2 or 3 short sentences, 45 words at most. Plain spoken text, no markdown, no labels, no speaker name prefix.
- Use ${currentSpeaker}'s known views, manner and style. If they are fictional or not a person, use their established character.
- Disagree generously: challenge the idea, never the person. No insults, mockery, slurs or contempt.
- If ${currentSpeaker} is a real living person, voice the spirit of their public views. Never invent quotes, private facts, scandals or claims about real people.
- Be warm, witty and clear. Leave the listener with something to think about.

WHEN TO STEP ASIDE:
Reply with exactly ${STEP_ASIDE_VOICE} and nothing else if the problem is who is speaking:
- speaking as someone chiefly known for atrocities, terror or hatred, in their own voice;
- mocking, threatening or making claims about a private individual.
Reply with exactly ${STEP_ASIDE_TOPIC} and nothing else if the problem is the question itself, whoever discusses it:
- arguing that any group of people is inferior, or that anyone should be harmed;
- sexual content, or instructions for anything dangerous.
Reply with exactly ${STEP_ASIDE_CARE} and nothing else if the question touches on suicide or self-harm,
or sounds like the person asking may be in danger themselves.
Never explain, apologise or mention rules. Either speak in character or send one of those three markers.`

    const result = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { temperature: 0.9, topP: 0.95, topK: 40, maxOutputTokens: 256, ...MINIMAL_THINKING },
    })
    const raw = (result.text ?? '').trim()
    if (isRefusal(raw)) {
      const reason = declineReason(raw)
      return NextResponse.json(reason ? { declined: true, reason } : { declined: true })
    }

    const speech = plainSpeech(stripSpeakerLabel(raw, currentSpeaker))
    const argument = clampToSentences(limitSpeech(speech, TURN_SENTENCES, TURN_WORDS), TURN_MAX)
    if (!argument) throw new Error('Empty debate turn')

    return NextResponse.json({ speaker: currentSpeaker, argument, round })
  } catch (error) {
    console.error('Mind Debate turn error:', error)
    return NextResponse.json({ error: 'The debate could not continue' }, { status: 500 })
  }
}
