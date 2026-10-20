'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isAdminEmail } from '@/lib/admin/auth'
import { pageSuivante } from '@/lib/suite'
import { resoudreAuthEmail } from '@/lib/auth-identifier'

export type LoginActionResult = {
  success?: boolean
  error?: string
  redirectUrl?: string
  userContext?: {
    userId: string
    nomComplet?: string | null
    identifiant: string
    telephone?: string | null
    email?: string | null
    role: string
    gieId: string
    gieNom: string
    devise?: string
    permissions?: any
  }
}

export async function login(formData: FormData): Promise<LoginActionResult> {
  const cookieStore = await cookies()
  
  // Check lockout status
  const lockoutUntil = cookieStore.get('lockout_until')?.value
  if (lockoutUntil && parseInt(lockoutUntil) > Date.now()) {
    return {
      error: 'Veuillez patienter 1 minute avant de vous reconnecter (tentatives excessives).',
    }
  }

  const supabase = await createClient()
  const suite = pageSuivante(formData.get('next'))

  const rawIdentifier = ((formData.get('email') as string) || (formData.get('identifier') as string) || '').trim()
  const password = (formData.get('password') as string) || ''

  if (!rawIdentifier) {
    return { error: 'Veuillez renseigner votre identifiant, téléphone ou e-mail.' }
  }
  if (!password) {
    return { error: 'Veuillez saisir votre mot de passe.' }
  }

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
      cookieStore.set('lockout_until', (Date.now() + 60000).toString(), { maxAge: 60 })
      cookieStore.delete('login_attempts')
      return {
        error: 'Trop de tentatives échouées. Veuillez patienter 1 minute avant de réessayer.',
      }
    } else {
      cookieStore.set('login_attempts', attempts.toString(), { maxAge: 300 })
      return {
        error: 'Identifiant ou mot de passe non conforme. Veuillez réessayer.',
      }
    }
  }

  // Clear tracking cookies on success
  cookieStore.delete('login_attempts')
  cookieStore.delete('lockout_until')

  // Compte super-admin sans GIE : /dashboard le renverrait aussitôt ici (aucune ligne
  // utilisateurs), en boucle muette. On referme la session client et on l'oriente vers
  // la connexion admin.
  if (isAdminEmail(resolvedEmail) || (signInData?.user?.email && isAdminEmail(signInData.user.email))) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: rattachement } = user
      ? await supabase.from('utilisateurs').select('id').eq('id', user.id).maybeSingle()
      : { data: null }
    if (!rattachement) {
      await supabase.auth.signOut()
      return {
        redirectUrl: `/admin/login?message=${encodeURIComponent("Compte administrateur : connectez-vous ici pour accéder à l'administration.")}`,
      }
    }
  }

  // Récupération du contexte complet pour le cache hors-ligne
  let userContext: LoginActionResult['userContext']
  try {
    const { data: userProfile } = await supabase
      .from('utilisateurs')
      .select('id, identifiant, telephone, nom_complet, role, permissions, gie_id, gies(nom, devise)')
      .eq('id', signInData.user.id)
      .maybeSingle()

    if (userProfile) {
      const gie = Array.isArray(userProfile.gies) ? userProfile.gies[0] : userProfile.gies
      userContext = {
        userId: userProfile.id,
        nomComplet: userProfile.nom_complet || null,
        identifiant: userProfile.identifiant || rawIdentifier,
        telephone: userProfile.telephone || null,
        email: signInData.user.email || null,
        role: userProfile.role || 'membre',
        gieId: userProfile.gie_id,
        gieNom: gie?.nom || 'Mon GIE',
        devise: gie?.devise || 'XOF',
        permissions: userProfile.permissions || null,
      }
    }
  } catch (err) {
    console.warn('Erreur récupération profil utilisateur pour cache hors-ligne:', err)
  }

  revalidatePath('/', 'layout')

  return {
    success: true,
    redirectUrl: suite ?? '/dashboard',
    userContext,
  }
}
