'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminIdentityClient } from '@/utils/supabase/admin-identity'
import { isAdminEmail } from '@/lib/admin/auth'

// N'autorise qu'un chemin relatif ou une URL absolue vers un sous-domaine
// dembasolution.com — sinon un `next` forgé pourrait rediriger vers un site
// externe après une connexion réussie (open redirect).
function safeNextUrl(next: string | null): string {
  if (!next) return '/admin'
  if (next.startsWith('/') && !next.startsWith('//')) return next
  try {
    const url = new URL(next)
    if (url.hostname === 'dembasolution.com' || url.hostname.endsWith('.dembasolution.com')) {
      return url.toString()
    }
  } catch {
    // next n'est pas une URL absolue valide
  }
  return '/admin'
}

// Verrouillage après échecs répétés, séparé de celui de /login (cookies dédiés)
// pour ne pas mélanger les tentatives d'un client avec celles de l'admin.
const ATTEMPTS_COOKIE = 'admin_login_attempts'
const LOCKOUT_COOKIE = 'admin_lockout_until'
const MAX_ATTEMPTS = 3
const LOCKOUT_MS = 60_000

export async function loginAdmin(formData: FormData) {
  const cookieStore = await cookies()

  const next = safeNextUrl(formData.get('next') as string | null)
  const nextParam = next === '/admin' ? '' : `&next=${encodeURIComponent(next)}`

  const lockoutUntil = cookieStore.get(LOCKOUT_COOKIE)?.value
  if (lockoutUntil && parseInt(lockoutUntil) > Date.now()) {
    redirect(`/admin/login?message=Trop de tentatives échouées. Veuillez patienter 1 minute avant de réessayer.${nextParam}`)
  }

  const supabase = await createAdminIdentityClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  const registerFailedAttempt = async () => {
    const attemptsCookie = cookieStore.get(ATTEMPTS_COOKIE)?.value
    const attempts = attemptsCookie ? parseInt(attemptsCookie) + 1 : 1

    if (attempts >= MAX_ATTEMPTS) {
      cookieStore.set(LOCKOUT_COOKIE, (Date.now() + LOCKOUT_MS).toString(), { maxAge: 60 })
      cookieStore.delete(ATTEMPTS_COOKIE)
    } else {
      cookieStore.set(ATTEMPTS_COOKIE, attempts.toString(), { maxAge: 300 })
    }
  }

  if (error) {
    await registerFailedAttempt()
    redirect(`/admin/login?message=Identifiant ou mot de passe incorrect${nextParam}`)
  }

  // L'email/mot de passe est valide mais ce n'est pas un compte administrateur :
  // on referme immédiatement la session pour ne jamais laisser une session
  // authentifiée traîner suite à une tentative d'accès à /admin non autorisée.
  if (!isAdminEmail(data.user?.email)) {
    await registerFailedAttempt()
    await supabase.auth.signOut()
    redirect(`/admin/login?message=Ce compte n\'a pas accès à l\'administration${nextParam}`)
  }

  cookieStore.delete(ATTEMPTS_COOKIE)
  cookieStore.delete(LOCKOUT_COOKIE)

  redirect(next)
}
