import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Rate Limiting Configuration
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30
const CLEANUP_INTERVAL_MS = 60_000 // purge stale entries every 60 s

// ---------------------------------------------------------------------------
// In-memory store  (per-instance; resets on cold start / redeploy)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  /** Number of requests recorded in the current window. */
  count: number
  /** Timestamp (ms) when the current window started. */
  windowStart: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

let lastCleanup = Date.now()

/**
 * Remove entries whose window has expired so the Map does not grow unbounded.
 */
function cleanupStaleEntries(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  rateLimitMap.forEach((entry, ip) => {
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip)
    }
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the client IP from the request.  Checks common proxy headers first,
 * then falls back to a generic identifier.
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest): NextResponse {
  // Periodic cleanup (non-blocking, runs inline)
  cleanupStaleEntries()

  const ip = getClientIp(request)
  const now = Date.now()

  const entry = rateLimitMap.get(ip)

  // First request or window expired -> start a fresh window
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return NextResponse.next()
  }

  // Within the current window
  entry.count += 1

  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000
    )

    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests. Please try again later.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSeconds),
        },
      }
    )
  }

  return NextResponse.next()
}

// ---------------------------------------------------------------------------
// Matcher  -  only run on API routes
// ---------------------------------------------------------------------------

export const config = {
  matcher: '/api/:path*',
}
