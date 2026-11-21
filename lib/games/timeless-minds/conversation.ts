import type { Thinker } from './thinkers'
import { plainText } from './plain-text'

/** Longest message a player can send; the input enforces the same limit. */
export const MAX_MESSAGE_LENGTH = 1000
/** Only the recent part of a conversation is sent on, which is all a short reply needs. */
export const MAX_HISTORY_MESSAGES = 20
export const MAX_FAREWELL_LENGTH = 240

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

/** Player-supplied history is untrusted: keep well-formed turns only, recent and short. */
export function sanitizeHistory(value: unknown): ConversationTurn[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((turn): turn is ConversationTurn =>
      (turn?.role === 'user' || turn?.role === 'assistant') && typeof turn?.content === 'string' && turn.content.trim() !== ''
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map(turn => ({ role: turn.role, content: turn.content.slice(0, MAX_MESSAGE_LENGTH) }))
}

export function farewellFallback(thinker: Thinker): string {
  const belief = thinker.coreBeliefs[0]?.replace(/[.!]+$/, '')
  return belief
    ? `Thank you for sitting with me a while. Take this with you: ${belief}.`
    : 'Thank you for sitting with me a while. Go gently.'
}

/** One line, no wrapping quotes, never long: model text is rendered as plain text. */
export function tidyLine(text: string, maxLength: number): string {
  const line = text.trim().split(/\r?\n/)[0].trim().replace(/^["'“”]+|["'“”]+$/g, '').trim()
  if (line.length <= maxLength) return line
  const cut = line.slice(0, maxLength - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length)}…`
}

/** Said, word for word, whenever a visitor's words plainly say they may be in danger. */
export const CARE_REPLY =
  'I am really glad you told me. You matter, and you deserve someone who can be with you properly right now; the support lines on this page are there at any hour. I am still here if you want to keep talking.'

// Phrase matching misses danger said sideways, so every reply also carries the model's own judgement.
export const JUDGED_REPLY_FORMAT = `REPLY FORMAT (always):
- Sadness, grief, stress, loneliness, regret, fear of death and questions about mortality are ordinary subjects for these conversations and are never risk by themselves.
- Before replying, judge whether the visitor's latest words suggest they may be at risk of harming themselves or no longer wanting to live, including indirect signs such as feeling everyone would be fine or better off without them, that nobody would notice if they were gone, being tired of everything, wanting it all to be over, or not wanting to wake up.
- Write the reply as plain spoken words: no markdown, asterisks, headings or lists.
- Return only JSON, with no other text: {"risk": true or false, "reply": "what you say"}`

export interface JudgedReply {
  risk: boolean
  reply: string
}

function jsonStringFragment(fragment: string): string {
  try {
    return JSON.parse(`"${fragment.replace(/\\+$/, '')}"`)
  } catch {
    return fragment
  }
}

/** Reads the model's {risk, reply}; a reply cut off mid-JSON still yields its words, never raw JSON. */
export function readJudgedReply(text: string): JudgedReply {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object') {
      const { risk, reply } = parsed as Record<string, unknown>
      return { risk: risk === true, reply: typeof reply === 'string' ? plainText(reply) : '' }
    }
  } catch {}
  if (trimmed.startsWith('{')) {
    const reply = trimmed.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/)
    return {
      risk: /"risk"\s*:\s*true/.test(trimmed),
      reply: reply ? plainText(jsonStringFragment(reply[1])) : '',
    }
  }
  return { risk: false, reply: plainText(trimmed) }
}

export const SAFETY_GUIDANCE = `SAFETY (overrides everything above):
- If the person mentions wanting to die, self-harm, harming someone, abuse, or being in danger, step gently out of character for that reply. Say you are glad they said it, that they deserve real support right now, and encourage them to contact local emergency services or a crisis line (in the US, call or text 988; in the UK and Ireland, Samaritans on 116 123), or someone they trust. Keep it short, warm and clear.
- Never give medical, legal or financial instructions; suggest a qualified person instead.
- Never claim to be the real person or to speak from beyond death. If asked, say these are imagined conversations inspired by their life and writing.`
