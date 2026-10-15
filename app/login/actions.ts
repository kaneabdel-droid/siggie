'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isAdminEmail } from '@/lib/admin/auth'
import { pageSuivante } from '@/lib/suite'
import { resoudreAuthEmail } from '@/lib/auth-identifier'

export async function login(formData: FormData) {
  const cookieStore = await cookies()
  
  // Check lockout status
  const lockoutUntil = cookieStore.get('lockout_until')?.value
  if (lockoutUntil && parseInt(lockoutUntil) > Date.now()) {
    redirect('/?message=Veuillez patienter 1 minute avant de vous reconnecter')
  }

  const supabase = await createClient()
  const suite = pageSuivante(formData.get('next'))

  const rawIdentifier = ((formData.get('email') as string) || '').trim()
  const password = formData.get('password') as string

  // Résolution de l'identifiant (e-mail réel, nom d'utilisateur ou numéro de téléphone)
  let resolvedEmail = rawIdentifier
  try {
    const adminSupabase = createAdminClient()
    const resolved = await resoudreAuthEmail(rawIdentifier, adminSupabase)
    resolvedEmail = resolved.email
  } catch {
    resolvedEmail = rawIdentifier
  }

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: resolvedEmail,
    password,
  })

  if (error) {
    const attemptsCookie = cookieStore.get('login_attempts')?.value
    const attempts = attemptsCookie ? parseInt(attemptsCookie) + 1 : 1

    if (attempts >= 3) {
      // Set lockout for 1 minute (60000 ms)
      cookieStore.set('lockout_until', (Date.now() + 60000).toString(), { maxAge: 60 })
      cookieStore.delete('login_attempts')
      return redirect('/?message=Trop de tentatives échouées. Veuillez patienter 1 minute avant de vous reconnecter.')
    } else {
      cookieStore.set('login_attempts', attempts.toString(), { maxAge: 300 }) // Keep for 5 minutes
      return redirect('/login?message=Identifiant ou mot de passe non conforme veuillez réessayer' + (suite ? '&next=' + encodeURIComponent(suite) : ''))
    }
  }

  // Clear tracking cookies on success
  cookieStore.delete('login_attempts')
  cookieStore.delete('lockout_until')

  // Compte super-admin sans GIE : /dashboard le renverrait aussitôt ici (aucune ligne
  // utilisateurs), en boucle muette. On referme la session client et on l'oriente vers
  // la connexion admin, qui porte sa propre session (identité partagée).
  if (isAdminEmail(resolvedEmail) || (signInData?.user?.email && isAdminEmail(signInData.user.email))) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: rattachement } = user
      ? await supabase.from('utilisateurs').select('id').eq('id', user.id).maybeSingle()
      : { data: null }
    if (!rattachement) {
      await supabase.auth.signOut()
      redirect(`/admin/login?message=${encodeURIComponent("Compte administrateur : connectez-vous ici pour accéder à l'administration.")}`)
    }
  }

  revalidatePath('/', 'layout')
  redirect(suite ?? '/dashboard')
}
