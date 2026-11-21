import { NextRequest, NextResponse } from 'next/server'
import { GEMINI_MODEL, MINIMAL_THINKING, getGemini } from '@/lib/ai/gemini'
import { MAX_GUESS_LENGTH, fallbackCommentary, tidyCommentary } from '@/lib/games/hope-daily/commentary'

const SYSTEM_INSTRUCTION = `You write one short line for a calm daily puzzle. The player reads a true piece of hopeful news with one word missing, and has just guessed a word that is not the missing one.
Answer the guessed word itself with a small warm association, a gentle image, or light wordplay.

Rules:
- One sentence, at most 14 words. Plain text, no hashtags, no emoji.
- Warm, curious, quietly witty. Never sarcastic, never pushy, never "great job" filler.
- You do not know the answer. Never hint at it and never say "close", "almost" or "wrong".
- State no facts: no numbers, dates, names, places, statistics or claims about the world.
- If the guess is not a real word (random letters), smile at it kindly in a few words.
- Never mention puzzles being hard, scores, speed or tries.
- Never mention being a program, a model or AI.`

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const rawGuess: unknown = body?.guess

  if (typeof rawGuess !== 'string' || !/^[A-Za-z]+$/.test(rawGuess) || rawGuess.length > MAX_GUESS_LENGTH) {
    return NextResponse.json({ error: 'Invalid guess' }, { status: 400 })
  }

  const guess = rawGuess.toUpperCase()
  const guessNumber = Number.isInteger(body?.guessNumber) && body.guessNumber > 0 ? body.guessNumber : undefined
  const fallback = fallbackCommentary(guess, guessNumber)

  try {
    const result = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: `The player guessed "${guess}".`,
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
