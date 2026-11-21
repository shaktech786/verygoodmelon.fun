import { NextRequest, NextResponse } from 'next/server'
import { getWordOfDay } from '@/lib/games/hope-daily/words'
import { nextLetter } from '@/lib/games/hope-daily/puzzle'

/** The first letter of today's word that the player does not know yet. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const { word } = getWordOfDay()
  const known: unknown = body?.known

  const valid =
    Array.isArray(known) &&
    known.every(position => Number.isInteger(position) && position >= 0 && position < word.length)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const letter = nextLetter(word, known)
  if (!letter) {
    return NextResponse.json({ error: 'Every letter is already known' }, { status: 400 })
  }
  return NextResponse.json(letter)
}
