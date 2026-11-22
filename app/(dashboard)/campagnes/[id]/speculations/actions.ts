'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'
import {
  CampagneSpeculation,
  MembreSpeculationEntry,
  SyntheseSpeculation,
  RecapitulatifMembre,
  MembreSpeculationDetail,
  extraireTagSpeculation,
} from '@/lib/speculations'

export async function getSpeculationsCampagne(campagneId: string): Promise<CampagneSpeculation[]> {
  const supabase = await createClient()

  // 1. Tenter lecture depuis la table dédiée
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
  } catch (err) {
    console.warn("Table campagne_speculations non disponible, bascule de secours:", err)
  }

  // 2. Repli de secours : dériver depuis la campagne parente
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

function formatSupabaseError(error: any): string {
  if (!error) return "Une erreur inattendue est survenue."
  const msg = error.message || String(error)
  if (
    msg.toLowerCase().includes('campagne_speculations') ||
    msg.toLowerCase().includes('campagne_membre_speculations') ||
    msg.toLowerCase().includes('schema cache') ||
    msg.toLowerCase().includes('pgrst205') ||
    error.code === 'PGRST205'
  ) {
    return "La table 'campagne_speculations' ou 'campagne_membre_speculations' n'existe pas encore dans votre base Supabase. Veuillez exécuter le script SQL de la migration 66 dans le SQL Editor de Supabase pour activer la gestion multi-spéculations."
  }
  return msg
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

  try {
    const { error } = await supabase.from('campagne_speculations').insert([data])

    if (error) {
      console.error("Erreur ajout spéculation:", error)
      return { error: formatSupabaseError(error) }
    }

    revalidatePath(`/campagnes/${campagneId}`)
    revalidatePath(`/campagnes/${campagneId}/speculations`)
    revalidatePath(`/campagnes/${campagneId}/bilan`)
    return { success: true }
  } catch (err: any) {
    return { error: formatSupabaseError(err) }
  }
}

export async function updateSpeculation(id: string, campagneId: string, formData: FormData) {
  const denied = await requirePermission('campagnes', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

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

  try {
    const { error } = await supabase
      .from('campagne_speculations')
      .update(data)
      .eq('id', id)

    if (error) {
      console.error("Erreur modification spéculation:", error)
      return { error: formatSupabaseError(error) }
    }

    revalidatePath(`/campagnes/${campagneId}`)
    revalidatePath(`/campagnes/${campagneId}/speculations`)
    revalidatePath(`/campagnes/${campagneId}/bilan`)
    return { success: true }
  } catch (err: any) {
    return { error: formatSupabaseError(err) }
  }
}

export async function deleteSpeculation(id: string, campagneId: string) {
  const denied = await requirePermission('campagnes', 'delete')
  if (denied) return denied as never
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('campagne_speculations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error("Erreur suppression spéculation:", error)
      return { error: formatSupabaseError(error) }
    }

    revalidatePath(`/campagnes/${campagneId}`)
    revalidatePath(`/campagnes/${campagneId}/speculations`)
    revalidatePath(`/campagnes/${campagneId}/bilan`)
    return { success: true }
  } catch (err: any) {
    return { error: formatSupabaseError(err) }
  }
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

    if (error) return { error: formatSupabaseError(error) }

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

    revalidatePath(`/campagnes/${campagneId}`)
    revalidatePath(`/campagnes/${campagneId}/speculations`)
    revalidatePath(`/campagnes/${campagneId}/config`)
    return { success: true }
  } catch (err: any) {
    return { error: formatSupabaseError(err) }
  }
}

export async function supprimerAffectationMembreSpeculation(
  campagneId: string,
  membreId: string,
  speculationId: string
) {
  const denied = await requirePermission('campagnes', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('campagne_membre_speculations')
      .delete()
      .match({ campagne_id: campagneId, membre_id: membreId, speculation_id: speculationId })

    if (error) return { error: formatSupabaseError(error) }

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

    revalidatePath(`/campagnes/${campagneId}`)
    revalidatePath(`/campagnes/${campagneId}/speculations`)
    return { success: true }
  } catch (err: any) {
    return { error: formatSupabaseError(err) }
  }
}

export async function getDonneesCompletCampagneSpeculations(campagneId: string) {
  const supabase = await createClient()

  // 1. Données de base en parallèle
  const [
    { data: campagne },
    speculations,
    { data: campagneMembres },
    { data: membreSpecs },
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
      membres (id, nom, prenom, code_membre, telephone, village)
    `).eq('campagne_id', campagneId),
    supabase.from('campagne_membre_speculations').select('*').eq('campagne_id', campagneId),
    supabase.from('distribution_intrants').select(`
      id, membre_id, intrant_id, quantite, speculation_id,
      intrants (nom, type_intrant, prix_unitaire)
    `).eq('campagne_id', campagneId),
    supabase.from('campagne_intrants').select('intrant_id, prix_facturation').eq('campagne_id', campagneId),
    supabase.from('factures').select('id, membre_id, montant_total, montant_paye, montant_interet').eq('campagne_id', campagneId),
    supabase.from('remboursements').select('id, facture_id, membre_id, type_remboursement, montant_fcfa, quantite_nature, produit_nature, speculation_id, date_paiement'),
    supabase.from('paiements_clients').select('id, client_id, montant, motif, date_paiement'),
    supabase.from('credits').select('id, montant_accorde, but_credit, banque_nom').eq('campagne_id', campagneId),
  ])

  if (!campagne) return { error: "Campagne introuvable" }

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

  for (const r of (remboursementsData || []) as any[]) {
    const isCampagneRemb = facturesCampagneIds.has(r.facture_id)
    if (!isCampagneRemb) continue

    const mId = r.membre_id
    const montant = Number(r.montant_fcfa || 0)
    rembTotalParMembre[mId] = (rembTotalParMembre[mId] || 0) + montant

    if (r.type_remboursement === 'nature') {
      const qte = Number(r.quantite_nature || 0)
      const specTag = extraireTagSpeculation(r.produit_nature)
      const matchedSpec = speculations.find(s =>
        s.id === r.speculation_id ||
        (specTag && s.nom.toLowerCase() === specTag.toLowerCase()) ||
        (r.produit_nature && s.produit_collecte && r.produit_nature.toLowerCase().includes(s.produit_collecte.toLowerCase())) ||
        (r.produit_nature && s.nom && r.produit_nature.toLowerCase().includes(s.nom.toLowerCase()))
      ) || speculations[0]

      if (matchedSpec) {
        const key = `${mId}:${matchedSpec.id}`
        if (!collecteParMembreEtSpec[key]) collecteParMembreEtSpec[key] = { qte: 0, val: 0 }
        collecteParMembreEtSpec[key].qte += qte
        collecteParMembreEtSpec[key].val += montant > 0 ? montant : qte * matchedSpec.prix_collecte
      }
    }
  }

  // Traitement des paiements clients contenant [MODE:nature]
  for (const pc of (paiementsClientsData || []) as any[]) {
    const motifStr = String(pc.motif || '')
    if (!motifStr.includes('[MODE:nature]')) continue
    const campMatch = motifStr.match(/\[CAMPAGNE:([^\]]+)\]/)
    if (!campMatch || campMatch[1].trim() !== campagneId) continue

    const qMatch = motifStr.match(/\[QTE:([^\]]+)\]/)
    const qte = qMatch ? Number(qMatch[1]) : 0
    const mId = pc.client_id // Souvent le membre
    if (!mId) continue

    const specTag = extraireTagSpeculation(motifStr)
    const matchedSpec = speculations.find(s =>
      specTag && s.nom.toLowerCase() === specTag.toLowerCase()
    ) || speculations[0]

    if (matchedSpec) {
      const key = `${mId}:${matchedSpec.id}`
      if (!collecteParMembreEtSpec[key]) collecteParMembreEtSpec[key] = { qte: 0, val: 0 }
      const val = Number(pc.montant || 0) > 0 ? Number(pc.montant) : qte * matchedSpec.prix_collecte
      collecteParMembreEtSpec[key].qte += qte
      collecteParMembreEtSpec[key].val += val
      rembTotalParMembre[mId] = (rembTotalParMembre[mId] || 0) + val
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

  // Si aucune affectation explicite n'existe encore pour un membre inscrit, on lui attribue la 1ère spéculation avec sa superficie globale
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

  // 2. Construction de la Synthèse par Spéculation
  const syntheses: SyntheseSpeculation[] = speculations.map((spec) => {
    let membresCount = 0
    let superficieTotale = 0
    let superficieValideeTotale = 0
    let creditTotalSpec = Number(spec.credit_alloue || 0)
    let poidsCollecteKg = 0
    let valeurCollecte = 0

    enrolledMembres.forEach((em) => {
      const match = em.specs.find((s) => s.speculation_id === spec.id)
      if (match && match.superficie > 0) {
        membresCount += 1
        superficieTotale += match.superficie
        superficieValideeTotale += match.superficie_validee !== null && match.superficie_validee !== undefined ? match.superficie_validee : match.superficie
        creditTotalSpec += Number(match.credit_attribue || 0)

        const colKey = `${em.membreId}:${spec.id}`
        if (collecteParMembreEtSpec[colKey]) {
          poidsCollecteKg += collecteParMembreEtSpec[colKey].qte
          valeurCollecte += collecteParMembreEtSpec[colKey].val
        }
      }
    })

    // Répartition de la facturation proportionnellement à la superficie de cette spéculation par rapport à la surface totale de la campagne
    const totalSurfaceCampagne = enrolledMembres.reduce((sum, em) => sum + em.superficieGlobale, 0)
    const ratioSpec = totalSurfaceCampagne > 0 ? superficieTotale / totalSurfaceCampagne : (1 / Math.max(1, speculations.length))

    // Total facturé global campagne
    const totalFactureGlobal = Object.values(facturationParMembre).reduce((a, b) => a + b, 0)
    const facturationTotale = Math.round(totalFactureGlobal * ratioSpec)

    // Remboursements affectés à la spéculation : valeur collectée en nature + part espèces
    const rembNatureValeur = valeurCollecte
    const totalRembGlobal = Object.values(rembTotalParMembre).reduce((a, b) => a + b, 0)
    const remboursementsTotaux = Math.round(rembNatureValeur > 0 ? rembNatureValeur : totalRembGlobal * ratioSpec)

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

  // 3. Construction du Récapitulatif par Membre
  const recapitulatifMembres: RecapitulatifMembre[] = enrolledMembres.map((em) => {
    const memberSpecsDetail: MembreSpeculationDetail[] = speculations.map((spec) => {
      const match = em.specs.find((s) => s.speculation_id === spec.id)
      const sup = match ? match.superficie : 0
      const supVal = match && match.superficie_validee !== null && match.superficie_validee !== undefined ? match.superficie_validee : sup
      const cred = match ? match.credit_attribue : 0

      const colKey = `${em.membreId}:${spec.id}`
      const col = collecteParMembreEtSpec[colKey] || { qte: 0, val: 0 }

      return {
        speculationId: spec.id,
        nom: spec.nom,
        superficie: sup,
        superficieValidee: supVal,
        creditAttribue: cred,
        collecteQte: col.qte,
        collecteVal: col.val,
      }
    })

    const superficieTotale = memberSpecsDetail.reduce((acc, s) => acc + s.superficie, 0)
    const creditTotal = memberSpecsDetail.reduce((acc, s) => acc + s.creditAttribue, 0)
    const collecteQteTotale = memberSpecsDetail.reduce((acc, s) => acc + s.collecteQte, 0)
    const collecteValeurTotale = memberSpecsDetail.reduce((acc, s) => acc + s.collecteVal, 0)

    const fac = factureByMembre.get(em.membreId)
    const facturationTotale = fac
      ? Number(fac.montant_total || 0) + Number(fac.montant_interet || 0)
      : (facturationParMembre[em.membreId] || 0)

    const remboursementsTotaux = rembTotalParMembre[em.membreId] || (fac ? Number(fac.montant_paye || 0) : 0)
    const soldeNet = facturationTotale - remboursementsTotaux

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
      facturationTotale,
      collecteQteTotale,
      collecteValeurTotale,
      remboursementsTotaux,
      soldeNet,
      statutSolde,
    }
  }).sort((a, b) => a.nom.localeCompare(b.nom))

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

