const COUNTED_KEY = 'hasVisited'

let visit: Promise<number | null> | null = null

/**
 * The visit total for this page load. The footer and the homepage both want it; sharing one
 * request keeps it to a single call per load, and a visit is counted once per tab.
 */
export function siteVisitCount(): Promise<number | null> {
  visit ??= countVisit()
  return visit
}

async function countVisit(): Promise<number | null> {
  try {
    const counted = sessionStorage.getItem(COUNTED_KEY) === 'true'
    const response = await fetch('/api/site-visits', counted ? undefined : { method: 'POST' })
    // 204 means the counter is resting; the page simply goes without it
    if (response.status !== 200) return null
    const data: unknown = await response.json()
    if (!counted) sessionStorage.setItem(COUNTED_KEY, 'true')
    const count = (data as { count?: unknown }).count
    return typeof count === 'number' ? count : null
  } catch {
    return null
  }
}
