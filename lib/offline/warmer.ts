/**
 * Warmer proactif de routes et de payloads RSC pour l'accès hors-ligne complet de SIGGIE
 * Pré-charge et garde en cache Service Worker l'ensemble des écrans applicatifs
 * afin que toute navigation fonctionne instantanément avec ou sans connexion.
 */

export async function warmAppOfflineCache(routes: string[], cacheName = 'demba-offline-siggie-v4'): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine || !('caches' in window)) {
    return
  }

  try {
    const cache = await caches.open(cacheName)

    // Notifier le Service Worker de la session active
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SET_OFFLINE_SESSION', active: true })
    }

    // Réchauffer chaque route en tâche de fond
    for (const route of routes) {
      try {
        // 1. Page HTML complète
        const htmlRes = await fetch(route, { cache: 'no-cache' })
        if (htmlRes.ok && htmlRes.status === 200) {
          await cache.put(route, htmlRes)
        }

        // 2. Payload RSC de la route (essentiel pour navigation client Next.js sans réseau)
        const sep = route.includes('?') ? '&' : '?'
        const rscUrl = `${route}${sep}_rsc=1`
        const rscRes = await fetch(rscUrl, {
          headers: { 'RSC': '1' },
          cache: 'no-cache'
        })
        if (rscRes.ok && rscRes.status === 200) {
          await cache.put(rscUrl, rscRes)
        }
      } catch {
        // Silencieux pour ne pas perturber l'expérience utilisateur
      }
    }
  } catch (err) {
    console.warn('[Offline Warmer SIGGIE] Erreur de réchauffement:', err)
  }
}
