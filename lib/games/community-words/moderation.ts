import { ABUSIVE_PHRASES, ABUSIVE_WORDS, CLOUD_HIDDEN_WORDS } from './wordLists'

export const MAX_SUBMISSION_LENGTH = 500

export type ModerationResult =
  | { ok: true; words: string }
  | { ok: false; reason: 'empty' | 'too-long' | 'contact' | 'abusive' }

const LOOKALIKES: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '9': 'g',
  '@': 'a', '$': 's', '!': 'i', '|': 'i', '+': 't', '€': 'e',
}

/** Endings that turn a listed word into the same word ("slurs", "raped"). */
const SUFFIXES = new Set(['s', 'es', 'ed', 'd', 'ing', 'er', 'ers', 'z'])

const MIN_JOINED_LETTERS = 3

const CONTACT_PATTERNS = [
  /https?:\/\//,
  /\bwww\./,
  /[^\s@]+@[^\s@]+\.[a-z]{2,}/,
  /(?:^|[\s(])@[\w.]{2,}/,
  /\b[a-z0-9-]+\.(?:com|net|org|io|gg|xyz|ru|info|biz|app|link|shop|online|co\.uk)\b/,
  /(?:\d[\s().-]*){9,}/,
]

const DISTRESS_PATTERNS = [
  /\b(?:kill|hurt|harm|cut) myself\b/,
  /\bend(?:ing)? (?:my (?:own )?life|it all)\b/,
  /\btake my (?:own )?life\b/,
  /\bsuicid/,
  /\bbetter off without me\b/,
  // "I want to die surrounded by family" is a wish about dying well, not a crisis
  /\b(?:want|wanna|going|ready|deserve) to die\b(?!\s+(?:surrounded|peacefully|in|at|old|happy|with|knowing|having|like|when|after|before|doing|on|by|of|someday|one day))/,
  /\b(?:don'?t|do not) want to (?:live|be alive|be here|exist|wake up)\b/,
  /\bno (?:reason|point) (?:to|in) (?:live|living|go on|going on|being here)\b/,
  /\bself[- ]?harm/,
  /\boverdos/,
  // People in crisis often say it sideways; a gentle false alarm costs far less than a miss
  /\b(?:don'?t|do not|never) want to (?:go|come) back\b/,
  /\bover for good\b/,
  /\b(?:want|wish|need) (?:it|this|everything)(?: all)? to (?:be )?(?:over|end|stop)\b/,
  /\bnobody (?:would|will|'?d)(?: even)? (?:notice|care|miss me)\b/,
  /\bif i (?:was|were) gone\b/,
  /\bcan(?:'?t|not) (?:keep doing this|go on|do this anymore|take (?:it|this) anymore)\b/,
  /\b(?:never|not) (?:been |have been )?born\b/,
  /\bno way out\b/,
  /\btired of (?:living|life|being alive|everything|it all)\b/,
  /\bbetter off (?:if i (?:disappeared|was gone|were gone|wasn'?t here)|dead)\b/,
  /\bnever wake up\b/,
  /\bdisappear (?:forever|for good)\b/,
]

function fold(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[‘’`]/g, '\'')
}

/** "f a g" and "f.a.g" are one word spelled out; joins runs of single letters. */
function withSpelledOutWords(tokens: string[]): string[] {
  const joined: string[] = []
  let run: string[] = []
  for (const token of [...tokens, '']) {
    if (token.length === 1) {
      run.push(token)
      continue
    }
    if (run.length >= MIN_JOINED_LETTERS) joined.push(run.join(''))
    run = []
  }
  return [...tokens, ...joined]
}

/**
 * The words in a text, read two ways: with look-alike digits and symbols turned
 * back into letters ("sh1t"), and with them dropped ("love you!"). A word is
 * flagged if either reading matches.
 */
function readings(text: string): string[][] {
  const pieces = fold(text).split(/\s+/).filter(Boolean)
  const lettersOnly = (piece: string) =>
    piece.replace(/'/g, '').replace(/[^\p{L}]+/gu, ' ').trim().split(' ').filter(Boolean)

  const mapped = pieces.flatMap((piece) =>
    /\p{L}/u.test(piece) ? lettersOnly(piece.replace(/[0-9@$!|+€]/g, (c) => LOOKALIKES[c])) : []
  )
  const stripped = pieces.flatMap(lettersOnly)
  return [withSpelledOutWords(mapped), withSpelledOutWords(stripped)]
}

const collapse = (word: string) => word.replace(/(.)\1+/g, '$1')

function hasListedEnding(word: string, base: string): boolean {
  if (!word.startsWith(base)) return false
  const ending = word.slice(base.length)
  return base.length >= 4 ? SUFFIXES.has(ending) : ending === 's'
}

/** Matches "slurs", and stretched spellings like "sluuuurs", but never "sniggered" for a shorter slur. */
function matchesListed(token: string, listed: string): boolean {
  if (token === listed || hasListedEnding(token, listed)) return true
  if (token.length < listed.length) return false
  const stretched = collapse(token)
  const base = collapse(listed)
  return stretched === base || hasListedEnding(stretched, base)
}

const matchesAny = (token: string, list: readonly string[]) => list.some((listed) => matchesListed(token, listed))

function isAbusive(text: string): boolean {
  return readings(text).some((tokens) => {
    if (tokens.some((token) => matchesAny(token, ABUSIVE_WORDS))) return true
    const sentence = ` ${tokens.join(' ')} `
    return ABUSIVE_PHRASES.some((phrase) => sentence.includes(` ${phrase} `))
  })
}

/**
 * Decides whether a submission may join the shared word cloud. Everyday
 * swearing is allowed here and kept out of the cloud by isCloudSafeWord.
 */
export function moderateSubmission(text: string): ModerationResult {
  const words = text.trim()
  if (!words) return { ok: false, reason: 'empty' }
  if (words.length > MAX_SUBMISSION_LENGTH) return { ok: false, reason: 'too-long' }
  const folded = fold(words)
  if (CONTACT_PATTERNS.some((pattern) => pattern.test(folded))) return { ok: false, reason: 'contact' }
  if (isAbusive(words)) return { ok: false, reason: 'abusive' }
  return { ok: true, words }
}

/** Whether a single word may be drawn in the shared cloud. */
export function isCloudSafeWord(word: string): boolean {
  return !readings(word).some((tokens) =>
    tokens.some((token) => matchesAny(token, ABUSIVE_WORDS) || matchesAny(token, CLOUD_HIDDEN_WORDS))
  )
}

/** Whether the words sound like someone may be in danger rather than imagining an ending. */
export function soundsLikeDistress(text: string): boolean {
  const folded = fold(text).replace(/\s+/g, ' ')
  return DISTRESS_PATTERNS.some((pattern) => pattern.test(folded))
}
