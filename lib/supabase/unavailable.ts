let noted = false

/**
 * Counters and usage events are optional. When the database is down they are skipped quietly,
 * with one note per server process rather than an error on every page.
 */
export function noteDatabaseUnavailable(where: string, cause: unknown): void {
  if (noted) return
  noted = true
  console.warn(`${where}: database unavailable, skipping until it returns.`, cause)
}
