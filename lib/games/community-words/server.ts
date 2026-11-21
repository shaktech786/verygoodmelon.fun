import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { countWords } from '@/lib/games/wordFrequency'
import { MAX_SUBMISSION_LENGTH, moderateSubmission, soundsLikeDistress } from './moderation'
import { clientAddress, createRateLimiter } from './rateLimit'

export type CommunityWordsTable = 'last_words' | 'first_words'

const CLOUD_SOURCE_ROWS = 1000
const SUBMISSIONS_PER_CLIENT = { max: 6, windowMs: 10 * 60_000 }
const NO_STORE = { 'Cache-Control': 'no-store' }

const submissionSchema = z.object({
  words: z.string().refine((words) => {
    const length = words.trim().length
    return length > 0 && length <= MAX_SUBMISSION_LENGTH
  }),
})

function supabase(key: string | undefined) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

const notStored = (status: number) => NextResponse.json({ stored: false }, { status, headers: NO_STORE })

/**
 * Route handlers for a game whose words feed a word cloud everyone sees.
 * The browser never writes to the table: submissions are filtered here and
 * stored with the server's own credentials.
 */
export function createCommunityWordsHandlers(table: CommunityWordsTable) {
  const isLimited = createRateLimiter(SUBMISSIONS_PER_CLIENT)

  async function POST(request: NextRequest) {
    const parsed = submissionSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid submission' }, { status: 400, headers: NO_STORE })
    }
    if (isLimited(clientAddress(request))) return notStored(429)

    const verdict = moderateSubmission(parsed.data.words)
    // Declined quietly: the player still gets their moment, just not a place in the cloud.
    // Words from someone who may be in danger stay theirs, never something for strangers to read.
    if (!verdict.ok || soundsLikeDistress(verdict.words)) return notStored(200)

    const writer = supabase(process.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!writer) return notStored(503)

    const { error } = await writer.from(table).insert({ words: verdict.words }).retry(false)
    if (error) {
      console.error(`Could not store ${table} submission:`, error.message)
      return notStored(503)
    }
    return NextResponse.json({ stored: true }, { status: 201, headers: NO_STORE })
  }

  async function GET() {
    const reader = supabase(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    if (!reader) return NextResponse.json({ error: 'Unavailable' }, { status: 503, headers: NO_STORE })

    const { data, error } = await reader
      .from(table)
      .select('words')
      .order('created_at', { ascending: false })
      .limit(CLOUD_SOURCE_ROWS)
      .retry(false)
    if (error || !data) {
      if (error) console.error(`Could not read ${table}:`, error.message)
      return NextResponse.json({ error: 'Unavailable' }, { status: 503, headers: NO_STORE })
    }

    // Rows written before submissions were filtered are held to the same standard
    const accepted = data.flatMap((row: { words: unknown }) => {
      if (typeof row.words !== 'string') return []
      const verdict = moderateSubmission(row.words)
      return verdict.ok && !soundsLikeDistress(verdict.words) ? [verdict.words] : []
    })

    return NextResponse.json({ words: countWords(accepted), total: accepted.length }, { headers: NO_STORE })
  }

  return { GET, POST }
}
