'use client'

import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

type SlipFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'id'>

interface WritingSlipProps extends SlipFieldProps {
  /** Always shown above the field, unless a visible heading already asks the same question. */
  label: string
  labelHidden?: boolean
  /** One line in `--ink-soft` under the label. */
  hint?: ReactNode
  /** A length limit under the field. It is a limit, never progress. */
  note?: ReactNode
  /** One line of writing instead of a page. */
  line?: boolean
  /** A few lines that grow with the words, without the page's height or ruled lines. */
  compact?: boolean
  ref?: Ref<HTMLTextAreaElement>
}

/**
 * The writing slip (PLAN.md 7.3): a label above, a well-filled field with a 2 px edge, and for a page
 * of writing, ruled lines that Quiet and Highest contrast take off. Never a placeholder as the label.
 */
export function WritingSlip({ label, labelHidden = false, hint, note, line = false, compact = false, ref, 'aria-describedby': describedBy, ...field }: WritingSlipProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const noteId = note ? `${id}-note` : undefined
  const described = [describedBy, hintId, noteId].filter(Boolean).join(' ') || undefined
  const shared = { id, 'aria-describedby': described }
  return (
    <div className="sp-slip">
      <label htmlFor={id} className={labelHidden ? 'sr-only' : 'sp-slip__label'}>
        {label}
      </label>
      {hint && (
        <p id={hintId} className="sp-slip__hint">
          {hint}
        </p>
      )}
      {line ? (
        <input type="text" {...(field as InputHTMLAttributes<HTMLInputElement>)} {...shared} ref={ref as unknown as Ref<HTMLInputElement>} className="sp-slip__input" />
      ) : (
        <textarea {...field} {...shared} ref={ref} className={cn('sp-slip__input', compact ? 'sp-slip__input--few' : 'sp-slip__input--page')} />
      )}
      {note && (
        <div id={noteId} className="sp-slip__note">
          {note}
        </div>
      )}
    </div>
  )
}
