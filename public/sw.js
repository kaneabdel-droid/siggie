const CACHE_NAME = 'demba-offline-siggie-v4'
const APP_SHELL = '/dashboard'
const STATIC_ASSETS = [
  '/',
  '/login',
  '/dashboard',
  '/manifest.json',
  '/logo-icon.png'
]

// Indicateur en mémoire de session locale hors-ligne
let isOfflineSessionActive = false

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_OFFLINE_SESSION') {
    isOfflineSessionActive = Boolean(event.data.active)
  }
})

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          const res = await fetch(asset, { cache: 'reload' })
          if (res && (res.status === 200 || res.type === 'opaque')) {
            await cache.put(asset, res)
          }
        } catch (err) {
          console.warn(`Pré-mise en cache SW [${asset}]:`, err)
        }
      }
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return

  // Ne pas intercepter les API serveur externes, webhooks, ou streaming multimédia volumineux
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/videos/') || url.pathname.endsWith('.mp4')) return

  // 1. Navigation requests (Pages HTML) : Network-First avec repli App Shell résilient
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone)
              // Mémoriser automatiquement toute page du dashboard comme repli du shell
              if (url.pathname.startsWith('/dashboard') || (!STATIC_ASSETS.includes(url.pathname) && url.pathname !== '/login')) {
                cache.put(APP_SHELL, response.clone())
              }
            })
          }
          return response
        })
        .catch(async () => {
          const isDashboardTarget = url.pathname.startsWith('/dashboard') || (
            url.pathname !== '/' &&
            url.pathname !== '/login' &&
            url.pathname !== '/signup' &&
            url.pathname !== '/forgot-password' &&
            url.pathname !== '/update-password' &&
            !url.pathname.startsWith('/decouvrir') &&
            !url.pathname.startsWith('/guide') &&
            !url.pathname.startsWith('/tarifs') &&
            !url.pathname.startsWith('/checkout')
          )

          // A. Si la page demandée est exactement en cache
          const cached = await caches.match(request)
          if (cached) return cached

          // B. Tenter sans query params (ex: /membres?query=abc -> /membres)
          const cachedWithoutQuery = await caches.match(url.pathname)
          if (cachedWithoutQuery) return cachedWithoutQuery

          // C. Si l'utilisateur vise le dashboard ou une page interne de l'application
          if (isDashboardTarget || isOfflineSessionActive) {
            const fallbackShell = await caches.match(APP_SHELL)
            if (fallbackShell) return fallbackShell

            // Tenter n'importe quelle page interne déjà mise en cache
            const cache = await caches.open(CACHE_NAME)
            const keys = await cache.keys()
            for (const key of keys) {
              const u = new URL(key.url)
              if (u.pathname.startsWith('/dashboard') || (u.pathname !== '/' && u.pathname !== '/login')) {
                const match = await cache.match(key)
                if (match) return match
              }
            }
          }

          // D. Si l'utilisateur est sur la page d'accueil
          if (url.pathname === '/') {
            const cachedRoot = await caches.match('/')
            if (cachedRoot) return cachedRoot
          }

          // E. Repli vers login si spécifiquement demandé
          if (url.pathname === '/login') {
            const fallbackLogin = await caches.match('/login')
            if (fallbackLogin) return fallbackLogin
          }

          // F. Replis de sécurité finaux
          const fallbackShell = await caches.match(APP_SHELL)
          if (fallbackShell) return fallbackShell

          const fallbackRoot = await caches.match('/')
          if (fallbackRoot) return fallbackRoot

          const fallbackLogin = await caches.match('/login')
          if (fallbackLogin) return fallbackLogin

          return new Response('Application SIGGIE hors-ligne', {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          })
        })
    )
    return
  }

  // 2. Next.js RSC Prefetch & Data requests (_rsc query param)
  if (url.searchParams.has('_rsc')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(async () => {
          // A. Correspondance exacte en cache
          const cached = await caches.match(request)
          if (cached) return cached

          // B. Correspondance sans paramètre _rsc
          const cachedPath = await caches.match(url.pathname)
          if (cachedPath) return cachedPath

          // C. Repli RSC du shell
          const shellRsc = await caches.match(`${APP_SHELL}?_rsc=1`)
          if (shellRsc) return shellRsc

          // D. Renvoyer 204 No Content pour ne pas faire planter le routeur Next.js
          return new Response(null, {
            status: 204,
            statusText: 'No Content Offline RSC'
          })
        })
    )
    return
  }

  // 3. Static build assets (_next/static, fonts, images) : Cache-First avec mise en cache dynamique
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const clone = networkRes.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return networkRes
          })
          .catch(() => new Response('', { status: 408 }))
      })
    )
    return
  }

  // 4. Autres requêtes : Network avec Cache Fallback
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return res
      })
      .catch(() => caches.match(request))
  )
})
