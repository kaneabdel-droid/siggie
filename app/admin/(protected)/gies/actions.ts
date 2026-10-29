'use server'

import { revalidatePath } from 'next/cache'
import { getSharedAdminUser } from '@/utils/supabase/admin-identity'
import { createAdminClient } from '@/utils/supabase/admin'
import { isAdminEmail } from '@/lib/admin/auth'
import { defaultPermissionsForRole, sanitizePermissions, type PermissionMap } from '@/lib/permissions'

type ActionResult = { success?: true; error?: string }

async function checkAdmin(): Promise<string | null> {
  const user = await getSharedAdminUser()
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

// Le projet Supabase de SIGGIE est aussi la source d'identité admin partagée
// (cf. utils/supabase/admin-identity.ts) : bannir un compte listé dans ADMIN_EMAILS
// depuis la fiche d'un GIE dont il est membre bloquerait l'accès à /admin de tous
// les produits. Refusé ici plutôt que de compter sur la vigilance de l'opérateur.
async function refuserSiCompteAdmin(utilisateurId: string): Promise<string | null> {
  const { data, error } = await createAdminClient().auth.admin.getUserById(utilisateurId)
  if (error) return error.message
  return isAdminEmail(data.user?.email)
    ? "Ce compte est un compte super-admin : il ne peut pas être désactivé ni retiré d'un GIE."
    : null
}

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

import { genererEmailSynthetique } from '@/lib/auth-identifier'

export async function creerUtilisateurPourGie(
  gieId: string,
  identifiantOuEmail: string,
  password: string,
  role: string,
  permissions: PermissionMap | null = null,
  options?: {
    email?: string
    telephone?: string
    nomComplet?: string
  }
): Promise<ActionResult> {
  const authError = await checkAdmin()
  if (authError) return { error: authError }
  const identifiant = identifiantOuEmail.trim()
  if (!identifiant) return { error: "L'identifiant est requis" }
  if (!password || password.length < 6) return { error: 'Le mot de passe doit contenir au moins 6 caractères' }

  const supabase = createAdminClient()

  // Déterminer l'e-mail d'authentification pour Supabase Auth
  let authEmail = options?.email?.trim() || ''
  if (!authEmail) {
    if (identifiant.includes('@')) {
      authEmail = identifiant.toLowerCase()
    } else {
      authEmail = genererEmailSynthetique(identifiant)
    }
  }

  const { data: created, error } = await supabase.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      existing_gie_id: gieId,
      role: role.trim() || 'employe',
      identifiant: !identifiant.includes('@') ? identifiant : null,
      telephone: options?.telephone?.trim() || null,
      nom_complet: options?.nomComplet?.trim() || null,
    },
  })
  if (error) return { error: error.message }

  // Le trigger handle_new_user() a créé la ligne : mise à jour des droits et données complémentaires
  if (created.user) {
    const cleanRole = role.trim() || 'employe'
    const effectivePerms =
      cleanRole.toLowerCase() === 'admin'
        ? null
        : permissions
          ? sanitizePermissions(permissions)
          : defaultPermissionsForRole(cleanRole)
    const updatePayload: Record<string, any> = {
      permissions: effectivePerms,
    }
    if (!identifiant.includes('@')) updatePayload.identifiant = identifiant
    if (options?.telephone?.trim()) updatePayload.telephone = options.telephone.trim()
    if (options?.nomComplet?.trim()) updatePayload.nom_complet = options.nomComplet.trim()

    if (Object.keys(updatePayload).length > 0) {
      const { error: permError } = await supabase
        .from('utilisateurs')
        .update(updatePayload)
        .eq('id', created.user.id)
      if (permError) {
        return {
          error: `Compte créé, mais certaines métadonnées n'ont pas pu être enregistrées (${permError.message}).`,
        }
      }
    }
  }

  revalidatePath(`/admin/gies/${gieId}`)
  return { success: true }
}

// permissions = null : accès complet (comportement historique).
export async function changerPermissionsUtilisateur(
  gieId: string,
  utilisateurId: string,
  permissions: PermissionMap | null
): Promise<ActionResult> {
  const authError = await checkAdmin()
  if (authError) return { error: authError }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('utilisateurs')
    .update({ permissions: permissions ? sanitizePermissions(permissions) : null })
    .eq('id', utilisateurId)
    .eq('gie_id', gieId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  return { success: true }
}

export async function retirerUtilisateurDuGie(gieId: string, utilisateurId: string): Promise<ActionResult> {
  const authError = await checkAdmin()
  if (authError) return { error: authError }
  const refus = await refuserSiCompteAdmin(utilisateurId)
  if (refus) return { error: refus }

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
  const refus = await refuserSiCompteAdmin(utilisateurId)
  if (refus) return { error: refus }

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

  const echecsSuppressionAuth: string[] = []
  for (const u of utilisateurs ?? []) {
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(u.id)
    if (authDeleteError) echecsSuppressionAuth.push(`${u.id} (${authDeleteError.message})`)
  }

  if (echecsSuppressionAuth.length > 0) {
    return {
      error: `GIE supprimé, mais ${echecsSuppressionAuth.length} compte(s) auth n'ont pas pu être supprimés et restent orphelins : ${echecsSuppressionAuth.join(', ')}. Nettoyage manuel requis.`,
    }
  }

  return { success: true }
}
