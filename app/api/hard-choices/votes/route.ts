import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dilemmaId = searchParams.get('dilemmaId')

    if (!dilemmaId) {
      return NextResponse.json(
        { error: 'Missing dilemmaId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // The game shows its perspectives without these counts, so an unreachable
    // database should fail fast rather than sit through the client's retries.
    const countChoice = (choice: 'A' | 'B') =>
      supabase
        .from('hard_choices_votes')
        .select('*', { count: 'exact', head: true })
        .eq('dilemma_id', dilemmaId)
        .eq('choice', choice)
        .retry(false)

    const [{ count: countA, error: errorA }, { count: countB, error: errorB }] =
      await Promise.all([countChoice('A'), countChoice('B')])

    if (errorA || errorB) {
      console.error('Error fetching vote counts:', errorA || errorB)
      return NextResponse.json(
        { error: 'Failed to fetch vote counts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      choiceA: countA || 0,
      choiceB: countB || 0
    })
  } catch (error) {
    console.error('Error in votes API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
