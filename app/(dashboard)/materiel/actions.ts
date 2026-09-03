'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getMateriels() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: materiels, error } = await supabase
    .from('materiels')
    .select('*')
    .order('nom')

  if (error) {
    console.error(error)
    return { error: error.message }
  }

  return { materiels }
}

export async function addMateriel(
  nom: string, 
  etat: string, 
  date_acquisition: string | undefined, 
  valeur_acquisition: number, 
  duree_vie_economique: number, 
  fournisseur: string
) {
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
    .from('materiels')
    .insert({
      gie_id: userData.gie_id,
      nom,
      etat,
      date_acquisition: date_acquisition || null,
      valeur_acquisition,
      duree_vie_economique,
      fournisseur: fournisseur || null
    })

  if (error) return { error: error.message }

  revalidatePath('/materiel')
  return { success: true }
}

export async function updateMaterielEtat(id: string, nouvelEtat: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('materiels')
    .update({ etat: nouvelEtat })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/materiel')
  return { success: true }
}

export async function updateMateriel(
  id: string, 
  nom: string, 
  etat: string, 
  date_acquisition: string | undefined, 
  valeur_acquisition: number, 
  duree_vie_economique: number, 
  fournisseur: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('materiels')
    .update({
      nom,
      etat,
      date_acquisition: date_acquisition || null,
      valeur_acquisition,
      duree_vie_economique,
      fournisseur: fournisseur || null
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/materiel')
  return { success: true }
}


export async function deleteMateriel(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('materiels')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/materiel')
  return { success: true }
}

export async function getPrestations() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: prestations, error } = await supabase
    .from('materiel_prestations')
    .select(`
      *,
      materiel:materiel_id (nom)
    `)
    .order('date_prestation', { ascending: false })

  if (error) return { error: error.message }
  return { prestations }
}

export async function addPrestation(
  materiel_id: string,
  type_prestation: string,
  client_nom: string,
  superficie: number,
  montant_facture: number,
  date_prestation: string
) {
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
    .from('materiel_prestations')
    .insert({
      gie_id: userData.gie_id,
      materiel_id,
      type_prestation,
      client_nom,
      superficie,
      montant_facture,
      date_prestation
    })

  if (error) return { error: error.message }

  revalidatePath('/materiel/prestations')
  return { success: true }
}

export async function deletePrestation(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('materiel_prestations')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/materiel/prestations')
  return { success: true }
}

export async function getConsommations() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: consommations, error } = await supabase
    .from('materiel_consommations')
    .select(`
      *,
      materiel:materiel_id (nom)
    `)
    .order('date_consommation', { ascending: false })

  if (error) return { error: error.message }
  return { consommations }
}

export async function getRentabiliteMateriels() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()
    
  if (!userData) throw new Error("Utilisateur introuvable")

  // Récupérer tout le matériel
  const { data: materiels } = await supabase
    .from('materiels')
    .select('*')
    .eq('gie_id', userData.gie_id)

  // Récupérer toutes les prestations
  const { data: prestations } = await supabase
    .from('materiel_prestations')
    .select('materiel_id, montant_facture')
    .eq('gie_id', userData.gie_id)

  // Récupérer toutes les consommations
  const { data: consommations } = await supabase
    .from('materiel_consommations')
    .select('materiel_id, montant_total')
    .eq('gie_id', userData.gie_id)

  // Agréger les données par matériel
  const rentabilite = (materiels || []).map(mat => {
    const recettes = (prestations || [])
      .filter(p => p.materiel_id === mat.id)
      .reduce((sum, p) => sum + (p.montant_facture || 0), 0)

    const depenses = (consommations || [])
      .filter(c => c.materiel_id === mat.id)
      .reduce((sum, c) => sum + (c.montant_total || 0), 0)

    // Calcul de l'amortissement annuel linéaire basique
    // Amortissement = Valeur / Durée de vie
    let amortissement_annuel = 0
    let amortissement_cumule = 0

    if (mat.valeur_acquisition && mat.duree_vie_economique && mat.date_acquisition) {
      amortissement_annuel = mat.valeur_acquisition / mat.duree_vie_economique
      
      const dateAcq = new Date(mat.date_acquisition)
      const now = new Date()
      // Nombre d'années écoulées (approximatif)
      const annees_ecoulees = (now.getTime() - dateAcq.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      
      amortissement_cumule = Math.min(
        mat.valeur_acquisition, // Ne pas amortir plus que la valeur
        amortissement_annuel * Math.max(0, annees_ecoulees)
      )
    }

    const solde_net = recettes - depenses
    const solde_apres_amortissement = solde_net - amortissement_cumule

    return {
      ...mat,
      recettes,
      depenses,
      amortissement_annuel,
      amortissement_cumule,
      solde_net,
      solde_apres_amortissement
    }
  })

  return { rentabilite }
}

export async function addConsommation(
  materiel_id: string,
  type_consommation: string,
  fournisseur: string,
  quantite: number,
  montant_total: number,
  date_consommation: string
) {
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
    .from('materiel_consommations')
    .insert({
      gie_id: userData.gie_id,
      materiel_id,
      type_consommation,
      fournisseur,
      quantite,
      montant_total,
      date_consommation
    })

  if (error) return { error: error.message }

  revalidatePath('/materiel/consommations')
  return { success: true }
}

export async function deleteConsommation(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('materiel_consommations')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/materiel/consommations')
  return { success: true }
}

export async function updatePrestation(
  id: string,
  materiel_id: string,
  type_prestation: string,
  client_nom: string,
  superficie: number,
  montant_facture: number,
  date_prestation: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('materiel_prestations')
    .update({ 
      materiel_id, 
      type_prestation, 
      client_nom, 
      superficie, 
      montant_facture, 
      date_prestation 
    })
    .eq('id', id)

  if (error) {
    console.error(error)
    return { error: 'Erreur lors de la modification de la prestation' }
  }

  revalidatePath('/materiel')
  return { success: true }
}

export async function updateConsommation(
  id: string,
  materiel_id: string,
  type_consommation: string,
  fournisseur: string,
  quantite: number,
  montant_total: number,
  date_consommation: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('materiel_consommations')
    .update({ 
      materiel_id, 
      type_consommation, 
      fournisseur, 
      quantite, 
      montant_total, 
      date_consommation 
    })
    .eq('id', id)

  if (error) {
    console.error(error)
    return { error: 'Erreur lors de la modification de la consommation' }
  }

  revalidatePath('/materiel')
  return { success: true }
}
