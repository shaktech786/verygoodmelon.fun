import type { SoundType } from './soundscape-engine'

/**
 * A game can ask the page's ambient soundscape to fall quiet for a while, all of it or
 * only some layers, without owning the sound toggle. The player's own on/off choice is
 * untouched; hushed layers fade back as soon as every request is released.
 */
export type Hush = 'all' | readonly SoundType[]

const holds = new Set<{ hush: Hush }>()
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function hushAmbient(hush: Hush): () => void {
  const hold = { hush }
  holds.add(hold)
  notify()
  return () => {
    if (holds.delete(hold)) notify()
  }
}

export function isLayerHushed(type: SoundType): boolean {
  for (const { hush } of holds) {
    if (hush === 'all' || hush.includes(type)) return true
  }
  return false
}

export function subscribeToHush(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
