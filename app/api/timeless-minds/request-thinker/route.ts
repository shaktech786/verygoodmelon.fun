import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with runtime check
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return null
  }

  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    if (!supabase) {
      console.warn('Supabase not configured - request will be logged but not stored')
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

    // TODO: Integrate Stripe payment
    // For now, we'll just create the request without payment
    const paymentIntentId = 'test_' + Date.now()
    const paymentStatus = 'completed' // TODO: Update after Stripe integration

    // If Supabase is not configured, just return success
    if (!supabase) {
      return NextResponse.json({
        success: true,
        requestId: 'mock_' + Date.now(),
        message: 'Request received! (Development mode)'
      })
    }

    // Insert request into database
    const { data, error } = await supabase
      .from('thinker_requests')
      .insert({
        requester_name: requesterName,
        requester_email: requesterEmail,
        requested_name: requestedName,
        requested_era: requestedEra || null,
        requested_field: requestedField || null,
        reason_for_request: reasonForRequest,
        personal_connection: personalConnection || null,
        payment_amount: 500, // $5.00 in cents
        payment_intent_id: paymentIntentId,
        payment_status: paymentStatus,
        charity_name: 'Direct Relief',
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

    // Grant phone book access
    if (paymentStatus === 'completed') {
      await supabase
        .from('thinker_phone_book_access')
        .insert({
          user_email: requesterEmail,
          user_name: requesterName,
          access_type: 'custom_request',
          request_id: data.id,
          payment_intent_id: paymentIntentId,
          payment_amount: 500,
          is_active: true
        })
    }

    // TODO: Send confirmation email
    // TODO: Send notification to admin for review

    return NextResponse.json({
      success: true,
      requestId: data.id,
      message: 'Request submitted successfully! You now have access to the Phone Book.'
    })

  } catch (error) {
    console.error('Request thinker error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Check if user has phone book access
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    if (!supabase) {
      return NextResponse.json({
        hasAccess: false,
        accessDetails: null
      })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('thinker_phone_book_access')
      .select('*')
      .eq('user_email', email)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to check access' },
        { status: 500 }
      )
    }

    const hasAccess = data !== null

    return NextResponse.json({
      hasAccess,
      accessDetails: data || null
    })

  } catch (error) {
    console.error('Check access error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
