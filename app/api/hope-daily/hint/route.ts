import { NextRequest, NextResponse } from 'next/server'
import { getWordOfDay } from '@/lib/games/hope-daily/words'

/**
 * Hint API for Hope Daily
 *
 * Progressive hints that guide without giving away:
 * - Hint 1: A clue about the word's meaning
 * - Hint 2: Reveal one letter position
 * - Hint 3: Reveal another letter position
 */

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
      hint = wordData.clue
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
