'use client'

import { useId } from 'react'
import { Stamp } from './Stamp'

interface InlineConfirmProps {
  /** The question in words, ending in a question mark. */
  question: string
  /** What would be lost, in one plain line. */
  why?: string
  keepLabel: string
  confirmLabel: string
  onKeep: () => void
  onConfirm: () => void
}

/**
 * Replaces a destructive button in place (PLAN.md 7.12). The safe choice comes first and takes focus;
 * the careful one follows in the careful style. Never a Go: confirming is not the page's one go-action.
 */
export function InlineConfirm({ question, why, keepLabel, confirmLabel, onKeep, onConfirm }: InlineConfirmProps) {
  const id = useId()
  return (
    <div role="alertdialog" aria-labelledby={`${id}-q`} aria-describedby={why ? `${id}-why` : undefined} className="sp-confirm">
      <p id={`${id}-q`} className="sp-confirm__question">
        {question}
      </p>
      {why && (
        <p id={`${id}-why`} className="sp-confirm__why">
          {why}
        </p>
      )}
      <div className="sp-confirm__choices">
        <Stamp onClick={onKeep} autoFocus>
          {keepLabel}
        </Stamp>
        <Stamp onClick={onConfirm} className="sp-stamp--careful">
          {confirmLabel}
        </Stamp>
      </div>
    </div>
  )
}
