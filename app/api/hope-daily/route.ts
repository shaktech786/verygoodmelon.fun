import { NextRequest, NextResponse } from 'next/server'
import { getWordOfDay } from '@/lib/games/hope-daily/words'
import { puzzleFor, revealFor } from '@/lib/games/hope-daily/daily'
import { lettersInPlace, nextLetter } from '@/lib/games/hope-daily/puzzle'

/** Today's puzzle: everything but the word. */
export async function GET() {
  return NextResponse.json(puzzleFor(getWordOfDay()))
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const entry = getWordOfDay()
  const guess: unknown = body?.guess

  if (typeof guess !== 'string') {
    return NextResponse.json({ error: 'Type a word first.' }, { status: 400 })
  }
  if (!/^[A-Za-z]*$/.test(guess)) {
    return NextResponse.json({ error: 'Letters only, please.' }, { status: 400 })
  }
  if (guess.length !== entry.word.length) {
    return NextResponse.json({ error: `Today’s word has ${entry.word.length} letters.` }, { status: 400 })
  }

  const inPlace = lettersInPlace(guess, entry.word)
  if (guess.toUpperCase() === entry.word) {
    return NextResponse.json({ isCorrect: true, inPlace, reveal: revealFor(entry) })
  }

  if (body?.wantLetter !== true) {
    return NextResponse.json({ isCorrect: false, inPlace })
  }

  const known: number[] = Array.isArray(body?.known) ? body.known.filter(Number.isInteger) : []
  const letter = nextLetter(entry.word, [...known, ...inPlace.map(([position]) => position)])
  return NextResponse.json({ isCorrect: false, inPlace, letter })
}

/** The word and its good news, for someone who would rather be told. */
export async function PUT() {
  return NextResponse.json(revealFor(getWordOfDay()))
}
