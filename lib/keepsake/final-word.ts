import { KEEPSAKE_WIDTH, framedKeepsake, keepsakeDay, keepsakeFileName, type KeepsakeOp, type KeepsakePlan } from './plan'

export const FALLBACK_ADDRESSEE = 'whoever needs it'

// Only the questions that already say who the words are for
const ADDRESSEE_BY_PROMPT: Record<string, string> = {
  'What do you want the people you love to know?': 'the people I love',
  'What would you tell your younger self?': 'my younger self',
  'What would you want no one to worry about?': 'everyone who stays',
}

const NAMED_OPENING = /^\s*dear\s+([^,.!?;:\n]{1,32})\s*[,.!:]\s*/i
const KIN =
  'mum|mom|mummy|mommy|mama|dad|daddy|papa|mother|father|nan|nana|gran|granny|grandma|grandmother|grandad|granddad|grandpa|grandfather|sister|brother|son|daughter|kids|children|darling|sweetheart|friends?|everyone|everybody|world'
// "Love" on its own is more often a sign-off ("Love, always") than a name, so only "my love" counts
const KIN_OPENING = new RegExp(String.raw`^\s*((?:my\s+)?(?:${KIN})|my\s+love)\s*[,!:]\s*`, 'i')
// "To my brother: …", "To Sam, …": a greeting written as the card's own opening
const TO_OPENING = /^\s*to\s+([^,.!?;:\n]{1,40}?)\s*[,:]\s*/i
// The ways a written "To …" names who it is for, rather than starting a phrase like "To be honest,"
const PEOPLE_LEADS = new RegExp(String.raw`^(?:my|our|all|everyone|everybody|anyone|whoever|you|${KIN})$`, 'i')
const THE_PEOPLE = /^(?:people|person|one|ones|kids|children|family|friends?|world|reader|readers|future|future me|stranger|strangers|grandchildren)\b/i
// Capitalised words that still open a phrase, not a name: "To Be honest,", "To This day,"
const NOT_NAMES = /^(?:be|me|this|that|start|begin|end|sum|put|tell|say|think|cut|make|conclude|each|some|many|most|a|an|i|whom)$/i

/** Whether the words after "To" name someone: "my brother", "Sam", "the people I love", but not "be honest" or "the end". */
function namesSomeone(name: string): boolean {
  const [first, ...rest] = name.split(/\s+/)
  if (PEOPLE_LEADS.test(first)) return true
  if (/^the$/i.test(first)) return THE_PEOPLE.test(rest.join(' '))
  return /^\p{Lu}/u.test(first) && !NOT_NAMES.test(first)
}

/** Who a "To …" greeting names, if it names anyone and words follow it. */
function toOpening(text: string): RegExpMatchArray | null {
  const match = text.match(TO_OPENING)
  return match && namesSomeone(match[1].trim()) ? match : null
}

// Words that carry on a list rather than start a sentence: "My kids, and the sea at dawn."
const CARRIES_ON = /^(?:and|or|but|nor|plus|with|the|a|an|too|also|always|forever|then|&)(?=\s|$)/i

/** Whether what follows a kin word reads as a sentence said to them, not more of a list. */
function isSentence(rest: string): boolean {
  return rest.split(/\s+/).length >= 2 && !CARRIES_ON.test(rest)
}

export interface Letter {
  /** Who the words are for, as the card's opening: "To the people I love,". */
  to: string
  /** The words themselves, without a greeting the card already gives. */
  body: string
}

/**
 * Who the words are written to: a greeting the player wrote themselves ("Mum, you were…", "Dear Sam,", "To my brother:"),
 * else the person the question asked about, else anyone who might need them.
 */
export function letterOf({ words, prompt }: { words: string; prompt: string }): Letter {
  const text = words.trim()
  const named = text.match(NAMED_OPENING) ?? toOpening(text)
  const opening = named ?? text.match(KIN_OPENING)
  const rest = opening ? text.slice(opening[0].length).trim() : ''
  if (opening && rest && (named || isSentence(rest))) {
    const name = opening[1].trim().replace(/\s+/g, ' ')
    const addressee = /^(?:my|our|the|all|everyone|everybody|anyone|whoever|you)\b/i.test(name) ? name : `${name.charAt(0).toUpperCase()}${name.slice(1)}`
    return { to: `To ${addressee},`, body: `${rest.charAt(0).toUpperCase()}${rest.slice(1)}` }
  }
  return { to: `To ${ADDRESSEE_BY_PROMPT[prompt] ?? FALLBACK_ADDRESSEE},`, body: text }
}

const SHEET = { left: 120, right: KEEPSAKE_WIDTH - 120, top: 222, bottom: 1172 }
// The greeting sits above the words; the lower corner is kept for the candle
const WRITING = { left: 196, width: 688, top: 300, bottom: 1030 }
const GREETING_HEIGHT = 110
// An average Georgia letter, space included, is a little under half its size wide
const GLYPH_WIDTH = 0.47
const WAX = '#efd9c3'
const WAX_SHADE = '#dcbfa4'

/** Smaller writing for longer words, so even the longest fit the sheet. */
export function bodySize(body: string): number {
  if (body.length <= 90) return 56
  if (body.length <= 200) return 46
  if (body.length <= 340) return 39
  return 33
}

/** A small candle, just put out, with one thread of smoke. */
function candleMark(x: number, base: number): KeepsakeOp[] {
  return [
    { kind: 'ellipse', x, y: base, rx: 44, ry: 10, angle: 0, ink: 'line' },
    { kind: 'rect', x: x - 18, y: base - 72, w: 36, h: 72, ink: WAX },
    { kind: 'rect', x: x + 6, y: base - 72, w: 12, h: 72, ink: WAX_SHADE },
    { kind: 'line', points: [[x, base - 72], [x, base - 88]], ink: 'ink', width: 4 },
    {
      kind: 'line',
      points: [[x, base - 94], [x + 10, base - 116], [x - 6, base - 138], [x + 12, base - 162], [x - 2, base - 186]],
      ink: 'inkSoft',
      width: 5,
      alpha: 0.55,
    },
  ]
}

export interface FinalWordKeepsakeInput {
  words: string
  /** The question that was showing when the words were left. */
  prompt: string
  day: Date
}

/** Roughly how many lines the words will wrap to, so the writing can sit in the middle of the sheet. */
export function estimatedLines(body: string, size: number, width: number): number {
  const perLine = Math.max(1, Math.floor(width / (size * GLYPH_WIDTH)))
  return body.split('\n').reduce((lines, paragraph) => lines + Math.max(1, Math.ceil(paragraph.length / perLine)), 0)
}

export function finalWordKeepsake({ words, prompt, day }: FinalWordKeepsakeInput): KeepsakePlan {
  const { to, body } = letterOf({ words, prompt })
  const size = bodySize(body)
  const lineHeight = Math.round(size * 1.42)
  const maxLines = Math.floor((WRITING.bottom - WRITING.top - size) / lineHeight) + 1
  const lines = Math.min(maxLines, estimatedLines(body, size, WRITING.width))
  const block = GREETING_HEIGHT + lines * lineHeight
  const top = Math.max(WRITING.top, Math.round((WRITING.top + WRITING.bottom - block) / 2))
  const art: KeepsakeOp[] = [
    { kind: 'rect', x: SHEET.left + 12, y: SHEET.top + 12, w: SHEET.right - SHEET.left, h: SHEET.bottom - SHEET.top, ink: 'line' },
    { kind: 'rect', x: SHEET.left, y: SHEET.top, w: SHEET.right - SHEET.left, h: SHEET.bottom - SHEET.top, ink: 'paperDeep' },
    { kind: 'text', x: WRITING.left, y: top + 50, text: to, size: 50, ink: 'ink', font: 'hand', maxWidth: WRITING.width, maxLines: 1 },
    {
      kind: 'text',
      x: WRITING.left,
      y: top + GREETING_HEIGHT + size,
      text: body,
      size,
      ink: 'ink',
      font: 'serif',
      maxWidth: WRITING.width,
      lineHeight,
      maxLines: Math.floor((WRITING.bottom - top - GREETING_HEIGHT - size) / lineHeight) + 1,
    },
    ...candleMark(SHEET.right - 96, SHEET.bottom - 40),
  ]

  return framedKeepsake({
    title: 'The Final Word',
    subtitle: keepsakeDay(day),
    art,
    alt: `A card that begins “${to}” with your words beneath: “${body}” A small candle, just blown out, sits in the corner with a thread of smoke.`,
    text: `${to}\n\n${body}`,
    fileName: keepsakeFileName('The Final Word', day),
  })
}
