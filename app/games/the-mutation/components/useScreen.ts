'use client'

import { useCallback, useSyncExternalStore, type RefObject } from 'react'
import type { Sense } from '@/lib/design/tokens'
import type { InkContrast } from '@/lib/design/inks'
import { DEFAULT_PALETTE, arcadePalette, paletteVars, readNeon, screenInks, type Palette } from '../engine/palette'

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

export interface Screen {
  palette: Palette
  /** Glow strength, 0 to 1. */
  neon: number
  /** The same inks as CSS variables for the stage element. */
  vars: Record<string, string>
}

const DEFAULT_SCREEN: Screen = { palette: DEFAULT_PALETTE, neon: 1, vars: paletteVars(DEFAULT_PALETTE) }

let cached: { key: string; screen: Screen } = { key: 'gentle|normal|1', screen: DEFAULT_SCREEN }

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_QUERY)
  query.addEventListener('change', onChange)
  const observer = new MutationObserver(onChange)
  // Contrast, motion and the sensory dial are all attributes of <html>
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-contrast', 'data-reduce-motion', 'data-sense'],
  })
  return () => {
    query.removeEventListener('change', onChange)
    observer.disconnect()
  }
}

function readSense(root: HTMLElement): Sense {
  const sense = root.getAttribute('data-sense')
  return sense === 'quiet' || sense === 'lively' ? sense : 'gentle'
}

function readContrast(root: HTMLElement): InkContrast {
  const value = root.getAttribute('data-contrast')
  return value === 'high' || value === 'extra-high' ? value : 'normal'
}

/** The arcade screen's inks and glow as seen from `ref`, refreshed when the sense or contrast settings change. */
export function useScreen(ref: RefObject<Element | null>): Screen {
  const getSnapshot = useCallback((): Screen => {
    const root = document.documentElement
    const sense = readSense(root)
    const contrast = readContrast(root)
    const neon = readNeon(ref.current ?? root)
    const key = `${sense}|${contrast}|${neon}`
    if (key !== cached.key) {
      const palette = arcadePalette(screenInks(sense, contrast))
      cached = { key, screen: { palette, neon, vars: paletteVars(palette) } }
    }
    return cached.screen
  }, [ref])
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SCREEN)
}
