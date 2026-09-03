'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCampagne(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()
    
  if (!userData) throw new Error("Utilisateur introuvable")

  const data = {
    gie_id: userData.gie_id,
    nom: formData.get('nom'),
    date_debut: formData.get('date_debut') || null,
    date_fin: formData.get('date_fin') || null,
    mode_remboursement: formData.get('mode_remboursement') || 'mixte',
    produit_collecte: formData.get('produit_collecte'),
    prix_collecte: formData.get('prix_collecte') ? parseFloat(formData.get('prix_collecte') as string) : null,
    poids_standard: formData.get('poids_standard') ? parseFloat(formData.get('poids_standard') as string) : null,
    statut: formData.get('statut') || 'en_cours'
  }

  const { error } = await supabase.from('campagnes').insert([data])

  if (error) {
    console.error("Erreur ajout campagne:", error)
    return { error: error.message }
  }

  revalidatePath('/campagnes')
  return { success: true }
}

export async function updateCampagne(id: string, formData: FormData) {
  const supabase = await createClient()

  const data = {
    nom: formData.get('nom'),
    date_debut: formData.get('date_debut') || null,
    date_fin: formData.get('date_fin') || null,
    mode_remboursement: formData.get('mode_remboursement') || 'mixte',
    produit_collecte: formData.get('produit_collecte'),
    prix_collecte: formData.get('prix_collecte') ? parseFloat(formData.get('prix_collecte') as string) : null,
    poids_standard: formData.get('poids_standard') ? parseFloat(formData.get('poids_standard') as string) : null,
    statut: formData.get('statut') || 'en_cours'
  }

  const { error } = await supabase
    .from('campagnes')
    .update(data)
    .eq('id', id)

  if (error) {
    console.error("Erreur modification campagne:", error)
    return { error: error.message }
  }

  revalidatePath('/campagnes')
  return { success: true }
}

export async function deleteCampagne(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('campagnes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Erreur suppression campagne:", error)
    return { error: error.message }
  }

  revalidatePath('/campagnes')
  return { success: true }
}
