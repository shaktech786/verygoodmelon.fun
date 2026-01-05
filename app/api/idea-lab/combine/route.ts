import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Validate API key on initialization
const apiKey = process.env.GOOGLE_GEMINI_API_KEY
if (!apiKey) {
  throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not configured')
}

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(apiKey)
const GEMINI_MODEL = 'gemini-2.0-flash'

// Known combinations for consistency and instant responses
const KNOWN_COMBINATIONS: Record<string, { name: string; emoji: string; description: string }> = {
  // Classic philosophical combinations
  'love+fear': { name: 'Jealousy', emoji: '😒', description: 'When love fears loss, it curdles into possession.' },
  'love+death': { name: 'Grief', emoji: '💔', description: 'Love does not end where life does—it transforms into longing.' },
  'love+time': { name: 'Devotion', emoji: '💍', description: 'Love that endures through time becomes unbreakable.' },
  'love+truth': { name: 'Vulnerability', emoji: '🫀', description: 'True love requires showing who we really are.' },
  'love+freedom': { name: 'Trust', emoji: '🤝', description: 'Real love holds loosely, letting the other fly.' },
  'love+self': { name: 'Self-Compassion', emoji: '🌷', description: 'The hardest person to truly love is yourself.' },
  'love+other': { name: 'Empathy', emoji: '💗', description: 'Extending your heart beyond your own experience.' },

  'fear+death': { name: 'Mortality', emoji: '⚰️', description: 'The universal dread that gives life its urgency.' },
  'fear+time': { name: 'Anxiety', emoji: '😰', description: 'Fear stretched across an uncertain future.' },
  'fear+freedom': { name: 'Vertigo', emoji: '🌀', description: 'The dizziness of infinite possibility.' },
  'fear+truth': { name: 'Denial', emoji: '🙈', description: 'We fear what we refuse to see.' },
  'fear+self': { name: 'Insecurity', emoji: '😟', description: 'Doubting the ground beneath your own identity.' },

  'time+death': { name: 'Legacy', emoji: '📜', description: 'What remains after we are gone.' },
  'time+knowledge': { name: 'Wisdom', emoji: '🦉', description: 'Understanding deepened by experience.' },
  'time+hope': { name: 'Patience', emoji: '🌱', description: 'The strength to wait for what matters.' },
  'time+chaos': { name: 'Entropy', emoji: '🔥', description: 'All things tend toward disorder.' },
  'time+order': { name: 'History', emoji: '📖', description: 'The patterns we impose on passing moments.' },

  'death+hope': { name: 'Resurrection', emoji: '🌅', description: 'The possibility of beginning again.' },
  'death+beauty': { name: 'Impermanence', emoji: '🌸', description: 'Things are beautiful because they end.' },
  'death+self': { name: 'Ego Death', emoji: '🦋', description: 'The dissolution that precedes transformation.' },

  'knowledge+power': { name: 'Expertise', emoji: '🎓', description: 'To know deeply is to influence widely.' },
  'knowledge+truth': { name: 'Enlightenment', emoji: '💡', description: 'When knowing aligns with what is.' },
  'knowledge+self': { name: 'Introspection', emoji: '🔍', description: 'Turning the mind inward to examine itself.' },
  'knowledge+other': { name: 'Understanding', emoji: '🤲', description: 'Bridging the gap between different minds.' },

  'power+freedom': { name: 'Authority', emoji: '👑', description: 'The right to shape others without their consent.' },
  'power+justice': { name: 'Law', emoji: '⚖️', description: 'Power channeled through rules.' },
  'power+chaos': { name: 'Revolution', emoji: '✊', description: 'When accumulated force breaks old orders.' },
  'power+self': { name: 'Autonomy', emoji: '🏔️', description: 'The power to govern yourself.' },

  'freedom+order': { name: 'Discipline', emoji: '🎯', description: 'Structure that enables rather than constrains.' },
  'freedom+truth': { name: 'Authenticity', emoji: '✨', description: 'Living as you truly are.' },
  'freedom+self': { name: 'Liberation', emoji: '🔓', description: 'Breaking the chains you didn\'t know you wore.' },
  'freedom+other': { name: 'Democracy', emoji: '🗳️', description: 'Freedom that includes everyone.' },

  'truth+beauty': { name: 'Art', emoji: '🎨', description: 'Beauty that reveals something real.' },
  'truth+justice': { name: 'Integrity', emoji: '🛡️', description: 'When words match actions match values.' },
  'truth+self': { name: 'Honesty', emoji: '🪞', description: 'Seeing yourself without filters.' },
  'truth+chaos': { name: 'Paradox', emoji: '♾️', description: 'Truths that contradict yet coexist.' },

  'beauty+death': { name: 'Sublime', emoji: '🌌', description: 'Awe that touches terror.' },
  'beauty+chaos': { name: 'Creativity', emoji: '🌈', description: 'Order emerging from disorder.' },
  'beauty+order': { name: 'Harmony', emoji: '🎵', description: 'Elements in perfect relation.' },

  'justice+chaos': { name: 'Karma', emoji: '☯️', description: 'The universe balancing itself.' },
  'justice+power': { name: 'Judgment', emoji: '⚡', description: 'Power exercised with discernment.' },

  'hope+chaos': { name: 'Faith', emoji: '🕊️', description: 'Trusting without certainty.' },
  'hope+fear': { name: 'Courage', emoji: '🦁', description: 'Acting despite fear because something matters more.' },
  'hope+death': { name: 'Transcendence', emoji: '🌠', description: 'Believing in something beyond this life.' },

  'chaos+order': { name: 'Balance', emoji: '⚖️', description: 'The dance between structure and spontaneity.' },
  'chaos+nature': { name: 'Evolution', emoji: '🧬', description: 'Random change preserved by selection.' },

  'nature+death': { name: 'Cycle', emoji: '🔄', description: 'All that dies feeds new life.' },
  'nature+beauty': { name: 'Wonder', emoji: '🌺', description: 'Amazement at what exists without us.' },
  'nature+self': { name: 'Instinct', emoji: '🐾', description: 'The animal wisdom within.' },

  'self+other': { name: 'Relationship', emoji: '🔗', description: 'Where I end and you begin becomes unclear.' },
  'self+truth': { name: 'Identity', emoji: '🪪', description: 'The story you tell about who you are.' },
  'self+death': { name: 'Existentialism', emoji: '🤔', description: 'Confronting your own finite existence.' },

  // Some deeper combinations
  'wisdom+courage': { name: 'Virtue', emoji: '🏛️', description: 'Excellence of character through practice.' },
  'grief+hope': { name: 'Healing', emoji: '🩹', description: 'Pain transforming into growth.' },
  'anxiety+patience': { name: 'Acceptance', emoji: '🙏', description: 'Finding peace with what cannot be changed.' },
  'mortality+legacy': { name: 'Meaning', emoji: '💫', description: 'What makes a finite life worthwhile.' },
  'empathy+understanding': { name: 'Compassion', emoji: '❤️', description: 'Feeling with others and acting to help.' },
  'vulnerability+trust': { name: 'Intimacy', emoji: '💑', description: 'Two souls meeting without armor.' },
  'authenticity+discipline': { name: 'Mastery', emoji: '🥋', description: 'Becoming fully yourself through dedicated practice.' },
}

// Get combo key (sorted alphabetically)
function getComboKey(concept1: string, concept2: string): string {
  return [concept1.toLowerCase(), concept2.toLowerCase()].sort().join('+')
}

export async function POST(request: NextRequest) {
  try {
    const { concept1, concept2 } = await request.json()

    if (!concept1 || !concept2) {
      return NextResponse.json(
        { error: 'Two concepts are required' },
        { status: 400 }
      )
    }

    // Check known combinations first
    const comboKey = getComboKey(concept1, concept2)
    const known = KNOWN_COMBINATIONS[comboKey]
    if (known) {
      return NextResponse.json(known)
    }

    // Use AI for unknown combinations
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        maxOutputTokens: 256,
      },
    })

    const prompt = `You are a philosophical concept generator for a game called "The Idea Lab" where players combine abstract concepts to discover new ideas.

Given two philosophical concepts, create a meaningful new concept that represents their combination.

RULES:
1. The result should be a SINGLE WORD or SHORT PHRASE (1-3 words max)
2. It should feel like a genuine philosophical or emotional concept
3. It should make intuitive sense as a combination
4. Provide a short, poetic description (one sentence)
5. Choose an appropriate emoji

Input concepts: "${concept1}" and "${concept2}"

Respond in this exact JSON format:
{
  "name": "ConceptName",
  "emoji": "🔮",
  "description": "A one-sentence poetic description of this concept."
}

Only return the JSON, no other text.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid AI response format')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      name: parsed.name || 'Mystery',
      emoji: parsed.emoji || '❓',
      description: parsed.description || 'A concept beyond words.'
    })

  } catch (error) {
    console.error('Idea Lab combine error:', error)

    // Fallback response
    return NextResponse.json({
      name: 'Synthesis',
      emoji: '🔮',
      description: 'Something new emerges from unexpected combinations.'
    })
  }
}
