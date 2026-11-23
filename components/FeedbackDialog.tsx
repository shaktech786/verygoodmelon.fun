'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { Button, buttonClassName } from '@/components/ui/Button'
import { useModalDialog } from '@/components/accessibility/useModalDialog'

const OPEN_FEEDBACK_EVENT = 'verygoodmelon:open-feedback'

export function openFeedback(): void {
  window.dispatchEvent(new Event(OPEN_FEEDBACK_EVENT))
}

/** The feedback form, opened from the footer's Feedback link. */
export function FeedbackDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const doneRef = useRef<HTMLButtonElement>(null)

  const close = () => {
    setIsOpen(false)
    setIsSuccess(false)
    setError('')
  }

  useModalDialog(isOpen, dialogRef, close, textareaRef)

  useEffect(() => {
    const open = () => setIsOpen(true)
    window.addEventListener(OPEN_FEEDBACK_EVENT, open)
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, open)
  }, [])

  useEffect(() => {
    if (isSuccess) doneRef.current?.focus()
  }, [isSuccess])

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
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" onClick={close} />
      <div className="relative min-h-full px-4 py-8 flex items-center justify-center pointer-events-none">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          aria-describedby="feedback-intro"
          tabIndex={-1}
          className="pointer-events-auto bg-card-bg text-foreground rounded-xl p-5 sm:p-6 max-w-md w-full shadow-2xl animate-fade"
        >
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h2 id="feedback-title" className="text-lg sm:text-xl font-semibold text-foreground mb-1">
                Send feedback
              </h2>
              <p id="feedback-intro" className="text-sm text-primary-light">
                Something not working, or an idea to share? Every note is read.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="p-2.5 -mr-2 -mt-2 rounded-lg text-primary-light hover:text-foreground hover:bg-hover-bg transition-colors"
              aria-label="Close feedback"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {isSuccess ? (
            <div className="text-center py-6" role="status">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" aria-hidden="true" />
              <p className="text-base font-semibold text-foreground mb-1">Thank you</p>
              <p className="text-sm text-primary-light mb-5">Your note arrived safely and will be read soon.</p>
              <button ref={doneRef} type="button" onClick={close} className={buttonClassName('secondary', 'md', 'w-full')}>
                Close
              </button>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void submit()
              }}
            >
              <label htmlFor="feedback-text" className="block text-sm font-medium text-foreground mb-2">
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
                className="w-full px-3 py-2 bg-card-bg text-foreground border border-card-border rounded-lg resize-none min-h-[120px] text-base"
                required
                disabled={isSubmitting}
                aria-describedby="feedback-public-note"
              />
              <p id="feedback-public-note" className="text-sm text-primary-light mt-2">
                Notes are posted publicly on the site&apos;s GitHub page so they can be worked on in the open,
                so please leave out your name, email or anything personal.
              </p>
              <p className="text-xs text-primary-light mt-2 hidden sm:block">
                Ctrl + Enter (or Cmd + Enter) also sends it.
              </p>

              {error && (
                <p role="alert" className="mt-4 rounded-lg border border-card-border bg-hover-bg p-3 text-sm text-foreground">
                  {error}
                </p>
              )}

              <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  type="button"
                  onClick={close}
                  variant="secondary"
                  className="w-full sm:flex-1 order-2 sm:order-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 order-1 sm:order-2"
                  disabled={isSubmitting || !feedback.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                      Sending
                    </>
                  ) : (
                    <>
                      <Send size={18} aria-hidden="true" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
