/**
 * Email templates for thinker request notifications.
 * Returns plain HTML strings with inline styles (safe for email clients).
 */

import { PALETTES } from '@/lib/design/tokens'

// Email clients have no CSS variables, so the light palette's values are written into the inline styles.
const INK = PALETTES.light
const ACCENT = INK.rind
const TEXT_COLOR = INK.ink
const MUTED_COLOR = INK['ink-soft']
const BG_COLOR = INK.paper
const RULE_COLOR = INK.rule
const SITE_URL = 'https://verygoodmelon.fun'

function wrapInLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${TEXT_COLOR};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <tr><td>
      ${content}
      <p style="margin-top:32px;padding-top:16px;border-top:1px solid ${RULE_COLOR};font-size:13px;color:${MUTED_COLOR};">
        <a href="${SITE_URL}" style="color:${ACCENT};text-decoration:none;">VeryGoodMelon.fun</a> — Think deeply, feel lighter.
      </p>
    </td></tr>
  </table>
</body>
</html>`
}

// -------------------------------------------------------------------
// Confirmation email sent to the requester
// -------------------------------------------------------------------

interface ConfirmationEmailParams {
  requesterName?: string
  requestedName: string
}

export function confirmationEmailSubject(): string {
  return 'Your thinker request has been received'
}

export function confirmationEmailHtml({ requesterName, requestedName }: ConfirmationEmailParams): string {
  const greeting = requesterName ? `Hi ${escapeHtml(requesterName)},` : 'Hi there,'

  return wrapInLayout(`
    <h1 style="font-size:22px;color:${ACCENT};margin:0 0 16px;">Request received</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">${greeting}</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">
      Thank you for requesting <strong>${escapeHtml(requestedName)}</strong> as a new thinker in The Sage.
      We'll review your suggestion and, if it's a good fit, add them to the collection.
    </p>
    <p style="margin:24px 0;">
      <a href="${SITE_URL}/games/ancient-voices" style="display:inline-block;padding:10px 20px;background-color:${INK.flesh};color:${INK['on-flesh']};text-decoration:none;border-radius:4px;font-size:14px;font-weight:600;">
        Back to The Sage
      </a>
    </p>
  `)
}

// -------------------------------------------------------------------
// Admin notification email
// -------------------------------------------------------------------

interface AdminNotificationParams {
  requesterName?: string
  requesterEmail: string
  requestedName: string
  requestedEra?: string
  requestedField?: string
  reasonForRequest: string
  personalConnection?: string
  requestId: string
}

export function adminNotificationSubject(requestedName: string): string {
  return `New thinker request: ${requestedName}`
}

export function adminNotificationHtml(params: AdminNotificationParams): string {
  const {
    requesterName,
    requesterEmail,
    requestedName,
    requestedEra,
    requestedField,
    reasonForRequest,
    personalConnection,
    requestId,
  } = params

  const rows = [
    ['Requester', requesterName ? `${escapeHtml(requesterName)} (${escapeHtml(requesterEmail)})` : escapeHtml(requesterEmail)],
    ['Thinker', escapeHtml(requestedName)],
    requestedEra ? ['Era', escapeHtml(requestedEra)] : null,
    requestedField ? ['Field', escapeHtml(requestedField)] : null,
    ['Reason', escapeHtml(reasonForRequest)],
    personalConnection ? ['Personal connection', escapeHtml(personalConnection)] : null,
    ['Request ID', requestId],
  ].filter(Boolean) as [string, string][]

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:6px 12px 6px 0;font-size:13px;color:${MUTED_COLOR};vertical-align:top;white-space:nowrap;">${label}</td>
          <td style="padding:6px 0;font-size:14px;line-height:1.5;">${value}</td>
        </tr>`
    )
    .join('')

  return wrapInLayout(`
    <h1 style="font-size:22px;color:${ACCENT};margin:0 0 16px;">New thinker request</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      ${tableRows}
    </table>
  `)
}

// -------------------------------------------------------------------
// Utility
// -------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
