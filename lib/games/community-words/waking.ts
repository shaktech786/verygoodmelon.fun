import type { Judgement } from './judgement'
import { soundsLikeDistress } from './moderation'

const EXCERPT_LENGTH = 60

// Read back at dawn, these would hand the player their heaviest words again
const HEAVY = /\b(?:tired|exhausted|weary|worn out|drained|can(?:no|')t (?:do|take|go on)|anymore|hurts?|pain|scared|afraid|terrified|alone|lonely|empty|numb|hopeless|sad|crying|cry|give up|done with)\b/i
const LONGING = /\b(?:love|loved|miss|missed|wish|hope|long(?:ed)? for|hug|hold|thank|sorry|forgive|mum|mom|dad|grand\w*|brother|sister|friend|child|daughter|son|wife|husband|partner|you)\b/i

function shorten(text: string): string {
  if (text.length <= EXCERPT_LENGTH) return text
  const cut = text.slice(0, EXCERPT_LENGTH)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.!?-]+$/, '')}…`
}

/**
 * The part of the player's words worth quoting back in a single line: the sentence about longing or love
 * when there is one, never one about tiredness or distress. Null when nothing is gentle enough to repeat.
 */
export function excerpt(words: string): string | null {
  const text = words.replace(/\s+/g, ' ').trim()
  const sentences = text.match(/[^.!?…]+[.!?…]*/g)?.map((s) => s.trim()).filter(Boolean) ?? []
  const gentle = sentences.filter((s) => !HEAVY.test(s) && !soundsLikeDistress(s))
  if (gentle.length === 0) return null
  const longing = gentle.filter((s) => LONGING.test(s))
  return shorten((longing.length > 0 ? longing : gentle).join(' '))
}

interface Waking {
  words: string
  intention: string
  judgement: Judgement
}

/**
 * The line at dawn that ties what the player said on the other side to what they came back with.
 * Unless the words were judged safe it never repeats them or calls anything "within reach".
 */
export function wakingLine({ words, intention, judgement }: Waking): string {
  if (judgement !== 'safe') return 'You came back. It is good to have you here, today.'
  const quoted = excerpt(words)
  // A quote that trails off without its own full stop still closes the sentence before the next one
  const said = quoted ? `Over there, you said “${quoted}${/[.!?…]$/.test(quoted) ? '' : '.'}”` : 'You came back.'
  return intention.trim()
    ? `${said} You woke up with this:`
    : `${said} Whatever you reached for there is within reach here, too.`
}
