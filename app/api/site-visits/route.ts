import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { noteDatabaseUnavailable } from '@/lib/supabase/unavailable'
import type { TablesInsert } from '@/types/database'

function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/** No count to show: the footer simply leaves the counter out. A 2xx keeps the visitor's console clean. */
function noCount(cause: unknown) {
  noteDatabaseUnavailable('Site visits', cause)
  return new NextResponse(null, { status: 204 })
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ count: 0 })
  }

  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from('site_visits')
      .select('*', { count: 'exact', head: true })
    if (error) return noCount(error)
    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    return noCount(error)
  }
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ count: 0 })
  }

  try {
    const supabase = await createClient()
    const visitData: TablesInsert<'site_visits'> = {}
    const { error } = await supabase.from('site_visits').insert(visitData)
    if (error) return noCount(error)

    const { count } = await supabase
      .from('site_visits')
      .select('*', { count: 'exact', head: true })
    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    return noCount(error)
  }
}
