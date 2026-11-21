'use client'

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react'

interface CareModeValue {
  /** True once a visitor's words suggest they may be in danger; lasts a few hours, in every tab. */
  care: boolean
  enterCareMode: () => void
}

const CARE_KEY = 'verygoodmelon:care'
// Long enough to cover the rest of a hard evening and a new tab opened in it, short enough not to follow someone for days
export const CARE_LASTS_MS = 4 * 60 * 60 * 1000

const CareModeContext = createContext<CareModeValue>({ care: false, enterCareMode: () => {} })

// Another tab entering care mode updates this one too
function subscribeToOtherTabs(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

function readStoredCare(): boolean {
  try {
    const saved = JSON.parse(localStorage.getItem(CARE_KEY) ?? 'null') as { until?: unknown } | null
    if (typeof saved?.until === 'number' && saved.until > Date.now()) return true
  } catch {}
  try {
    return sessionStorage.getItem(CARE_KEY) === '1'
  } catch {
    return false
  }
}

function storeCare() {
  try {
    localStorage.setItem(CARE_KEY, JSON.stringify({ until: Date.now() + CARE_LASTS_MS }))
    return
  } catch {}
  try {
    sessionStorage.setItem(CARE_KEY, '1')
  } catch {}
}

/**
 * Lets any page stop suggesting heavy themes once someone may be in danger:
 * held at the root so it survives moving between pages, and in local storage
 * (session storage where that is refused) so it survives a reload and a new tab.
 */
export function CareModeProvider({ children }: { children: ReactNode }) {
  // Read after hydration, so the server's calm page and the browser's stored care never disagree
  const stored = useSyncExternalStore(subscribeToOtherTabs, readStoredCare, () => false)
  // Held in memory too, for browsers that refuse all storage
  const [entered, setEntered] = useState(false)

  const enterCareMode = () => {
    setEntered(true)
    storeCare()
  }

  return (
    <CareModeContext.Provider value={{ care: entered || stored, enterCareMode }}>
      {children}
    </CareModeContext.Provider>
  )
}

export function useCareMode(): CareModeValue {
  return useContext(CareModeContext)
}
