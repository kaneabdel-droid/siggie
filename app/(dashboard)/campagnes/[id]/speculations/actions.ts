'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'
import {
  CampagneSpeculation,
  MembreSpeculationEntry,
  SyntheseSpeculation,
  RecapitulatifMembre,
  MembreSpeculationDetail,
  extraireTagSpeculation,
  extraireParcellesObservations,
  encoderParcellesObservations,
} from '@/lib/speculations'
import { getCreditSpeculationId, getCreditSpeculationNom } from '@/lib/credits-types'

function formatSupabaseError(err: any): string {
  if (!err) return "Une erreur inattendue est survenue."
  return err.message || String(err)
}

function getDbClient(fallback: any) {
  try {
    return createAdminClient()
  } catch {
    return fallback
  }
}

export async function getSpeculationsCampagne(campagneId: string): Promise<CampagneSpeculation[]> {
  const supabase = await createClient()

  // 1. Tenter lecture depuis la table dédiée si existante
  try {
    const { data, error } = await supabase
      .from('campagne_speculations')
      .select('*')
      .eq('campagne_id', campagneId)
      .order('created_at', { ascending: true })

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        campagne_id: d.campagne_id,
        gie_id: d.gie_id,
        nom: d.nom,
        variete: d.variete,
        produit_collecte: d.produit_collecte,
        prix_collecte: Number(d.prix_collecte || 0),
        poids_standard: Number(d.poids_standard || 50),
        unite_mesure: d.unite_mesure || 'kg',
        credit_alloue: Number(d.credit_alloue || 0),
        rendement_prevu_tonne_ha: Number(d.rendement_prevu_tonne_ha || 0),
        statut: d.statut || 'active',
        created_at: d.created_at,
      }))
    }
  } catch {
    // bascule automatique
  }

  // 2. Tenter lecture depuis le stockage automatique (imputations compte = SPEC:campagneId)
  try {
    const db = getDbClient(supabase)
    const { data: impData, error: impError } = await db
      .from('imputations')
      .select('*')
      .eq('compte', `SPEC:${campagneId}`)
      .order('created_at', { ascending: true })

    if (!impError && impData && impData.length > 0) {
      const parsedList: CampagneSpeculation[] = []
      for (const row of impData) {
        try {
          const meta = JSON.parse(row.libelle)
          parsedList.push({
            id: row.id,
            campagne_id: campagneId,
            gie_id: row.gie_id,
            nom: meta.nom || 'Culture',
            variete: meta.variete || null,
            produit_collecte: meta.produit_collecte || meta.nom,
            prix_collecte: Number(meta.prix_collecte || 0),
            poids_standard: Number(meta.poids_standard || 50),
            unite_mesure: meta.unite_mesure || 'kg',
            credit_alloue: Number(meta.credit_alloue || 0),
            rendement_prevu_tonne_ha: Number(meta.rendement_prevu_tonne_ha || 0),
            statut: meta.statut || 'active',
            created_at: row.created_at,
          })
        } catch {
          // ignorer format invalide
        }
      }
      if (parsedList.length > 0) return parsedList
    }
  } catch {
    // bascule vers repli standard
  }

  // 3. Repli standard : dériver depuis la campagne parente
  try {
    const { data: campagne } = await supabase
      .from('campagnes')
      .select('*')
      .eq('id', campagneId)
      .single()

    if (campagne) {
      const nomSpec = campagne.produit_collecte || 'Production Principale'
      return [
        {
          id: `spec-default-${campagneId}`,
          campagne_id: campagneId,
          nom: nomSpec,
          variete: 'Standard',
          produit_collecte: campagne.produit_collecte || nomSpec,
          prix_collecte: Number(campagne.prix_collecte || 0),
          poids_standard: Number(campagne.poids_standard || 50),
          unite_mesure: 'kg',
          credit_alloue: 0,
          rendement_prevu_tonne_ha: 0,
          statut: 'active',
        },
      ]
    }
  } catch (err) {
    console.warn("Échec repli campagne:", err)
  }

  return []
}

export async function addSpeculation(campagneId: string, formData: FormData) {
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

  const nom = (formData.get('nom') as string)?.trim()
  if (!nom) return { error: "Le nom de la spéculation est obligatoire (ex: Oignon, Tomate, Riz)." }

  const data = {
    gie_id: userData.gie_id,
    campagne_id: campagneId,
    nom,
    variete: (formData.get('variete') as string)?.trim() || null,
    produit_collecte: (formData.get('produit_collecte') as string)?.trim() || nom,
    prix_collecte: formData.get('prix_collecte') ? parseFloat(formData.get('prix_collecte') as string) : 0,
    poids_standard: formData.get('poids_standard') ? parseFloat(formData.get('poids_standard') as string) : 50,
    unite_mesure: (formData.get('unite_mesure') as string)?.trim() || 'kg',
    credit_alloue: formData.get('credit_alloue') ? parseFloat(formData.get('credit_alloue') as string) : 0,
    rendement_prevu_tonne_ha: formData.get('rendement_prevu_tonne_ha') ? parseFloat(formData.get('rendement_prevu_tonne_ha') as string) : 0,
    statut: (formData.get('statut') as string) || 'active',
  }

  // 1. Tenter l'insertion dans la table dédiée
  try {
    const tryDedicated = await supabase.from('campagne_speculations').insert([data])
    if (!tryDedicated.error) {
      revalidatePath(`/campagnes/${campagneId}`)
      revalidatePath(`/campagnes/${campagneId}/speculations`)
      revalidatePath(`/campagnes/${campagneId}/bilan`)
      return { success: true }
    }
  } catch {
    // continuer vers stockage automatique
  }

  // 2. Si la table dédiée n'existe pas, stockage automatique et transparent dans imputations
  try {
    const jsonMeta = JSON.stringify({
      nom: data.nom,
      variete: data.variete,
      produit_collecte: data.produit_collecte,
      prix_collecte: data.prix_collecte,
      poids_standard: data.poids_standard,
      unite_mesure: data.unite_mesure,
      credit_alloue: data.credit_alloue,
      rendement_prevu_tonne_ha: data.rendement_prevu_tonne_ha,
      statut: data.statut,
      created_at: new Date().toISOString(),
    })

    const db = getDbClient(supabase)
    const { error: fallbackError } = await db.from('imputations').insert({
      gie_id: userData.gie_id,
      compte: `SPEC:${campagneId}`,
      categorie: 'exploitation',
      nature: 'recette',
      libelle: jsonMeta,
    })

    if (fallbackError) {
      console.error("Erreur enregistrement spéculation:", fallbackError)
      return { error: fallbackError.message }
    }

    revalidatePath(`/campagnes/${campagneId}`)
    revalidatePath(`/campagnes/${campagneId}/speculations`)
    revalidatePath(`/campagnes/${campagneId}/bilan`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Erreur enregistrement spéculation" }
  }
}

export async function updateSpeculation(id: string, campagneId: string, formData: FormData) {
  const denied = await requirePermission('campagnes', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  // Si c'est la spéculation par défaut virtuelle, on la transforme en spéculation réelle
  if (id.startsWith('spec-default-')) {
    return await addSpeculation(campagneId, formData)
  }

  const nom = (formData.get('nom') as string)?.trim()
  if (!nom) return { error: "Le nom de la spéculation est obligatoire." }

  const data = {
    nom,
    variete: (formData.get('variete') as string)?.trim() || null,
    produit_collecte: (formData.get('produit_collecte') as string)?.trim() || nom,
    prix_collecte: formData.get('prix_collecte') ? parseFloat(formData.get('prix_collecte') as string) : 0,
    poids_standard: formData.get('poids_standard') ? parseFloat(formData.get('poids_standard') as string) : 50,
    unite_mesure: (formData.get('unite_mesure') as string)?.trim() || 'kg',
    credit_alloue: formData.get('credit_alloue') ? parseFloat(formData.get('credit_alloue') as string) : 0,
    rendement_prevu_tonne_ha: formData.get('rendement_prevu_tonne_ha') ? parseFloat(formData.get('rendement_prevu_tonne_ha') as string) : 0,
    statut: (formData.get('statut') as string) || 'active',
  }

  // 1. Tenter la mise à jour sur la table dédiée
  try {
    const { data: updatedRows, error: tryDedicatedError } = await supabase
      .from('campagne_speculations')
      .update(data)
      .eq('id', id)
      .select('id')

    if (!tryDedicatedError && updatedRows && updatedRows.length > 0) {
      revalidatePath(`/campagnes/${campagneId}`)
      revalidatePath(`/campagnes/${campagneId}/speculations`)
      revalidatePath(`/campagnes/${campagneId}/bilan`)
      return { success: true }
    }
  } catch {
    // continuer vers imputations
  }

  // 2. Mise à jour automatique dans imputations
  try {
    const jsonMeta = JSON.stringify({
      nom: data.nom,
      variete: data.variete,
      produit_collecte: data.produit_collecte,
      prix_collecte: data.prix_collecte,
      poids_standard: data.poids_standard,
      unite_mesure: data.unite_mesure,
      credit_alloue: data.credit_alloue,
      rendement_prevu_tonne_ha: data.rendement_prevu_tonne_ha,
      statut: data.statut,
    })

    const db = getDbClient(supabase)
    const { error: fallbackError } = await db
      .from('imputations')
      .update({ libelle: jsonMeta })
      .eq('id', id)

    if (fallbackError) {
      return { error: fallbackError.message }
    }

    revalidatePath(`/campagnes/${campagneId}`)
    revalidatePath(`/campagnes/${campagneId}/speculations`)
    revalidatePath(`/campagnes/${campagneId}/bilan`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Erreur modification spéculation" }
  }
}

export async function deleteSpeculation(id: string, campagneId: string) {
  const denied = await requirePermission('campagnes', 'delete')
  if (denied) return denied as never
  const supabase = await createClient()

  if (id.startsWith('spec-default-')) {
    return { error: "La culture principale de la campagne ne peut pas être supprimée. Vous pouvez la modifier ou ajouter d'autres cultures." }
  }

  // 1. Tenter suppression sur table dédiée
  try {
    await supabase.from('campagne_speculations').delete().eq('id', id)
  } catch {
    // continuer
  }

  // 2. Suppression dans imputations
  try {
    const db = getDbClient(supabase)
    await db.from('imputations').delete().eq('id', id)
  } catch {
    // continuer
  }

  // 3. Nettoyer les affectations dans observations des membres de la campagne
  try {
    const { data: members } = await supabase
      .from('campagne_membres')
      .select('membre_id, observations')
      .eq('campagne_id', campagneId)

    for (const m of members || []) {
      const parcelles = extraireParcellesObservations(m.observations)
      const filtered = parcelles.filter((p) => p.speculation_id !== id)
      if (filtered.length !== parcelles.length) {
        const totalHa = filtered.reduce((acc, p) => acc + (Number(p.superficie) || 0), 0)
        await supabase
          .from('campagne_membres')
          .update({
            superficie: totalHa,
            observations: encoderParcellesObservations(m.observations, filtered),
          })
          .match({ campagne_id: campagneId, membre_id: m.membre_id })
      }
    }
  } catch (err) {
    console.warn("Nettoyage parcelles:", err)
  }

  revalidatePath(`/campagnes/${campagneId}`)
  revalidatePath(`/campagnes/${campagneId}/speculations`)
  revalidatePath(`/campagnes/${campagneId}/bilan`)
  return { success: true }
}

export async function affecterMembreSpeculation(
  campagneId: string,
  membreId: string,
  speculationId: string,
  superficie: number,
  creditAttribue: number = 0,
  casier?: string
) {
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

  let savedDedicated = false

  // 1. Tenter l'enregistrement dans la table dédiée
  try {
    const { error } = await supabase
      .from('campagne_membre_speculations')
      .upsert(
        {
          gie_id: userData.gie_id,
          campagne_id: campagneId,
          membre_id: membreId,
          speculation_id: speculationId,
          superficie: Number(superficie || 0),
          credit_attribue: Number(creditAttribue || 0),
          casier: casier || null,
        },
        { onConflict: 'campagne_id,membre_id,speculation_id' }
      )

    if (!error) {
      savedDedicated = true
      // Synchronisation de la superficie totale déclarée sur campagne_membres
      const { data: allSpecs } = await supabase
        .from('campagne_membre_speculations')
        .select('superficie')
        .eq('campagne_id', campagneId)
        .eq('membre_id', membreId)

      const totalHa = (allSpecs || []).reduce((acc: number, item: any) => acc + Number(item.superficie || 0), 0)

      await supabase
        .from('campagne_membres')
        .update({ superficie: totalHa })
        .match({ campagne_id: campagneId, membre_id: membreId })
    }
  } catch {
    savedDedicated = false
  }

  // 2. Stockage automatique dans campagne_membres.observations si table dédiée absente
  if (!savedDedicated) {
    try {
      const db = getDbClient(supabase)
      const { data: cm } = await db
        .from('campagne_membres')
        .select('superficie, observations')
        .match({ campagne_id: campagneId, membre_id: membreId })
        .single()

      const parcelles = extraireParcellesObservations(cm?.observations)
      const existingIdx = parcelles.findIndex((p) => p.speculation_id === speculationId)

      // Si c'est la première affectation détaillée pour ce membre et qu'il avait déjà une superficie globale
      if (parcelles.length === 0 && Number(cm?.superficie || 0) > 0) {
        const specList = await getSpeculationsCampagne(campagneId)
        if (specList.length > 0 && specList[0].id !== speculationId) {
          const supInitiale = Number(cm?.superficie || 0)
          parcelles.push({
            campagne_id: campagneId,
            membre_id: membreId,
            speculation_id: specList[0].id,
            superficie: supInitiale,
            credit_attribue: 0,
            casier: null,
          })
        }
      }

      const entry: MembreSpeculationEntry = {
        campagne_id: campagneId,
        membre_id: membreId,
        speculation_id: speculationId,
        superficie: Number(superficie || 0),
        credit_attribue: Number(creditAttribue || 0),
        casier: casier || null,
      }

      if (existingIdx >= 0) {
        parcelles[existingIdx] = entry
      } else {
        parcelles.push(entry)
      }

      const totalHa = parcelles.reduce((acc, p) => acc + (Number(p.superficie) || 0), 0)
      const updatedObs = encoderParcellesObservations(cm?.observations, parcelles)

      const { error: updErr } = await db
        .from('campagne_membres')
        .update({
          superficie: totalHa,
          observations: updatedObs,
        })
        .match({ campagne_id: campagneId, membre_id: membreId })

      if (updErr) {
        return { error: updErr.message }
      }
    } catch (fallbackErr: any) {
      return { error: fallbackErr.message || "Erreur enregistrement de la parcelle" }
    }
  }

  revalidatePath(`/campagnes/${campagneId}`)
  revalidatePath(`/campagnes/${campagneId}/speculations`)
  revalidatePath(`/campagnes/${campagneId}/config`)
  return { success: true }
}

export async function supprimerAffectationMembreSpeculation(
  campagneId: string,
  membreId: string,
  speculationId: string
) {
  const denied = await requirePermission('campagnes', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  let deletedDedicated = false

  try {
    const { error } = await supabase
      .from('campagne_membre_speculations')
      .delete()
      .match({ campagne_id: campagneId, membre_id: membreId, speculation_id: speculationId })

    if (!error) {
      deletedDedicated = true
      // Recalculer le total
      const { data: allSpecs } = await supabase
        .from('campagne_membre_speculations')
        .select('superficie')
        .eq('campagne_id', campagneId)
        .eq('membre_id', membreId)

      const totalHa = (allSpecs || []).reduce((acc: number, item: any) => acc + Number(item.superficie || 0), 0)

      await supabase
        .from('campagne_membres')
        .update({ superficie: totalHa })
        .match({ campagne_id: campagneId, membre_id: membreId })
    }
  } catch {
    deletedDedicated = false
  }

  // Nettoyage dans observations
  try {
    const db = getDbClient(supabase)
    const { data: cm } = await db
      .from('campagne_membres')
      .select('observations')
      .match({ campagne_id: campagneId, membre_id: membreId })
      .single()

    const parcelles = extraireParcellesObservations(cm?.observations)
    const filtered = parcelles.filter((p) => p.speculation_id !== speculationId)

    if (filtered.length !== parcelles.length) {
      const totalHa = filtered.reduce((acc, p) => acc + (Number(p.superficie) || 0), 0)
      const updatedObs = encoderParcellesObservations(cm?.observations, filtered)

      await db
        .from('campagne_membres')
        .update({
          superficie: totalHa,
          observations: updatedObs,
        })
        .match({ campagne_id: campagneId, membre_id: membreId })
    }
  } catch (err) {
    console.warn("Nettoyage parcelles observations:", err)
  }

  revalidatePath(`/campagnes/${campagneId}`)
  revalidatePath(`/campagnes/${campagneId}/speculations`)
  return { success: true }
}

export async function getDonneesCompletCampagneSpeculations(campagneId: string) {
  const supabase = await createClient()

  // 1. Données de base en parallèle
  const [
    { data: campagne },
    speculations,
    { data: campagneMembres },
    membreSpecsRes,
    { data: distributionsData },
    { data: campagneIntrantsData },
    { data: facturesData },
    { data: remboursementsData },
    { data: paiementsClientsData },
    { data: creditsData },
  ] = await Promise.all([
    supabase.from('campagnes').select('*').eq('id', campagneId).single(),
    getSpeculationsCampagne(campagneId),
    supabase.from('campagne_membres').select(`
      membre_id,
      superficie,
      superficie_validee,
      casier,
      statut_validation,
      observations,
      membres (id, nom, prenom, code_membre, telephone, village)
    `).eq('campagne_id', campagneId),
    supabase.from('campagne_membre_speculations').select('*').eq('campagne_id', campagneId),
    supabase.from('distribution_intrants').select(`
      id, membre_id, intrant_id, quantite,
      intrants (nom, type_intrant, prix_unitaire)
    `).eq('campagne_id', campagneId),
    supabase.from('campagne_intrants').select('intrant_id, prix_facturation').eq('campagne_id', campagneId),
    supabase.from('factures').select('id, membre_id, montant_total, montant_paye, montant_interet').eq('campagne_id', campagneId),
    supabase.from('remboursements').select('id, facture_id, membre_id, type_remboursement, montant_fcfa, quantite_nature, produit_nature, date_paiement'),
    supabase.from('paiements_clients').select('id, client_id, montant, motif, date_paiement'),
    supabase.from('credits').select('id, montant_accorde, but_credit, banque_nom').eq('campagne_id', campagneId),
  ])

  if (!campagne) return { error: "Campagne introuvable" }

  const membreSpecs = (membreSpecsRes && !membreSpecsRes.error && Array.isArray(membreSpecsRes.data))
    ? membreSpecsRes.data
    : []

  // Maps de calcul
  const intrantPriceMap = new Map<string, number>()
  ;(campagneIntrantsData || []).forEach((ci: any) => {
    intrantPriceMap.set(ci.intrant_id, Number(ci.prix_facturation || 0))
  })

  // Factures map
  const facturesCampagneIds = new Set((facturesData || []).map((f: any) => f.id))
  const factureByMembre = new Map<string, any>()
  ;(facturesData || []).forEach((f: any) => {
    factureByMembre.set(f.membre_id, f)
  })

  // Distributions facturées par membre
  const facturationParMembre: Record<string, number> = {}
  ;(distributionsData || []).forEach((d: any) => {
    const prix = intrantPriceMap.get(d.intrant_id) !== undefined
      ? intrantPriceMap.get(d.intrant_id)!
      : Number(d.intrants?.prix_unitaire || 0)
    const val = Number(d.quantite || 0) * prix
    facturationParMembre[d.membre_id] = (facturationParMembre[d.membre_id] || 0) + val
  })

  // Collecte et Remboursements par membre et spéculation
  const collecteParMembreEtSpec: Record<string, { qte: number; val: number }> = {}
  const rembTotalParMembre: Record<string, number> = {}
  const rembParMembreEtSpec: Record<string, number> = {}
  const rembNonVentileParMembre: Record<string, number> = {}

  for (const r of (remboursementsData || []) as any[]) {
    const isCampagneRemb = facturesCampagneIds.has(r.facture_id)
    if (!isCampagneRemb) continue

    const mId = r.membre_id
    const montant = Number(r.montant_fcfa || 0)
    rembTotalParMembre[mId] = (rembTotalParMembre[mId] || 0) + montant

    const specTag = extraireTagSpeculation(r.produit_nature)
    const matchedSpec = speculations.find((s: CampagneSpeculation) =>
      s.id === (r as any).speculation_id ||
      (specTag && s.nom.toLowerCase() === specTag.toLowerCase()) ||
      (r.type_remboursement === 'nature' && r.produit_nature && s.produit_collecte && r.produit_nature.toLowerCase().includes(s.produit_collecte.toLowerCase())) ||
      (r.type_remboursement === 'nature' && r.produit_nature && s.nom && r.produit_nature.toLowerCase().includes(s.nom.toLowerCase()))
    )

    if (r.type_remboursement === 'nature') {
      const qte = Number(r.quantite_nature || 0)
      const effectiveSpec = matchedSpec || speculations[0]

      if (effectiveSpec) {
        const key = `${mId}:${effectiveSpec.id}`
        if (!collecteParMembreEtSpec[key]) collecteParMembreEtSpec[key] = { qte: 0, val: 0 }
        const val = montant > 0 ? montant : qte * effectiveSpec.prix_collecte
        collecteParMembreEtSpec[key].qte += qte
        collecteParMembreEtSpec[key].val += val
        rembParMembreEtSpec[key] = (rembParMembreEtSpec[key] || 0) + val
      }
    } else {
      if (matchedSpec) {
        const key = `${mId}:${matchedSpec.id}`
        rembParMembreEtSpec[key] = (rembParMembreEtSpec[key] || 0) + montant
      } else {
        rembNonVentileParMembre[mId] = (rembNonVentileParMembre[mId] || 0) + montant
      }
    }
  }

  // Traitement des paiements clients contenant [MODE:nature] ou rattachés à la campagne
  for (const pc of (paiementsClientsData || []) as any[]) {
    const motifStr = String(pc.motif || '')
    const campMatch = motifStr.match(/\[CAMPAGNE:([^\]]+)\]/)
    const hasCampagne = campMatch && campMatch[1].trim() === campagneId
    const isNature = motifStr.includes('[MODE:nature]')
    if (!hasCampagne && !isNature) continue

    const mId = pc.client_id // Souvent le membre
    if (!mId) continue

    const specTag = extraireTagSpeculation(motifStr)
    const matchedSpec = speculations.find((s: CampagneSpeculation) =>
      specTag && s.nom.toLowerCase() === specTag.toLowerCase()
    )

    const montant = Number(pc.montant || 0)

    if (isNature) {
      if (!hasCampagne) continue
      const qMatch = motifStr.match(/\[QTE:([^\]]+)\]/)
      const qte = qMatch ? Number(qMatch[1]) : 0
      const effectiveSpec = matchedSpec || speculations[0]
      if (effectiveSpec) {
        const key = `${mId}:${effectiveSpec.id}`
        if (!collecteParMembreEtSpec[key]) collecteParMembreEtSpec[key] = { qte: 0, val: 0 }
        const val = montant > 0 ? montant : qte * effectiveSpec.prix_collecte
        collecteParMembreEtSpec[key].qte += qte
        collecteParMembreEtSpec[key].val += val
        rembParMembreEtSpec[key] = (rembParMembreEtSpec[key] || 0) + val
        rembTotalParMembre[mId] = (rembTotalParMembre[mId] || 0) + val
      }
    } else if (hasCampagne) {
      if (matchedSpec) {
        const key = `${mId}:${matchedSpec.id}`
        rembParMembreEtSpec[key] = (rembParMembreEtSpec[key] || 0) + montant
      } else {
        rembNonVentileParMembre[mId] = (rembNonVentileParMembre[mId] || 0) + montant
      }
      rembTotalParMembre[mId] = (rembTotalParMembre[mId] || 0) + montant
    }
  }

  // Map des affectations membre_speculations
  const membreSpecsMap = new Map<string, MembreSpeculationEntry[]>()
  ;(membreSpecs || []).forEach((ms: any) => {
    const list = membreSpecsMap.get(ms.membre_id) || []
    list.push({
      id: ms.id,
      campagne_id: ms.campagne_id,
      membre_id: ms.membre_id,
      speculation_id: ms.speculation_id,
      superficie: Number(ms.superficie || 0),
      superficie_validee: ms.superficie_validee !== null ? Number(ms.superficie_validee) : null,
      casier: ms.casier,
      statut_validation: ms.statut_validation,
      credit_attribue: Number(ms.credit_attribue || 0),
    })
    membreSpecsMap.set(ms.membre_id, list)
  })

  // S'il n'y a pas d'affectation dédiée pour un membre, charger depuis observations
  ;(campagneMembres || []).forEach((cm: any) => {
    if (!membreSpecsMap.has(cm.membre_id) || membreSpecsMap.get(cm.membre_id)!.length === 0) {
      const parcelles = extraireParcellesObservations(cm.observations)
      if (parcelles && parcelles.length > 0) {
        membreSpecsMap.set(cm.membre_id, parcelles)
      }
    }
  })

  // Inscriptions membres avec affectations de spéculations
  const enrolledMembres = (campagneMembres || []).map((cm: any) => {
    const m = Array.isArray(cm.membres) ? cm.membres[0] : cm.membres
    const supGlobale = Number(cm.superficie || 0)
    const supValGlobale = cm.superficie_validee !== null ? Number(cm.superficie_validee) : null

    let userSpecs = membreSpecsMap.get(cm.membre_id) || []
    if (userSpecs.length === 0 && speculations.length > 0) {
      userSpecs = [
        {
          campagne_id: campagneId,
          membre_id: cm.membre_id,
          speculation_id: speculations[0].id,
          superficie: supGlobale,
          superficie_validee: supValGlobale,
          casier: cm.casier,
          statut_validation: cm.statut_validation,
          credit_attribue: 0,
        },
      ]
    }

    return {
      membreId: cm.membre_id,
      nom: m?.nom || 'Inconnu',
      prenom: m?.prenom || '',
      codeMembre: m?.code_membre || '',
      telephone: m?.telephone || '',
      village: m?.village || '',
      specs: userSpecs,
      superficieGlobale: supGlobale,
    }
  })

  // 2. Construction du Récapitulatif par Membre (avec suivi individuel par spéculation et consolidé)
  const recapitulatifMembres: RecapitulatifMembre[] = enrolledMembres.map((em: any) => {
    const fac = factureByMembre.get(em.membreId)
    const facturationTotaleMembre = fac
      ? Number(fac.montant_total || 0) + Number(fac.montant_interet || 0)
      : (facturationParMembre[em.membreId] || 0)

    const sumMembreSuperficie = em.specs.reduce((acc: number, s: MembreSpeculationEntry) => acc + (Number(s.superficie) || 0), 0)

    const memberSpecsDetail: MembreSpeculationDetail[] = speculations.map((spec: CampagneSpeculation) => {
      const match = em.specs.find((s: MembreSpeculationEntry) => s.speculation_id === spec.id)
      const sup = match ? Number(match.superficie || 0) : 0
      const supVal = match && match.superficie_validee !== null && match.superficie_validee !== undefined ? Number(match.superficie_validee) : sup
      const cred = match ? Number(match.credit_attribue || 0) : 0

      const colKey = `${em.membreId}:${spec.id}`
      const col = collecteParMembreEtSpec[colKey] || { qte: 0, val: 0 }

      // Répartition de la facturation au prorata de la superficie de cette spéculation pour ce membre
      const ratioMembreSpec = sumMembreSuperficie > 0
        ? sup / sumMembreSuperficie
        : (speculations.length > 0 ? 1 / speculations.length : 1)

      const specFacturation = Math.round(facturationTotaleMembre * ratioMembreSpec)

      // Remboursements directement fléchés sur cette spéculation + quote-part des remboursements généraux non fléchés
      const rembDirect = rembParMembreEtSpec[`${em.membreId}:${spec.id}`] || 0
      const nonVentileMembre = rembNonVentileParMembre[em.membreId] || 0
      const partNonVentilee = Math.round(nonVentileMembre * ratioMembreSpec)
      const specRemboursements = rembDirect + partNonVentilee

      const specSolde = specFacturation - specRemboursements

      return {
        speculationId: spec.id,
        nom: spec.nom,
        superficie: sup,
        superficieValidee: supVal,
        creditAttribue: cred,
        facturation: specFacturation,
        collecteQte: col.qte,
        collecteVal: col.val,
        remboursements: specRemboursements,
        solde: specSolde,
      }
    })

    const superficieTotale = memberSpecsDetail.reduce((acc: number, s: MembreSpeculationDetail) => acc + s.superficie, 0)
    const creditTotal = memberSpecsDetail.reduce((acc: number, s: MembreSpeculationDetail) => acc + s.creditAttribue, 0)
    const collecteQteTotale = memberSpecsDetail.reduce((acc: number, s: MembreSpeculationDetail) => acc + s.collecteQte, 0)
    const collecteValeurTotale = memberSpecsDetail.reduce((acc: number, s: MembreSpeculationDetail) => acc + s.collecteVal, 0)

    const remboursementsTotaux = rembTotalParMembre[em.membreId] || (fac ? Number(fac.montant_paye || 0) : 0)
    const soldeNet = facturationTotaleMembre - remboursementsTotaux

    let statutSolde: 'solde' | 'excedent' | 'reliquat' = 'solde'
    if (soldeNet > 0) statutSolde = 'reliquat'
    else if (soldeNet < 0) statutSolde = 'excedent'
    else statutSolde = 'solde'

    return {
      membreId: em.membreId,
      nom: em.nom,
      prenom: em.prenom,
      codeMembre: em.codeMembre,
      telephone: em.telephone,
      village: em.village,
      speculations: memberSpecsDetail,
      superficieTotale,
      creditTotal,
      facturationTotale: facturationTotaleMembre,
      collecteQteTotale,
      collecteValeurTotale,
      remboursementsTotaux,
      soldeNet,
      statutSolde,
    }
  }).sort((a: RecapitulatifMembre, b: RecapitulatifMembre) => a.nom.localeCompare(b.nom))

  // 3. Construction de la Synthèse par Spéculation
  const syntheses: SyntheseSpeculation[] = speculations.map((spec: CampagneSpeculation) => {
    let membresCount = 0
    let superficieTotale = 0
    let superficieValideeTotale = 0
    // Crédits bancaires fléchés sur cette spéculation
    const creditsSpec = (creditsData || []).filter((c: any) => {
      const sId = getCreditSpeculationId(c)
      const sNom = getCreditSpeculationNom(c)
      if (sId && sId === spec.id) return true
      if (sNom && sNom.toLowerCase() === spec.nom.toLowerCase()) return true
      return false
    })
    const creditBancaireSpec = creditsSpec.reduce((sum: number, c: any) => sum + Number(c.montant_accorde || c.montant_demande || 0), 0)

    let creditTotalSpec = Number(spec.credit_alloue || 0)
    if (creditBancaireSpec > 0 && creditTotalSpec === 0) {
      creditTotalSpec = creditBancaireSpec
    }
    let poidsCollecteKg = 0
    let valeurCollecte = 0

    recapitulatifMembres.forEach((rm) => {
      const s = rm.speculations.find((sd) => sd.speculationId === spec.id)
      if (s && s.superficie > 0) {
        membresCount += 1
        superficieTotale += s.superficie
        superficieValideeTotale += s.superficieValidee
        creditTotalSpec += s.creditAttribue
        poidsCollecteKg += s.collecteQte
        valeurCollecte += s.collecteVal
      }
    })

    // Facturation et Remboursements totaux consolidés pour cette spéculation
    const facturationTotale = recapitulatifMembres.reduce((sum, rm) => {
      const s = rm.speculations.find((sd) => sd.speculationId === spec.id)
      return sum + (s?.facturation || 0)
    }, 0)

    const remboursementsTotaux = recapitulatifMembres.reduce((sum, rm) => {
      const s = rm.speculations.find((sd) => sd.speculationId === spec.id)
      return sum + (s?.remboursements || 0)
    }, 0)

    const tauxRecouvrement = facturationTotale > 0
      ? Math.min(100, Math.round((remboursementsTotaux / facturationTotale) * 100))
      : 100

    const soldeRestant = Math.max(0, facturationTotale - remboursementsTotaux)

    return {
      speculation: spec,
      membresCount,
      superficieTotale,
      superficieValideeTotale,
      creditAlloue: creditTotalSpec,
      facturationTotale,
      poidsCollecteKg,
      prixCollecte: spec.prix_collecte,
      valeurCollecte,
      remboursementsTotaux,
      tauxRecouvrement,
      soldeRestant,
    }
  })

  // Total crédit bancaire campagne
  const creditBancaireCampagne = (creditsData || []).reduce((sum: number, c: any) => sum + Number(c.montant_accorde || 0), 0)

  return {
    campagne,
    speculations,
    syntheses,
    recapitulatifMembres,
    creditBancaireCampagne,
  }
}
