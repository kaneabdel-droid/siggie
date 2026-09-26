import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminEmail } from '@/lib/admin/auth'
import { createAdminIdentityMiddlewareClient } from '@/utils/supabase/admin-identity'
import { firstAllowedPath, hasPermission, moduleForPath, type PermissionMap } from '@/lib/permissions'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const { pathname } = request.nextUrl

  // Les webhooks des prestataires de paiement (Bictorys, Moneroo, Chariow) et le cron
  // de réconciliation appellent ces routes serveur-à-serveur sans session utilisateur :
  // elles ne doivent jamais être redirigées vers /login, sous peine de casser la
  // confirmation des paiements (elles ont leur propre vérification de secret).
  if (pathname.startsWith('/api/webhooks') || pathname.startsWith('/api/cron')) {
    return supabaseResponse
  }

  // /admin/login est le point d'entrée dédié de l'espace admin : jamais soumis
  // aux redirections ci-dessous (sinon boucle de redirection avec lui-même).
  if (pathname === '/admin/login') {
    return supabaseResponse
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Espace admin plateforme : réservé aux emails listés dans ADMIN_EMAILS, jamais
  // soumis au verrouillage d'essai d'un GIE (l'admin ne gère pas son propre GIE ici).
  // Traité avant la redirection générique ci-dessous pour qu'un visiteur non
  // connecté sur /admin/* atterrisse sur /admin/login, pas sur /login (compte client).
  //
  // La session admin est portée par le client d'identité partagée (cookie à domaine
  // .dembasolution.com, cf. utils/supabase/admin-identity.ts) et non par le client
  // "produit" ci-dessus, pour qu'elle soit reconnue aussi par les autres produits
  // DembaSolution (SSO admin inter-produits).
  if (pathname.startsWith('/admin')) {
    // Un pépin réseau transitoire sur le projet Supabase partagé ne doit pas faire
    // planter la requête — on le traite comme "pas de session admin" plutôt que
    // de laisser l'exception remonter.
    const adminUser = await createAdminIdentityMiddlewareClient(request, supabaseResponse)
      .auth.getUser()
      .then(({ data }) => data.user)
      .catch(() => null)

    // Toujours vers /admin/login, même si une session client existe : le même email
    // peut être membre d'un GIE (éventuellement expiré), et le renvoyer vers /dashboard
    // l'enverrait sur /abonnement sans jamais lui proposer la connexion admin.
    if (!isAdminEmail(adminUser?.email)) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.search = pathname === '/admin' ? '' : `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  if (
    !user &&
    pathname !== '/' &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/signup') &&
    !pathname.startsWith('/forgot-password') &&
    !pathname.startsWith('/update-password') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/decouvrir-siggie') &&
    !pathname.startsWith('/tarifs')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Verrouillage après la période d'essai (ou verrouillage manuel admin) : un GIE
  // sans paiement confirmé est redirigé vers son espace abonnement pour régulariser,
  // sauf sur les pages nécessaires pour payer.
  const exemptFromTrialLock =
    pathname.startsWith('/abonnement') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/logout')

  if (user && !exemptFromTrialLock) {
    const { data: userData } = await supabase
      .from('utilisateurs')
      .select('role, permissions, gies(essai_expire_le, compte_verrouille)')
      .eq('id', user.id)
      .single()

    const gie = Array.isArray(userData?.gies) ? userData.gies[0] : userData?.gies
    const essaiExpireLe = gie?.essai_expire_le as string | null | undefined
    const essaiExpire = essaiExpireLe ? new Date(essaiExpireLe) < new Date() : false

    if (gie?.compte_verrouille || essaiExpire) {
      const url = request.nextUrl.clone()
      url.pathname = '/abonnement'
      url.searchParams.set('essai_expire', '1')
      return NextResponse.redirect(url)
    }

    // Droits par page : un utilisateur sans "lecture" sur le module de cette URL
    // est renvoyé vers la première page qui lui est ouverte. Les server actions
    // d'écriture revérifient chacune leur droit (requirePermission).
    const moduleKey = moduleForPath(pathname)
    if (moduleKey) {
      const role = userData?.role as string | undefined
      const permissions = (userData?.permissions as PermissionMap | null) ?? null
      if (!hasPermission(role, permissions, moduleKey, 'read')) {
        const url = request.nextUrl.clone()
        url.pathname = firstAllowedPath(role, permissions)
        url.search = ''
        if (url.pathname !== pathname) return NextResponse.redirect(url)
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
