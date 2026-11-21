import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/send-email'
import {
  confirmationEmailSubject,
  confirmationEmailHtml,
  adminNotificationSubject,
  adminNotificationHtml,
} from '@/lib/email/templates'

// Initialize Supabase client with runtime check
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return null
  }

  return createClient(url, key)
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5 // requests per window
const RATE_WINDOW = 60 * 1000 // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP (skip for requests without identifiable IP)
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
    if (ip && isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before trying again.' },
        { status: 429 }
      )
    }

    const requestData = await request.json()

    const {
      requesterName,
      requesterEmail,
      requestedName,
      requestedEra,
      requestedField,
      reasonForRequest,
      personalConnection
    } = requestData

    // Validate required fields
    if (!requesterEmail || !requestedName || !reasonForRequest) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validation rules
    const name = requestedName.toLowerCase()

    // Rule 1: Must be deceased (block common living people)
    const livingPeople = [
      'elon musk', 'jeff bezos', 'bill gates', 'mark zuckerberg',
      'taylor swift', 'beyonce', 'kanye west', 'joe biden',
      'donald trump', 'xi jinping', 'vladimir putin',
      'greta thunberg', 'lebron james', 'lionel messi'
    ]

    if (livingPeople.some(person => name.includes(person))) {
      return NextResponse.json(
        { error: 'Only deceased historical figures are allowed. This helps focus on minds we can no longer reach in real life.' },
        { status: 400 }
      )
    }

    // Rule 2: Block harmful/negative figures
    const blockedFigures = [
      'hitler', 'stalin', 'mao', 'pol pot', 'mussolini',
      'jeffrey dahmer', 'ted bundy', 'charles manson',
      'osama bin laden', 'idi amin'
    ]

    if (blockedFigures.some(person => name.includes(person))) {
      return NextResponse.json(
        { error: 'We only accept requests for positive historical figures who contributed to human growth and wellbeing.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Requests are not being kept just now' }, { status: 503 })
    }

    // Insert request into database (free — no payment required)
    const { data, error } = await supabase
      .from('thinker_requests')
      .insert({
        requester_name: requesterName || null,
        requester_email: requesterEmail,
        requested_name: requestedName,
        requested_era: requestedEra || null,
        requested_field: requestedField || null,
        reason_for_request: reasonForRequest,
        personal_connection: personalConnection || null,
        payment_amount: 0,
        payment_intent_id: null,
        payment_status: 'free',
        charity_name: null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to create request' },
        { status: 500 }
      )
    }

    // Fire-and-forget: send confirmation + admin notification emails
    // Errors are logged internally — never block the response
    sendEmail({
      to: requesterEmail,
      subject: confirmationEmailSubject(),
      html: confirmationEmailHtml({
        requesterName: requesterName || undefined,
        requestedName,
      }),
    }).catch(() => {}) // swallow unhandled rejection

    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      sendEmail({
        to: adminEmail,
        subject: adminNotificationSubject(requestedName),
        html: adminNotificationHtml({
          requesterName: requesterName || undefined,
          requesterEmail,
          requestedName,
          requestedEra: requestedEra || undefined,
          requestedField: requestedField || undefined,
          reasonForRequest,
          personalConnection: personalConnection || undefined,
          requestId: data.id,
        }),
      }).catch(() => {}) // swallow unhandled rejection
    }

    return NextResponse.json({
      success: true,
      requestId: data.id
    })

  } catch (error) {
    console.error('Request thinker error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/** The page offers requests only while they can actually be kept. */
export async function GET() {
  const supabase = getSupabaseClient()
  if (!supabase) return NextResponse.json({ available: false })
  try {
    const { error } = await supabase.from('thinker_requests').select('id').limit(1)
    return NextResponse.json({ available: !error })
  } catch {
    return NextResponse.json({ available: false })
  }
}
