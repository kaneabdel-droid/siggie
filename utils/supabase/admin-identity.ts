import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'

// Client Supabase dédié à l'identité admin partagée entre produits DembaSolution
// (SIGGIE, D-QUINCA, ...) — projet Supabase de SIGGIE (source d'identité admin
// commune), cookie à domaine .dembasolution.com pour qu'il soit lisible par tous
// les produits hébergés sous ce domaine. Distinct du client habituel de
// utils/supabase/server.ts, qui reste scopé aux données du produit courant.
const ADMIN_COOKIE_OPTIONS = {
  name: 'sb-demba-admin',
  domain: '.dembasolution.com',
  sameSite: 'lax' as const,
  secure: true,
}

// Pour Server Components / Server Actions.
export async function createAdminIdentityClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.ADMIN_IDENTITY_SUPABASE_URL!,
    process.env.ADMIN_IDENTITY_SUPABASE_ANON_KEY!,
    {
      cookieOptions: ADMIN_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Appelé depuis un Server Component : sans effet si le middleware
            // rafraîchit déjà la session (même contrat que utils/supabase/server.ts).
          }
        },
      },
    }
  )
}

// Pour le middleware — mêmes options de cookie, branchées sur request/response.
export function createAdminIdentityMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
    process.env.ADMIN_IDENTITY_SUPABASE_URL!,
    process.env.ADMIN_IDENTITY_SUPABASE_ANON_KEY!,
    {
      cookieOptions: ADMIN_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}
