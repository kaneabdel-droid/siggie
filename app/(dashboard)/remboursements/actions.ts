'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'
import { reconcilierPrestationsEtPaiements } from '@/lib/recouvrement-reconciliation'

export async function getFacturesPourRemboursement() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const [facturesCampagneRes, prestationsRes, ventesRes, clientsRes, paiementsClientsRes, transactionsRes, remboursementsRes] = await Promise.all([
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
    supabase.from('remboursements').select('id, montant_fcfa, type_remboursement, facture_id, membre_id, date_paiement'),
  ])

  if (facturesCampagneRes.error) return { error: facturesCampagneRes.error.message }

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

    facturesUnifiees.push({
      ...f,
      id: f.id,
      raw_id: f.id,
      type_document: 'campagne' as const,
      tiers_type: 'membre' as const,
      designation: `Facture Intrants & Crédits (${f.campagne?.nom || 'Campagne'})`,
      montant_total: montantTotal,
      montant_interet: montantInteret,
      montant_paye: montantPaye,
      total_du: totalDu,
      reste,
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
    const montantPaye = rec ? rec.montantPaye : Math.max(Number(p.montant_paye || 0), paidFromTags)
    const totalDu = montantTotal
    const reste = Math.max(0, totalDu - montantPaye)
    const statut = rec
      ? rec.statut
      : (p.statut_paiement || (reste <= 0 ? 'payee' : (montantPaye > 0 ? 'partiellement_paye' : 'impayee')))

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
      montant_paye: montantPaye,
      total_du: totalDu,
      reste,
      statut: p.statut_paiement || (reste <= 0 ? 'payee' : (montantPaye > 0 ? 'partiellement_paye' : 'impayee')),
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

    const montantTotal = Number(v.quantite || 0) * Number(v.prix_unitaire || 0)
    const paidFromTags = paidByDocKey.get(`vente_stock:${v.id}`) || 0
    const montantPaye = Math.max(Number(v.montant_paye || 0), paidFromTags)
    const totalDu = montantTotal
    const reste = totalDu - montantPaye

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
      designation: `Vente de Stock (${v.quantite} kg de ${prod})`,
      montant_total: montantTotal,
      montant_interet: 0,
      montant_paye: montantPaye,
      total_du: totalDu,
      reste,
      statut: reste <= 0 ? 'payee' : (montantPaye > 0 ? 'partiellement_paye' : 'impayee'),
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
