import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfWeekISO = startOfWeek.toISOString()

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [totalResult, todayResult, weekResult, monthResult] = await Promise.all([
      supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true })
        .gte('visited_at', startOfToday),
      supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true })
        .gte('visited_at', startOfWeekISO),
      supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true })
        .gte('visited_at', startOfMonth),
    ])

    if (totalResult.error || todayResult.error || weekResult.error || monthResult.error) {
      console.error('Analytics query error:', {
        total: totalResult.error,
        today: todayResult.error,
        week: weekResult.error,
        month: monthResult.error,
      })
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      total: totalResult.count ?? 0,
      today: todayResult.count ?? 0,
      thisWeek: weekResult.count ?? 0,
      thisMonth: monthResult.count ?? 0,
    })
  } catch (error) {
    console.error('Error in analytics API:', error)

    // If Supabase is not configured, return zeros gracefully
    if (
      error instanceof Error &&
      (error.message.includes('NEXT_PUBLIC_SUPABASE_URL') ||
        error.message.includes('supabase'))
    ) {
      return NextResponse.json({
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
