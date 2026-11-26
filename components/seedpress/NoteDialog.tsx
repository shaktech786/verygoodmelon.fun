'use client'

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type Ref, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { focusableIn } from '@/components/accessibility/useModalDialog'
import { cn } from '@/lib/utils/cn'
import { IconStamp } from './IconStamp'

interface NoteDialogProps {
  /** The dialog's name. Rendered as its h2. */
  title: string
  onClose: () => void
  /** One plain line under the title, read out with it. */
  description?: ReactNode
  /** Adds the close stamp. Confirms that already end in a "keep it" choice leave it out. */
  closeLabel?: string
  size?: 'small' | 'medium' | 'form' | 'wide'
  /** Where focus lands on open. Without it, the title takes focus. */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** For a game that moves focus back to the title itself. */
  titleRef?: RefObject<HTMLHeadingElement | null>
  /** Where focus goes on close, read at that moment. Without it, back to whatever had focus on open. */
  returnFocusRef?: RefObject<HTMLElement | null>
  /** Pressing the scrim closes it. Leave off while a form holds words. */
  scrimCloses?: boolean
  /** The actions row; the Go, if any, comes last. */
  actions?: ReactNode
  className?: string
  children?: ReactNode
}

/**
 * A note card on the native dialog (PLAN.md 7.12). Mount it only while it is open: it shows itself
 * modally, keeps Tab inside, closes on Escape and hands focus back to whatever opened it. It is
 * portalled out of the page so the page's own go-action never counts against the dialog's.
 */
export function NoteDialog({
  title,
  onClose,
  description,
  closeLabel,
  size = 'medium',
  initialFocusRef,
  titleRef,
  returnFocusRef,
  scrimCloses = false,
  actions,
  className,
  children,
}: NoteDialogProps) {
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const ownTitleRef = useRef<HTMLHeadingElement>(null)
  const headingRef = titleRef ?? ownTitleRef
  const initialRef = useRef(initialFocusRef)
  const headingRefStable = useRef(headingRef)
  const returnRef = useRef(returnFocusRef)
  // Kept across the double run of effects in development, so the second run does not take the dialog itself for the opener
  const openerRef = useRef<HTMLElement | null>(null)
  const pressedScrim = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    openerRef.current ??= document.activeElement instanceof HTMLElement ? document.activeElement : null
    const opener = openerRef.current
    dialog.showModal()
    ;(initialRef.current?.current ?? headingRefStable.current.current ?? dialog).focus()
    return () => {
      const target = returnRef.current?.current ?? opener
      if (target?.isConnected) target.focus()
    }
  }, [])

  const keepTabInside = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return
    const dialog = event.currentTarget
    const items = focusableIn(dialog)
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (!first || !last) {
      event.preventDefault()
    } else if (event.shiftKey && (active === first || !items.includes(active as HTMLElement))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (active === last || !items.includes(active as HTMLElement))) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-lead` : undefined}
      className={cn('sp-dialog', `sp-dialog--${size}`, className)}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      // A second Escape with nothing pressed between can close a modal dialog without a cancel event:
      // tell the parent, and bring the dialog back if the parent keeps it open.
      onClose={() => {
        onClose()
        setTimeout(() => {
          const dialog = dialogRef.current
          if (dialog?.isConnected && !dialog.open) dialog.showModal()
        }, 0)
      }}
      onKeyDown={keepTabInside}
      onPointerDown={(event) => {
        pressedScrim.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        // Only a press that began on the scrim too, so ending a text selection there does not close it
        if (scrimCloses && pressedScrim.current && event.target === event.currentTarget) onClose()
        pressedScrim.current = false
      }}
    >
      <div className="sp-dialog__inner">
        <header className="sp-dialog__head">
          <h2 id={`${id}-title`} ref={headingRef as Ref<HTMLHeadingElement>} tabIndex={-1} className="sp-h3 sp-dialog__title">
            {title}
          </h2>
          {closeLabel && <IconStamp icon="close" label={closeLabel} onClick={onClose} />}
        </header>
        {description && (
          <p id={`${id}-lead`} className="sp-dialog__lead">
            {description}
          </p>
        )}
        {children && <div className="sp-dialog__body">{children}</div>}
        {actions && <div className="sp-dialog__actions">{actions}</div>}
      </div>
    </dialog>,
    document.body
  )
}
