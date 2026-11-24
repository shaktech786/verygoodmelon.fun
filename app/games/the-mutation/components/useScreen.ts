'use client'

import { useCallback, useSyncExternalStore, type RefObject } from 'react'
import { DEFAULT_PALETTE, readNeon, readPalette, type Palette } from '../engine/palette'

const DARK_QUERY = '(prefers-color-scheme: dark)'
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

export interface Screen {
  palette: Palette
  /** Glow strength, 0 to 1. */
  neon: number
}

const DEFAULT_SCREEN: Screen = { palette: DEFAULT_PALETTE, neon: 1 }

let cached: { key: string; screen: Screen } = { key: '', screen: DEFAULT_SCREEN }

function subscribe(onChange: () => void): () => void {
  const queries = [window.matchMedia(DARK_QUERY), window.matchMedia(REDUCED_QUERY)]
  for (const q of queries) q.addEventListener('change', onChange)
  const observer = new MutationObserver(onChange)
  // data-sense lives on the Seedpress scope, below the root, so the whole tree is watched for that one attribute
  observer.observe(document.documentElement, {
    attributes: true,
    subtree: true,
    attributeFilter: ['data-theme', 'data-contrast', 'data-reduce-motion', 'data-sense'],
  })
  return () => {
    for (const q of queries) q.removeEventListener('change', onChange)
    observer.disconnect()
  }
}

/** The arcade screen's inks and glow as seen from `ref`, refreshed when the theme or sense changes. */
export function useScreen(ref: RefObject<Element | null>): Screen {
  const getSnapshot = useCallback((): Screen => {
    const el = ref.current ?? document.documentElement
    const palette = readPalette(el)
    const neon = readNeon(el)
    const key = `${Object.values(palette).join('|')}|${neon}`
    if (key !== cached.key) cached = { key, screen: { palette, neon } }
    return cached.screen
  }, [ref])
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SCREEN)
}
