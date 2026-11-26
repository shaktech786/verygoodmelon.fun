'use client'

import { useSyncExternalStore } from 'react'
import { SENSES, DEFAULT_SENSE, type Sense } from './tokens'

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

export interface SenseState {
  sense: Sense
  /** The device asks for less motion, or the visitor switched "Reduce motion" on. */
  reducedMotion: boolean
  /** 0 in Quiet or under reduced motion, otherwise 1: multiply every JavaScript-driven duration and distance by it. */
  motionScale: 0 | 1
}

const SERVER_STATE: SenseState = { sense: DEFAULT_SENSE, reducedMotion: false, motionScale: 1 }
let cached: SenseState = SERVER_STATE

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_QUERY)
  query.addEventListener('change', onChange)
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-sense', 'data-reduce-motion'] })
  return () => {
    query.removeEventListener('change', onChange)
    observer.disconnect()
  }
}

function snapshot(): SenseState {
  const root = document.documentElement
  const attribute = root.getAttribute('data-sense')
  const sense = SENSES.find((s) => s === attribute) ?? DEFAULT_SENSE
  const reducedMotion = window.matchMedia(REDUCED_QUERY).matches || root.getAttribute('data-reduce-motion') === 'true'
  const motionScale = sense === 'quiet' || reducedMotion ? 0 : 1
  if (cached.sense !== sense || cached.reducedMotion !== reducedMotion || cached.motionScale !== motionScale) {
    cached = { sense, reducedMotion, motionScale }
  }
  return cached
}

/** The sensory dial and the reduced-motion setting as one value (docs/design-system/PLAN.md §5.6). */
export function useSense(): SenseState {
  return useSyncExternalStore(subscribe, snapshot, () => SERVER_STATE)
}
