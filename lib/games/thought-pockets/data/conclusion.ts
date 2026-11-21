import { School } from '@/types/thought-pockets'

/** How many times the Conclusion counts, and the Empiricist's exception. Every text about it is built from these. */
export const CONCLUSION_TIMES = 2
export const EMPIRICIST_EVIDENCE_TIMES = 3
export const FOOTNOTES_TIMES = 3

const WORDS: Record<number, string> = { 1: 'once', 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times' }

export function timesWord(n: number): string {
  return WORDS[n] ?? `${n} times`
}

/** What the Conclusion does, for this school, or for every school when none is chosen yet. */
export function conclusionLine(school: School | null): string {
  const usual = `its Weight or Multiplier counts ${timesWord(CONCLUSION_TIMES)}`
  const empiricist = `an Evidence Conclusion counts ${timesWord(EMPIRICIST_EVIDENCE_TIMES)}`
  if (school === 'empiricist') return `As an Empiricist, ${empiricist}; any other Conclusion: ${usual}.`
  if (school === null) return `Usually ${usual} (for an Empiricist, ${empiricist}).`
  return `${usual.charAt(0).toUpperCase()}${usual.slice(1)}.`
}
