'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'
const SITE_SETTING_ATTRIBUTE = 'data-reduce-motion'

function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(QUERY)
  mediaQuery.addEventListener('change', onChange)
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [SITE_SETTING_ATTRIBUTE],
  })
  return () => {
    mediaQuery.removeEventListener('change', onChange)
    observer.disconnect()
  }
}

function getSnapshot(): boolean {
  return (
    window.matchMedia(QUERY).matches ||
    document.documentElement.getAttribute(SITE_SETTING_ATTRIBUTE) === 'true'
  )
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * True when motion should be reduced: either the operating system asks for it
 * or the visitor switched on "Reduce Motion" in the site's accessibility panel.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
