import { NextResponse, type NextRequest } from 'next/server'

/**
 * Chemins de probing et de scanning fréquemment attaqués par les robots malveillants.
 * Toute requête vers ces chemins est immédiatement bloquée avec un code HTTP 403.
 */
const FORBIDDEN_PROBE_PATTERNS = [
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/\.aws/i,
  /^\/\.well-known\/(?!pki-validation)/i,
  /^\/wp-(admin|login|content|includes)/i,
  /^\/phpmyadmin/i,
  /^\/pma/i,
  /^\/adminer/i,
  /^\/xmlrpc\.php/i,
  /^\/actuator/i,
  /^\/cgi-bin/i,
  /^\/console/i,
  /^\/server-status/i,
  /^\/eval-stdin/i,
  /\.(bak|config|sql|tar|gz|zip|rar|7z)$/i,
]

/**
 * Outils de scraping et scanners automatisés connus qui tentent de cloner
 * ou d'aspirer le contenu des applications web sans autorisation.
 */
const BLOCKED_SCRAPER_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /dirbuster/i,
  /gobuster/i,
  /masscan/i,
  /acunetix/i,
  /wpscan/i,
  /scrapy/i,
  /python-requests/i,
  /aiohttp/i,
  /httpclient/i,
  /libwww-perl/i,
  /zgrab/i,
  /censys/i,
  /shodan/i,
  /mj12bot/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /dotbot/i,
  /blexbot/i,
]

/**
 * Motifs d'injection malveillante (SQLi, XSS, Path Traversal) dans l'URL.
 */
const SUSPICIOUS_QUERY_PATTERNS = [
  /(\.\.[\/\\])/, // Directory Traversal
  /(<script[\s>])/i, // XSS
  /(union\s+select)/i, // SQLi
  /(exec\s*\()/i, // Command injection
  /(benchmark\s*\()/i, // Blind SQLi
  /(waitfor\s+delay)/i, // Blind SQLi
]

/**
 * Analyse une requête entrante pour détecter les tentatives d'intrusion,
 * de probing de failles ou d'aspiration automatisée.
 */
export function inspectSecurityThreat(request: NextRequest): {
  blocked: boolean
  status?: number
  reason?: string
} {
  const { pathname, search } = request.nextUrl
  const userAgent = request.headers.get('user-agent') || ''

  // 1. Les webhooks légitimes et cron ont leurs propres signatures et secrets :
  // on ne les bloque pas par user-agent
  if (pathname.startsWith('/api/webhooks') || pathname.startsWith('/api/cron')) {
    return { blocked: false }
  }

  // 2. Détection de probing d'intrusion (fichiers sensibles ou scanners)
  for (const pattern of FORBIDDEN_PROBE_PATTERNS) {
    if (pattern.test(pathname)) {
      return {
        blocked: true,
        status: 403,
        reason: 'Accès interdit - tentative de sondage détectée',
      }
    }
  }

  // 3. Détection d'injection dans les query parameters
  if (search) {
    for (const pattern of SUSPICIOUS_QUERY_PATTERNS) {
      if (pattern.test(decodeURIComponent(search))) {
        return {
          blocked: true,
          status: 400,
          reason: 'Requête suspecte rejetée',
        }
      }
    }
  }

  // 4. Détection de scrapers et d'aspirateurs automatisés sur les pages interactives
  for (const botPattern of BLOCKED_SCRAPER_USER_AGENTS) {
    if (botPattern.test(userAgent)) {
      return {
        blocked: true,
        status: 403,
        reason: 'Accès automatisé non autorisé',
      }
    }
  }

  return { blocked: false }
}

/**
 * Applique systématiquement les en-têtes de sécurité sur la réponse HTTP,
 * et ajoute une directive anti-indexation/anti-archive stricte sur les zones privées.
 */
export function applySecurityHeaders(
  response: NextResponse,
  pathname: string
): NextResponse {
  // En-têtes de défense fondamentale
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  )

  // Protection anti-indexation / anti-archivage / anti-clonage pour tout l'espace d'application
  const isPrivateArea =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/abonnement') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/campagnes') ||
    pathname.startsWith('/credits') ||
    pathname.startsWith('/intrants') ||
    pathname.startsWith('/distribution') ||
    pathname.startsWith('/facturation') ||
    pathname.startsWith('/remboursements') ||
    pathname.startsWith('/tresorerie') ||
    pathname.startsWith('/materiel') ||
    pathname.startsWith('/membres')

  if (isPrivateArea) {
    // Interdit aux moteurs de recherche et aux aspirateurs (Web Archive, Google cache)
    // de sauvegarder ou d'indexer la moindre bribe de données de gestion
    response.headers.set(
      'X-Robots-Tag',
      'noindex, nofollow, noarchive, nosnippet, noimageindex'
    )
  }

  return response
}
