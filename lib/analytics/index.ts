/**
 * Anonymous usage analytics.
 *
 * Two sources, both cookieless and free of visitor identifiers:
 * - Vercel Web Analytics (page views, referrers, device type) — see <SiteAnalytics />
 * - First-party game events in Supabase (which game, how long) — see /api/game-events
 *
 * Anything added here must stay describable by /privacy. Never send free text,
 * emails, user IDs, or anything else that could identify a person.
 */

export type GameEvent =
  | { event: 'open'; gameId: string }
  | { event: 'close'; gameId: string; durationSeconds: number }

/**
 * Visitors who signal Do Not Track or Global Privacy Control are not measured at all.
 */
export function isTrackingAllowed(): boolean {
  if (typeof navigator === 'undefined') return false

  const { doNotTrack, globalPrivacyControl } = navigator as Navigator & {
    globalPrivacyControl?: boolean
  }
  return doNotTrack !== '1' && globalPrivacyControl !== true
}

export function recordGameEvent(event: GameEvent): void {
  if (!isTrackingAllowed()) return

  // keepalive lets the request finish while the page is being closed
  fetch('/api/game-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {
    // Analytics must never surface an error to someone who came here to relax
  })
}
