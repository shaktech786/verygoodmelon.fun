'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Heart, Loader2, CheckCircle2 } from 'lucide-react'
import { Button, buttonClassName } from '@/components/ui/Button'

const REQUEST_UNAVAILABLE = 'Your request could not be sent just now. Your words are still here, so you can try again a little later.'
const EMPTY_FORM = {
  requesterName: '',
  requesterEmail: '',
  requestedName: '',
  requestedEra: '',
  requestedField: '',
  reasonForRequest: '',
  personalConnection: ''
}

interface RequestThinkerModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function RequestThinkerModal({ isOpen, onClose }: RequestThinkerModalProps) {
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const doneButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isSuccess) doneButtonRef.current?.focus()
  }, [isSuccess])

  const close = () => {
    if (isSuccess) {
      setIsSuccess(false)
      setFormData(EMPTY_FORM)
    }
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/timeless-minds/request-thinker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.status === 400) {
        const data = await response.json().catch(() => null)
        setError(typeof data?.error === 'string' ? data.error : REQUEST_UNAVAILABLE)
        return
      }

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      setIsSuccess(true)
    } catch (err) {
      setError(REQUEST_UNAVAILABLE)
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[100] overflow-y-auto">
        <div className="min-h-screen px-4 py-8 flex items-center justify-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-saved-title"
            className="bg-card-bg rounded-xl p-8 max-w-md w-full shadow-2xl animate-fade text-center"
          >
            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" aria-hidden="true" />
            <h3 id="request-saved-title" className="text-2xl font-semibold mb-3 text-foreground">Request saved</h3>
            <p className="text-foreground/70">
              Thank you. The creator reads every suggestion, though not every thinker can be added.
            </p>
            <button ref={doneButtonRef} onClick={close} className={buttonClassName('primary', 'md', 'mt-6 w-full')}>
              Back to the conversation
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-thinker-title"
          className="bg-card-bg rounded-xl p-6 max-w-2xl w-full shadow-2xl animate-fade my-8"
        >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 id="request-thinker-title" className="text-2xl font-semibold text-foreground mb-2">Request a Thinker</h2>
            <p className="text-sm text-foreground/70">
              Suggest a mind you&apos;d like to talk to
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-foreground/70 hover:text-foreground transition-colors"
            aria-label="Close request form"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <Heart className="text-success flex-shrink-0 mt-0.5" size={20} aria-hidden="true" />
            <div className="text-sm text-foreground/80">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Request any positive historical figure who is <strong>no longer living</strong></li>
                <li>Speak with minds you can no longer reach in real life</li>
                <li>The creator reads every suggestion; not every one can be added</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="requesterName" className="block text-sm font-medium text-foreground/70 mb-1">
                Your name (optional)
              </label>
              <input
                id="requesterName"
                type="text"
                value={formData.requesterName}
                onChange={(e) => handleChange('requesterName', e.target.value)}
                autoComplete="name"
                className="w-full px-3 py-2 bg-card-bg text-foreground border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>

            <div>
              <label htmlFor="requesterEmail" className="block text-sm font-medium text-foreground/70 mb-1">
                Your email *
              </label>
              <input
                id="requesterEmail"
                type="email"
                value={formData.requesterEmail}
                onChange={(e) => handleChange('requesterEmail', e.target.value)}
                autoComplete="email"
                aria-describedby="requesterEmail-hint"
                className="w-full px-3 py-2 bg-card-bg text-foreground border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus-ring"
                required
              />
              <p id="requesterEmail-hint" className="text-xs text-foreground/70 mt-1">
                Used only to write back to you about this request.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="requestedName" className="block text-sm font-medium text-foreground/70 mb-1">
              Who would you like to talk to? * (must be deceased)
            </label>
            <input
              id="requestedName"
              type="text"
              value={formData.requestedName}
              onChange={(e) => handleChange('requestedName', e.target.value)}
              placeholder="e.g., Carl Jung, Jane Austen, Richard Feynman"
              className="w-full px-3 py-2 bg-card-bg text-foreground border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus-ring"
              required
            />
            <p className="text-xs text-foreground/70 mt-1">
              Only historical figures who have passed away (no living people)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="requestedEra" className="block text-sm font-medium text-foreground/70 mb-1">
                Era (optional)
              </label>
              <input
                id="requestedEra"
                type="text"
                value={formData.requestedEra}
                onChange={(e) => handleChange('requestedEra', e.target.value)}
                placeholder="e.g., 1875-1961"
                className="w-full px-3 py-2 bg-card-bg text-foreground border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>

            <div>
              <label htmlFor="requestedField" className="block text-sm font-medium text-foreground/70 mb-1">
                Field (optional)
              </label>
              <input
                id="requestedField"
                type="text"
                value={formData.requestedField}
                onChange={(e) => handleChange('requestedField', e.target.value)}
                placeholder="e.g., Psychology, Literature"
                className="w-full px-3 py-2 bg-card-bg text-foreground border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reasonForRequest" className="block text-sm font-medium text-foreground/70 mb-1">
              Why this person? *
            </label>
            <textarea
              id="reasonForRequest"
              value={formData.reasonForRequest}
              onChange={(e) => handleChange('reasonForRequest', e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder="What wisdom or perspective would they bring? How would they help people grow?"
              rows={3}
              className="w-full px-3 py-2 bg-card-bg text-foreground border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus-ring resize-none"
              required
            />
          </div>

          <div>
            <label htmlFor="personalConnection" className="block text-sm font-medium text-foreground/70 mb-1">
              Personal connection (optional)
            </label>
            <textarea
              id="personalConnection"
              value={formData.personalConnection}
              onChange={(e) => handleChange('personalConnection', e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder="Any personal reason why this person matters to you?"
              rows={2}
              className="w-full px-3 py-2 bg-card-bg text-foreground border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus-ring resize-none"
            />
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin motion-reduce:animate-none" size={18} aria-hidden="true" />
                  Submitting...
                </>
              ) : (
                <>
                  <Heart size={18} aria-hidden="true" />
                  Submit Request
                </>
              )}
            </Button>
          </div>

          <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-3 mb-3">
            <p className="text-xs text-foreground/70 mb-2">
              <strong>Important:</strong>
            </p>
            <p className="text-xs text-foreground/70 leading-relaxed">
              Imagined conversations, not real quotes from the person. Every reply is invented by a computer program,
              inspired by historical research, for reflection and personal growth only. Replies are interpretations,
              not what these individuals actually said or would say. Always verify important information independently.
            </p>
          </div>

          <p className="text-xs text-foreground/70 text-center mb-3">
            By submitting, you agree that: (1) You understand these conversations are imagined, for reflection and learning only,
            (2) You will not present invented replies as real words from the person.
            Requirements: Must be deceased, positive influence, not billionaires/politicians/criminals.
          </p>

          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
            <p className="text-xs text-foreground/70 leading-relaxed text-center">
              <strong>Creator&apos;s Discretion:</strong> All requests are subject to approval/denial at the sole discretion of the creator.
              The creator reserves the right to modify, change, or remove any thinker at any time for any reason without notice.
              Request approval is not guaranteed.
            </p>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
