'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleMembreCampagne(campagne_id: string, membre_id: string, isEnrolled: boolean) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()
    
  if (!userData) throw new Error("Utilisateur introuvable")

  if (isEnrolled) {
    // Supprimer l'inscription
    const { error } = await supabase
      .from('campagne_membres')
      .delete()
      .match({ campagne_id, membre_id, gie_id: userData.gie_id })
      
    if (error) return { error: error.message }
  } else {
    // Ajouter l'inscription : la superficie déclarée par défaut pour cette campagne
    // reprend la superficie du membre (modifiable ensuite au cas par cas).
    const { data: membre } = await supabase
      .from('membres')
      .select('superficie')
      .eq('id', membre_id)
      .single()

    const { error } = await supabase
      .from('campagne_membres')
      .insert([{
        campagne_id,
        membre_id,
        gie_id: userData.gie_id,
        superficie: membre?.superficie || 0
      }])

    if (error) return { error: error.message }
  }

  revalidatePath(`/campagnes/${campagne_id}/config`)
  revalidatePath('/distribution')
  return { success: true }
}

export async function updateSuperficieCampagneMembre(campagne_id: string, membre_id: string, superficie: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('campagne_membres')
    .update({ superficie })
    .match({ campagne_id, membre_id })

  if (error) return { error: error.message }

  revalidatePath(`/campagnes/${campagne_id}/config`)
  revalidatePath('/distribution')
  return { success: true }
}

export async function addCampagneIntrant(campagne_id: string, intrant_id: string, prix_facturation: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()
    
  if (!userData) throw new Error("Utilisateur introuvable")

  const { error } = await supabase
    .from('campagne_intrants')
    .insert([{
      campagne_id,
      intrant_id,
      prix_facturation,
      gie_id: userData.gie_id
    }])
    
  if (error) return { error: error.message }

  revalidatePath(`/campagnes/${campagne_id}/config`)
  revalidatePath('/distribution')
  return { success: true }
}

export async function removeCampagneIntrant(campagne_intrant_id: string, campagne_id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('campagne_intrants')
    .delete()
    .eq('id', campagne_intrant_id)

  if (error) return { error: error.message }

  revalidatePath(`/campagnes/${campagne_id}/config`)
  revalidatePath('/distribution')
  return { success: true }
}

export async function updateCampagneIntrant(campagne_intrant_id: string, campagne_id: string, prix_facturation: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('campagne_intrants')
    .update({ prix_facturation })
    .eq('id', campagne_intrant_id)

  if (error) return { error: error.message }

  revalidatePath(`/campagnes/${campagne_id}/config`)
  revalidatePath('/distribution')
  return { success: true }
}
