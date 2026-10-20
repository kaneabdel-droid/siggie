const CACHE_NAME = 'demba-offline-siggie-v3'
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/logo-icon.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pré-mise en cache SW partielle SIGGIE:', err)
      })
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

  // Ne pas intercepter les API serveur
  if (url.pathname.startsWith('/api/')) return

  // 1. Navigation requests (HTML pages) : Network-First with Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone)
              // Mémoriser automatiquement les pages internes comme repli du shell de dashboard
              if (url.pathname.startsWith('/dashboard') || (!STATIC_ASSETS.includes(url.pathname) && url.pathname !== '/login')) {
                cache.put('/dashboard', response.clone())
              }
            })
          }
          return response
        })
        .catch(async () => {
          const cookieHeader = request.headers.get('cookie') || ''
          const isOfflineActive = cookieHeader.includes('demba_offline_active=1')
          const isDashboardTarget = url.pathname.startsWith('/dashboard') || (url.pathname !== '/' && url.pathname !== '/login')

          // A. Si la page demandée est exactement en cache sans être une redirection
          const cached = await caches.match(request)
          if (cached && (!cached.redirected || isDashboardTarget)) {
            return cached
          }

          // B. Si l'utilisateur vise le dashboard ou possède une session hors-ligne active
          if (isDashboardTarget || isOfflineActive) {
            const fallbackDashboard = await caches.match('/dashboard')
            if (fallbackDashboard && !fallbackDashboard.redirected) {
              return fallbackDashboard
            }

            const fallbackLogin = await caches.match('/login')
            if (fallbackLogin) return fallbackLogin
          }

          // C. Si l'utilisateur est sur '/' sans cookie de session
          if (url.pathname === '/') {
            const cachedRoot = await caches.match('/')
            if (cachedRoot) return cachedRoot
          }

          // D. Replis de sécurité finaux
          const fallbackLogin = await caches.match('/login')
          if (fallbackLogin) return fallbackLogin

          const fallbackRoot = await caches.match('/')
          if (fallbackRoot) return fallbackRoot

          return new Response('Application SIGGIE hors-ligne', {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          })
        })
    )
    return
  }

  // 2. Next.js RSC Prefetch & Data requests (_rsc query param)
  if (url.searchParams.has('_rsc')) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        // Retourne 503 pour forcer Next.js à déclencher une navigation HTML complète
        // qui sera immédiatement interceptée par request.mode === 'navigate' ci-dessus.
        return new Response('', { status: 503, statusText: 'Offline RSC' })
      })
    )
    return
  }

  // 3. Static build assets (_next/static, fonts, images) : Cache-First
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
    fetch(request).catch(() => caches.match(request))
  )
})
