const EXCERPT_LENGTH = 60

/** The player's words, short enough to quote back in a single line. */
export function excerpt(words: string): string {
  const text = words.replace(/\s+/g, ' ').trim()
  if (text.length <= EXCERPT_LENGTH) return text
  const cut = text.slice(0, EXCERPT_LENGTH)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.!?-]+$/, '')}…`
}

interface Waking {
  words: string
  intention: string
  care: boolean
}

/** The line at dawn that ties what the player said on the other side to what they came back with. */
export function wakingLine({ words, intention, care }: Waking): string {
  if (care) return 'You came back. It is good to have you here, today.'
  const said = `Over there, you said “${excerpt(words)}”`
  return intention.trim()
    ? `${said} You woke up with this:`
    : `${said} Whatever you reached for there is within reach here, too.`
}
