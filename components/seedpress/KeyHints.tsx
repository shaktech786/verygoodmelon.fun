'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { Icon } from './icons/Icon'

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
  /** Layout only. */
  className?: string
}

/**
 * A "Keys" disclosure for a game's keyboard controls. It shows on devices with a fine pointer,
 * and on any device once a key has been pressed. Screen reader descriptions of the controls live
 * with the controls themselves, so collapsing this hides nothing they rely on.
 */
export function KeyHints({ children, className }: KeyHintsProps) {
  const seen = useSyncExternalStore(subscribe, () => keysSeen, () => false)

  return (
    <details className={cn('sp-keys', seen ? 'is-seen' : 'is-waiting', className)}>
      <summary className="sp-stamp sp-keys__summary">
        <Icon name="keys" />
        <span>Keys</span>
      </summary>
      <p className="sp-keys__body">{children}</p>
    </details>
  )
}
