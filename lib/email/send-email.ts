/**
 * Email sending utility using the Resend API.
 * Uses native fetch — no npm packages required.
 */

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

interface SendEmailResult {
  success: boolean
  error?: string
}

const RESEND_API_URL = 'https://api.resend.com/emails'

function getDefaultFrom(): string {
  return process.env.EMAIL_FROM || 'VeryGoodMelon <noreply@verygoodmelon.fun>'
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not configured — skipping email send')
    return { success: false, error: 'Email not configured' }
  }

  const { to, subject, html, from } = options

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || getDefaultFrom(),
        to: [to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error(`[email] Resend API error (${response.status}):`, body)
      return { success: false, error: `Resend API error: ${response.status}` }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[email] Failed to send email:', message)
    return { success: false, error: message }
  }
}
