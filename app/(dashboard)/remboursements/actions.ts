'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'
import { reconcilierPrestationsEtPaiements } from '@/lib/recouvrement-reconciliation'
import { findDoublonRemboursement } from '@/lib/anti-doublons'

export type ModeRemboursementKey = 'nature' | 'espece' | 'bon' | 'cheque' | 'autre'

export type PaiementDetailItem = {
  id: string
  date: string
  mode: ModeRemboursementKey
  modeLabel: string
  montant: number
  quantite_nature?: number | null
  unite_nature?: string | null
  produit_nature?: string | null
  reference_piece?: string | null
  compte_nom?: string | null
  motif?: string | null
}

export type RemboursementsParMode = {
  nature: { montant: number; quantite: number; unite: string }
  espece: { montant: number }
  bon: { montant: number }
  cheque: { montant: number }
  autre: { montant: number }
  total: number
}

function initRemboursementsParMode(): RemboursementsParMode {
  return {
    nature: { montant: 0, quantite: 0, unite: 'kg' },
    espece: { montant: 0 },
    bon: { montant: 0 },
    cheque: { montant: 0 },
    autre: { montant: 0 },
    total: 0,
  }
}

function getModeLabel(mode: ModeRemboursementKey): string {
  switch (mode) {
    case 'nature':
      return 'En Nature'
    case 'espece':
      return 'Espèces'
    case 'bon':
      return 'Par Bon'
    case 'cheque':
      return 'Chèque / Banque'
    case 'autre':
      return 'Autre'
  }
}

function parsePaiementClientMotif(motifStr?: string | null): {
  mode: ModeRemboursementKey
  quantite: number | null
  unite: string
  produit: string | null
  reference: string | null
  cleanMotif: string
} {
  const str = String(motifStr || '')
  const modeMatch = str.match(/\[MODE:([^\]]+)\]/)
  const qteMatch = str.match(/\[QTE:([^\]]+)\]/)
  const uniteMatch = str.match(/\[UNITE:([^\]]+)\]/)
  const prodMatch = str.match(/\[PRODUIT:([^\]]+)\]/)
  const refMatch = str.match(/\[REF:([^\]]+)\]/)
  const cleanMotif = str.replace(/\[[^\]]*\]/g, '').trim()

  const rawMode = (modeMatch ? modeMatch[1] : '').trim().toLowerCase()
  let mode: ModeRemboursementKey = 'espece'
  if (rawMode === 'nature') mode = 'nature'
  else if (rawMode === 'bon') mode = 'bon'
  else if (rawMode === 'cheque' || rawMode === 'banque' || rawMode === 'virement') mode = 'cheque'
  else if (rawMode === 'autre') mode = 'autre'
  else if (str.toLowerCase().includes('nature') || qteMatch) mode = 'nature'
  else if (str.toLowerCase().includes('bon')) mode = 'bon'
  else if (str.toLowerCase().includes('chèque') || str.toLowerCase().includes('cheque')) mode = 'cheque'

  return {
    mode,
    quantite: qteMatch ? Number(qteMatch[1]) : null,
    unite: uniteMatch ? uniteMatch[1].trim() : 'kg',
    produit: prodMatch ? prodMatch[1].trim() : null,
    reference: refMatch ? refMatch[1].trim() : null,
    cleanMotif,
  }
}

export async function getFacturesPourRemboursement() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const [facturesCampagneRes, prestationsRes, ventesRes, clientsRes, paiementsClientsRes, transactionsRes, remboursementsRes, comptesRes] = await Promise.all([
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
        membre:membre_id (id, nom, prenom, code_membre, telephone),
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
    supabase
      .from('clients_externes')
      .select('id, nom, telephone, code_client'),
    supabase
      .from('paiements_clients')
      .select('id, client_id, montant, date_paiement, motif'),
    supabase.from('transactions').select('id, date_transaction, type_transaction, type_piece, montant, motif, compte_id, campagne_id'),
    supabase.from('remboursements').select('id, montant_fcfa, type_remboursement, facture_id, membre_id, quantite_nature, produit_nature, date_paiement, reference_piece, compte_id, created_at'),
    supabase.from('comptes').select('id, nom'),
  ])

  if (facturesCampagneRes.error) return { error: facturesCampagneRes.error.message }

  const comptesMap = new Map<string, string>((comptesRes.data || []).map((c: any) => [c.id, c.nom]))

  // Calcul des montants payés par document (prestation / vente_stock) via paiements_clients (tags [DOC:type:id])
  const paidByDocKey = new Map<string, number>()
  for (const pc of (paiementsClientsRes.data || []) as any[]) {
    const motifStr = String(pc.motif || '')
    const docMatch = motifStr.match(/\[DOC:(prestation|vente_stock):([^\]]+)\]/)
    if (docMatch) {
      const key = `${docMatch[1]}:${docMatch[2]}`
      paidByDocKey.set(key, (paidByDocKey.get(key) || 0) + Number(pc.montant || 0))
    }
  }

  const clientMap = new Map<string, any>()
  const clientByName = new Map<string, any>()
  for (const c of (clientsRes.data || []) as any[]) {
    const code = c.code_client || `CLI-${c.id ? c.id.slice(0, 4).toUpperCase() : '001'}`
    const enriched = { ...c, code_client: code }
    clientMap.set(c.id, enriched)
    if (c.nom) clientByName.set(c.nom.trim().toLowerCase(), enriched)
  }

  const facturesUnifiees: any[] = []

  // 1. Factures Campagnes (Intrants & Crédits membres)
  for (const f of facturesCampagneRes.data || []) {
    const montantTotal = Number(f.montant_total || 0)
    const montantInteret = Number(f.montant_interet || 0)
    const montantPaye = Number(f.montant_paye || 0)
    const totalDu = montantTotal + montantInteret
    const reste = totalDu - montantPaye

    const fRembList = (remboursementsRes.data || []).filter((r: any) => r.facture_id === f.id)
    const parMode: RemboursementsParMode = initRemboursementsParMode()
    const details: PaiementDetailItem[] = []
    let sumDetails = 0

    for (const r of fRembList) {
      const rawMode = String(r.type_remboursement || '').toLowerCase()
      let mode: ModeRemboursementKey = 'espece'
      if (rawMode === 'nature') mode = 'nature'
      else if (rawMode === 'bon') mode = 'bon'
      else if (rawMode === 'cheque' || rawMode === 'banque') mode = 'cheque'
      else if (rawMode === 'autre') mode = 'autre'

      const montant = Number(r.montant_fcfa || 0)
      const qte = r.quantite_nature != null ? Number(r.quantite_nature) : null
      const compteNom = r.compte_id ? comptesMap.get(r.compte_id) || null : null

      parMode[mode].montant += montant
      if (mode === 'nature' && qte) {
        parMode.nature.quantite += qte
      }
      sumDetails += montant

      details.push({
        id: r.id,
        date: r.date_paiement ? r.date_paiement.slice(0, 10) : (r.created_at ? r.created_at.slice(0, 10) : ''),
        mode,
        modeLabel: getModeLabel(mode),
        montant,
        quantite_nature: qte,
        produit_nature: r.produit_nature,
        reference_piece: r.reference_piece,
        compte_nom: compteNom,
      })
    }

    if (montantPaye > sumDetails) {
      const diff = montantPaye - sumDetails
      parMode.espece.montant += diff
      details.unshift({
        id: `reglement-direct-${f.id}`,
        date: f.date_emission ? f.date_emission.slice(0, 10) : '',
        mode: 'espece',
        modeLabel: 'Règlement / Trésorerie',
        montant: diff,
        motif: 'Paiement direct enregistré sur la facture',
      })
    }
    parMode.total = Math.max(montantPaye, sumDetails)

    facturesUnifiees.push({
      ...f,
      id: f.id,
      raw_id: f.id,
      type_document: 'campagne' as const,
      tiers_type: 'membre' as const,
      designation: `Facture Intrants & Crédits (${f.campagne?.nom || 'Campagne'})`,
      montant_total: montantTotal,
      montant_interet: montantInteret,
      montant_paye: parMode.total,
      total_du: totalDu,
      reste: totalDu - parMode.total,
      remboursements_par_mode: parMode,
      paiements_details: details,
      client: null,
    })
  }

  const reconciledPrestations = reconcilierPrestationsEtPaiements({
    prestations: prestationsRes.data || [],
    paiementsClients: paiementsClientsRes.data || [],
    transactions: transactionsRes.data || [],
    remboursements: remboursementsRes.data || [],
    clientsMap: clientMap,
  })
  const recMap = new Map<string, any>()
  reconciledPrestations.forEach((r) => recMap.set(r.prestationId, r))

  // 2. Prestations Matériel (membres et clients)
  for (const p of prestationsRes.data || []) {
    const isMembre = p.tiers_type === 'membre' || (p.membre_id && !p.client_id)
    const clientFound = p.client_id
      ? clientMap.get(p.client_id)
      : p.client_nom
        ? clientByName.get(p.client_nom.trim().toLowerCase())
        : null

    const montantTotal = Number(p.montant_facture || 0)
    const paidFromTags = paidByDocKey.get(`prestation:${p.id}`) || 0
    const rec = recMap.get(p.id)
    const initialMontantPaye = rec ? rec.montantPaye : Math.max(Number(p.montant_paye || 0), paidFromTags)

    const parMode: RemboursementsParMode = initRemboursementsParMode()
    const details: PaiementDetailItem[] = []
    let sumDetails = 0

    // Paiements clients par tag ou match client
    const matchingPcs = (paiementsClientsRes.data || [])
      .filter((pc: any) => {
        const motifStr = String(pc.motif || '')
        if (motifStr.includes(`[DOC:prestation:${p.id}]`) || motifStr.includes(`[PRESTATION:${p.id}]`)) return true
        if (p.client_id && pc.client_id === p.client_id && (motifStr.toLowerCase().includes('prestation') || motifStr.toLowerCase().includes('moisson'))) return true
        return false
      })

    for (const pc of matchingPcs) {
      const parsed = parsePaiementClientMotif(pc.motif)
      const montant = Number(pc.montant || 0)
      parMode[parsed.mode].montant += montant
      if (parsed.mode === 'nature' && parsed.quantite) {
        parMode.nature.quantite += parsed.quantite
        if (parsed.unite) parMode.nature.unite = parsed.unite
      }
      sumDetails += montant

      details.push({
        id: pc.id,
        date: pc.date_paiement ? pc.date_paiement.slice(0, 10) : '',
        mode: parsed.mode,
        modeLabel: getModeLabel(parsed.mode),
        montant,
        quantite_nature: parsed.quantite,
        unite_nature: parsed.unite,
        produit_nature: parsed.produit,
        reference_piece: parsed.reference,
        motif: parsed.cleanMotif,
      })
    }

    // Remboursements pour membres liés à cette prestation
    if (isMembre && p.membre_id) {
      const mRemb = (remboursementsRes.data || []).filter((r: any) => r.membre_id === p.membre_id && r.document_id === p.id)
      for (const r of mRemb) {
        const rawMode = String(r.type_remboursement || '').toLowerCase()
        let mode: ModeRemboursementKey = 'espece'
        if (rawMode === 'nature') mode = 'nature'
        else if (rawMode === 'bon') mode = 'bon'
        else if (rawMode === 'cheque') mode = 'cheque'
        else if (rawMode === 'autre') mode = 'autre'

        const montant = Number(r.montant_fcfa || 0)
        parMode[mode].montant += montant
        if (mode === 'nature' && r.quantite_nature) parMode.nature.quantite += Number(r.quantite_nature)
        sumDetails += montant

        details.push({
          id: r.id,
          date: r.date_paiement ? r.date_paiement.slice(0, 10) : '',
          mode,
          modeLabel: getModeLabel(mode),
          montant,
          quantite_nature: r.quantite_nature,
          produit_nature: r.produit_nature,
          reference_piece: r.reference_piece,
        })
      }
    }

    if (initialMontantPaye > sumDetails) {
      const diff = initialMontantPaye - sumDetails
      parMode.espece.montant += diff
      details.unshift({
        id: `reglement-prestation-${p.id}`,
        date: p.date_prestation ? p.date_prestation.slice(0, 10) : '',
        mode: 'espece',
        modeLabel: 'Règlement Trésorerie',
        montant: diff,
        motif: 'Paiement enregistré sur la prestation',
      })
    }

    const finalMontantPaye = Math.max(initialMontantPaye, sumDetails)
    parMode.total = finalMontantPaye
    const totalDu = montantTotal
    const reste = Math.max(0, totalDu - finalMontantPaye)
    const statut = rec
      ? rec.statut
      : (p.statut_paiement || (reste <= 0 ? 'payee' : (finalMontantPaye > 0 ? 'partiellement_paye' : 'impayee')))

    const clientData = clientFound || {
      id: p.client_id || '',
      nom: p.client_nom || 'Client externe',
      telephone: p.client_telephone || null,
      code_client: p.client_id ? `CLI-${String(p.client_id).slice(0, 4).toUpperCase()}` : 'CLI',
    }

    facturesUnifiees.push({
      ...p,
      id: `prestation-${p.id}`,
      raw_id: p.id,
      type_document: 'prestation' as const,
      tiers_type: isMembre ? ('membre' as const) : ('client' as const),
      membre: isMembre ? p.membre : null,
      client: !isMembre ? clientData : null,
      client_nom: clientData.nom,
      client_telephone: clientData.telephone,
      designation: `Prestation ${p.type_prestation} - ${p.materiel?.nom || 'Matériel'}`,
      montant_total: montantTotal,
      montant_interet: 0,
      montant_paye: finalMontantPaye,
      total_du: totalDu,
      reste,
      remboursements_par_mode: parMode,
      paiements_details: details,
      statut,
      date_emission: p.date_prestation,
    })
  }

  // 3. Ventes de Stock (clients)
  for (const v of ventesRes.data || []) {
    const clientFound = v.client_id
      ? clientMap.get(v.client_id)
      : v.tiers_nom
        ? clientByName.get(v.tiers_nom.trim().toLowerCase())
        : null

    const vMotifStr = String(v.motif || '')
    const vQteMatch = vMotifStr.match(/\[VENTE_QTE:([^\]]+)\]/)
    const vUniteMatch = vMotifStr.match(/\[VENTE_UNITE:([^\]]+)\]/)
    const quantiteFacturee = vQteMatch ? Number(vQteMatch[1]) : Number(v.quantite || 0)
    const uniteFacturee = vUniteMatch ? vUniteMatch[1].trim() : 'kg'
    const montantTotal = quantiteFacturee * Number(v.prix_unitaire || 0)
    const paidFromTags = paidByDocKey.get(`vente_stock:${v.id}`) || 0
    const initialMontantPaye = Math.max(Number(v.montant_paye || 0), paidFromTags)

    const parMode: RemboursementsParMode = initRemboursementsParMode()
    const details: PaiementDetailItem[] = []
    let sumDetails = 0

    const matchingPcs = (paiementsClientsRes.data || []).filter((pc: any) => {
      const motifStr = String(pc.motif || '')
      if (motifStr.includes(`[DOC:vente_stock:${v.id}]`) || motifStr.includes(`[VENTE:${v.id}]`)) return true
      if (v.client_id && pc.client_id === v.client_id && (motifStr.toLowerCase().includes('vente') || motifStr.toLowerCase().includes('stock'))) return true
      return false
    })

    for (const pc of matchingPcs) {
      const parsed = parsePaiementClientMotif(pc.motif)
      const montant = Number(pc.montant || 0)
      parMode[parsed.mode].montant += montant
      if (parsed.mode === 'nature' && parsed.quantite) {
        parMode.nature.quantite += parsed.quantite
        if (parsed.unite) parMode.nature.unite = parsed.unite
      }
      sumDetails += montant

      details.push({
        id: pc.id,
        date: pc.date_paiement ? pc.date_paiement.slice(0, 10) : '',
        mode: parsed.mode,
        modeLabel: getModeLabel(parsed.mode),
        montant,
        quantite_nature: parsed.quantite,
        unite_nature: parsed.unite,
        produit_nature: parsed.produit,
        reference_piece: parsed.reference,
        motif: parsed.cleanMotif,
      })
    }

    if (initialMontantPaye > sumDetails) {
      const diff = initialMontantPaye - sumDetails
      parMode.espece.montant += diff
      details.unshift({
        id: `reglement-vente-${v.id}`,
        date: v.date_sortie ? v.date_sortie.slice(0, 10) : '',
        mode: 'espece',
        modeLabel: 'Règlement Trésorerie',
        montant: diff,
        motif: 'Paiement enregistré sur la vente de stock',
      })
    }

    const finalMontantPaye = Math.max(initialMontantPaye, sumDetails)
    parMode.total = finalMontantPaye
    const totalDu = montantTotal
    const reste = totalDu - finalMontantPaye

    const clientData = clientFound || {
      id: v.client_id || '',
      nom: v.tiers_nom || 'Client externe',
      telephone: null,
      code_client: v.client_id ? `CLI-${String(v.client_id).slice(0, 4).toUpperCase()}` : 'CLI',
    }

    const prod = v.campagne?.produit_collecte || 'Stock en nature'
    facturesUnifiees.push({
      ...v,
      id: `vente-${v.id}`,
      raw_id: v.id,
      type_document: 'vente_stock' as const,
      tiers_type: 'client' as const,
      membre: null,
      client: clientData,
      client_nom: clientData.nom,
      client_telephone: clientData.telephone,
      designation: `Vente de Stock (${quantiteFacturee} ${uniteFacturee} de ${prod})`,
      montant_total: montantTotal,
      montant_interet: 0,
      montant_paye: finalMontantPaye,
      total_du: totalDu,
      reste,
      remboursements_par_mode: parMode,
      paiements_details: details,
      statut: reste <= 0 ? 'payee' : (finalMontantPaye > 0 ? 'partiellement_paye' : 'impayee'),
      date_emission: v.date_sortie,
    })
  }

  return { factures: facturesUnifiees }
}

export async function enregistrerRemboursement(
  factureId: string,
  membreId: string | null,
  type: 'espece' | 'nature' | 'bon' | 'cheque' | 'autre',
  montantFcfa: number,
  quantiteNature?: number | null,
  produitNature?: string | null,
  compteId?: string | null,
  referencePiece?: string | null,
  options?: {
    clientId?: string | null
    clientNom?: string | null
    origineStock?: 'exploitation' | 'materiel' | 'achat'
    variete?: string | null
    uniteNature?: string | null
    prixUnitaireNature?: number | null
    typeDocument?: 'campagne' | 'prestation' | 'vente_stock'
    campagneId?: string | null
    datePaiement?: string | null
  }
) {
  const denied = await requirePermission('remboursements', 'create')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('id, gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  // Detect invoice type from ID prefix if not specified
  let docType = options?.typeDocument || 'campagne'
  let rawId = factureId

  if (factureId.startsWith('prestation-')) {
    docType = 'prestation'
    rawId = factureId.replace('prestation-', '')
  } else if (factureId.startsWith('vente-')) {
    docType = 'vente_stock'
    rawId = factureId.replace('vente-', '')
  }

  // Vérifications selon le moyen de paiement
  if ((type === 'espece' || type === 'cheque') && !compteId) {
    return { error: type === 'cheque' ? "Sélectionnez le compte bancaire de dépôt" : "Sélectionnez le compte de trésorerie à créditer" }
  }

  const origineStock = options?.origineStock || (docType === 'prestation' ? 'materiel' : docType === 'vente_stock' ? 'achat' : 'exploitation')
  const variete = options?.variete?.trim() || null

  // Résoudre la campagne de rattachement (indispensable pour l'entrée en Stock en Nature)
  let effectiveCampagneId = options?.campagneId || null
  if (!effectiveCampagneId && type === 'nature') {
    const { data: activeCamp } = await supabase
      .from('campagnes')
      .select('id')
      .eq('gie_id', userData.gie_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    effectiveCampagneId = activeCamp?.id || null
  }

  // Resolve nom & client_id for tiers
  let nomTiers = 'Tiers'
  let resolvedClientId = options?.clientId || null

  if (membreId) {
    const { data: m } = await supabase.from('membres').select('prenom, nom').eq('id', membreId).maybeSingle()
    if (m) nomTiers = `${m.prenom} ${m.nom}`
  } else {
    if (resolvedClientId) {
      const { data: c } = await supabase.from('clients_externes').select('id, nom').eq('id', resolvedClientId).maybeSingle()
      if (c) nomTiers = c.nom
    } else if (options?.clientNom) {
      nomTiers = options.clientNom.trim()
      const { data: existingClient } = await supabase
        .from('clients_externes')
        .select('id, nom')
        .eq('gie_id', userData.gie_id)
        .ilike('nom', nomTiers)
        .limit(1)
        .maybeSingle()
      if (existingClient) {
        resolvedClientId = existingClient.id
      } else {
        const { data: createdClient } = await supabase
          .from('clients_externes')
          .insert({ gie_id: userData.gie_id, nom: nomTiers })
          .select('id')
          .maybeSingle()
        if (createdClient) resolvedClientId = createdClient.id
      }
    }
  }

  // 1. Enregistrer dans la table remboursements (avec tolérance schéma)
  const cleanProdName = (produitNature || 'Produit').trim()
  const uniteNature = options?.uniteNature?.trim() || 'kg'
  const safeProduitNature = type === 'nature'
    ? `${cleanProdName}${variete ? ` [VARIETE:${variete}]` : ''} [ORIGINE:${origineStock}] [UNITE:${uniteNature}]${!membreId && nomTiers ? ` [CLIENT:${nomTiers}]` : ''}${effectiveCampagneId ? ` [CAMPAGNE:${effectiveCampagneId}]` : ''}`
    : null

  const dateEffectuee = options?.datePaiement?.trim() || new Date().toISOString().slice(0, 10)

  // Vérification anti-doublon stricte : même membre + même montant ET (même campagne OU même date OU même ref)
  if (membreId) {
    if (!effectiveCampagneId && docType === 'campagne') {
      const { data: fCamp } = await supabase.from('factures').select('campagne_id').eq('id', rawId).maybeSingle()
      effectiveCampagneId = fCamp?.campagne_id || null
    }

    const doublon = await findDoublonRemboursement(supabase, {
      gieId: userData.gie_id,
      membreId,
      montant: montantFcfa,
      datePaiement: dateEffectuee,
      referencePiece: referencePiece?.trim() || null,
      factureId: docType === 'campagne' ? rawId : null,
      campagneId: effectiveCampagneId,
    })

    if (doublon.isDoublon) {
      return {
        error: `Doublon détecté : un remboursement identique de ${montantFcfa.toLocaleString('fr-FR')} FCFA a déjà été enregistré pour ce membre (${doublon.reason}). Opération annulée pour éviter un double comptage.`
      }
    }
  }

  const rembInsertPayload: any = {
    gie_id: userData.gie_id,
    type_remboursement: type,
    montant_fcfa: montantFcfa,
    quantite_nature: type === 'nature' ? quantiteNature : null,
    produit_nature: safeProduitNature,
    compte_id: compteId || null,
    reference_piece: referencePiece?.trim() || null,
    date_paiement: dateEffectuee,
  }

  if (docType === 'campagne') {
    rembInsertPayload.facture_id = rawId
  }
  if (membreId) {
    rembInsertPayload.membre_id = membreId
  }
  if (resolvedClientId) {
    rembInsertPayload.client_id = resolvedClientId
  }

  let rembId: string | null = null

  // Try insert with native columns
  const tryInsert = await supabase
    .from('remboursements')
    .insert({
      ...rembInsertPayload,
      origine_stock: origineStock,
      variete: variete,
      document_id: rawId,
      document_type: docType,
    })
    .select('id')
    .maybeSingle()

  if (tryInsert.data?.id) {
    rembId = tryInsert.data.id
  } else {
    // Fallback without extended columns if schema cache misses them
    const { client_id: _cid, compte_id: _cpid, reference_piece: _ref, ...basePayload } = rembInsertPayload
    const fallbackInsert = await supabase
      .from('remboursements')
      .insert(basePayload)
      .select('id')
      .maybeSingle()

    if (fallbackInsert.data?.id) {
      rembId = fallbackInsert.data.id
    }
  }

  // 2. Entrée de trésorerie sur le compte de destination choisi (espèces, chèque, bon ou autre relié à un compte)
  const docLabel = docType === 'prestation' ? 'Prestation' : docType === 'vente_stock' ? 'Vente stock' : 'Campagne'
  let motifHumain = `Remboursement (${docLabel}) - ${nomTiers}`
  let typePiece = membreId ? 'remboursement_membre' : 'remboursement_client'

  if (type === 'cheque') {
    motifHumain = `Paiement par chèque ${referencePiece ? `N° ${referencePiece}` : ''} (${docLabel}) - ${nomTiers}`
    typePiece = 'remboursement_cheque'
  } else if (type === 'bon') {
    motifHumain = `Paiement par bon ${referencePiece ? `N° ${referencePiece}` : ''} (${docLabel}) - ${nomTiers}`
    typePiece = 'remboursement_bon'
  } else if (type === 'autre') {
    motifHumain = `Autre paiement ${referencePiece ? `(${referencePiece})` : ''} (${docLabel}) - ${nomTiers}`
    typePiece = 'remboursement_autre'
  } else if (type === 'nature') {
    motifHumain = `Paiement en nature : ${quantiteNature || 0} kg de ${cleanProdName}${variete ? ` (Var. ${variete})` : ''} (${docLabel}) - ${nomTiers}`
  }

  if (compteId && (type === 'espece' || type === 'cheque' || type === 'bon' || type === 'autre')) {
    const { error: txError } = await supabase.from('transactions').insert({
      gie_id: userData.gie_id,
      compte_id: compteId,
      type_transaction: 'entree',
      montant: montantFcfa,
      motif: motifHumain,
      type_piece: typePiece,
      date_transaction: dateEffectuee,
      campagne_id: effectiveCampagneId,
    })

    if (txError) {
      if (rembId) await supabase.from('remboursements').delete().eq('id', rembId)
      return { error: txError.message }
    }
  }

  // 2.b Si c'est un client non-membre, enregistrer dans paiements_clients (pour TOUS les modes, y compris nature, bon, autre)
  if (!membreId && resolvedClientId) {
    const puNature = options?.prixUnitaireNature || (quantiteNature && quantiteNature > 0 ? Math.round(montantFcfa / quantiteNature) : 0)
    const metaTags = [
      `[MODE:${type}]`,
      `[DOC:${docType}:${rawId}]`,
      rembId ? `[REMB_ID:${rembId}]` : '',
      compteId ? `[COMPTE:${compteId}]` : '',
      referencePiece ? `[REF:${referencePiece.trim()}]` : '',
      type === 'nature' && quantiteNature ? `[QTE:${quantiteNature}]` : '',
      type === 'nature' && puNature ? `[PU:${puNature}]` : '',
      type === 'nature' && cleanProdName ? `[PRODUIT:${cleanProdName}]` : '',
      type === 'nature' && variete ? `[VARIETE:${variete}]` : '',
      type === 'nature' ? `[ORIGINE:${origineStock}]` : '',
      type === 'nature' && effectiveCampagneId ? `[CAMPAGNE:${effectiveCampagneId}]` : '',
    ]
      .filter(Boolean)
      .join(' ')

    await supabase.from('paiements_clients').insert({
      gie_id: userData.gie_id,
      client_id: resolvedClientId,
      montant: montantFcfa,
      date_paiement: dateEffectuee,
      motif: `${metaTags} ${motifHumain}`.trim(),
    })
  }

  // 3. Mettre à jour la facture source (montant_paye et statut)
  if (docType === 'campagne') {
    const { data: facture } = await supabase
      .from('factures')
      .select('montant_total, montant_interet, montant_paye')
      .eq('id', rawId)
      .single()

    if (facture) {
      const totalDu = Number(facture.montant_total || 0) + Number(facture.montant_interet || 0)
      const nouveauMontantPaye = Number(facture.montant_paye || 0) + Number(montantFcfa)
      let nouveauStatut = 'impayee'
      if (nouveauMontantPaye > 0) nouveauStatut = 'partiellement_paye'
      if (nouveauMontantPaye >= totalDu) nouveauStatut = 'payee'

      await supabase
        .from('factures')
        .update({
          montant_paye: nouveauMontantPaye,
          statut: nouveauStatut
        })
        .eq('id', rawId)
    }
  } else if (docType === 'prestation') {
    const { data: prest } = await supabase
      .from('materiel_prestations')
      .select('montant_facture, montant_paye')
      .eq('id', rawId)
      .single()

    if (prest) {
      const totalDu = Number(prest.montant_facture || 0)
      const nouveauMontantPaye = Number(prest.montant_paye || 0) + Number(montantFcfa)
      const nouveauStatut = nouveauMontantPaye >= totalDu ? 'payee' : nouveauMontantPaye > 0 ? 'partiellement_paye' : 'impayee'

      await supabase
        .from('materiel_prestations')
        .update({
          montant_paye: nouveauMontantPaye,
          statut_paiement: nouveauStatut,
        })
        .eq('id', rawId)
    }
  } else if (docType === 'vente_stock') {
    const { data: vente } = await supabase
      .from('sorties_stock_nature')
      .select('quantite, prix_unitaire, montant_paye')
      .eq('id', rawId)
      .single()

    if (vente) {
      const nouveauMontantPaye = Number(vente.montant_paye || 0) + Number(montantFcfa)
      await supabase
        .from('sorties_stock_nature')
        .update({
          montant_paye: nouveauMontantPaye,
        })
        .eq('id', rawId)
    }
  }

  revalidatePath('/remboursements')
  revalidatePath('/remboursements/ristournes')
  revalidatePath('/remboursements/stock-nature')
  revalidatePath('/tresorerie')
  revalidatePath('/tresorerie/journaux')
  revalidatePath('/facturation')
  revalidatePath('/materiel/prestations')
  revalidatePath('/bilans')
  revalidatePath('/bilans/releve-membre')
  revalidatePath('/bilans/releve-client')
  revalidatePath('/bilans/bilan-annuel')
  revalidatePath('/dashboard')

  return { success: true }
}
