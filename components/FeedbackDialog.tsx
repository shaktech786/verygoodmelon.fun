'use client'

import { useEffect, useRef, useState } from 'react'
import { Go } from '@/components/seedpress/Go'
import { Note } from '@/components/seedpress/Note'
import { NoteDialog } from '@/components/seedpress/NoteDialog'
import { Stamp } from '@/components/seedpress/Stamp'
import { StatusLine } from '@/components/seedpress/StatusLine'

const OPEN_FEEDBACK_EVENT = 'verygoodmelon:open-feedback'

export function openFeedback(event?: { currentTarget: HTMLElement }): void {
  window.dispatchEvent(new CustomEvent<HTMLElement | null>(OPEN_FEEDBACK_EVENT, { detail: event?.currentTarget ?? null }))
}

/** The feedback form, opened from the footer's Feedback link. */
export function FeedbackDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const doneRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  const close = () => {
    setIsOpen(false)
    setIsSuccess(false)
    setError('')
  }

  useEffect(() => {
    if (isSuccess) doneRef.current?.focus()
  }, [isSuccess])

  useEffect(() => {
    const open = (event: Event) => {
      openerRef.current = (event as CustomEvent<HTMLElement | null>).detail
      setIsOpen(true)
    }
    window.addEventListener(OPEN_FEEDBACK_EVENT, open)
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, open)
  }, [])

  const submit = async () => {
    if (!feedback.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedback.trim() }),
      })
      if (!response.ok) throw new Error(`Feedback request failed: ${response.status}`)
      setIsSuccess(true)
      setFeedback('')
    } catch (err) {
      console.error(err)
      setError("That didn't send. Your words are still here, so you can try again in a moment.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <NoteDialog
      title="Send feedback"
      description="Something not working, or an idea to share? Every note is read."
      onClose={close}
      closeLabel="Close feedback"
      initialFocusRef={textareaRef}
      returnFocusRef={openerRef}
      actions={
        isSuccess ? (
          <Stamp ref={doneRef} onClick={close}>
            Close
          </Stamp>
        ) : (
          <>
            <Stamp onClick={close} disabled={isSubmitting}>
              Cancel
            </Stamp>
            <Go type="submit" form="feedback-form" loading={isSubmitting} unavailable={feedback.trim() ? undefined : 'Write a note first.'}>
              {isSubmitting ? 'Sending' : 'Send'}
            </Go>
          </>
        )
      }
    >
      {isSuccess ? (
        <StatusLine mark="done">Thank you. Your note arrived safely and will be read soon.</StatusLine>
      ) : (
        <form
          id="feedback-form"
          className="sp-field"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <label htmlFor="feedback-text" className="sp-field__label">
            Your note
          </label>
          <textarea
            ref={textareaRef}
            id="feedback-text"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault()
                void submit()
              }
            }}
            placeholder="What happened, or what would you like to see?"
            className="sp-field__input"
            rows={5}
            required
            disabled={isSubmitting}
            aria-describedby="feedback-public-note"
          />
          <p id="feedback-public-note" className="sp-field__hint">
            Notes are posted publicly on the site&apos;s GitHub page so they can be worked on in the open,
            so please leave out your name, email or anything personal.
          </p>
          <p className="sp-field__hint">Ctrl + Enter (or Cmd + Enter) also sends it.</p>
          {error && <Note tone="look" role="alert">{error}</Note>}
        </form>
      )}
    </NoteDialog>
  )
}
