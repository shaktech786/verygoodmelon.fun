/** The free support lines the site offers, written once so every place that names them agrees. */
export interface Helpline {
  id: string
  /** What to do, as it begins a row: "Call or text". */
  action: string
  /** What the visitor presses or copies: the number, or the site. */
  label: string
  /** Where the line is, in words; none for the directory, which covers every country. */
  region?: string
  href: string
  external?: boolean
}

export const US_LINE: Helpline = { id: 'us', action: 'Call or text', label: '988', region: 'US', href: 'tel:988' }
export const UK_IE_LINE: Helpline = { id: 'uk-ie', action: 'Call', label: '116 123', region: 'UK and Ireland', href: 'tel:116123' }
export const DIRECTORY_LINE: Helpline = {
  id: 'directory',
  action: 'Find a line near you at',
  label: 'findahelpline.com',
  href: 'https://findahelpline.com',
  external: true,
}

export const HELPLINES: readonly Helpline[] = [US_LINE, UK_IE_LINE, DIRECTORY_LINE]

/** Free support, any hour, as the plain sentence the in-game notes use. */
export const HELPLINES_AVAILABLE = 'Free support, any hour:'

/** The parts of the sentence "call or text 988 (US), call 116 123 (UK and Ireland), or findahelpline.com". */
export function sentenceVerb(line: Helpline): string {
  return line.action.toLowerCase()
}
