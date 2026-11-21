import { NextRequest, NextResponse } from 'next/server'
import { GEMINI_MODEL, MINIMAL_THINKING, getGemini } from '@/lib/ai/gemini'
import {
  MAX_GUESS_LENGTH,
  fallbackCommentary,
  parseTiles,
  tidyCommentary,
  type ScoredTile,
} from '@/lib/games/hope-daily/commentary'

const SYSTEM_INSTRUCTION = `You write one short line of gentle commentary for a calm daily word puzzle about hopeful progress in the world (health, energy, nature, rights, peace, technology).
The player has just typed a guess. Comment on the guessed word itself: what it means, a small surprising or hopeful association, or light wordplay.

Rules:
- One sentence, at most 14 words. Plain text, no hashtags, at most one emoji.
- Warm, curious, quietly witty. Never sarcastic, never pushy, never "great job" filler.
- You do not know the answer. Never hint at it and never say "close", "almost" or "wrong".
- If the guess is not a real word (random letters), smile at it kindly in a few words.
- Never mention puzzles being hard, scores, speed, or how many tries are left.
- Vary your wording; avoid leaning on the words "quiet" and "quietly".
- Never mention being a program, a model or AI.`

function describeTiles(tiles: ScoredTile[]): string {
  if (tiles.length === 0) return ''
  const placed = tiles.filter(tile => tile.state === 'correct').length
  const present = tiles.filter(tile => tile.state === 'present').length
  return ` (${placed} letters in the right place, ${present} in the word elsewhere)`
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const rawGuess: unknown = body?.guess

  if (typeof rawGuess !== 'string' || !/^[A-Za-z]+$/.test(rawGuess) || rawGuess.length > MAX_GUESS_LENGTH) {
    return NextResponse.json({ error: 'Invalid guess' }, { status: 400 })
  }

  const guess = rawGuess.toUpperCase()
  const isCorrect = body?.isCorrect === true
  const tiles = parseTiles(body?.letterStates, guess)
  const guessNumber = Number.isInteger(body?.guessNumber) && body.guessNumber > 0 ? body.guessNumber : undefined
  const fallback = fallbackCommentary(guess, tiles, isCorrect, guessNumber)

  try {
    const prompt = isCorrect
      ? `The player just found today's word: "${guess}". Celebrate softly by saying something hopeful about what "${guess}" stands for.`
      : `The player guessed "${guess}"${describeTiles(tiles)}.`

    const result = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.9,
        maxOutputTokens: 60,
        ...MINIMAL_THINKING,
      },
    })

    const commentary = tidyCommentary(result.text ?? '')
    return NextResponse.json({ commentary: commentary || fallback })
  } catch (error) {
    console.error('Commentary generation error:', error)
    return NextResponse.json({ commentary: fallback })
  }
}
