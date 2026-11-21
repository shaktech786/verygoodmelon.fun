import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TablesInsert } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const { dilemmaId, choice } = await request.json()

    if (!dilemmaId || !choice) {
      return NextResponse.json(
        { error: 'Missing dilemmaId or choice' },
        { status: 400 }
      )
    }

    if (!['A', 'B'].includes(choice)) {
      return NextResponse.json(
        { error: 'Invalid choice. Must be A or B' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Insert the vote
    const voteData: TablesInsert<'hard_choices_votes'> = {
      dilemma_id: dilemmaId,
      choice: choice as 'A' | 'B'
    }

    const { error: insertError } = await supabase
      .from('hard_choices_votes')
      .insert(voteData)

    if (insertError) {
      console.error('Error inserting vote:', insertError)
      return NextResponse.json(
        { error: 'Failed to record vote' },
        { status: 500 }
      )
    }

    // Get updated vote counts
    const { count: countA, error: errorA } = await supabase
      .from('hard_choices_votes')
      .select('*', { count: 'exact', head: true })
      .eq('dilemma_id', dilemmaId)
      .eq('choice', 'A')

    const { count: countB, error: errorB } = await supabase
      .from('hard_choices_votes')
      .select('*', { count: 'exact', head: true })
      .eq('dilemma_id', dilemmaId)
      .eq('choice', 'B')

    if (errorA || errorB) {
      console.error('Error fetching vote counts:', errorA || errorB)
      return NextResponse.json(
        { error: 'Failed to fetch vote counts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      results: {
        choiceA: countA || 0,
        choiceB: countB || 0
      }
    })
  } catch (error) {
    console.error('Error in vote API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
