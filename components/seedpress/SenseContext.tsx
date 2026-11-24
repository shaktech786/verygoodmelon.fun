'use client'

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react'
import { DEFAULT_SENSE, SENSES, type Sense } from '@/lib/design/tokens'

const KEY = 'verygoodmelon:press:sense'
const listeners = new Set<() => void>()

let current: Sense | null = null

function read(): Sense {
  if (current) return current
  try {
    const stored = window.sessionStorage.getItem(KEY)
    current = SENSES.includes(stored as Sense) ? (stored as Sense) : DEFAULT_SENSE
  } catch {
    current = DEFAULT_SENSE
  }
  return current
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const SenseContext = createContext<{ sense: Sense; setSense: (sense: Sense) => void }>({
  sense: DEFAULT_SENSE,
  setSense: () => {},
})

/** Holds the sensory dial for this visit and sets `data-sense` on the scope it wraps. */
export function SenseScope({ className, children }: { className: string; children: ReactNode }) {
  const sense = useSyncExternalStore(subscribe, read, () => DEFAULT_SENSE)
  const setSense = useCallback((next: Sense) => {
    current = next
    try {
      window.sessionStorage.setItem(KEY, next)
    } catch {
      // Kept for this page view only when the browser refuses storage
    }
    listeners.forEach((listener) => listener())
  }, [])
  return (
    <SenseContext value={{ sense, setSense }}>
      <div className={className} data-sense={sense}>
        {children}
      </div>
    </SenseContext>
  )
}

export function useSenseDial() {
  return useContext(SenseContext)
}
