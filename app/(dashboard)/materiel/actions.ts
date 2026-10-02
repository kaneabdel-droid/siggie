'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'
import { getDictionary, getLocale } from '@/dictionaries'

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
  fournisseur: string,
  type_materiel: string
) {
  const denied = await requirePermission('materiel', 'create')
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
    .from('materiels')
    .insert({
      gie_id: userData.gie_id,
      nom,
      etat,
      date_acquisition: date_acquisition || null,
      valeur_acquisition,
      duree_vie_economique,
      fournisseur: fournisseur || null,
      type_materiel
    })

  if (error) return { error: error.message }

  revalidatePath('/materiel')
  return { success: true }
}

export async function updateMaterielEtat(id: string, nouvelEtat: string) {
  const denied = await requirePermission('materiel', 'update')
  if (denied) return denied as never
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
  fournisseur: string,
  type_materiel: string
) {
  const denied = await requirePermission('materiel', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { error } = await supabase
    .from('materiels')
    .update({
      nom,
      etat,
      date_acquisition: date_acquisition || null,
      valeur_acquisition,
      duree_vie_economique,
      fournisseur: fournisseur || null,
      type_materiel
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/materiel')
  return { success: true }
}


export async function deleteMateriel(id: string) {
  const denied = await requirePermission('materiel', 'delete')
  if (denied) return denied as never
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
      materiel:materiel_id (nom),
      produit:produit_id (nom),
      campagne:campagne_id (nom)
    `)
    .order('date_prestation', { ascending: false })

  if (error) return { error: error.message }
  return { prestations }
}

const UNITES_PRESTATION = ['ha', 'h', 'sac', 'autre'] as const

function nombre(fd: FormData, cle: string) {
  const v = String(fd.get(cle) ?? '').trim().replace(',', '.')
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

function texte(fd: FormData, cle: string) {
  const v = String(fd.get(cle) ?? '').trim()
  return v || null
}

/** Lit et contrôle le pointage d'une prestation (unité, quantités, variété, téléphone, part de récolte). */
async function lirePointage(fd: FormData, supabase: Awaited<ReturnType<typeof createClient>>) {
  const t = (await getDictionary(await getLocale())).materiel_pages.prestations.errors

  const unite = String(fd.get('unite') ?? 'ha')
  if (!(UNITES_PRESTATION as readonly string[]).includes(unite)) return { error: t.unit }
  const unite_autre = unite === 'autre' ? texte(fd, 'unite_autre') : null
  if (unite === 'autre' && !unite_autre) return { error: t.unit_other }

  const quantite_traitee = nombre(fd, 'quantite_traitee')
  if (quantite_traitee === null || Number.isNaN(quantite_traitee) || quantite_traitee <= 0) return { error: t.quantity }

  const client_telephone = texte(fd, 'client_telephone')
  if (!client_telephone || client_telephone.replace(/\D/g, '').length < 7) return { error: t.phone }

  const produit_id = texte(fd, 'produit_id')
  let variete = texte(fd, 'variete')
  if (produit_id) {
    const { data: produit } = await supabase.from('materiel_produits').select('variete_obligatoire').eq('id', produit_id).single()
    if (!produit) return { error: t.product }
    if (produit.variete_obligatoire && !variete) return { error: t.variety }
  } else {
    variete = null
  }

  const quantite_obtenue = nombre(fd, 'quantite_obtenue')
  if (Number.isNaN(quantite_obtenue) || (quantite_obtenue !== null && quantite_obtenue < 0)) return { error: t.obtained }

  const mode_paiement = fd.get('mode_paiement') === 'part_recolte' ? 'part_recolte' : 'especes'
  const taux_part = mode_paiement === 'part_recolte' ? nombre(fd, 'taux_part') : null
  const prix_unitaire_part = mode_paiement === 'part_recolte' ? nombre(fd, 'prix_unitaire_part') : null
  if (mode_paiement === 'part_recolte') {
    if (!quantite_obtenue) return { error: t.obtained_required }
    if (taux_part === null || Number.isNaN(taux_part) || taux_part <= 0 || taux_part > 100) return { error: t.rate }
    if (Number.isNaN(prix_unitaire_part) || (prix_unitaire_part !== null && prix_unitaire_part < 0)) return { error: t.amount }
  }

  const tarif_unitaire = mode_paiement === 'especes' ? nombre(fd, 'tarif_unitaire') : null
  if (Number.isNaN(tarif_unitaire) || (tarif_unitaire !== null && tarif_unitaire < 0)) return { error: t.amount }

  const montant_facture = nombre(fd, 'montant_facture') ?? 0
  if (Number.isNaN(montant_facture) || montant_facture < 0) return { error: t.amount }

  const materiel_id = texte(fd, 'materiel_id')
  const type_prestation = texte(fd, 'type_prestation')
  const date_prestation = texte(fd, 'date_prestation')
  if (!materiel_id || !type_prestation || !date_prestation) return { error: t.required }

  return {
    valeurs: {
      materiel_id,
      // Imputation au budget Matériel de la campagne (réalisé du suivi budgétaire).
      campagne_id: texte(fd, 'campagne_id'),
      type_prestation,
      date_prestation,
      client_nom: texte(fd, 'client_nom'),
      client_telephone,
      unite,
      unite_autre,
      quantite_traitee,
      // La superficie reste alimentée pour les prestations à l'hectare (rapports existants).
      superficie: unite === 'ha' ? quantite_traitee : 0,
      tarif_unitaire,
      produit_id,
      variete,
      quantite_obtenue,
      unite_obtenue: quantite_obtenue !== null ? texte(fd, 'unite_obtenue') ?? 'sac' : null,
      mode_paiement,
      taux_part,
      prix_unitaire_part,
      montant_facture,
    },
  }
}

export async function addPrestation(fd: FormData) {
  const denied = await requirePermission('materiel_prestations', 'create')
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

  const pointage = await lirePointage(fd, supabase)
  if ('error' in pointage) return { error: pointage.error }

  const { error } = await supabase
    .from('materiel_prestations')
    .insert({ gie_id: userData.gie_id, ...pointage.valeurs, pointe_par: user.id })

  if (error) return { error: error.message }

  revalidatePath('/materiel/prestations')
  return { success: true }
}

export async function deletePrestation(id: string) {
  const denied = await requirePermission('materiel_prestations', 'delete')
  if (denied) return denied as never
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
  date_consommation: string,
  campagne_id: string | null = null
) {
  const denied = await requirePermission('materiel_consommations', 'create')
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
    .from('materiel_consommations')
    .insert({
      gie_id: userData.gie_id,
      materiel_id,
      type_consommation,
      fournisseur,
      quantite,
      montant_total,
      date_consommation,
      campagne_id: campagne_id || null
    })

  if (error) return { error: error.message }

  revalidatePath('/materiel/consommations')
  return { success: true }
}

export async function deleteConsommation(id: string) {
  const denied = await requirePermission('materiel_consommations', 'delete')
  if (denied) return denied as never
  const supabase = await createClient()

  const { error } = await supabase
    .from('materiel_consommations')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/materiel/consommations')
  return { success: true }
}

export async function updatePrestation(id: string, fd: FormData) {
  const denied = await requirePermission('materiel_prestations', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const pointage = await lirePointage(fd, supabase)
  if ('error' in pointage) return { error: pointage.error }

  const { error } = await supabase
    .from('materiel_prestations')
    .update(pointage.valeurs)
    .eq('id', id)

  if (error) {
    console.error(error)
    return { error: 'Erreur lors de la modification de la prestation' }
  }

  revalidatePath('/materiel')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Référentiel des produits pointés (variété obligatoire ou non)
// ---------------------------------------------------------------------------

/**
 * Campagnes et sous-rubriques du budget Matériel : chaque prestation (recette) ou consommation (dépense) imputée à une
 * campagne alimente le réalisé de la rubrique « équipement / type » du suivi budgétaire.
 */
export async function getContexteBudgetMateriel() {
  const supabase = await createClient()
  const [{ data: campagnes }, { data: imputations }] = await Promise.all([
    supabase.from('campagnes').select('id, nom, statut, date_debut').order('date_debut', { ascending: false, nullsFirst: false }),
    supabase.from('imputations').select('libelle, compte, nature').eq('categorie', 'materiel').order('compte'),
  ])
  const types = (nature: string) => (imputations || []).filter((i) => i.nature === nature).map((i) => ({ type: i.compte, materiel: i.libelle }))
  return {
    campagnes: (campagnes || []).map((c) => ({ id: c.id, nom: c.nom })),
    defaultCampagneId: (campagnes || []).find((c) => c.statut === 'en_cours')?.id ?? '',
    typesRecette: types('recette'),
    typesDepense: types('depense'),
  }
}

export async function getProduitsMateriel() {
  const supabase = await createClient()
  const { data: produits, error } = await supabase
    .from('materiel_produits')
    .select('id, nom, unite, variete_obligatoire')
    .order('nom')
  if (error) return { error: error.message }
  return { produits }
}

/** Variétés déjà pointées, proposées en suggestion pour chaque produit. */
export async function getVarietesPointees() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('materiel_prestations')
    .select('produit_id, variete')
    .not('variete', 'is', null)
    .not('produit_id', 'is', null)
  const parProduit: Record<string, string[]> = {}
  for (const l of data || []) {
    const liste = (parProduit[l.produit_id] ??= [])
    if (!liste.includes(l.variete)) liste.push(l.variete)
  }
  return parProduit
}

export async function saveProduitMateriel(fd: FormData) {
  const id = texte(fd, 'id')
  const denied = await requirePermission('materiel_prestations', id ? 'update' : 'create')
  if (denied) return denied as never
  const supabase = await createClient()
  const t = (await getDictionary(await getLocale())).materiel_pages.prestations.errors

  const nom = texte(fd, 'nom')
  if (!nom) return { error: t.required }
  const valeurs = { nom, unite: texte(fd, 'unite') ?? 'sac', variete_obligatoire: fd.get('variete_obligatoire') === 'on' }

  let error
  if (id) {
    ;({ error } = await supabase.from('materiel_produits').update(valeurs).eq('id', id))
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Non authentifié" }
    const { data: userData } = await supabase.from('utilisateurs').select('gie_id').eq('id', user.id).single()
    if (!userData) return { error: "Utilisateur introuvable" }
    ;({ error } = await supabase.from('materiel_produits').insert({ gie_id: userData.gie_id, ...valeurs }))
  }

  if (error) return { error: error.code === '23505' ? t.product_exists : error.message }

  revalidatePath('/materiel/prestations')
  return { success: true }
}

export async function deleteProduitMateriel(id: string) {
  const denied = await requirePermission('materiel_prestations', 'delete')
  if (denied) return denied as never
  const supabase = await createClient()

  const { error } = await supabase.from('materiel_produits').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/materiel/prestations')
  return { success: true }
}

export async function updateConsommation(
  id: string,
  materiel_id: string,
  type_consommation: string,
  fournisseur: string,
  quantite: number,
  montant_total: number,
  date_consommation: string,
  campagne_id: string | null = null
) {
  const denied = await requirePermission('materiel_consommations', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { error } = await supabase
    .from('materiel_consommations')
    .update({ 
      materiel_id, 
      type_consommation, 
      fournisseur, 
      quantite, 
      montant_total, 
      date_consommation,
      campagne_id: campagne_id || null
    })
    .eq('id', id)

  if (error) {
    console.error(error)
    return { error: 'Erreur lors de la modification de la consommation' }
  }

  revalidatePath('/materiel')
  return { success: true }
}
