'use client'

import { type RefObject, useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.getClientRects().length > 0
  )
}

/**
 * Makes an open element behave as a modal dialog: focus moves in, Tab and
 * Shift+Tab stay inside, Escape closes, and focus returns to where it was.
 */
export function useModalDialog(
  open: boolean,
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>
): void {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return

    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    ;(initialFocusRef?.current ?? focusableIn(dialog)[0] ?? dialog).focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = focusableIn(dialog)
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!first || !last) {
        event.preventDefault()
      } else if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (returnTo?.isConnected) returnTo.focus()
    }
  }, [open, dialogRef, initialFocusRef])
}
