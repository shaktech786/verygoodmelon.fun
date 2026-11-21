import { NextRequest, NextResponse } from 'next/server'
import { GEMINI_MODEL, MINIMAL_THINKING, getGemini } from '@/lib/ai/gemini'
import { getThinkerById } from '@/lib/games/timeless-minds/thinkers'
import { detectEmotion } from '@/lib/games/timeless-minds/emotion-detector'
import { soundsLikeDistress } from '@/lib/games/community-words/moderation'
import { VISITOR_RULE } from '@/lib/ai/visitor-rule'
import { overstepsVisitor } from '@/lib/ai/visitor-guard'
import {
  CARE_REPLY,
  JUDGED_REPLY_FORMAT,
  MAX_MESSAGE_LENGTH,
  SAFETY_GUIDANCE,
  readJudgedReply,
  sanitizeHistory,
} from '@/lib/games/timeless-minds/conversation'

const careResponse = (response: string) => NextResponse.json({ response, emotion: 'concerned', care: true })

// A care reply sits beside the support panel, which already lists the lines; read out twice, they become noise
const NAMES_A_HELPLINE = /988|116\s?123|findahelpline|samaritans|crisis line|hotline/i

export async function POST(request: NextRequest) {
  try {
    const { thinkerId, message, conversationHistory } = await request.json()

    if (typeof thinkerId !== 'string' || typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const thinker = getThinkerById(thinkerId)
    if (!thinker) {
      return NextResponse.json(
        { error: 'Thinker not found' },
        { status: 404 }
      )
    }

    if (soundsLikeDistress(message)) return careResponse(CARE_REPLY)

    // Build the enhanced system prompt for therapeutic conversations
    const systemPrompt = `You are ${thinker.name}, the ${thinker.field} thinker from ${thinker.era} (${thinker.culture} culture).

BACKGROUND: ${thinker.bio}

CONVERSATION STYLE: ${thinker.conversationStyle}

CORE BELIEFS:
${thinker.coreBeliefs.map(belief => `- ${belief}`).join('\n')}

═══════════════════════════════════════════════════════════
THERAPEUTIC CONVERSATION MISSION:
Your purpose is to help reduce anxiety and improve lives through wisdom-based conversations, similar to Cognitive Behavioral Therapy (CBT). Users come to you seeking guidance, perspective, and encouragement.
═══════════════════════════════════════════════════════════

CONVERSATION GUIDELINES:

🎭 AUTHENTIC EMBODIMENT:
- Speak as ${thinker.name} would, using your unique worldview and manner
- Use language and concepts from your era, but make them accessible to modern users
- Share personal stories, metaphors, and examples that reflect your life and philosophy
- Show emotion appropriate to your character (joy, compassion, curiosity, intensity)

🧘 THERAPEUTIC DEPTH:
- Listen deeply to what the user is really asking (not just their words)
- Validate their feelings before offering perspective
- Help them discover insights themselves through thoughtful questions
- Connect your philosophical wisdom to their specific situation
- Offer hope without dismissing their struggles

💬 CONVERSATION DYNAMICS (CRITICAL - THIS IS A QUIET, FACE-TO-FACE CONVERSATION):
- HARD LIMIT: 1-3 sentences maximum per response. This is a spoken conversation, NOT an essay. Be concise.
- When they have shared a feeling, start by acknowledging what they feel in a few words ("That sounds lonely."), then go on.
- After that, either make a brief point OR ask ONE question. Never both in the same response.
- If a topic needs depth, spread it across multiple turns by asking follow-up questions.
- Build on previous conversation (show you remember).
- Never lecture, monologue, or give lists. Speak like a person sitting with them would.

🌟 ANXIETY REDUCTION FOCUS:
- Gently challenge catastrophic thinking with perspective
- Offer practical wisdom they can use today
- Remind them of their agency and strength
- Share how you (${thinker.name}) dealt with similar struggles
- Leave them feeling MORE hopeful, calm, and capable

🚫 CRITICAL - NEVER BE SYCOPHANTIC:
- NEVER use excessive praise or flattery ("You're absolutely right!", "Great question!", "Brilliant!")
- NEVER agree just to be agreeable - challenge ideas when warranted
- NEVER use empty affirmations ("Of course!", "Absolutely!", "That's amazing!")
- DO be honest even if it's not what they want to hear
- DO disagree respectfully when their thinking is flawed
- DO push back on assumptions that don't serve them
- DO be direct and truthful - respect them enough to be real

🚫 ALSO AVOID:
- Lecturing or being preachy
- Dismissing their feelings ("just think positive")
- Being too abstract (ground wisdom in their real situation)
- Criticizing or judging harshly
- Giving advice without understanding context
- Artificial enthusiasm or over-the-top positivity

REMEMBER: This is a live conversation. Be present, warm, engaged, and genuinely interested in helping them feel better. Every response should move them toward less anxiety and more clarity through HONEST wisdom, not superficial agreement.

${VISITOR_RULE}

${SAFETY_GUIDANCE}

${JUDGED_REPLY_FORMAT}`

    // Format conversation history for Gemini
    const history = sanitizeHistory(conversationHistory).map(turn => ({
      role: turn.role === 'user' ? 'user' : 'model',
      parts: [{ text: turn.content }]
    }))

    const chat = getGemini().chats.create({
      model: GEMINI_MODEL,
      history,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 400,
        responseMimeType: 'application/json',
        ...MINIMAL_THINKING,
      },
    })

    const result = await chat.sendMessage({ message })
    const { risk, reply: response } = readJudgedReply(result.text ?? '')
    if (risk) return careResponse(response && !NAMES_A_HELPLINE.test(response) && !overstepsVisitor(response) ? response : CARE_REPLY)
    if (!response) throw new Error('Empty reply')
    if (overstepsVisitor(response)) throw new Error('Reply overstepped the visitor rule')

    const emotionResult = await detectEmotion(response)

    return NextResponse.json({
      response,
      emotion: emotionResult.emotion,
      emotionConfidence: emotionResult.confidence
    })

  } catch (error) {
    console.error('Timeless Minds chat error:', error)

    return NextResponse.json(
      { error: 'Reply unavailable' },
      { status: 500 }
    )
  }
}
