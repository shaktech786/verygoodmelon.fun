import { useState, useSyncExternalStore } from 'react'

const noSubscribe = () => () => {}

/**
 * Reads browser-only state (storage, the clock) once per mount. It is `null` on the server and during hydration,
 * then the loaded value, so markup matches the server without an effect that sets state after mount.
 */
export function useLoadedOnClient<T>(load: () => T): T | null {
  const [read] = useState(() => {
    let cached: { value: T } | undefined
    return () => (cached ??= { value: load() }).value
  })
  return useSyncExternalStore(noSubscribe, read, () => null)
}
