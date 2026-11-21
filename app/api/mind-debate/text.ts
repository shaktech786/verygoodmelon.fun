export const NAME_MAX = 60
export const TOPIC_MAX = 120
export const ARGUMENT_MAX = 1200
export const MAX_HISTORY = 12

/** Marker the model is told to send instead of explaining why it will not voice a debate. */
export const STEP_ASIDE = '[[STEP_ASIDE]]'

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
  return text.includes(STEP_ASIDE) || REFUSAL_PATTERNS.some(p => p.test(text))
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
