'use client'

import { useSyncExternalStore } from 'react'

/** The soundscape of the game on screen, switched from the settings panel. */
export interface AmbientControl {
  isPlaying: boolean
  /** Call from the player's own click: browsers keep audio started any later silent. */
  toggle: () => void
}

let control: AmbientControl | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

/** A game page offers its soundscape here while it is on screen; the returned function withdraws it. */
export function offerAmbient(next: AmbientControl): () => void {
  control = next
  notify()
  return () => {
    if (control !== next) return
    control = null
    notify()
  }
}

export function subscribeToAmbient(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

/** True only after the player turned the page's soundscape on. */
export function ambientOn(): boolean {
  return control?.isPlaying ?? false
}

/** The page's soundscape control, or null on pages without one. */
export function useAmbientControl(): AmbientControl | null {
  return useSyncExternalStore(subscribeToAmbient, () => control, () => null)
}
