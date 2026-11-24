export const NAME_MAX = 60
export const TOPIC_MAX = 120
export const ARGUMENT_MAX = 1200
export const MAX_HISTORY = 12

/** Markers the model is told to send instead of explaining why it will not voice a turn. */
export const STEP_ASIDE_VOICE = '[[STEP_ASIDE_VOICE]]'
export const STEP_ASIDE_TOPIC = '[[STEP_ASIDE_TOPIC]]'
export const STEP_ASIDE_CARE = '[[STEP_ASIDE_CARE]]'
const STEP_ASIDE_PREFIX = '[[STEP_ASIDE'

/** 'care' is not a refusal: the question sounds like someone in danger, and is met with support. */
export type DeclineReason = 'voice' | 'topic' | 'care'

export interface HistoryEntry {
  speaker: string
  argument: string
}

export function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function cleanHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return []
  return value
    .slice(-MAX_HISTORY)
    .filter((h): h is Record<string, unknown> => typeof h === 'object' && h !== null)
    .map(h => ({ speaker: clean(h.speaker, NAME_MAX), argument: clean(h.argument, ARGUMENT_MAX) }))
    .filter(h => h.speaker && h.argument)
}

const REFUSAL_PATTERNS = [
  /\bI (?:cannot|can(?:'|’)t|can not|am unable to|(?:'|’)m unable to|won(?:'|’)t|will not) (?:fulfill|comply|assist|generate|create|provide|write|produce|adopt|engage in|role-?play|continue with|help(?! but))/i,
  /\bas an AI\b/i,
  /\blanguage model\b/i,
  /\b(?:safety|content) (?:guidelines|policy|policies)\b/i,
  /\b(?:this|that|your) request\b/i,
]

/** True when the model answered as itself instead of as the debater. */
export function isRefusal(text: string): boolean {
  return text.includes(STEP_ASIDE_PREFIX) || REFUSAL_PATTERNS.some(p => p.test(text))
}

/** Which part the model would not voice, when it said so; a plain refusal names neither. */
export function declineReason(text: string): DeclineReason | null {
  if (text.includes(STEP_ASIDE_VOICE)) return 'voice'
  if (text.includes(STEP_ASIDE_TOPIC)) return 'topic'
  if (text.includes(STEP_ASIDE_CARE)) return 'care'
  return null
}

/** Markdown would show up as literal asterisks in a speech bubble. */
export function plainSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/(\*{1,3}|_{1,3})(\S(?:[\s\S]*?\S)?)\1/g, '$2')
    .replace(/[*`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cuts long text at the last full sentence that fits. */
export function clampToSentences(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '))
  if (end > max * 0.4) return cut.slice(0, end + 1)
  const space = cut.lastIndexOf(' ')
  return `${cut.slice(0, space > 0 ? space : max).replace(/[,;:\s]+$/, '')}…`
}

const SENTENCE_END = /[.!?…]+["'”’)\]]*(?=\s|$)/g
// A full stop after a title or an initial does not end the sentence ("I." still does)
const NOT_AN_END = /\b(?:Mr|Mrs|Ms|Dr|St|Prof|Mt|vs|etc|e\.g|i\.e|[A-HJ-Z])\.$/

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length

/**
 * Keeps whole sentences only, at most `maxSentences` and, after the first,
 * no more than `maxWords` in total. A trailing fragment cut off part way is dropped.
 */
export function limitSpeech(text: string, maxSentences: number, maxWords: number): string {
  const sentences: string[] = []
  let start = 0
  for (const match of text.matchAll(SENTENCE_END)) {
    const end = match.index + match[0].length
    if (NOT_AN_END.test(text.slice(start, end))) continue
    sentences.push(text.slice(start, end).trim())
    start = end
  }
  if (sentences.length === 0) return text.trim()

  const kept: string[] = []
  let words = 0
  for (const sentence of sentences) {
    if (kept.length === maxSentences) break
    if (kept.length > 0 && words + wordCount(sentence) > maxWords) break
    kept.push(sentence)
    words += wordCount(sentence)
  }
  return kept.join(' ')
}
