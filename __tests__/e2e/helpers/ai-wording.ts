/** The words that must not reach a player: the site keeps its AI invisible (PLAN.md 12.1). */
export const AI_WORDING = /\bAI\b|artificial intelligence|model|generat/i

/** Ordinary English that happens to contain a flagged stem. Each is removed from a line before the line is tested. */
const ALLOWED_PHRASES: RegExp[] = [
  // A person to look up to
  /\brole models?\b/gi,
  // People who came before or come after: "for generations", "Stolen Generations", "future generations"
  /\bgenerations?\b/gi,
  // A thing that gives energy back, not a system that writes
  /\bregenerat\w*/gi,
  // Power stations and panels make electricity; the Optimist's facts say so
  /\bgenerat(?:e|es|ed|ing) (?:electricity|power|energy|heat)\b/gi,
]

/** What is left of a line that still reads as AI, model or generating, once the ordinary phrases are taken out. */
export function aiWordingIn(line: string): string | null {
  const rest = ALLOWED_PHRASES.reduce((text, phrase) => text.replace(phrase, ' '), line)
  return AI_WORDING.test(rest) ? line : null
}
