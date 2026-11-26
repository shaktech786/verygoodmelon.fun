'use client'

import { useSyncExternalStore } from 'react'
import { PALETTES, SENSES, type Palette, type PaletteName, type Sense } from './tokens'

export type InkTheme = 'light' | 'dark'
export type InkContrast = 'normal' | 'high' | 'extra-high'
export type Inks = Palette

const DARK_QUERY = '(prefers-color-scheme: dark)'
const WATCHED = ['data-theme', 'data-sense', 'data-contrast']

/** The palette tokens.css emits for this combination: high contrast wins over Quiet, which wins over the standard inks. */
export function paletteName(theme: InkTheme, sense: Sense, contrast: InkContrast): PaletteName {
  const dark = theme === 'dark'
  if (contrast !== 'normal') return dark ? 'darkHigh' : 'lightHigh'
  if (sense === 'quiet') return dark ? 'darkQuiet' : 'lightQuiet'
  return dark ? 'dark' : 'light'
}

const highestCopies = new Map<PaletteName, Inks>()

/**
 * Every colour role, resolved to a string a canvas can take. Highest contrast also sets every rule to
 * rule-strong (tokens.css), so it gets a copy of the High palette; the copy is made once per palette so
 * useSyncExternalStore sees a stable reference.
 */
export function getInks(theme: InkTheme, sense: Sense, contrast: InkContrast): Inks {
  const name = paletteName(theme, sense, contrast)
  if (contrast !== 'extra-high') return PALETTES[name]
  let copy = highestCopies.get(name)
  if (!copy) {
    copy = { ...PALETTES[name], rule: PALETTES[name]['rule-strong'] }
    highestCopies.set(name, copy)
  }
  return copy
}

function systemIsDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

function readTheme(root: HTMLElement): InkTheme {
  const theme = root.getAttribute('data-theme')
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  return systemIsDark() ? 'dark' : 'light'
}

function readSense(root: HTMLElement): Sense {
  const sense = root.getAttribute('data-sense')
  return SENSES.find((s) => s === sense) ?? 'gentle'
}

function readContrast(root: HTMLElement): InkContrast {
  const contrast = root.getAttribute('data-contrast')
  return contrast === 'high' || contrast === 'extra-high' ? contrast : 'normal'
}

/** The theme, sense and contrast the page is showing now, for art drawn once outside React (a saved keepsake). */
export function readInkState(): { theme: InkTheme; sense: Sense; contrast: InkContrast } {
  const root = document.documentElement
  return { theme: readTheme(root), sense: readSense(root), contrast: readContrast(root) }
}

function snapshot(): Inks {
  const root = document.documentElement
  return getInks(readTheme(root), readSense(root), readContrast(root))
}

function subscribe(onChange: () => void): () => void {
  const query = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null
  query?.addEventListener('change', onChange)
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: WATCHED })
  return () => {
    query?.removeEventListener('change', onChange)
    observer.disconnect()
  }
}

const DEFAULT_INKS = getInks('light', 'gentle', 'normal')

/**
 * The inks the page is showing now, for canvas and SVG art that cannot read CSS variables.
 * For canvas only: the server and the first client render use the light Gentle inks, so SVG and CSS must use the CSS variables instead.
 * The palette objects are shared, so an unchanged palette never re-renders.
 */
export function useInks(): Inks {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_INKS)
}

/** Light or dark as the page shows it now (auto resolved), for art that keeps its own fixed colours per theme. */
export function useInkTheme(): InkTheme {
  return useSyncExternalStore(subscribe, () => readTheme(document.documentElement), () => 'light')
}
