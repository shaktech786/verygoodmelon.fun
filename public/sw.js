const CACHE_NAME = 'vgm-v5'
const OFFLINE_URL = '/offline'

// Pages and assets to pre-cache for offline use
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/',
  '/manifest.json',
  '/logo.png',
]

// Game pages a visitor has opened are kept (newest last) so they can be opened again offline.
const GAME_PAGE = /^\/games\/[^/]+$/
const MAX_GAME_PAGES = 20

// The offline page is only useful if its stylesheets, fonts and scripts are there too. Read them from the
// page itself (and the fonts out of its stylesheets) so the list can never drift from what the build emits.
const STATIC_ASSET = /\/_next\/static\/[^"'()\s\\]+/g
const CSS_URL = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g

const pathOf = (url) => new URL(url, self.location.origin).pathname
const isStylesheet = (url) => pathOf(url).endsWith('.css')

// Every font or image a stylesheet names, resolved against the stylesheet's own address
function assetsInCss(css, cssUrl) {
  const found = []
  for (const match of css.matchAll(CSS_URL)) {
    try {
      const asset = new URL(match[2], new URL(cssUrl, self.location.origin))
      if (asset.origin === self.location.origin && asset.pathname.startsWith('/_next/static/')) found.push(asset.href)
    } catch {}
  }
  return found
}

async function precacheOfflineAssets(cache) {
  const page = await cache.match(OFFLINE_URL)
  if (!page) return
  const urls = new Set(((await page.text()).match(STATIC_ASSET) || []).map((url) => new URL(url, self.location.origin).href))
  await Promise.all(
    [...urls].filter(isStylesheet).map(async (url) => {
      try {
        const response = await fetch(url)
        if (!response.ok) return
        for (const asset of assetsInCss(await response.clone().text(), url)) urls.add(asset)
        await cache.put(url, response)
      } catch {}
    })
  )
  await Promise.all([...urls].filter((url) => !isStylesheet(url)).map((url) => cache.add(url).catch(() => {})))
}

async function keepGamePage(request, response) {
  const cache = await caches.open(CACHE_NAME)
  await cache.put(request, response)
  const pages = (await cache.keys()).filter((key) => GAME_PAGE.test(pathOf(key.url)))
  await Promise.all(pages.slice(0, Math.max(0, pages.length - MAX_GAME_PAGES)).map((key) => cache.delete(key)))
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

const STATIC_FILE = /\.(?:svg|png|jpe?g|webp|avif|woff2)$/

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Framework data requests (RSC payloads, prefetches) are never kept: they go straight to the network
  if (request.headers.has('RSC') || url.searchParams.has('_rsc')) return

  // Navigation requests: network-first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && GAME_PAGE.test(url.pathname)) {
            event.waitUntil(keepGamePage(request, response.clone()))
          } else if (response.ok && url.pathname === '/') {
            const cloned = response.clone()
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned)))
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
  if (url.pathname.startsWith('/_next/static/') || STATIC_FILE.test(url.pathname)) {
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
    fetch(request).catch(() => caches.match(request).then((cached) => cached || Response.error()))
  )
})
