import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { inspectSecurityThreat, applySecurityHeaders } from '@/lib/security'

export async function middleware(request: NextRequest) {
  // 1. Bouclier de sécurité actif : détection de probing d'intrusion et scrapers
  const threat = inspectSecurityThreat(request)
  if (threat.blocked) {
    const blockedResponse = new NextResponse(
      JSON.stringify({ error: threat.reason || 'Accès refusé' }),
      {
        status: threat.status || 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    return applySecurityHeaders(blockedResponse, request.nextUrl.pathname)
  }

  // 2. Gestion de la session Supabase, des accès et des redirections
  const response = await updateSession(request)

  // 3. Application des en-têtes de sécurité et X-Robots-Tag sur toute réponse
  return applySecurityHeaders(response, request.nextUrl.pathname)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
