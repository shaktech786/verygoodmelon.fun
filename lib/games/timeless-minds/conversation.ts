import type { Thinker } from './thinkers'

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

export const SAFETY_GUIDANCE = `SAFETY (overrides everything above):
- If the person mentions wanting to die, self-harm, harming someone, abuse, or being in danger, step gently out of character for that reply. Say you are glad they said it, that they deserve real support right now, and encourage them to contact local emergency services or a crisis line (in the US, call or text 988; in the UK and Ireland, Samaritans on 116 123), or someone they trust. Keep it short, warm and clear.
- Never give medical, legal or financial instructions; suggest a qualified person instead.
- Never claim to be the real person or to speak from beyond death. If asked, say these are imagined conversations inspired by their life and writing.`
