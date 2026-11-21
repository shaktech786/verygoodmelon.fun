/** Each letter of a found word drops into its slot this long after the one before it. */
export const LETTER_DROP_GAP_MS = 60
export const LETTER_DROP_MS = 340

/** One soft, mid-high tone: heard, not announced. Quieter than any other cue on the site. */
export const SOLVED_CHIME_HZ = 659.25
export const SOLVED_CHIME_SECONDS = 1.6
export const SOLVED_CHIME_LOUDNESS = 0.045

export function letterDropDelayMs(position: number): number {
  return position * LETTER_DROP_GAP_MS
}

/** Seconds from the moment the word is found until the last letter has landed, when the chime rings. */
export function lettersLandAfterSeconds(wordLength: number, moving: boolean): number {
  if (!moving || wordLength === 0) return 0
  return (letterDropDelayMs(wordLength - 1) + LETTER_DROP_MS) / 1000
}
