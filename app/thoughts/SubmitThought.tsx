'use client'

import { useRef, useState } from 'react'

const THEMES = [
  { value: 'patience', label: 'Patience' },
  { value: 'wonder', label: 'Wonder' },
  { value: 'impermanence', label: 'Impermanence' },
  { value: 'creativity', label: 'Creativity' },
  { value: 'rest', label: 'Rest' },
  { value: 'connection', label: 'Connection' },
  { value: 'perspective', label: 'Perspective' },
] as const

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

export function SubmitThought() {
  const [body, setBody] = useState('')
  const [theme, setTheme] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [state, setState] = useState<SubmitState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  const charCount = body.length
  const isValidLength = charCount >= 20 && charCount <= 2000

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
      <section
        aria-label="Thought submitted"
        className="mt-16 pt-8 border-t border-card-border"
      >
        <div
          ref={statusRef}
          tabIndex={-1}
          className="bg-card-bg border border-card-border rounded-lg p-8 text-center"
          role="status"
        >
          <p className="text-foreground text-lg font-medium mb-2">
            Thank you. Your thought will be reviewed.
          </p>
          <p className="text-primary-light text-sm">
            If it resonates, it will appear here for others to read.
          </p>
          <button
            type="button"
            onClick={() => setState('idle')}
            className="mt-6 text-sm text-accent hover:text-accent/80 transition-colors underline underline-offset-4"
          >
            Share another thought
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-label="Share a thought"
      className="mt-16 pt-8 border-t border-card-border"
    >
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Share a thought
      </h2>
      <p className="text-primary-light text-sm mb-8">
        If something is on your mind, write it down. Thoughtful submissions may
        appear here for others to find.
      </p>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-6"
        noValidate
      >
        {/* Thought body */}
        <div>
          <label
            htmlFor="thought-body"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Your thought
          </label>
          <textarea
            id="thought-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-3 text-foreground text-sm leading-relaxed placeholder:text-primary-light/50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background resize-y"
            placeholder="Write something honest..."
            aria-describedby="thought-body-hint"
            required
            disabled={state === 'submitting'}
          />
          <p
            id="thought-body-hint"
            className={`mt-1.5 text-xs ${
              charCount > 0 && !isValidLength
                ? 'text-accent'
                : 'text-primary-light/60'
            }`}
          >
            {charCount > 0
              ? `${charCount.toLocaleString()} / 2,000 characters${
                  charCount < 20 ? ` (${20 - charCount} more needed)` : ''
                }`
              : '20\u20132,000 characters'}
          </p>
        </div>

        {/* Theme */}
        <fieldset>
          <legend className="block text-sm font-medium text-foreground mb-3">
            Theme
          </legend>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Choose a theme"
          >
            {THEMES.map((t) => (
              <label
                key={t.value}
                className={`
                  inline-flex items-center cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium
                  border transition-colors
                  focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-background
                  ${
                    theme === t.value
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-card-border bg-card-bg text-primary-light hover:border-accent/30 hover:text-foreground'
                  }
                  ${state === 'submitting' ? 'opacity-60 pointer-events-none' : ''}
                `}
              >
                <input
                  type="radio"
                  name="theme"
                  value={t.value}
                  checked={theme === t.value}
                  onChange={(e) => setTheme(e.target.value)}
                  className="sr-only"
                  disabled={state === 'submitting'}
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Author name (optional) */}
        <div>
          <label
            htmlFor="author-name"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Your name{' '}
            <span className="font-normal text-primary-light/60">
              (optional)
            </span>
          </label>
          <input
            id="author-name"
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            maxLength={100}
            className="w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-foreground text-sm placeholder:text-primary-light/50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            placeholder="Leave blank to stay anonymous"
            aria-describedby="author-name-hint"
            disabled={state === 'submitting'}
          />
          <p id="author-name-hint" className="mt-1.5 text-xs text-primary-light/60">
            Shown alongside your thought if approved.
          </p>
        </div>

        {/* Error message */}
        {state === 'error' && (
          <div
            ref={statusRef}
            tabIndex={-1}
            role="alert"
            className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent"
          >
            {errorMessage}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={state === 'submitting' || !isValidLength || !theme}
          className="
            inline-flex items-center gap-2 rounded-lg px-5 py-2.5
            bg-accent text-white text-sm font-medium
            transition-colors hover:bg-accent/90
            focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {state === 'submitting' ? 'Submitting...' : 'Submit thought'}
        </button>
      </form>
    </section>
  )
}
