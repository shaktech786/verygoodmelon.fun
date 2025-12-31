import { NextRequest, NextResponse } from 'next/server'
import { getWordOfDay } from '@/lib/games/hope-daily/words'

/**
 * Hint API for Hope Daily
 *
 * Progressive hints that guide without giving away:
 * - Hint 1: Thematic clue about the word's meaning
 * - Hint 2: Reveal one letter position
 * - Hint 3: Reveal another letter position
 */

// Thematic clues for common positive/progress words
const THEMATIC_CLUES: Record<string, string> = {
  // Environment
  'SOLAR': 'It comes from our nearest star',
  'GREEN': 'The color of growth and nature',
  'CLEAN': 'Free from pollution or dirt',
  'TREES': 'They breathe for our planet',
  'OCEAN': 'Covers most of Earth\'s surface',
  'EARTH': 'Our home planet',
  'WATER': 'Essential for all life',
  'CORAL': 'Underwater ecosystems at risk',
  'OZONE': 'Protects us from UV rays',

  // Health
  'CURED': 'No longer sick',
  'HEALS': 'The body repairs itself',
  'SAVED': 'Rescued from danger',
  'ALIVE': 'Having life',
  'HEART': 'It beats for you',
  'BRAIN': 'The mind\'s home',
  'CELLS': 'Building blocks of life',

  // Progress
  'PEACE': 'Absence of conflict',
  'UNITY': 'Coming together as one',
  'EQUAL': 'The same for everyone',
  'VOICE': 'The power to speak up',
  'VOTES': 'Democracy in action',
  'LAWS': 'Rules that protect',
  'RIGHTS': 'What everyone deserves',
  'FREED': 'Released from bondage',
  'HOPE': 'Belief in better days',

  // Technology
  'SMART': 'Intelligent or clever',
  'SPACE': 'The final frontier',
  'LUNAR': 'Related to the moon',
  'MARS': 'The red planet',
  'GENES': 'Blueprints of life',
  'ROBOT': 'Mechanical helper',
  'CHIPS': 'Tiny but powerful',

  // Education
  'BOOKS': 'Knowledge on pages',
  'LEARN': 'To gain knowledge',
  'TEACH': 'To share knowledge',
  'SCHOOL': 'Where learning happens',
  'GIRLS': 'Half of humanity',
  'YOUTH': 'The next generation',

  // Economy
  'JOBS': 'Work for income',
  'WAGES': 'Pay for work',
  'TRADE': 'Exchange of goods',
  'FARMS': 'Where food grows',
  'CROPS': 'Plants we cultivate',
  'FOOD': 'Nourishment for all',
}

function generateThematicClue(word: string, category: string): string {
  // Check if we have a specific clue
  if (THEMATIC_CLUES[word]) {
    return THEMATIC_CLUES[word]
  }

  // Generate generic clue based on category
  const categoryClues: Record<string, string[]> = {
    'Environment': [
      'Think about nature and our planet',
      'Related to Earth\'s wellbeing',
      'Something environmental'
    ],
    'Health': [
      'Think about wellness and medicine',
      'Related to human health',
      'Something medical or biological'
    ],
    'Technology': [
      'Think about innovation',
      'Related to science and progress',
      'Something technological'
    ],
    'Society': [
      'Think about people and communities',
      'Related to human progress',
      'Something social'
    ],
    'Education': [
      'Think about learning and knowledge',
      'Related to schools and teaching',
      'Something educational'
    ],
    'Economy': [
      'Think about work and prosperity',
      'Related to financial wellbeing',
      'Something economic'
    ]
  }

  const clues = categoryClues[category] || ['Think about global progress']
  return clues[Math.floor(Math.random() * clues.length)]
}

export async function POST(request: NextRequest) {
  try {
    const { hintNumber, revealedPositions = [] } = await request.json()
    const wordData = getWordOfDay()
    const word = wordData.word

    if (typeof hintNumber !== 'number' || hintNumber < 1 || hintNumber > 3) {
      return NextResponse.json({ error: 'Invalid hint number' }, { status: 400 })
    }

    let hint: string
    let revealedLetter: { position: number; letter: string } | null = null

    if (hintNumber === 1) {
      // First hint: thematic clue
      hint = generateThematicClue(word, wordData.category)
    } else {
      // Hints 2 and 3: reveal a letter position
      // Find positions not yet revealed
      const availablePositions = []
      for (let i = 0; i < word.length; i++) {
        if (!revealedPositions.includes(i)) {
          availablePositions.push(i)
        }
      }

      if (availablePositions.length === 0) {
        hint = 'No more letters to reveal!'
      } else {
        // Pick a random available position
        const position = availablePositions[Math.floor(Math.random() * availablePositions.length)]
        const letter = word[position]
        revealedLetter = { position, letter }

        // Ordinal suffix
        const ordinal = (n: number) => {
          const s = ['th', 'st', 'nd', 'rd']
          const v = n % 100
          return n + (s[(v - 20) % 10] || s[v] || s[0])
        }

        hint = `The ${ordinal(position + 1)} letter is "${letter}"`
      }
    }

    return NextResponse.json({
      hint,
      revealedLetter,
      hintNumber
    })

  } catch (error) {
    console.error('Hint API error:', error)
    return NextResponse.json({ error: 'Failed to generate hint' }, { status: 500 })
  }
}
