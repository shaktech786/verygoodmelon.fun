'use client'

import { useSyncExternalStore } from 'react'
import { DEFAULT_PALETTE, readPalette, type Palette } from '../engine/palette'

const DARK_QUERY = '(prefers-color-scheme: dark)'

let cached: { key: string; palette: Palette } = { key: '', palette: DEFAULT_PALETTE }

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-contrast'] })
  return () => {
    media.removeEventListener('change', onChange)
    observer.disconnect()
  }
}

function getSnapshot(): Palette {
  const palette = readPalette(document.documentElement)
  const key = Object.values(palette).join('|')
  if (key !== cached.key) cached = { key, palette }
  return cached.palette
}

/** The site's colour tokens for the current theme, refreshed when the theme changes. */
export function usePalette(): Palette {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_PALETTE)
}
