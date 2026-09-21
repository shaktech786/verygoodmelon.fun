import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ALL_GAMES } from '@/lib/games/config'

const MAX_DURATION_SECONDS = 86_400

const gameIds = ALL_GAMES.map((game) => game.id)

const eventSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('open'),
    gameId: z.enum(gameIds),
  }),
  z.object({
    event: z.literal('close'),
    gameId: z.enum(gameIds),
    durationSeconds: z.number().int().min(0).max(MAX_DURATION_SECONDS),
  }),
])

/**
 * Records an anonymous usage event. Nothing about the visitor is read or
 * stored: no cookies, headers, IP, or identifiers — only which game and,
 * on close, how long it was open.
 */
export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return new NextResponse(null, { status: 204 })
  }

  const parsed = eventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.from('game_events').insert({
    game_id: parsed.data.gameId,
    event: parsed.data.event,
    duration_seconds: parsed.data.event === 'close' ? parsed.data.durationSeconds : null,
  })

  if (error) {
    console.error('Error recording game event:', error)
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
