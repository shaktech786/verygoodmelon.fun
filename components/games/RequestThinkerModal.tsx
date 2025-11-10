'use client'

import { useState } from 'react'
import { X, Heart, Loader2, CheckCircle2 } from 'lucide-react'

interface RequestThinkerModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function RequestThinkerModal({ isOpen, onClose }: RequestThinkerModalProps) {
  const [formData, setFormData] = useState({
    requesterName: '',
    requesterEmail: '',
    requestedName: '',
    requestedEra: '',
    requestedField: '',
    reasonForRequest: '',
    personalConnection: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // TODO: Implement Stripe payment flow
      // For now, just submit the request
      const response = await fetch('/api/timeless-minds/request-thinker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to submit request')
      }

      setIsSuccess(true)
      setTimeout(() => {
        onClose()
        setIsSuccess(false)
        setFormData({
          requesterName: '',
          requesterEmail: '',
          requestedName: '',
          requestedEra: '',
          requestedField: '',
          reasonForRequest: '',
          personalConnection: ''
        })
      }, 3000)
    } catch (err) {
      setError('Something went wrong. Please try again.')
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
        <div className="bg-card-bg rounded-xl p-8 max-w-md w-full shadow-2xl animate-fade">
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
            <h3 className="text-2xl font-semibold mb-3 text-foreground">Request Submitted!</h3>
            <p className="text-foreground/70 mb-4">
              Thank you for your contribution. Your $5 has been donated to Direct Relief,
              and we&apos;ll research your requested thinker.
            </p>
            <p className="text-sm text-foreground/60">
              You&apos;ll receive an email when they&apos;re ready to chat. Plus, you now
              have access to the Phone Book to select specific thinkers!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-card-bg rounded-xl p-6 max-w-2xl w-full shadow-2xl animate-fade my-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Request a Thinker</h2>
            <p className="text-sm text-foreground/70">
              $5 donation • Unlock Phone Book access • Support Direct Relief
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-foreground/50 hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <Heart className="text-success flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-foreground/80">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Request any positive historical figure who is <strong>no longer living</strong></li>
                <li>Speak with minds you can no longer reach in real life</li>
                <li>We research their speaking style, beliefs, and wisdom</li>
                <li>Your $5 goes directly to Direct Relief (disaster relief charity)</li>
                <li>Get instant access to the Phone Book (select specific thinkers)</li>
                <li>We&apos;ll email you when your requested thinker is ready</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="requesterName" className="block text-sm font-medium text-foreground/70 mb-1">
                Your Name
              </label>
              <input
                id="requesterName"
                type="text"
                value={formData.requesterName}
                onChange={(e) => handleChange('requesterName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                required
              />
            </div>

            <div>
              <label htmlFor="requesterEmail" className="block text-sm font-medium text-foreground/70 mb-1">
                Your Email
              </label>
              <input
                id="requesterEmail"
                type="email"
                value={formData.requesterEmail}
                onChange={(e) => handleChange('requesterEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                required
              />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
              required
            />
            <p className="text-xs text-foreground/50 mt-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
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
                  handleSubmit(e as unknown as React.FormEvent)
                }
              }}
              placeholder="What wisdom or perspective would they bring? How would they help people grow?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
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
                  handleSubmit(e as unknown as React.FormEvent)
                }
              }}
              placeholder="Any personal reason why this person matters to you?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-foreground/20 rounded-lg hover:bg-foreground/5 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Processing...
                </>
              ) : (
                <>
                  <Heart size={18} />
                  Donate $5 & Request
                </>
              )}
            </button>
          </div>

          <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-3 mb-3">
            <p className="text-xs text-foreground/70 mb-2">
              <strong>⚠️ Important Disclaimer:</strong>
            </p>
            <p className="text-xs text-foreground/60 leading-relaxed">
              These are AI-generated simulations based on historical research, NOT real conversations with deceased individuals.
              This experience is for entertainment, reflection, and personal growth only. All responses are interpretations
              and should not be considered factual representations of what these individuals would actually say.
              Always verify important information independently.
            </p>
          </div>

          <p className="text-xs text-foreground/50 text-center">
            By submitting, you agree that: (1) Your $5 donation is non-refundable and goes directly to Direct Relief,
            (2) You understand this is AI entertainment/education only, (3) You will not misrepresent AI responses as real communications.
            Requirements: Must be deceased, positive influence, not billionaires/politicians/criminals.
          </p>
        </form>
      </div>
    </div>
  )
}
