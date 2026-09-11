'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { isStockableType } from '@/lib/intrants/types'

// Conserver l'ancienne fonction au cas où
export async function addDistribution(formData: FormData) {
  // ... existing code ...
  // (We'll just leave it or rewrite it if needed, but since we are replacing the UI, let's write the new functions)
}

// Option 1 : Distribution par Intrant
export async function addDistributionsByIntrant(campagne_id: string, intrant_id: string, distributions: { membre_id: string, quantite: number }[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()
    
  if (!userData) throw new Error("Utilisateur introuvable")

  // Filtrer les quantités valides
  const validDistributions = distributions.filter(d => d.quantite > 0)
  if (validDistributions.length === 0) return { error: "Aucune quantité valide à distribuer." }

  const totalQuantite = validDistributions.reduce((sum, d) => sum + d.quantite, 0)

  // Vérifier le stock global (les intrants non stockables, ex: Refacturation,
  // Service Hydraulique, n'ont pas de stock à vérifier ni à déduire)
  const { data: intrant } = await supabase
    .from('intrants')
    .select('quantite_stock, type_intrant')
    .eq('id', intrant_id)
    .single()

  if (!intrant) return { error: "Intrant introuvable" }
  const stockable = isStockableType(intrant.type_intrant)
  if (stockable && intrant.quantite_stock < totalQuantite) {
    return { error: `Stock insuffisant. Il ne reste que ${intrant.quantite_stock} unités disponibles, mais vous essayez de distribuer ${totalQuantite} unités.` }
  }

  // Préparer les données
  const rows = validDistributions.map(d => ({
    gie_id: userData.gie_id,
    campagne_id,
    membre_id: d.membre_id,
    intrant_id,
    quantite: d.quantite,
  }))

  // Insérer
  const { error: insertError } = await supabase.from('distribution_intrants').insert(rows)
  if (insertError) return { error: insertError.message }

  // Déduire le stock (uniquement pour les intrants stockables)
  if (stockable) {
    const { error: updateError } = await supabase
      .from('intrants')
      .update({ quantite_stock: intrant.quantite_stock - totalQuantite })
      .eq('id', intrant_id)

    if (updateError) return { error: "Distribution enregistrée mais erreur lors de la mise à jour du stock." }
  }

  revalidatePath('/distribution')
  revalidatePath('/intrants')
  return { success: true }
}

// Option 2 : Distribution par Membre
export async function addDistributionsByMembre(campagne_id: string, membre_id: string, distributions: { intrant_id: string, quantite: number }[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()
    
  if (!userData) throw new Error("Utilisateur introuvable")

  // Filtrer
  const validDistributions = distributions.filter(d => d.quantite > 0)
  if (validDistributions.length === 0) return { error: "Aucune quantité valide à distribuer." }

  // Vérifier les stocks pour CHAQUE intrant stockable (on pourrait faire un in, mais pour
  // simplifier on fait une boucle, c'est peu de produits en général). Les intrants non
  // stockables (ex: Refacturation, Service Hydraulique) n'ont pas de stock à vérifier.
  for (const d of validDistributions) {
    const { data: intrant } = await supabase
      .from('intrants')
      .select('quantite_stock, nom, type_intrant')
      .eq('id', d.intrant_id)
      .single()

    if (!intrant) return { error: "Un intrant est introuvable." }
    if (isStockableType(intrant.type_intrant) && intrant.quantite_stock < d.quantite) {
      return { error: `Stock insuffisant pour ${intrant.nom}. Il reste ${intrant.quantite_stock} mais vous demandez ${d.quantite}.` }
    }
  }

  // Préparer les données
  const rows = validDistributions.map(d => ({
    gie_id: userData.gie_id,
    campagne_id,
    membre_id,
    intrant_id: d.intrant_id,
    quantite: d.quantite,
  }))

  // Insérer
  const { error: insertError } = await supabase.from('distribution_intrants').insert(rows)
  if (insertError) return { error: insertError.message }

  // Déduire les stocks individuellement (intrants stockables uniquement)
  for (const d of validDistributions) {
    // on a déjà vérifié plus haut qu'on a le stock, on refait un get/set (attention concurence, mais c'est ok pour ce stade)
    const { data: intrant } = await supabase.from('intrants').select('quantite_stock, type_intrant').eq('id', d.intrant_id).single()
    if (intrant && isStockableType(intrant.type_intrant)) {
      await supabase.from('intrants').update({ quantite_stock: intrant.quantite_stock - d.quantite }).eq('id', d.intrant_id)
    }
  }

  revalidatePath('/distribution')
  revalidatePath('/intrants')
  return { success: true }
}

export async function deleteDistribution(id: string) {
  const supabase = await createClient()

  // On récupère d'abord les infos de la distribution pour restaurer le stock
  const { data: distribution } = await supabase
    .from('distribution_intrants')
    .select('intrant_id, quantite')
    .eq('id', id)
    .single()

  if (!distribution) {
    return { error: "Distribution introuvable" }
  }

  // On supprime la distribution
  const { error: deleteError } = await supabase
    .from('distribution_intrants')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error("Erreur suppression distribution:", deleteError)
    return { error: deleteError.message }
  }

  // On restaure le stock (intrants stockables uniquement)
  const { data: intrant } = await supabase
    .from('intrants')
    .select('quantite_stock, type_intrant')
    .eq('id', distribution.intrant_id)
    .single()

  if (intrant && isStockableType(intrant.type_intrant)) {
    await supabase
      .from('intrants')
      .update({ quantite_stock: intrant.quantite_stock + distribution.quantite })
      .eq('id', distribution.intrant_id)
  }

  revalidatePath('/distribution')
  revalidatePath('/intrants')
  return { success: true }
}

export async function updateDistribution(id: string, newQuantite: number) {
  const supabase = await createClient()

  const { data: distribution } = await supabase
    .from('distribution_intrants')
    .select('intrant_id, quantite')
    .eq('id', id)
    .single()

  if (!distribution) {
    return { error: "Distribution introuvable" }
  }

  if (distribution.quantite === newQuantite) {
    return { success: true }
  }

  const { data: intrant } = await supabase
    .from('intrants')
    .select('quantite_stock, type_intrant')
    .eq('id', distribution.intrant_id)
    .single()

  if (!intrant) {
    return { error: "Intrant introuvable" }
  }

  const stockable = isStockableType(intrant.type_intrant)
  const difference = newQuantite - distribution.quantite

  if (stockable && difference > 0 && intrant.quantite_stock < difference) {
    return { error: `Stock insuffisant. Il ne reste que ${intrant.quantite_stock} unités.` }
  }

  const { error: updateError } = await supabase
    .from('distribution_intrants')
    .update({ quantite: newQuantite })
    .eq('id', id)

  if (updateError) {
    return { error: updateError.message }
  }

  if (stockable) {
    await supabase
      .from('intrants')
      .update({ quantite_stock: intrant.quantite_stock - difference })
      .eq('id', distribution.intrant_id)
  }

  revalidatePath('/distribution')
  revalidatePath('/intrants')
  return { success: true }
}
