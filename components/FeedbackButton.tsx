'use client'

import { useState } from 'react'
import { MessageSquare, X, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!feedback.trim()) {
      setError('Please enter your feedback')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedback.trim() })
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      await response.json()

      setIsSuccess(true)
      setFeedback('')

      // Close after 3 seconds
      setTimeout(() => {
        setIsSuccess(false)
        setIsOpen(false)
      }, 3000)
    } catch (err) {
      setError('Failed to submit feedback. Please try again.')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Side Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-accent text-white px-3 py-4 rounded-l-lg shadow-lg hover:bg-accent/90 transition-all hover:px-4 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        aria-label="Send feedback"
      >
        <div className="flex items-center gap-2 -rotate-90 origin-center whitespace-nowrap">
          <MessageSquare size={18} className="rotate-90" />
          <span className="text-sm font-medium">Feedback</span>
        </div>
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 py-8 flex items-center justify-center">
            <div className="bg-card-bg rounded-xl p-6 max-w-md w-full shadow-2xl animate-fade">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-1">Send Feedback</h2>
                  <p className="text-sm text-foreground/70">
                    Report bugs, suggest features, or share your thoughts
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-foreground/50 hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Success State */}
              {isSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Thank you!</h3>
                  <p className="text-sm text-foreground/70">
                    Your feedback has been submitted as a GitHub issue.
                    We&apos;ll review it soon!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Textarea */}
                  <div className="mb-4">
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                          e.preventDefault()
                          handleSubmit(e as unknown as React.FormEvent)
                        }
                      }}
                      placeholder="Describe the bug, feature request, or feedback..."
                      className="w-full px-3 py-2 bg-card-bg text-foreground border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none min-h-[120px]"
                      required
                      disabled={isSubmitting}
                      autoFocus
                    />
                    <p className="text-xs text-foreground/50 mt-2">
                      Tip: Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to submit
                    </p>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mb-4 bg-danger/10 border border-danger/20 rounded-lg p-3 text-sm text-danger">
                      {error}
                    </div>
                  )}

                  {/* Info */}
                  <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-3 mb-4">
                    <p className="text-xs text-foreground/70 leading-relaxed">
                      💡 <strong>What happens next:</strong> Your feedback will be analyzed by AI and converted
                      into a GitHub issue. You can track progress at{' '}
                      <a
                        href="https://github.com/shaktech786/verygoodmelon.fun/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        github.com/shaktech786/verygoodmelon.fun/issues
                      </a>
                    </p>
                  </div>

                  {/* Submit */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      variant="secondary"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1 flex items-center justify-center gap-2"
                      disabled={isSubmitting || !feedback.trim()}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          Send Feedback
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
