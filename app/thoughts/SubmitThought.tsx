'use client'

import { useRef, useState } from 'react'
import { Go } from '@/components/seedpress/Go'
import { Icon } from '@/components/seedpress/icons/Icon'
import { Note } from '@/components/seedpress/Note'
import { ProseSection } from '@/components/seedpress/Prose'
import { QuietButton } from '@/components/seedpress/QuietButton'
import { WritingSlip } from '@/components/seedpress/WritingSlip'
import { THEME_LABELS } from '@/lib/thoughts/thoughts-data'

const THEMES = Object.entries(THEME_LABELS).map(([value, label]) => ({ value, label }))

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

export function SubmitThought() {
  const [body, setBody] = useState('')
  const [theme, setTheme] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [state, setState] = useState<SubmitState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const statusRef = useRef<HTMLDivElement>(null)

  const charCount = body.length
  const isValidLength = charCount >= 20 && charCount <= 2000
  const submitting = state === 'submitting'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!isValidLength || !theme) return

    setState('submitting')
    setErrorMessage('')

    try {
      const res = await fetch('/api/thoughts/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body.trim(),
          theme,
          authorName: authorName.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setState('error')
        setErrorMessage(data.error ?? 'Something went wrong. Please try again.')
        statusRef.current?.focus()
        return
      }

      setState('success')
      setBody('')
      setTheme('')
      setAuthorName('')
      statusRef.current?.focus()
    } catch {
      setState('error')
      setErrorMessage('Could not connect. Please check your connection and try again.')
      statusRef.current?.focus()
    }
  }

  if (state === 'success') {
    return (
      <ProseSection id="share-thought" title="Share a thought">
        <div ref={statusRef} tabIndex={-1} className="sp-thanks" role="status">
          <p>
            <strong>Thank you. Your thought will be reviewed.</strong>
          </p>
          <p>If it resonates, it will appear here for others to read.</p>
          <QuietButton onClick={() => setState('idle')}>Share another thought</QuietButton>
        </div>
      </ProseSection>
    )
  }

  return (
    <ProseSection id="share-thought" title="Share a thought">
      <p>
        If something is on your mind, write it down. Thoughtful submissions may appear here for others to find.
      </p>

      <form onSubmit={handleSubmit} className="sp-thoughts-form" noValidate>
        <WritingSlip
          label="Your thought"
          hint="Write something honest."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          disabled={submitting}
          note={
            charCount > 0
              ? `${charCount.toLocaleString()} / 2,000 characters${charCount < 20 ? ' (a little longer, please)' : ''}`
              : '20–2,000 characters'
          }
        />

        <fieldset>
          <legend>Theme</legend>
          <div className="sp-stamp-row" role="radiogroup" aria-label="Choose a theme">
            {THEMES.map((t) => (
              <label key={t.value} className="sp-choice">
                <input
                  type="radio"
                  name="theme"
                  value={t.value}
                  checked={theme === t.value}
                  onChange={(e) => setTheme(e.target.value)}
                  disabled={submitting}
                />
                <span className="sp-choice__face">
                  {theme === t.value && <Icon name="done" />}
                  {t.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <WritingSlip
          line
          label="Your name (optional)"
          hint="Leave blank to stay anonymous. Shown alongside your thought if approved."
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={100}
          disabled={submitting}
        />

        {state === 'error' && (
          <div ref={statusRef} tabIndex={-1}>
            <Note tone="look" role="alert">
              {errorMessage}
            </Note>
          </div>
        )}

        <div>
          <Go
            type="submit"
            loading={submitting}
            unavailable={!isValidLength ? 'Write a little more first.' : !theme ? 'Choose a theme first.' : undefined}
          >
            Submit thought
          </Go>
        </div>
      </form>
    </ProseSection>
  )
}
