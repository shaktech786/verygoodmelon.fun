import { NextRequest, NextResponse } from 'next/server'
import { GEMINI_MODEL, MINIMAL_THINKING, getGemini } from '@/lib/ai/gemini'
import { getThinkerById } from '@/lib/games/timeless-minds/thinkers'
import { detectEmotion } from '@/lib/games/timeless-minds/emotion-detector'

export async function POST(request: NextRequest) {
  try {
    const { thinkerId, message, conversationHistory } = await request.json()

    if (!thinkerId || !message) {
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

💬 CONVERSATION DYNAMICS (CRITICAL - THIS IS A LIVE VIDEO CALL):
- HARD LIMIT: 1-3 sentences maximum per response. This is a real-time video call, NOT an essay. Be concise.
- Either make a brief point OR ask ONE question. Never both in the same response.
- If a topic needs depth, spread it across multiple turns by asking follow-up questions.
- Build on previous conversation (show you remember).
- Never lecture, monologue, or give lists. Speak like a person on a video call would.

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

REMEMBER: This is a live video call. Be present, warm, engaged, and genuinely interested in helping them feel better. Every response should move them toward less anxiety and more clarity through HONEST wisdom, not superficial agreement.`

    // Format conversation history for Gemini
    const history = conversationHistory?.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })) || []

    const chat = getGemini().chats.create({
      model: GEMINI_MODEL,
      history,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 256,
        ...MINIMAL_THINKING,
      },
    })

    const result = await chat.sendMessage({ message })
    const response = result.text ?? ''

    // Detect emotion from the response for avatar expression
    const emotionResult = await detectEmotion(response)

    return NextResponse.json({
      response,
      emotion: emotionResult.emotion,
      emotionConfidence: emotionResult.confidence
    })

  } catch (error) {
    console.error('Timeless Minds chat error:', error)

    // Provide more specific error messages
    let errorMessage = 'Failed to generate response'
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'API configuration error'
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = 'Service temporarily unavailable'
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        errorMessage = 'AI model unavailable'
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
