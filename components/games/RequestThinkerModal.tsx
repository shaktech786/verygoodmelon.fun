'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { Go } from '@/components/seedpress/Go'
import { Note } from '@/components/seedpress/Note'
import { NoteDialog } from '@/components/seedpress/NoteDialog'
import { Stamp } from '@/components/seedpress/Stamp'
import { StatusLine } from '@/components/seedpress/StatusLine'

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
  returnFocusRef?: RefObject<HTMLElement | null>
}

export default function RequestThinkerModal({ isOpen, onClose, returnFocusRef }: RequestThinkerModalProps) {
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const doneRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isSuccess) doneRef.current?.focus()
  }, [isSuccess])

  const close = () => {
    if (isSuccess) {
      setIsSuccess(false)
      setFormData(EMPTY_FORM)
    }
    onClose()
  }

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
      <NoteDialog
        title="Request saved"
        onClose={close}
        returnFocusRef={returnFocusRef}
        actions={
          <Stamp ref={doneRef} onClick={close}>
            Back to the conversation
          </Stamp>
        }
      >
        <StatusLine mark="done">
          Thank you. The creator reads every suggestion, though not every thinker can be added.
        </StatusLine>
      </NoteDialog>
    )
  }

  return (
    <NoteDialog
      title="Request a Thinker"
      description="Suggest a mind you'd like to talk to"
      onClose={close}
      closeLabel="Close request form"
      initialFocusRef={firstFieldRef}
      returnFocusRef={returnFocusRef}
      size="form"
      actions={
        <>
          <Stamp onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Stamp>
          <Go type="submit" form="request-thinker-form" loading={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Go>
        </>
      }
    >
      <Note>
        <p className="sp-note__title">How it works:</p>
        <ul className="sp-note__list">
          <li>Request any positive historical figure who is <strong>no longer living</strong></li>
          <li>Speak with minds you can no longer reach in real life</li>
          <li>The creator reads every suggestion; not every one can be added</li>
        </ul>
      </Note>

      <form id="request-thinker-form" onSubmit={handleSubmit} className="sp-form">
        <div className="sp-form__pair">
          <div className="sp-field">
            <label htmlFor="requesterName" className="sp-field__label">
              Your name (optional)
            </label>
            <input
              ref={firstFieldRef}
              id="requesterName"
              type="text"
              value={formData.requesterName}
              onChange={(e) => handleChange('requesterName', e.target.value)}
              autoComplete="name"
              className="sp-field__input"
            />
          </div>

          <div className="sp-field">
            <label htmlFor="requesterEmail" className="sp-field__label">
              Your email *
            </label>
            <input
              id="requesterEmail"
              type="email"
              value={formData.requesterEmail}
              onChange={(e) => handleChange('requesterEmail', e.target.value)}
              autoComplete="email"
              aria-describedby="requesterEmail-hint"
              className="sp-field__input"
              required
            />
            <p id="requesterEmail-hint" className="sp-field__hint">
              Used only to write back to you about this request.
            </p>
          </div>
        </div>

        <div className="sp-field">
          <label htmlFor="requestedName" className="sp-field__label">
            Who would you like to talk to? * (must be deceased)
          </label>
          <input
            id="requestedName"
            type="text"
            value={formData.requestedName}
            onChange={(e) => handleChange('requestedName', e.target.value)}
            placeholder="e.g., Carl Jung, Jane Austen, Richard Feynman"
            aria-describedby="requestedName-hint"
            className="sp-field__input"
            required
          />
          <p id="requestedName-hint" className="sp-field__hint">
            Only historical figures who have passed away (no living people)
          </p>
        </div>

        <div className="sp-form__pair">
          <div className="sp-field">
            <label htmlFor="requestedEra" className="sp-field__label">
              Era (optional)
            </label>
            <input
              id="requestedEra"
              type="text"
              value={formData.requestedEra}
              onChange={(e) => handleChange('requestedEra', e.target.value)}
              placeholder="e.g., 1875-1961"
              className="sp-field__input"
            />
          </div>

          <div className="sp-field">
            <label htmlFor="requestedField" className="sp-field__label">
              Field (optional)
            </label>
            <input
              id="requestedField"
              type="text"
              value={formData.requestedField}
              onChange={(e) => handleChange('requestedField', e.target.value)}
              placeholder="e.g., Psychology, Literature"
              className="sp-field__input"
            />
          </div>
        </div>

        <div className="sp-field">
          <label htmlFor="reasonForRequest" className="sp-field__label">
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
            className="sp-field__input"
            required
          />
        </div>

        <div className="sp-field">
          <label htmlFor="personalConnection" className="sp-field__label">
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
            className="sp-field__input"
          />
        </div>

        {error && (
          <Note tone="look" role="alert">
            {error}
          </Note>
        )}

        <div className="sp-fineprint">
          <p>
            <strong>Important:</strong>
          </p>
          <p>
            Imagined conversations, not real quotes from the person. Every reply is invented by a computer program,
            inspired by historical research, for reflection and personal growth only. Replies are interpretations,
            not what these individuals actually said or would say. Always verify important information independently.
          </p>
          <p>
            By submitting, you agree that: (1) You understand these conversations are imagined, for reflection and learning only,
            (2) You will not present invented replies as real words from the person.
            Requirements: Must be deceased, positive influence, not billionaires/politicians/criminals.
          </p>
          <p>
            <strong>Creator&apos;s Discretion:</strong> All requests are subject to approval/denial at the sole discretion of the creator.
            The creator reserves the right to modify, change, or remove any thinker at any time for any reason without notice.
            Request approval is not guaranteed.
          </p>
        </div>
      </form>
    </NoteDialog>
  )
}
