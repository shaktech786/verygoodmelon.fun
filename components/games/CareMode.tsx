'use client'

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react'

interface CareModeValue {
  /** True once a visitor's words suggest they may be in danger; lasts until the browser tab is closed. */
  care: boolean
  enterCareMode: () => void
}

const CARE_KEY = 'verygoodmelon:care'

const CareModeContext = createContext<CareModeValue>({ care: false, enterCareMode: () => {} })

const subscribeToNothing = () => () => {}

function readStoredCare(): boolean {
  try {
    return sessionStorage.getItem(CARE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Lets any page stop suggesting heavy themes once someone may be in danger:
 * held at the root so it survives moving between pages, and in session storage
 * so it survives a reload.
 */
export function CareModeProvider({ children }: { children: ReactNode }) {
  // Read after hydration, so the server's calm page and the browser's stored care never disagree
  const stored = useSyncExternalStore(subscribeToNothing, readStoredCare, () => false)
  // Held in memory too, for browsers that refuse session storage
  const [entered, setEntered] = useState(false)

  const enterCareMode = () => {
    setEntered(true)
    try {
      sessionStorage.setItem(CARE_KEY, '1')
    } catch {}
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
