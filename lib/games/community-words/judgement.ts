/** What the reply said about the words. Only an explicit "safe" ever counts as safe. */
export type Verdict = 'safe' | 'care' | 'unjudged'

/**
 * Where a writing game stands with the player's words. Every celebration, keepsake,
 * quote-back, share to the cloud and "write again" waits for "safe"; "awaiting" is a
 * calm hold, "unjudged" a gentle way out with support, and "care" the care path.
 */
export type Judgement = 'unwritten' | 'awaiting' | Verdict

export interface ReflectReply {
  reflection?: string
  intention?: string
  safe?: boolean
  care?: boolean
  unjudged?: boolean
}

/** A missing, failed or unclear reply is never read as safe. */
export function verdictOf(reply: ReflectReply | null): Verdict {
  if (reply?.care === true) return 'care'
  if (reply?.safe === true && reply.unjudged !== true) return 'safe'
  return 'unjudged'
}

export function judgementOf({ submitted, care, verdict }: { submitted: boolean; care: boolean; verdict: Verdict | null }): Judgement {
  if (!submitted) return 'unwritten'
  if (care) return 'care'
  return verdict ?? 'awaiting'
}

/** Words not yet judged safe, so nothing heavy is suggested and nothing is celebrated or shared. */
export const isUnsettled = (judgement: Judgement) => judgement === 'awaiting' || judgement === 'unjudged'
