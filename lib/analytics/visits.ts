const COUNTED_KEY = 'hasVisited'

let recorded = false

/**
 * Adds this tab's visit to the anonymous total, once per tab. The total is never shown on the
 * page; it appears only in the public numbers on /privacy.
 */
export function recordVisit(): void {
  if (recorded) return
  recorded = true
  void sendVisit()
}

async function sendVisit(): Promise<void> {
  try {
    if (sessionStorage.getItem(COUNTED_KEY) === 'true') return
    const response = await fetch('/api/site-visits', { method: 'POST' })
    // 204 means the database is resting and nothing was recorded, so the next page load tries again
    if (response.status === 200) sessionStorage.setItem(COUNTED_KEY, 'true')
  } catch {
    // A visit that cannot be recorded is simply not counted
  }
}
