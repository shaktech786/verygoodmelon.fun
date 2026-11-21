import type { NextRequest } from 'next/server'

const MAX_TRACKED_CLIENTS = 5000

/**
 * Fixed-window limiter kept in this server instance's memory. Serverless
 * instances do not share it, so it slows a single client down rather than
 * guaranteeing a global ceiling.
 */
export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const windows = new Map<string, { count: number; resetAt: number }>()

  return function isLimited(client: string, now = Date.now()): boolean {
    if (windows.size > MAX_TRACKED_CLIENTS) {
      for (const [key, entry] of windows) if (now > entry.resetAt) windows.delete(key)
    }
    const entry = windows.get(client)
    if (!entry || now > entry.resetAt) {
      windows.set(client, { count: 1, resetAt: now + windowMs })
      return false
    }
    entry.count++
    return entry.count > max
  }
}

/** The visitor's address as the platform's proxy reports it (first hop of x-forwarded-for). */
export function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'unknown'
}
