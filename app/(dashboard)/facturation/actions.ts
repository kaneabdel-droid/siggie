'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'
import { getCreditType, getCreditSpeculationId, getCreditSpeculationNom } from '@/lib/credits-types'
import { reconcilierPrestationsEtPaiements } from '@/lib/recouvrement-reconciliation'
import { extraireTagSpeculation, extraireParcellesObservations } from '@/lib/speculations'
import { getSpeculationsCampagne } from '@/app/(dashboard)/campagnes/[id]/speculations/actions'

export async function getFactures() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const [
    facturesRes,
    prestationsRes,
    ventesRes,
    membresRes,
    clientsRes,
    paiementsClientsRes,
    transactionsRes,
    remboursementsRes,
    campagneMembresRes,
    campagneMembreSpecsRes,
  ] = await Promise.all([
    supabase
      .from('factures')
      .select(`
        *,
        membre:membre_id (id, nom, prenom, code_membre, telephone, village),
        campagne:campagne_id (id, nom, produit_collecte, prix_collecte)
      `)
      .order('date_emission', { ascending: false }),
    supabase
      .from('materiel_prestations')
      .select(`
        *,
        materiel:materiel_id (id, nom),
        produit:produit_id (id, nom),
        campagne:campagne_id (id, nom, produit_collecte, prix_collecte)
      `)
      .order('date_prestation', { ascending: false }),
    supabase
      .from('sorties_stock_nature')
      .select(`
        *,
        campagne:campagne_id (id, nom, produit_collecte, prix_collecte)
      `)
      .eq('type_sortie', 'vente')
      .order('date_sortie', { ascending: false }),
    supabase.from('membres').select('id, nom, prenom, code_membre, telephone, village'),
    supabase.from('clients_externes').select('id, nom, telephone'),
    supabase.from('paiements_clients').select('id, client_id, montant, motif, date_paiement'),
    supabase.from('transactions').select('id, date_transaction, type_transaction, type_piece, montant, motif, compte_id, campagne_id'),
    supabase.from('remboursements').select('id, montant_fcfa, type_remboursement, facture_id, membre_id, quantite_nature, produit_nature, date_paiement'),
    supabase.from('campagne_membres').select('campagne_id, membre_id, superficie, superficie_validee, casier, observations'),
    supabase.from('campagne_membre_speculations').select('*'),
  ])

  if (facturesRes.error) return { error: facturesRes.error.message }

  // Spéculations par campagne
  const uniqueCampagneIds = Array.from(
    new Set((facturesRes.data || []).map((f: any) => f.campagne_id).filter(Boolean))
  ) as string[]

  const specsByCampagne = new Map<string, any[]>()
  const allSpeculationsList: any[] = []
  await Promise.all(
    uniqueCampagneIds.map(async (cId) => {
      try {
        const specs = await getSpeculationsCampagne(cId)
        specsByCampagne.set(cId, specs || [])
          ; (specs || []).forEach((s) => {
            if (!allSpeculationsList.some((ex) => ex.id === s.id)) {
              allSpeculationsList.push(s)
            }
          })
      } catch (err) {
        console.warn(`Erreur récupération spéculations campagne ${cId}:`, err)
        specsByCampagne.set(cId, [])
      }
    })
  )

  const membreSpecsData = (campagneMembreSpecsRes && !campagneMembreSpecsRes.error && Array.isArray(campagneMembreSpecsRes.data))
    ? campagneMembreSpecsRes.data
    : []

  const parcellesByCampagneMembre = new Map<string, any[]>()
  membreSpecsData.forEach((ms: any) => {
    const key = `${ms.campagne_id}:${ms.membre_id}`
    const list = parcellesByCampagneMembre.get(key) || []
    list.push(ms)
    parcellesByCampagneMembre.set(key, list)
  })

    ; (campagneMembresRes.data || []).forEach((cm: any) => {
      const key = `${cm.campagne_id}:${cm.membre_id}`
      if (!parcellesByCampagneMembre.has(key) || parcellesByCampagneMembre.get(key)!.length === 0) {
        const parcelles = extraireParcellesObservations(cm.observations)
        if (parcelles && parcelles.length > 0) {
          parcellesByCampagneMembre.set(key, parcelles)
        }
      }
    })

  const paidByDocKey = new Map<string, number>()
  for (const pc of (paiementsClientsRes.data || []) as any[]) {
    const motifStr = String(pc.motif || '')
    const docMatch = motifStr.match(/\[DOC:(prestation|vente_stock):([^\]]+)\]/)
    if (docMatch) {
      const key = `${docMatch[1]}:${docMatch[2]}`
      paidByDocKey.set(key, (paidByDocKey.get(key) || 0) + Number(pc.montant || 0))
    }
  }

  const membresById = new Map<string, any>()
  const membresByName = new Map<string, any>()
  for (const m of membresRes.data || []) {
    membresById.set(m.id, m)
    membresByName.set(`${m.prenom} ${m.nom}`.trim().toLowerCase(), m)
    membresByName.set(`${m.nom} ${m.prenom}`.trim().toLowerCase(), m)
  }

  const clientsById = new Map<string, any>()
  const clientsByName = new Map<string, any>()
  for (const c of clientsRes.data || []) {
    clientsById.set(c.id, c)
    clientsByName.set(String(c.nom || '').trim().toLowerCase(), c)
  }

  const reconciledPrestations = reconcilierPrestationsEtPaiements({
    prestations: prestationsRes.data || [],
    paiementsClients: paiementsClientsRes.data || [],
    transactions: transactionsRes.data || [],
    remboursements: remboursementsRes.data || [],
    clientsMap: clientsById,
  })
  const recMap = new Map<string, any>()
  reconciledPrestations.forEach((r) => recMap.set(r.prestationId, r))

  const facturesCampagne = (facturesRes.data || []).map((f: any) => {
    const montantTotal = Number(f.montant_total || 0)
    const montantInteret = Number(f.montant_interet || 0)
    const montantPaye = Number(f.montant_paye || 0)
    const totalDu = montantTotal + montantInteret

    const cId = f.campagne_id
    const mId = f.membre_id
    const key = `${cId}:${mId}`
    const specsCampagne = specsByCampagne.get(cId) || []
    let memberParcelles = parcellesByCampagneMembre.get(key) || []

    const cmRow = (campagneMembresRes.data || []).find((cm: any) => cm.campagne_id === cId && cm.membre_id === mId)
    const supGlobale = Number(cmRow?.superficie || 0)

    if (memberParcelles.length === 0) {
      if (specsCampagne.length > 0) {
        const share = supGlobale > 0 ? supGlobale / specsCampagne.length : 1
        memberParcelles = specsCampagne.map((s: any) => ({
          speculation_id: s.id,
          superficie: share,
          casier: cmRow?.casier || null,
        }))
      } else {
        memberParcelles = [
          {
            speculation_id: `spec-default-${cId}`,
            superficie: supGlobale > 0 ? supGlobale : 1,
            casier: cmRow?.casier || null,
          },
        ]
      }
    }

    const totalMemberSup = memberParcelles.reduce((sum: number, p: any) => sum + (Number(p.superficie) || 0), 0)

    // Préparation des accumulateurs par spéculation
    const specAccMap = new Map<string, {
      speculation_id: string
      nom: string
      variete: string | null
      superficie: number
      casier: string | null
      prix_collecte: number
      produit_collecte: string | null
      unite_mesure: string
      ratio: number
      montant_interet?: number
      montant_du: number
      quantite_nature: number
      valeur_nature: number
      montant_numeraire: number
    }>()

    let allocatedDuSum = 0
    memberParcelles.forEach((p: any, idx: number) => {
      const specObj = specsCampagne.find((s: any) => s.id === p.speculation_id)
      const nom = specObj?.nom || f.campagne?.nom || 'Culture'
      const ratio = totalMemberSup > 0 ? (Number(p.superficie) || 0) / totalMemberSup : 1 / memberParcelles.length
      let mDu = Math.round(totalDu * ratio)
      if (idx === memberParcelles.length - 1) {
        mDu = Math.max(0, totalDu - allocatedDuSum)
      } else {
        allocatedDuSum += mDu
      }

      specAccMap.set(p.speculation_id, {
        speculation_id: p.speculation_id,
        nom,
        variete: specObj?.variete || null,
        superficie: Number(p.superficie || 0),
        casier: p.casier || cmRow?.casier || null,
        prix_collecte: Number(specObj?.prix_collecte || f.campagne?.prix_collecte || 0),
        produit_collecte: specObj?.produit_collecte || f.campagne?.produit_collecte || nom,
        unite_mesure: specObj?.unite_mesure || 'kg',
        ratio,
        montant_interet: Math.round(montantInteret * ratio),
        montant_du: mDu,
        quantite_nature: 0,
        valeur_nature: 0,
        montant_numeraire: 0,
      })
    })

    const fRembList = (remboursementsRes.data || []).filter((r: any) => r.facture_id === f.id)
    let nonVentileMonetaire = 0
    let sumDetails = 0

    for (const r of fRembList) {
      const montant = Number(r.montant_fcfa || 0)
      sumDetails += montant
      const qte = r.quantite_nature != null ? Number(r.quantite_nature) : null
      const rawMode = String(r.type_remboursement || '').toLowerCase()
      const isNature = rawMode === 'nature'

      const specTag = extraireTagSpeculation(r.produit_nature)
      let matchedSpecId: string | null = null

      if ((r as any).speculation_id && specAccMap.has((r as any).speculation_id)) {
        matchedSpecId = (r as any).speculation_id
      } else if (specTag) {
        for (const [sId, sData] of specAccMap.entries()) {
          if (sData.nom.toLowerCase() === specTag.toLowerCase()) {
            matchedSpecId = sId
            break
          }
        }
      } else if (isNature && r.produit_nature) {
        const prodLower = String(r.produit_nature).toLowerCase()
        for (const [sId, sData] of specAccMap.entries()) {
          if (sData.produit_collecte && prodLower.includes(sData.produit_collecte.toLowerCase())) {
            matchedSpecId = sId
            break
          }
          if (prodLower.includes(sData.nom.toLowerCase())) {
            matchedSpecId = sId
            break
          }
        }
      }

      if (isNature) {
        const targetId = matchedSpecId || memberParcelles[0]?.speculation_id
        if (targetId && specAccMap.has(targetId)) {
          const acc = specAccMap.get(targetId)!
          const qVal = qte || 0
          const val = montant > 0 ? montant : qVal * acc.prix_collecte
          acc.quantite_nature += qVal
          acc.valeur_nature += val
        }
      } else {
        if (matchedSpecId && specAccMap.has(matchedSpecId)) {
          specAccMap.get(matchedSpecId)!.montant_numeraire += montant
        } else {
          nonVentileMonetaire += montant
        }
      }
    }

    if (montantPaye > sumDetails) {
      nonVentileMonetaire += (montantPaye - sumDetails)
    }

    for (const acc of specAccMap.values()) {
      const partNonVentilee = Math.round(nonVentileMonetaire * acc.ratio)
      acc.montant_numeraire += partNonVentilee
    }

    const rembParSpecList = Array.from(specAccMap.values()).map((acc) => {
      const montantRembourse = acc.valeur_nature + acc.montant_numeraire
      const solde = acc.montant_du - montantRembourse
      const taux = acc.montant_du > 0 ? Math.min(100, Math.round((montantRembourse / acc.montant_du) * 100)) : 100
      let statutSolde: 'solde' | 'excedent' | 'reliquat' = 'solde'
      if (solde > 0) statutSolde = 'reliquat'
      else if (solde < 0) statutSolde = 'excedent'

      return {
        speculation_id: acc.speculation_id,
        nom: acc.nom,
        variete: acc.variete,
        superficie: acc.superficie,
        casier: acc.casier,
        prix_collecte: acc.prix_collecte,
        produit_collecte: acc.produit_collecte,
        unite_mesure: acc.unite_mesure,
        montant_interet: acc.montant_interet || 0,
        montant_du: acc.montant_du,
        quantite_nature: acc.quantite_nature,
        valeur_nature: acc.valeur_nature,
        montant_numeraire: acc.montant_numeraire,
        montant_rembourse: montantRembourse,
        taux_recouvrement: taux,
        solde,
        statut_solde: statutSolde,
      }
    })

    return {
      ...f,
      type_document: 'campagne' as const,
      tiers_type: 'membre' as const,
      designation: f.campagne?.nom ? `Facture Campagne — ${f.campagne.nom}` : 'Facture Campagne',
      remboursements_par_speculation: rembParSpecList,
      member_parcelles: memberParcelles,
    }
  })

  const facturesPrestations = (prestationsRes.data || []).map((p: any) => {
    const cNomLower = String(p.client_nom || '').trim().toLowerCase()
    const matchedMembre = p.membre_id
      ? membresById.get(p.membre_id)
      : p.tiers_type === 'membre' || (!p.client_id && membresByName.has(cNomLower))
        ? membresByName.get(cNomLower)
        : null
    const isMembre = p.tiers_type === 'membre' || Boolean(matchedMembre)
    const matchedClient = !isMembre
      ? (p.client_id ? clientsById.get(p.client_id) : clientsByName.get(cNomLower)) || {
        id: p.client_id || null,
        nom: p.client_nom || 'Client externe',
        telephone: p.client_telephone || null,
      }
      : null

    const montant = Number(p.montant_facture || 0)
    const paidFromTags = paidByDocKey.get(`prestation:${p.id}`) || 0
    const rec = recMap.get(p.id)
    const montantPaye = rec ? rec.montantPaye : Math.max(Number(p.montant_paye || 0), paidFromTags)
    const statut = rec
      ? rec.statut
      : (p.statut_paiement || (montantPaye >= montant && montant > 0 ? 'payee' : montantPaye > 0 ? 'partiellement_paye' : 'impayee'))
    const qte = Number(p.quantite_traitee || p.superficie || 0)
    const uniteStr = p.unite === 'autre' ? (p.unite_autre || '') : (p.unite || 'ha')

    return {
      id: `prestation-${p.id}`,
      raw_id: p.id,
      type_document: 'prestation' as const,
      tiers_type: isMembre ? ('membre' as const) : ('client' as const),
      membre_id: matchedMembre?.id || p.membre_id || null,
      membre: matchedMembre || null,
      client_id: matchedClient?.id || p.client_id || null,
      client: matchedClient || null,
      client_nom: p.client_nom || (matchedMembre ? `${matchedMembre.prenom} ${matchedMembre.nom}`.trim() : matchedClient?.nom),
      client_telephone: p.client_telephone || matchedMembre?.telephone || matchedClient?.telephone || null,
      campagne_id: p.campagne_id || p.campagne?.id || null,
      campagne: p.campagne || null,
      designation: `${p.type_prestation || 'Prestation'}${p.materiel?.nom ? ` (${p.materiel.nom})` : ''}${qte > 0 ? ` · ${qte} ${uniteStr}` : ''}`,
      date_emission: p.date_prestation || p.created_at,
      montant_total: montant,
      montant_interet: 0,
      montant_paye: montantPaye,
      statut,
      imputation_releve: isMembre ? 'releve_membre' : 'releve_client',
      raw: { ...p, membre: matchedMembre, client: matchedClient, tiers_type: isMembre ? 'membre' : 'client' },
    }
  })

  const facturesVentes = (ventesRes.data || []).map((v: any) => {
    const isMembre = v.tiers_type === 'membre' || Boolean(v.membre_id)
    const matchedMembre = v.membre_id ? membresById.get(v.membre_id) : null
    const tNomLower = String(v.tiers_nom || '').trim().toLowerCase()
    const matchedClient = !isMembre
      ? (v.client_id ? clientsById.get(v.client_id) : clientsByName.get(tNomLower)) || {
        id: v.client_id || null,
        nom: v.tiers_nom || 'Client externe',
        telephone: null,
      }
      : null

    const motifStr = String(v.motif || '')
    const vQteMatch = motifStr.match(/\[VENTE_QTE:([^\]]+)\]/)
    const vUniteMatch = motifStr.match(/\[VENTE_UNITE:([^\]]+)\]/)
    const quantite = vQteMatch ? Number(vQteMatch[1]) : Number(v.quantite || 0)
    const uniteFacturee = vUniteMatch ? vUniteMatch[1].trim() : 'kg'
    const prixUnitaire = Number(v.prix_unitaire || 0)
    const montant = quantite * prixUnitaire
    const paidFromTags = paidByDocKey.get(`vente_stock:${v.id}`) || 0
    const montantPaye = Math.max(Number(v.montant_paye || 0), paidFromTags)
    const statut = montantPaye >= montant && montant > 0 ? 'payee' : montantPaye > 0 ? 'partiellement_paye' : 'impayee'
    const prod = v.campagne?.produit_collecte || 'Stock en nature'

    return {
      id: `vente-${v.id}`,
      raw_id: v.id,
      type_document: 'vente_stock' as const,
      tiers_type: isMembre ? ('membre' as const) : ('client' as const),
      membre_id: matchedMembre?.id || v.membre_id || null,
      membre: matchedMembre || null,
      client_id: matchedClient?.id || v.client_id || null,
      client: matchedClient || null,
      client_nom: matchedMembre ? `${matchedMembre.prenom} ${matchedMembre.nom}`.trim() : (matchedClient?.nom || v.tiers_nom || 'Client'),
      client_telephone: matchedMembre?.telephone || matchedClient?.telephone || null,
      campagne_id: v.campagne_id || v.campagne?.id || null,
      campagne: v.campagne || null,
      designation: `Vente ${prod} (${quantite} ${uniteFacturee} × ${prixUnitaire.toLocaleString('fr-FR')})`,
      date_emission: v.date_sortie || v.created_at,
      montant_total: montant,
      montant_interet: 0,
      montant_paye: montantPaye,
      statut,
      imputation_releve: isMembre ? 'releve_membre' : 'releve_client',
      raw: { ...v, membre: matchedMembre, client: matchedClient, montant_total: montant },
    }
  })

  const factures = [...facturesCampagne, ...facturesPrestations, ...facturesVentes].sort((a, b) => {
    const ta = a.date_emission ? new Date(a.date_emission).getTime() : 0
    const tb = b.date_emission ? new Date(b.date_emission).getTime() : 0
    return tb - ta
  })

  return { factures, allSpeculations: allSpeculationsList }
}

export async function updateMembreTelephone(membreId: string, telephone: string) {
  const denied = await requirePermission('membres', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const clean = telephone.trim()
  const { error } = await supabase
    .from('membres')
    .update({ telephone: clean })
    .eq('id', membreId)

  if (error) return { error: error.message }
  revalidatePath('/facturation')
  revalidatePath('/membres')
  revalidatePath('/remboursements')
  return { success: true }
}

// Répartit l'intérêt du/des crédit(s) validé(s) d'une campagne entre les factures
// des membres de cette campagne, au prorata soit de la superficie qu'ils exploitent
// pour la campagne, soit du montant déjà facturé (intrants + crédits) — stocké à part
/**
 * Récupère les crédits de campagne et leurs paramètres (banque, montant, taux, durée, intérêt, spéculation)
 * pour affichage en temps réel dans la modal de calcul des intérêts.
 */
export async function getCreditsCampagneForInteret(campagneId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié", credits: [], speculations: [] }

  const [creditsRes, specsRes] = await Promise.all([
    supabase
      .from('credits')
      .select('id, banque_nom, montant_accorde, montant_demande, taux_interet, duree_credit, but_credit, statut')
      .eq('campagne_id', campagneId)
      .neq('statut', 'rejete'),
    getSpeculationsCampagne(campagneId).catch(() => []),
  ])

  const speculations = specsRes || []

  const credits = (creditsRes.data || [])
    .filter((c: any) => getCreditType(c) === 'campagne')
    .map((c: any) => {
      const montant = Number(c.montant_accorde) || Number(c.montant_demande) || 0
      const taux = Number(c.taux_interet) || 0
      const duree = Number(c.duree_credit) || 12
      const specId = getCreditSpeculationId(c)
      let specNom = getCreditSpeculationNom(c)
      if (!specNom && specId) {
        const found = speculations.find((s: any) => s.id === specId)
        if (found) specNom = found.nom
      }
      const interet = Math.round(montant * (taux / 100) * (duree / 12))

      return {
        id: c.id,
        banque_nom: c.banque_nom || 'Banque partenaire',
        montant,
        taux_interet: taux,
        duree_credit: duree,
        statut: c.statut,
        speculation_id: specId,
        speculation_nom: specNom,
        interet_calcule: interet,
      }
    })

  return { credits, speculations }
}

// Calcule et répartit l'intérêt bancaire de campagne entre les membres.
// Prend en compte les campagnes multi-spéculations : si un crédit finance une culture spécifique
// (ex: Tomate ou Oignon), son intérêt est imputé au prorata aux membres exploitant cette culture.
export async function calculerInteret(
  campagneId: string,
  methode: 'superficie' | 'intrants',
  options?: {
    speculationId?: string | null
  }
) {
  const denied = await requirePermission('facturation', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: creditsRaw, error: creditsErr } = await supabase
    .from('credits')
    .select('id, banque_nom, montant_accorde, montant_demande, taux_interet, duree_credit, but_credit, statut')
    .eq('campagne_id', campagneId)
    .neq('statut', 'rejete')

  if (creditsErr) {
    console.error("Erreur récupération crédits pour intérêt:", creditsErr)
    return { error: creditsErr.message }
  }

  let credits = (creditsRaw || []).filter((c: any) => getCreditType(c) === 'campagne')

  const filterSpecId = options?.speculationId && options.speculationId !== 'all' ? options.speculationId : null
  if (filterSpecId) {
    credits = credits.filter((c: any) => {
      const sId = getCreditSpeculationId(c)
      return sId === filterSpecId
    })
  }

  const creditsWithInteret = credits.map((c: any) => {
    const montant = Number(c.montant_accorde) || Number(c.montant_demande) || 0
    const taux = Number(c.taux_interet) || 0
    const duree = Number(c.duree_credit) || 12
    const specId = getCreditSpeculationId(c)
    const specNom = getCreditSpeculationNom(c)
    const interet = Math.round(montant * (taux / 100) * (duree / 12))
    return {
      ...c,
      montant,
      taux,
      duree,
      specId,
      specNom,
      interet,
    }
  }).filter((c: any) => c.interet > 0)

  const totalInteret = creditsWithInteret.reduce((sum: number, c: any) => sum + c.interet, 0)

  if (totalInteret <= 0) {
    return {
      error: "Aucun intérêt à répartir : aucun crédit de campagne avec montant, taux (> 0%) et durée renseignés pour cette campagne.",
    }
  }

  const [facturesRes, cmRes, specsRes] = await Promise.all([
    supabase
      .from('factures')
      .select('id, membre_id, montant_total, montant_paye, montant_interet')
      .eq('campagne_id', campagneId),
    supabase
      .from('campagne_membres')
      .select('membre_id, superficie, observations')
      .eq('campagne_id', campagneId),
    getSpeculationsCampagne(campagneId).catch(() => []),
  ])

  const factures = facturesRes.data || []
  if (factures.length === 0) {
    return { error: "Aucune facture trouvée pour cette campagne. Générez d'abord la facturation groupée." }
  }

  const cmData = cmRes.data || []
  const speculations = specsRes || []

  // Cartographie des parcelles multi-spéculations par membre
  const memberSpecsMap = new Map<string, Array<{ speculation_id: string; superficie: number }>>()
  cmData.forEach((cm: any) => {
    const parcelles = extraireParcellesObservations(cm.observations)
    if (parcelles && parcelles.length > 0) {
      memberSpecsMap.set(cm.membre_id, parcelles.map((p) => ({
        speculation_id: p.speculation_id,
        superficie: Number(p.superficie || 0),
      })))
    } else {
      const sup = Number(cm.superficie || 0)
      if (speculations.length > 0) {
        // En multi-spéculations, si le membre a une superficie globale sans ventilation explicite,
        // on alloue sa superficie entre les spéculations de la campagne
        const share = sup / speculations.length
        memberSpecsMap.set(cm.membre_id, speculations.map(s => ({
          speculation_id: s.id,
          superficie: share,
        })))
      } else {
        memberSpecsMap.set(cm.membre_id, [{
          speculation_id: 'default',
          superficie: sup,
        }])
      }
    }
  })

  // Répartition des intérêts par membre en fonction de la spécialisation de chaque crédit
  const allocatedInteretByMember: Record<string, number> = {}
  factures.forEach((f) => {
    allocatedInteretByMember[f.membre_id] = 0
  })

  for (const credit of creditsWithInteret) {
    const cInteret = credit.interet
    const cSpecId = credit.specId

    const poidsCredit: Record<string, number> = {}
    let totalPoidsCredit = 0

    if (methode === 'superficie') {
      for (const cm of cmData) {
        const mId = cm.membre_id
        const parcelles = memberSpecsMap.get(mId) || []
        let sup = 0
        if (cSpecId) {
          const matchP = parcelles.find((p) => p.speculation_id === cSpecId)
          if (matchP) sup = matchP.superficie
        } else {
          sup = Number(cm.superficie || 0) || parcelles.reduce((s, p) => s + p.superficie, 0)
        }
        if (sup > 0) {
          poidsCredit[mId] = sup
          totalPoidsCredit += sup
        }
      }
    } else {
      // Au prorata du montant total déjà facturé
      for (const f of factures) {
        const m = Number(f.montant_total || 0)
        poidsCredit[f.membre_id] = m
        totalPoidsCredit += m
      }
    }

    if (totalPoidsCredit > 0) {
      for (const [mId, p] of Object.entries(poidsCredit)) {
        const part = cInteret * (p / totalPoidsCredit)
        allocatedInteretByMember[mId] = (allocatedInteretByMember[mId] || 0) + part
      }
    } else {
      // Repli si pas de superficie spécifique : répartir également entre les membres de la campagne
      const part = cInteret / factures.length
      factures.forEach((f) => {
        allocatedInteretByMember[f.membre_id] = (allocatedInteretByMember[f.membre_id] || 0) + part
      })
    }
  }

  // Mise à jour de chaque facture avec sa quote-part d'intérêts
  for (const f of factures) {
    const part = Math.round(allocatedInteretByMember[f.membre_id] || 0)
    const totalDu = Number(f.montant_total || 0) + part
    const montantPaye = Number(f.montant_paye || 0)

    let statut: string = 'impayee'
    if (montantPaye >= totalDu && totalDu > 0) {
      statut = 'payee'
    } else if (montantPaye > 0) {
      statut = 'partiellement_paye'
    } else if (totalDu === 0 && montantPaye === 0) {
      statut = 'payee'
    } else {
      statut = 'impayee'
    }

    const { error } = await supabase
      .from('factures')
      .update({ montant_interet: part, statut })
      .eq('id', f.id)
    if (error) return { error: error.message }
  }

  revalidatePath('/facturation')
  revalidatePath('/remboursements')
  revalidatePath('/bilans')
  revalidatePath('/bilans/releve-membre')
  revalidatePath('/bilans/bilan-annuel')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function genererFacturesCampagne(campagneId: string) {
  const denied = await requirePermission('facturation', 'create')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  // 1. Récupérer toutes les distributions d'intrants pour cette campagne et ce GIE
  const { data: distributions, error: distError } = await supabase
    .from('distribution_intrants')
    .select(`
      membre_id,
      quantite,
      intrant_id,
      intrants ( prix_unitaire )
    `)
    .eq('campagne_id', campagneId)
    .eq('gie_id', userData.gie_id)

  if (distError) return { error: distError.message }

  // 1.b Récupérer les prix de facturation configurés pour cette campagne
  const { data: campagneIntrants } = await supabase
    .from('campagne_intrants')
    .select('intrant_id, prix_facturation')
    .eq('campagne_id', campagneId)
    .eq('gie_id', userData.gie_id)

  const prixFacturationMap: Record<string, number> = {}
  if (campagneIntrants) {
    campagneIntrants.forEach(ci => {
      prixFacturationMap[ci.intrant_id] = Number(ci.prix_facturation)
    })
  }

  // 2. Agréger par membre les coûts des intrants distribués
  const montantsParMembre: Record<string, number> = {}

  if (distributions) {
    distributions.forEach(d => {
      const intrant = Array.isArray(d.intrants) ? d.intrants[0] : d.intrants
      const prixFacturation = prixFacturationMap[d.intrant_id] !== undefined
        ? prixFacturationMap[d.intrant_id]
        : Number(intrant?.prix_unitaire || 0)
      const cout = Number(d.quantite || 0) * prixFacturation
      montantsParMembre[d.membre_id] = (montantsParMembre[d.membre_id] || 0) + cout
    })
  }

  // 4. Récupérer toutes les factures existantes pour cette campagne et ce GIE
  const { data: existingFactures, error: factError } = await supabase
    .from('factures')
    .select('id, membre_id, montant_total, montant_paye, montant_interet, statut')
    .eq('campagne_id', campagneId)
    .eq('gie_id', userData.gie_id)

  if (factError) return { error: factError.message }

  // 4.b Récupérer les remboursements réels associés aux factures existantes
  const existingFactureMap = new Map<string, any>()
  const existingFactureIds: string[] = []
  for (const f of existingFactures || []) {
    existingFactureMap.set(f.membre_id, f)
    existingFactureIds.push(f.id)
  }

  const paiementsParFacture: Record<string, number> = {}
  if (existingFactureIds.length > 0) {
    const { data: remboursements } = await supabase
      .from('remboursements')
      .select('facture_id, montant_fcfa')
      .in('facture_id', existingFactureIds)
      .eq('gie_id', userData.gie_id)

    if (remboursements) {
      for (const r of remboursements) {
        paiementsParFacture[r.facture_id] = (paiementsParFacture[r.facture_id] || 0) + Number(r.montant_fcfa || 0)
      }
    }
  }

  let countCreated = 0
  let countUpdated = 0
  let countRemoved = 0

  // 5. Traiter les membres ayant des distributions ou des crédits
  const processedMembreIds = new Set<string>()

  for (const [membreId, montantTotal] of Object.entries(montantsParMembre)) {
    processedMembreIds.add(membreId)
    const existing = existingFactureMap.get(membreId)

    if (existing) {
      // Synchroniser le montant payé réel
      const montantPaye = paiementsParFacture[existing.id] !== undefined
        ? paiementsParFacture[existing.id]
        : Number(existing.montant_paye || 0)

      const montantInteret = Number(existing.montant_interet || 0)
      const totalDu = Number(montantTotal) + montantInteret

      let statut: string = 'impayee'
      if (montantPaye >= totalDu && totalDu > 0) {
        statut = 'payee'
      } else if (montantPaye > 0) {
        statut = 'partiellement_paye'
      } else if (totalDu === 0 && montantPaye === 0) {
        statut = 'payee'
      } else {
        statut = 'impayee'
      }

      const { error: updateErr } = await supabase
        .from('factures')
        .update({
          montant_total: montantTotal,
          montant_paye: montantPaye,
          statut,
        })
        .eq('id', existing.id)

      if (updateErr) return { error: updateErr.message }
      countUpdated++
    } else {
      // Créer une nouvelle facture
      const { error: insertErr } = await supabase
        .from('factures')
        .insert({
          gie_id: userData.gie_id,
          campagne_id: campagneId,
          membre_id: membreId,
          montant_total: montantTotal,
          montant_paye: 0,
          montant_interet: 0,
          statut: montantTotal === 0 ? 'payee' : 'impayee',
        })

      if (insertErr) return { error: insertErr.message }
      countCreated++
    }
  }

  // 6. Nettoyer ou mettre à jour les factures existantes de membres n'ayant plus de distributions ni crédits
  for (const existing of existingFactures || []) {
    if (!processedMembreIds.has(existing.membre_id)) {
      const montantPaye = paiementsParFacture[existing.id] !== undefined
        ? paiementsParFacture[existing.id]
        : Number(existing.montant_paye || 0)

      if (montantPaye > 0) {
        // Le membre a déjà effectué des paiements, préserver l'historique mais solder le principal
        await supabase
          .from('factures')
          .update({
            montant_total: 0,
            montant_paye: montantPaye,
            statut: 'payee',
          })
          .eq('id', existing.id)
        countUpdated++
      } else {
        // Aucune distribution, aucun crédit et aucun paiement : supprimer la facture orpheline
        await supabase
          .from('factures')
          .delete()
          .eq('id', existing.id)
        countRemoved++
      }
    }
  }

  // 7. Revalidation globale des données
  revalidatePath('/facturation')
  revalidatePath('/remboursements')
  revalidatePath('/bilans')
  revalidatePath('/bilans/releve-membre')
  revalidatePath('/bilans/bilan-annuel')
  revalidatePath('/dashboard')

  return {
    success: true,
    countCreated,
    countUpdated,
    countRemoved,
  }
}
