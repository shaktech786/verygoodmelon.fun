'use client'

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'

interface OwnSupportValue {
  /** True while the game on this page is showing its own Support block. */
  shown: boolean
  register: () => () => void
}

const OwnSupportContext = createContext<OwnSupportValue>({ shown: false, register: () => () => {} })

/** Lets a game tell its page that it is showing its own helplines, so the page adds the shared block only when it is not. */
export function OwnSupportProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0)
  const register = useCallback(() => {
    setCount((n) => n + 1)
    return () => setCount((n) => n - 1)
  }, [])
  const value = useMemo(() => ({ shown: count > 0, register }), [count, register])
  return <OwnSupportContext.Provider value={value}>{children}</OwnSupportContext.Provider>
}

export function useOwnSupportShown(): boolean {
  return useContext(OwnSupportContext).shown
}

/** Put inside a game's own Support block: while it is mounted, the page does not add a second one. */
export function OwnSupportMark() {
  const { register } = useContext(OwnSupportContext)
  useLayoutEffect(() => register(), [register])
  return null
}
