'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// One flag for the whole visit: a hint that mounts after the first key press shows straight away
let keysSeen = false
const listeners = new Set<() => void>()

function onFirstKey() {
  keysSeen = true
  window.removeEventListener('keydown', onFirstKey)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!keysSeen) window.addEventListener('keydown', onFirstKey)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('keydown', onFirstKey)
  }
}

interface KeyHintsProps {
  children: ReactNode
  /** Layout and colour; the default colour suits the site's own background. */
  className?: string
}

/**
 * A small "Keys" disclosure for a game's keyboard controls. It shows on devices with a fine
 * pointer, and on any device once a key has been pressed. Screen reader descriptions of the
 * controls live with the controls themselves, so collapsing this hides nothing they rely on.
 */
export function KeyHints({ children, className = 'text-foreground/70' }: KeyHintsProps) {
  const seen = useSyncExternalStore(subscribe, () => keysSeen, () => false)

  return (
    <details className={cn('group text-xs', seen ? 'block' : 'hidden pointer-fine:block', className)}>
      <summary className="inline-flex min-h-6 cursor-pointer list-none items-center gap-1 rounded px-1.5 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring [&::-webkit-details-marker]:hidden">
        <Keyboard size={12} aria-hidden="true" />
        Keys
      </summary>
      <p className="mt-1">{children}</p>
    </details>
  )
}
