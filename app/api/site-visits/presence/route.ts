import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Returns approximate count of visitors in the last 10 minutes.
 * Used for the "X people exploring right now" indicator on the homepage.
 */
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ count: 0 })
  }

  try {
    const supabase = await createClient()

    // Count visits in the last 10 minutes as a proxy for "active" visitors
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    const { count, error } = await supabase
      .from('site_visits')
      .select('*', { count: 'exact', head: true })
      .gte('visited_at', tenMinutesAgo)

    if (error) {
      console.error('Error fetching presence:', error)
      return NextResponse.json({ count: 0 })
    }

    return NextResponse.json({ count: count ?? 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
