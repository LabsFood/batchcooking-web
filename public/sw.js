/* Lab's Food — minimal service worker */
const SW_VERSION = 'labsfood-v1'
const RUNTIME_CACHE = `${SW_VERSION}-runtime`
const PRECACHE = `${SW_VERSION}-precache`

// Shell statique mis en cache à l'install — uniquement les ressources qu'on
// veut servir hors-ligne. Pas de pages dynamiques (Next gère son cache).
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/logo.png',
  '/logoOfficiel.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) =>
        // Best-effort precache — un échec individuel ne fait pas échouer l'install.
        Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u))),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(SW_VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// Stratégie :
//   - GET vers /_next/static/* ou public assets    → Cache First (immutables)
//   - GET HTML / autres                             → Network First avec fallback cache
//   - Tout le reste (POST, cross-origin, ws, etc.)  → on laisse passer
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:png|jpg|jpeg|svg|webp|avif|ico|gif|woff2?|ttf|otf|css)$/.test(url.pathname)

  if (isStatic) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request))
  }
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return cached || new Response('Offline asset unavailable', { status: 503 })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    const fallback = await caches.match('/')
    if (fallback) return fallback
    return new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}
