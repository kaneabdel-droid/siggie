'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

export async function toggleMembreCampagne(campagne_id: string, membre_id: string, isEnrolled: boolean) {
  const denied = await requirePermission('campagnes', 'update')
  if (denied) return denied as never
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
  const denied = await requirePermission('campagnes', 'update')
  if (denied) return denied as never
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
  const denied = await requirePermission('campagnes', 'update')
  if (denied) return denied as never
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
  const denied = await requirePermission('campagnes', 'update')
  if (denied) return denied as never
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
  const denied = await requirePermission('campagnes', 'update')
  if (denied) return denied as never
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

export async function addRubrique(categorie: string, nature: string, libelle: string, compte: string) {
  const denied = await requirePermission('campagnes', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }
  if (userData.role !== 'admin') return { error: "Réservé à l'administrateur du GIE" }
  if (!libelle.trim() || !compte.trim()) return { error: "Rubrique et sous-rubrique requises" }

  const categorieValide = categorie === 'materiel' ? 'materiel' : 'exploitation'
  const natureValide = nature === 'recette' ? 'recette' : 'depense'

  const { error } = await supabase.from('imputations').insert({
    gie_id: userData.gie_id,
    libelle: libelle.trim(),
    compte: compte.trim(),
    categorie: categorieValide,
    nature: natureValide,
  })

  if (error) return { error: error.message }

  // Cette action ne reçoit pas de campagne_id (une rubrique n'appartient pas à
  // une campagne), donc pas de revalidatePath ciblé ici : l'appelant
  // (BudgetPrevisionsManager) déclenche un router.refresh() pour recharger la
  // liste des rubriques du GIE.
  return { success: true }
}

export async function setBudgetPrevision(campagne_id: string, imputation_id: string, montant_prevu: number) {
  const denied = await requirePermission('campagnes', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  const { error } = await supabase
    .from('budget_previsions')
    .upsert({
      gie_id: userData.gie_id,
      campagne_id,
      imputation_id,
      montant_prevu,
    }, { onConflict: 'campagne_id,imputation_id' })

  if (error) return { error: error.message }

  revalidatePath(`/campagnes/${campagne_id}/config`)
  return { success: true }
}
