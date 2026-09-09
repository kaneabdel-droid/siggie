'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isAdminEmail } from '@/lib/admin/auth'

type ActionResult = { success?: true; error?: string }

async function checkAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminEmail(user?.email) ? null : 'Non autorisé'
}

export async function changerForfait(gieId: string, niveau: string): Promise<ActionResult> {
  const authError = await checkAdmin()
  if (authError) return { error: authError }

  const supabase = createAdminClient()
  const { error } = await supabase.from('gies').update({ subscription_tier: niveau }).eq('id', gieId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  revalidatePath('/admin/gies')
  return { success: true }
}

export async function prolongerEssai(gieId: string, jours: number): Promise<ActionResult> {
  const authError = await checkAdmin()
  if (authError) return { error: authError }

  const supabase = createAdminClient()
  const nouvelleDate = new Date(Date.now() + jours * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase.from('gies').update({ essai_expire_le: nouvelleDate }).eq('id', gieId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  revalidatePath('/admin/gies')
  return { success: true }
}

export async function verrouillerCompte(gieId: string): Promise<ActionResult> {
  const authError = await checkAdmin()
  if (authError) return { error: authError }

  const supabase = createAdminClient()
  const { error } = await supabase.from('gies').update({ compte_verrouille: true }).eq('id', gieId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  revalidatePath('/admin/gies')
  return { success: true }
}

export async function deverrouillerCompte(gieId: string): Promise<ActionResult> {
  const authError = await checkAdmin()
  if (authError) return { error: authError }

  const supabase = createAdminClient()
  // Déverrouiller lève aussi l'horloge d'essai pour ne pas se faire reverrouiller aussitôt.
  const { error } = await supabase.from('gies').update({ compte_verrouille: false, essai_expire_le: null }).eq('id', gieId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  revalidatePath('/admin/gies')
  return { success: true }
}

// Bannissement long (10 ans) plutôt qu'un vrai champ "désactivé" — Supabase Auth n'a
// pas de statut désactivé natif, `ban_duration` est le mécanisme officiel pour bloquer
// la connexion sans supprimer le compte ni ses données.
const BAN_DUREE_DESACTIVATION = '87600h'

export async function changerRoleUtilisateur(gieId: string, utilisateurId: string, role: string): Promise<ActionResult> {
  const authError = await checkAdmin()
  if (authError) return { error: authError }
  if (!role.trim()) return { error: 'Le rôle ne peut pas être vide' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('utilisateurs').update({ role: role.trim() }).eq('id', utilisateurId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  return { success: true }
}

export async function creerUtilisateurPourGie(
  gieId: string,
  email: string,
  password: string,
  role: string
): Promise<ActionResult> {
  const authError = await checkAdmin()
  if (authError) return { error: authError }
  if (!email.trim()) return { error: "L'email est requis" }
  if (!password || password.length < 6) return { error: 'Le mot de passe doit contenir au moins 6 caractères' }

  const supabase = createAdminClient()

  // `existing_gie_id` dans les métadonnées indique au trigger handle_new_user()
  // de rattacher ce compte au GIE existant plutôt que d'en créer un nouveau
  // (comportement par défaut de toute création dans auth.users).
  const { error } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { existing_gie_id: gieId, role: role.trim() || 'employe' },
  })
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  return { success: true }
}

export async function retirerUtilisateurDuGie(gieId: string, utilisateurId: string): Promise<ActionResult> {
  const authError = await checkAdmin()
  if (authError) return { error: authError }

  const supabase = createAdminClient()

  // gie_id est obligatoire sur utilisateurs : "retirer du GIE" supprime la ligne de
  // rattachement. On désactive aussi le compte auth au passage, sinon il resterait
  // connectable mais sans aucun GIE — cassant sur presque toutes les pages du dashboard.
  const { error: banError } = await supabase.auth.admin.updateUserById(utilisateurId, { ban_duration: BAN_DUREE_DESACTIVATION })
  if (banError) return { error: banError.message }

  const { error } = await supabase.from('utilisateurs').delete().eq('id', utilisateurId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  return { success: true }
}

export async function desactiverCompteUtilisateur(gieId: string, utilisateurId: string): Promise<ActionResult> {
  const authError = await checkAdmin()
  if (authError) return { error: authError }

  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.updateUserById(utilisateurId, { ban_duration: BAN_DUREE_DESACTIVATION })
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  return { success: true }
}

export async function reactiverCompteUtilisateur(gieId: string, utilisateurId: string): Promise<ActionResult> {
  const authError = await checkAdmin()
  if (authError) return { error: authError }

  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.updateUserById(utilisateurId, { ban_duration: 'none' })
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  return { success: true }
}

/**
 * Suppression définitive d'un GIE — pour les inscriptions jamais payées après
 * expiration de l'essai. Supprime aussi les comptes auth de ses utilisateurs
 * (la cascade sur `gies` efface les lignes `utilisateurs`, `campagnes`,
 * `abonnement_paiements`, etc., mais pas les comptes auth.users sous-jacents,
 * qui resteraient orphelins et connectables sans aucun GIE).
 * Pas de revalidatePath ici : la page appelante navigue elle-même vers
 * /admin/gies après succès (redirect() dans une action gérée en try/catch
 * côté client casse la navigation).
 */
export async function supprimerGie(gieId: string): Promise<ActionResult> {
  const authError = await checkAdmin()
  if (authError) return { error: authError }

  const supabase = createAdminClient()

  const { data: utilisateurs } = await supabase.from('utilisateurs').select('id').eq('gie_id', gieId)

  // Le GIE d'abord (cascade sur utilisateurs/campagnes/paiements...), puis les
  // comptes auth : utilisateurs.id référence auth.users SANS cascade, donc
  // supprimer un compte auth avant que sa ligne utilisateurs ait disparu échoue
  // (erreur 500 générique côté Supabase — contrainte de clé étrangère violée).
  const { error } = await supabase.from('gies').delete().eq('id', gieId)
  if (error) return { error: error.message }

  for (const u of utilisateurs ?? []) {
    await supabase.auth.admin.deleteUser(u.id)
  }

  return { success: true }
}
