import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // Les webhooks des prestataires de paiement (Bictorys, Moneroo) appellent cette
  // route serveur-à-serveur sans session utilisateur : ils ne doivent jamais être
  // redirigés vers /login, sous peine de casser la confirmation des paiements.
  if (pathname.startsWith('/api/webhooks')) {
    return supabaseResponse
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    pathname !== '/' &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/signup') &&
    !pathname.startsWith('/forgot-password') &&
    !pathname.startsWith('/update-password') &&
    !pathname.startsWith('/auth')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Verrouillage après la période d'essai : un GIE dont l'essai a expiré sans
  // paiement confirmé (essai_expire_le non nul et dépassé) est redirigé vers son
  // espace abonnement pour régulariser, sauf sur les pages nécessaires pour payer.
  const exemptFromTrialLock =
    pathname.startsWith('/abonnement') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/logout') ||
    pathname.startsWith('/api/webhooks')

  if (user && !exemptFromTrialLock) {
    const { data: userData } = await supabase
      .from('utilisateurs')
      .select('gies(essai_expire_le)')
      .eq('id', user.id)
      .single()

    const gie = Array.isArray(userData?.gies) ? userData.gies[0] : userData?.gies
    const essaiExpireLe = gie?.essai_expire_le as string | null | undefined

    if (essaiExpireLe && new Date(essaiExpireLe) < new Date()) {
      const url = request.nextUrl.clone()
      url.pathname = '/abonnement'
      url.searchParams.set('essai_expire', '1')
      return NextResponse.redirect(url)
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
