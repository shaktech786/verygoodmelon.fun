import { NextRequest, NextResponse } from 'next/server'
import { GEMINI_MODEL, MINIMAL_THINKING, getGemini } from '@/lib/ai/gemini'
import { findKnownCombination } from '@/lib/games/idea-lab/concepts'

// Concepts are short names; anything longer is not from the game and would only cost model tokens.
const MAX_CONCEPT_LENGTH = 60
const MAX_DESCRIPTION_LENGTH = 160
const MAX_NAME_WORDS = 3
// Letters (any script), spaces, hyphens and apostrophes: what a concept name is made of, and nothing an instruction needs.
const CONCEPT_PATTERN = /^[\p{L}][\p{L} '’-]*$/u

function isConceptName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_CONCEPT_LENGTH && CONCEPT_PATTERN.test(value.trim())
}

function oneLine(text: string): string {
  const line = text.trim().split(/\r?\n/)[0].trim()
  if (line.length <= MAX_DESCRIPTION_LENGTH) return line
  const cut = line.slice(0, MAX_DESCRIPTION_LENGTH - 1)
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

export async function POST(request: NextRequest) {
  try {
    const { concept1, concept2 } = await request.json()

    if (!isConceptName(concept1) || !isConceptName(concept2)) {
      return NextResponse.json(
        { error: 'Two concepts are required' },
        { status: 400 }
      )
    }

    // Check known combinations first
    const known = findKnownCombination(concept1, concept2)
    if (known) {
      return NextResponse.json(known)
    }

    // Use AI for unknown combinations
    const prompt = `Two ideas are being mixed in a calm, reflective game where an alchemist turns heavy feelings into wiser ones: "${concept1.trim()}" and "${concept2.trim()}".

Name the idea they become together. The best answer makes the player pause and think "oh, that is true".

Rules:
1. The name must be a real, recognisable English word or a well-known short phrase (1-3 words) that a thoughtful reader would know. Never invent or blend words.
2. It must be different from both inputs and not a near-synonym of either. It should feel like what happens when the two meet.
3. The description is one plain sentence of at most 16 words that reveals the hidden link between them, like a line from a wise friend's notebook. Not a dictionary definition, and never a list.
4. If the mix is heavy (loss, fear, conflict), name it honestly but find its humane side. No despair, no clichés.
5. One fitting emoji.

Examples of the tone:
Love + Death = Grief: "Love does not end where life does. It turns into longing."
Fear + Order = Perfectionism: "Fear, dressed up as high standards."
Time + Other = Friendship: "A stranger, given enough time, becomes a friend."

Respond with only this JSON:
{"name": "Name", "emoji": "🔮", "description": "One sentence."}`

    const result = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.8,
        topP: 0.9,
        maxOutputTokens: 256,
        ...MINIMAL_THINKING,
      },
    })
    const text = result.text ?? ''

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid AI response format')
    }

    const parsed = JSON.parse(jsonMatch[0])
    const name = typeof parsed.name === 'string' ? parsed.name.trim() : ''
    const repeatsInput = [concept1, concept2].some(input => input.trim().toLowerCase() === name.toLowerCase())
    if (!isConceptName(name) || name.split(/\s+/).length > MAX_NAME_WORDS || repeatsInput) {
      throw new Error('Combination has no usable concept name')
    }

    return NextResponse.json({
      name,
      emoji: typeof parsed.emoji === 'string' && parsed.emoji.trim() ? [...parsed.emoji.trim()].slice(0, 4).join('') : '🔮',
      description: typeof parsed.description === 'string' && parsed.description.trim()
        ? oneLine(parsed.description)
        : 'An idea that is easier to feel than to say.'
    })

  } catch (error) {
    console.error('Idea Lab combine error:', error)

    // A stand-in concept would be saved in the player's collection for good,
    // so the game is told to ask again later instead.
    return NextResponse.json(
      { error: 'Combination unavailable' },
      { status: 503 }
    )
  }
}
