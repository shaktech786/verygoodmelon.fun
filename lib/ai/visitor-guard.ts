/**
 * The server-side half of VISITOR_RULE. The prompt rule alone failed in real replies
 * ("...and use your time well.", "letting fear dictate your time"), so every reply
 * that speaks to a visitor is checked here before it is shown, and a reply that
 * crosses the line is swapped for the route's own written fallback.
 */

const TIME_LEFT = [
  /(?<!\btake )(?<!\bin )\byour time\b(?! (?:here|with me|today))/i,
  /\bthe time (?:you|we|that) (?:have|has|still|are|is) ?(?:left|remaining|given)?/i,
  /\b(?:time|days|years|moments|hours) (?:you have )?(?:left|remaining)\b/i,
  /\b(?:while|whilst) (?:you|there(?: i|')s|you've|you have) (?:still )?(?:time|can|got time|the chance|a chance)\b/i,
  /\bwhile you(?:'re| are) (?:still )?(?:here|alive|able|young)\b/i,
  /\byou (?:still )?have (?:time|plenty of time|days|years|a chance)\b/i,
  /\bstill have (?:time|days|years|so much|plenty)\b/i,
  /\b(?:before|until) it(?:'s| is) too late\b/i,
  /\bnot too late\b/i,
  /\b(?:life|time) is (?:short|precious|fleeting|running out)\b/i,
  /\b(?:running|run) out of time\b/i,
  /\b(?:precious|limited|little|borrowed|remaining) time\b/i,
  /\b(?:days|time) (?:are|is) numbered\b/i,
]

const VERDICT = [
  /\bwast(?:e|ed|ing)\b/i,
  /\blet(?:ting|s)? (?:fear|anxiety|worry|doubt|regret)s? (?:dictate|rule|run|decide|control|steal|hold)\b/i,
  /\b(?:you|we) (?:should|shouldn't|ought to) have\b/i,
  /\b(?:you|we) should(?:n't)?'ve\b/i,
  /\byou could have (?:done|been|tried|said|lived|spent|taken|chosen)\b/i,
  /\byou(?:'ve| have) been (?:hiding|holding back|playing it safe|avoiding|running from)\b/i,
]

const ADVICE_TO_DO_BETTER = [
  /\byou (?:really |truly )?(?:should|must|ought to|need to)\b/i,
  /\b(?:do|be) better\b/i,
  /\bmake the most of\b/i,
  /\b(?:live|living) (?:more )?(?:fully|to the fullest|life to the full)/i,
  /\bseize the day\b|\bcarpe diem\b/i,
  /\bdon'?t let (?:it|life|this|the days?) (?:pass|slip)\b/i,
]

const CROSSES_THE_LINE = [...TIME_LEFT, ...VERDICT, ...ADVICE_TO_DO_BETTER]

/** True when a reply talks about the visitor's time left, judges their life, or tells them to do better. */
export function overstepsVisitor(text: string): boolean {
  const plain = text.replace(/[’‘]/g, "'")
  return CROSSES_THE_LINE.some((pattern) => pattern.test(plain))
}
