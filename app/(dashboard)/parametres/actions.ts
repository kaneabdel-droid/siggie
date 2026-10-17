'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { estDeviseValide } from '@/lib/currency'
import { requirePermission } from '@/utils/supabase/permissions'

type ActionResult = { success?: true; error?: string; logoUrl?: string }

export async function updateGieInfos(formData: FormData): Promise<ActionResult> {
  const denied = await requirePermission('parametres', 'update')
  if (denied) return denied as never
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non autorisé' }
  const supabase = await createClient()

  const nom = (formData.get('nom') as string)?.trim()
  const adresse = (formData.get('adresse') as string) ?? ''
  const telephone = (formData.get('telephone') as string) ?? ''
  const email = (formData.get('email') as string) ?? ''
  const identification = (formData.get('identification') as string) ?? ''
  const devise = formData.get('devise') as string

  if (!nom) return { error: 'Le nom est requis' }
  if (!estDeviseValide(devise)) return { error: 'Devise invalide' }

  const { error } = await supabase.rpc('update_gie_infos', {
    p_nom: nom,
    p_adresse: adresse,
    p_telephone: telephone,
    p_email: email,
    p_identification: identification,
    p_devise: devise,
  })
  if (error) return { error: error.message }

  revalidatePath('/parametres')
  return { success: true }
}

// Upload distinct de la mise à jour du formulaire : le logo se remplace
// indépendamment des autres champs via update_gie_logo, une fois l'upload
// Storage terminé et l'URL publique connue.
export async function uploadLogo(formData: FormData): Promise<ActionResult> {
  const denied = await requirePermission('parametres', 'update')
  if (denied) return denied as never
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non autorisé' }
  const supabase = await createClient()

  const file = formData.get('logo') as File | null
  if (!file || file.size === 0) return { error: 'Aucun fichier sélectionné' }
  if (!file.type.startsWith('image/')) return { error: 'Le fichier doit être une image' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Image trop volumineuse (max 2 Mo)' }

  const extension = file.name.split('.').pop() || 'png'
  const path = `${tenant.gieId}/logo.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) return { error: uploadError.message }

  const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(path)
  const logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const { error: rpcError } = await supabase.rpc('update_gie_logo', { p_logo_url: logoUrl })
  if (rpcError) return { error: rpcError.message }

  revalidatePath('/parametres')
  return { success: true, logoUrl }
}

import { createAdminClient } from '@/utils/supabase/admin'
import { genererEmailSynthetique, normaliserIdentifiant } from '@/lib/auth-identifier'
import { sanitizePermissions, type PermissionMap } from '@/lib/permissions'

export async function creerCollaborateur(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const tenant = await getTenantContext()
  if (!tenant || tenant.role !== 'admin') {
    return { error: "Seul l'administrateur du GIE peut ajouter des collaborateurs." }
  }

  const rawIdentifiant = (formData.get('identifiant') as string)?.trim()
  const nomComplet = (formData.get('nom_complet') as string)?.trim() || null
  const telephone = (formData.get('telephone') as string)?.trim() || null
  const emailInput = (formData.get('email') as string)?.trim() || ''
  const password = (formData.get('password') as string) || ''
  const role = ((formData.get('role') as string)?.trim()) || 'collaborateur'
  const rawPerms = formData.get('permissions') as string | null

  if (!rawIdentifiant) {
    return { error: "L'identifiant ou numéro de téléphone est obligatoire." }
  }

  const identifiant = normaliserIdentifiant(rawIdentifiant)
  if (identifiant.length < 3) {
    return { error: "L'identifiant doit comporter au moins 3 caractères." }
  }

  if (!password || password.length < 6) {
    return { error: 'Le mot de passe doit comporter au moins 6 caractères.' }
  }

  let permissions: PermissionMap | null = null
  if (rawPerms) {
    try {
      permissions = sanitizePermissions(JSON.parse(rawPerms))
    } catch {
      // Ignorer si invalide
    }
  }

  // Détermination de l'e-mail auth : soit réel si fourni par l'utilisateur, soit alias synthétique interne
  const authEmail = emailInput ? emailInput.toLowerCase() : genererEmailSynthetique(identifiant)

  const adminSupabase = createAdminClient()

  // 1. Vérification unicité identifiant / téléphone dans le GIE
  const { data: existant } = await adminSupabase
    .from('utilisateurs')
    .select('id')
    .or(`identifiant.ilike.${identifiant}${telephone ? `,telephone.eq.${telephone}` : ''}`)
    .maybeSingle()

  if (existant) {
    return { error: 'Cet identifiant ou numéro de téléphone est déjà utilisé par un autre collaborateur.' }
  }

  // 2. Création auth.users
  const { data: authCreated, error: authError } = await adminSupabase.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      existing_gie_id: tenant.gieId,
      role,
      identifiant,
      telephone,
      nom_complet: nomComplet,
    },
  })

  if (authError) {
    if (authError.message.toLowerCase().includes('already') || authError.message.toLowerCase().includes('registered')) {
      return { error: `L'identifiant "${rawIdentifiant}" ou cet e-mail est déjà utilisé. Veuillez choisir un identifiant différent (ou utiliser le numéro de téléphone).` }
    }
    return { error: `Échec de création du compte : ${authError.message}` }
  }

  // 3. Mise à jour de public.utilisateurs
  if (authCreated.user) {
    const { error: userError } = await adminSupabase
      .from('utilisateurs')
      .update({
        identifiant,
        telephone,
        nom_complet: nomComplet,
        role,
        permissions,
      })
      .eq('id', authCreated.user.id)

    if (userError) {
      return { error: `Compte créé, mais métadonnées partielles : ${userError.message}` }
    }
  }

  revalidatePath('/parametres')
  return { success: true }
}

export async function supprimerCollaborateur(collaborateurId: string): Promise<{ success?: boolean; error?: string }> {
  const tenant = await getTenantContext()
  if (!tenant || tenant.role !== 'admin') {
    return { error: 'Action réservée aux administrateurs.' }
  }

  if (collaborateurId === tenant.userId) {
    return { error: 'Vous ne pouvez pas supprimer votre propre compte administrateur.' }
  }

  const adminSupabase = createAdminClient()

  // Vérifier appartenance au même GIE
  const { data: cible } = await adminSupabase
    .from('utilisateurs')
    .select('id, role')
    .eq('id', collaborateurId)
    .eq('gie_id', tenant.gieId)
    .maybeSingle()

  if (!cible) {
    return { error: 'Collaborateur introuvable dans votre GIE.' }
  }

  // Supprimer profil utilisateur
  const { error: delProfileError } = await adminSupabase
    .from('utilisateurs')
    .delete()
    .eq('id', collaborateurId)
    .eq('gie_id', tenant.gieId)

  if (delProfileError) {
    return { error: delProfileError.message }
  }

  // Supprimer du service Auth Supabase
  await adminSupabase.auth.admin.deleteUser(collaborateurId)

  revalidatePath('/parametres')
  return { success: true }
}

export async function genererLienResetCollaborateur(collaborateurId: string): Promise<{
  success?: boolean
  error?: string
  link?: string
  telephone?: string | null
  identifiant?: string | null
  nomComplet?: string | null
}> {
  const tenant = await getTenantContext()
  if (!tenant || tenant.role !== 'admin') {
    return { error: 'Action réservée aux administrateurs.' }
  }

  const adminSupabase = createAdminClient()

  const { data: cible } = await adminSupabase
    .from('utilisateurs')
    .select('id, identifiant, telephone, nom_complet')
    .eq('id', collaborateurId)
    .eq('gie_id', tenant.gieId)
    .maybeSingle()

  if (!cible) {
    return { error: 'Collaborateur introuvable.' }
  }

  const { data: authUser, error: authErr } = await adminSupabase.auth.admin.getUserById(collaborateurId)
  if (authErr || !authUser?.user?.email) {
    return { error: 'Compte d’authentification introuvable.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectTo = `${siteUrl}/auth/callback?next=/update-password`

  const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
    type: 'recovery',
    email: authUser.user.email,
    options: { redirectTo },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return { error: linkError?.message || 'Impossible de générer le lien de récupération.' }
  }

  return {
    success: true,
    link: linkData.properties.action_link,
    telephone: cible.telephone,
    identifiant: cible.identifiant,
    nomComplet: cible.nom_complet,
  }
}

export async function modifierRoleEtPermissionsCollaborateur(
  collaborateurId: string,
  role: string,
  permissions: PermissionMap | null
): Promise<{ success?: boolean; error?: string }> {
  const tenant = await getTenantContext()
  if (!tenant || tenant.role !== 'admin') {
    return { error: 'Action réservée aux administrateurs.' }
  }

  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('utilisateurs')
    .update({
      role: role.trim() || 'collaborateur',
      permissions: permissions ? sanitizePermissions(permissions) : null,
    })
    .eq('id', collaborateurId)
    .eq('gie_id', tenant.gieId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/parametres')
  return { success: true }
}

