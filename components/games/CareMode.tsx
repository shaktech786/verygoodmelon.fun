'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface CareModeValue {
  /** True once a player's words suggest they may be in danger; lasts for the visit. */
  care: boolean
  enterCareMode: () => void
}

const CareModeContext = createContext<CareModeValue>({ care: false, enterCareMode: () => {} })

/** Lets a game tell the rest of its page to stop suggesting heavy themes. */
export function CareModeProvider({ children }: { children: ReactNode }) {
  const [care, setCare] = useState(false)
  return (
    <CareModeContext.Provider value={{ care, enterCareMode: () => setCare(true) }}>
      {children}
    </CareModeContext.Provider>
  )
}

export function useCareMode(): CareModeValue {
  return useContext(CareModeContext)
}
