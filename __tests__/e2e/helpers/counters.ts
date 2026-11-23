/**
 * Site rule: nothing a player reads should work as a counter, score, countdown or clock.
 * Shared by the source scan (__tests__/lib/no-counters.test.ts) and the page scan
 * (__tests__/e2e/no-counters.e2e.test.ts) so both hold the same line.
 */
export const COUNTER_PATTERNS: RegExp[] = [
  /\b\d+ ?(?:of|\/) ?\d+\b/i,
  /\bseconds\b/i,
  /\bminutes\b/i,
  /\btimes\b/i,
  // Round 1, Round 3: numbering the turns of a conversation
  /\bround \d+/i,
  // 19 turns, 48,213 visits, 5 places, 27 damage: a tally of what was done
  /\b\d[\d,]* (?:turns?|visits?|places?|damage)\b/i,
  // 2 more: what is left to get through
  /\b\d+ more\b/i,
]

export function readsAsCounter(text: string): boolean {
  return COUNTER_PATTERNS.some((pattern) => pattern.test(text))
}
