const CACHE_NAME = 'vgm-v4'
const OFFLINE_URL = '/offline'

// Pages and assets to pre-cache for offline use
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/',
  '/manifest.json',
  '/logo.png',
]

// Game routes that work offline (no server/API dependency)
const OFFLINE_GAME_ROUTES = [
  '/games/the-still-point',   // Breathing Patterns — pure client-side
  '/games/the-long-breath',   // The Unrusher — pure client-side
  '/games/thought-pockets',   // Thought Pockets — pure client-side (Zustand state)
]

// The offline page is only useful if its stylesheets, fonts and scripts are there too. Read them from the
// page itself (and the fonts out of its stylesheets) so the list can never drift from what the build emits.
const STATIC_ASSET = /\/_next\/static\/[^"'()\s\\]+/g

async function precacheOfflineAssets(cache) {
  const page = await cache.match(OFFLINE_URL)
  if (!page) return
  const urls = new Set((await page.text()).match(STATIC_ASSET) || [])
  const stylesheets = [...urls].filter((url) => url.endsWith('.css'))
  await Promise.all(
    stylesheets.map(async (url) => {
      try {
        const response = await fetch(url)
        if (!response.ok) return
        const css = await response.clone().text()
        for (const asset of css.match(STATIC_ASSET) || []) urls.add(asset)
        await cache.put(url, response)
      } catch {}
    })
  )
  await Promise.all(
    [...urls].filter((url) => !url.endsWith('.css')).map((url) => cache.add(url).catch(() => {}))
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PRECACHE_URLS)
      await precacheOfflineAssets(cache)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Navigation requests: network-first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses for offline game routes
          const isOfflineGame = OFFLINE_GAME_ROUTES.some((route) => url.pathname.startsWith(route))
          if (response.ok && (isOfflineGame || url.pathname === '/')) {
            const cloned = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned))
          }
          return response
        })
        .catch(() => {
          // Try serving from cache first, then offline page
          return caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        })
    )
    return
  }

  // Static assets (JS, CSS, images, fonts): cache-first for performance
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/games/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const cloned = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned))
          }
          return response
        })
      })
    )
    return
  }

  // API requests: network-only (no caching)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // Everything else: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})
