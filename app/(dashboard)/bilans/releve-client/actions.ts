'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

export async function getClients() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = user
    ? await supabase.from('utilisateurs').select('gie_id').eq('id', user.id).maybeSingle()
    : { data: null }

  let clientsRes: any = await supabase
    .from('clients_externes')
    .select('id, nom, telephone, code_client')
    .not('nom', 'ilike', '[FOURNISSEUR]%')
    .order('nom', { ascending: true })
  if (clientsRes.error && (clientsRes.error.message?.includes('code_client') || clientsRes.error.code === '42703')) {
    clientsRes = await supabase
      .from('clients_externes')
      .select('id, nom, telephone')
      .not('nom', 'ilike', '[FOURNISSEUR]%')
      .order('nom', { ascending: true })
  }

  const [membresRes, prestationsRes, sortiesRes] = await Promise.all([
    supabase.from('membres').select('id, prenom, nom'),
    supabase.from('materiel_prestations').select('id, client_nom, client_telephone, tiers_type, membre_id, client_id'),
    supabase.from('sorties_stock_nature').select('id, tiers_nom, tiers_type, client_id').eq('tiers_type', 'client'),
  ])

  if (clientsRes.error) return { error: clientsRes.error.message }

  const clients = (clientsRes.data || [])
    .filter((c: any) => !c.nom?.startsWith('[FOURNISSEUR]'))
    .map((c: any, idx: number) => ({
      ...c,
      code_client: c.code_client || `CLI-${c.id ? c.id.slice(0, 4).toUpperCase() : String(idx + 1).padStart(3, '0')}`,
    }))
  const existingClientNames = new Set(clients.map((c: any) => c.nom.trim().toLowerCase()))
  const memberNames = new Set(
    (membresRes.data || []).flatMap((m) => [
      `${m.prenom} ${m.nom}`.trim().toLowerCase(),
      `${m.nom} ${m.prenom}`.trim().toLowerCase(),
    ])
  )

  if (userData?.gie_id) {
    const newClientsToInsert: { gie_id: string; nom: string; telephone: string | null }[] = []

    for (const p of (prestationsRes.data || []) as any[]) {
      if (p.tiers_type === 'membre' || p.membre_id || p.client_id) continue
      const nom = String(p.client_nom || '').trim()
      if (!nom) continue
      const lower = nom.toLowerCase()
      if (memberNames.has(lower) || existingClientNames.has(lower)) continue
      existingClientNames.add(lower)
      newClientsToInsert.push({
        gie_id: userData.gie_id,
        nom,
        telephone: p.client_telephone || null,
      })
    }

    for (const s of (sortiesRes.data || []) as any[]) {
      if (s.client_id) continue
      const nom = String(s.tiers_nom || '').trim()
      if (!nom) continue
      const lower = nom.toLowerCase()
      if (memberNames.has(lower) || existingClientNames.has(lower)) continue
      existingClientNames.add(lower)
      newClientsToInsert.push({
        gie_id: userData.gie_id,
        nom,
        telephone: null,
      })
    }

    if (newClientsToInsert.length > 0) {
      const { data: inserted } = await supabase
        .from('clients_externes')
        .insert(newClientsToInsert)
        .select('id, nom, telephone')
      if (inserted) {
        inserted.forEach((item: any, i: number) => {
          clients.push({
            ...item,
            code_client: item.code_client || `CLI-${item.id ? item.id.slice(0, 4).toUpperCase() : String(clients.length + i + 1).padStart(3, '0')}`
          })
        })
        clients.sort((a: any, b: any) => a.nom.localeCompare(b.nom))
      }
    }
  }

  return { clients }
}

export async function addClient(nom: string, telephone?: string) {
  const denied = await requirePermission('bilans_clients', 'create')
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
  if (!nom.trim()) return { error: "Le nom du client est requis" }

  // Generate a code client
  const { data: countData } = await supabase
    .from('clients_externes')
    .select('id', { count: 'exact', head: true })
  const nextNum = (countData ? Number(countData) : 0) + 1
  const codeClient = `CLI-${String(nextNum).padStart(3, '0')}`

  let insertRes = await supabase
    .from('clients_externes')
    .insert({ gie_id: userData.gie_id, nom: nom.trim(), telephone: telephone?.trim() || null, code_client: codeClient })
    .select('id, nom, telephone, code_client')
    .single()

  if (insertRes.error && (insertRes.error.message?.includes('code_client') || insertRes.error.code === '42703')) {
    insertRes = await supabase
      .from('clients_externes')
      .insert({ gie_id: userData.gie_id, nom: nom.trim(), telephone: telephone?.trim() || null })
      .select('id, nom, telephone')
      .single()
  }

  if (insertRes.error) return { error: insertRes.error.message }

  const client = {
    ...insertRes.data,
    code_client: (insertRes.data as any)?.code_client || codeClient
  }

  revalidatePath('/bilans/releve-client')
  revalidatePath('/materiel/prestations')
  revalidatePath('/membres')
  return { success: true, client }
}

type Mouvement = {
  id: string
  date: string
  type: 'vente' | 'prestation' | 'paiement' | 'remboursement'
  designation: string
  quantite: number | null
  unite?: string | null
  prix_unitaire: number | null
  montant: number
  raw?: any
}

export async function getReleveClient(clientId: string) {
  const supabase = await createClient()

  let clientRes = await supabase
    .from('clients_externes')
    .select('id, nom, telephone, code_client')
    .eq('id', clientId)
    .single()

  if (clientRes.error && (clientRes.error.message?.includes('code_client') || clientRes.error.code === '42703')) {
    clientRes = await supabase
      .from('clients_externes')
      .select('id, nom, telephone')
      .eq('id', clientId)
      .single()
  }

  const client = clientRes.data
  if (!client || client.nom?.startsWith('[FOURNISSEUR]')) return { error: "Client introuvable" }
  if (!(client as any).code_client) {
    (client as any).code_client = `CLI-${client.id ? client.id.slice(0, 4).toUpperCase() : '001'}`
  }

  const [ventesRes, prestationsRes, paiementsRes, remboursementsRes, transactionsRes] = await Promise.all([
    supabase
      .from('sorties_stock_nature')
      .select('id, client_id, tiers_nom, tiers_type, quantite, prix_unitaire, date_sortie, motif, campagnes(nom, produit_collecte)')
      .eq('type_sortie', 'vente')
      .eq('tiers_type', 'client'),
    supabase
      .from('materiel_prestations')
      .select('*, materiel:materiel_id(nom), produit:produit_id(nom), campagne:campagne_id(nom)'),
    supabase
      .from('paiements_clients')
      .select('id, montant, date_paiement, motif')
      .eq('client_id', clientId),
    supabase
      .from('remboursements')
      .select('id, montant_fcfa, type_remboursement, quantite_nature, produit_nature, date_paiement, reference_piece')
      .eq('client_id', clientId),
    supabase
      .from('transactions')
      .select('id, montant, date_transaction, motif, type_piece, type_transaction')
      .eq('type_transaction', 'entree'),
  ])

  if (ventesRes.error) return { error: ventesRes.error.message }
  if (paiementsRes.error) return { error: paiementsRes.error.message }

  const clientNomLower = client.nom.trim().toLowerCase()

  const ventesClient = (ventesRes.data || []).filter((v: any) => {
    if (v.client_id) return v.client_id === clientId
    return String(v.tiers_nom || '').trim().toLowerCase() === clientNomLower
  })

  const prestationsClient = (prestationsRes.data || []).filter((p: any) => {
    if (p.tiers_type === 'membre' || p.membre_id) return false
    if (p.client_id) return p.client_id === clientId
    return String(p.client_nom || '').trim().toLowerCase() === clientNomLower
  })

  const mouvements: Mouvement[] = []

  for (const v of ventesClient) {
    const camp = Array.isArray(v.campagnes) ? v.campagnes[0] : v.campagnes
    const prod = camp?.produit_collecte || 'Stock en nature'
    mouvements.push({
      id: v.id,
      date: v.date_sortie,
      type: 'vente',
      designation: `Facture Vente : ${prod}${camp?.nom ? ` (${camp.nom})` : ''}`,
      quantite: Number(v.quantite),
      unite: 'kg',
      prix_unitaire: Number(v.prix_unitaire),
      montant: Number(v.quantite) * Number(v.prix_unitaire),
      raw: { ...v, client, campagne: camp },
    })
  }

  for (const p of prestationsClient) {
    const qte = Number(p.quantite_traitee || p.superficie || 0)
    const uniteStr = p.unite === 'autre' ? (p.unite_autre || '') : (p.unite || 'ha')
    const matNom = p.materiel?.nom ? ` (${p.materiel.nom})` : ''
    const prixUnit =
      p.mode_paiement === 'part_recolte'
        ? p.prix_unitaire_part != null
          ? Number(p.prix_unitaire_part)
          : null
        : p.tarif_unitaire != null
          ? Number(p.tarif_unitaire)
          : null

    mouvements.push({
      id: `prestation-${p.id}`,
      date: p.date_prestation,
      type: 'prestation',
      designation: `Facture Prestation : ${p.type_prestation}${matNom}`,
      quantite: qte > 0 ? qte : null,
      unite: uniteStr,
      prix_unitaire: prixUnit,
      montant: Number(p.montant_facture || 0),
      raw: { ...p, client },
    })
  }

  const rembIdsFromPaiements = new Set<string>()

  for (const p of paiementsRes.data || []) {
    const rawMotif = String(p.motif || '')
    const rembMatch = rawMotif.match(/\[REMB_ID:([^\]]+)\]/)
    if (rembMatch && rembMatch[1]) {
      rembIdsFromPaiements.add(rembMatch[1].trim())
    }

    const modeMatch = rawMotif.match(/\[MODE:([^\]]+)\]/)
    const mode = modeMatch ? modeMatch[1].trim() : 'espece'
    const qteMatch = rawMotif.match(/\[QTE:([^\]]+)\]/)
    const puMatch = rawMotif.match(/\[PU:([^\]]+)\]/)
    const prodMatch = rawMotif.match(/\[PRODUIT:([^\]]+)\]/)
    const varMatch = rawMotif.match(/\[VARIETE:([^\]]+)\]/)
    const refMatch = rawMotif.match(/\[REF:([^\]]+)\]/)
    const uniteMatch = rawMotif.match(/\[UNITE:([^\]]+)\]/)

    const cleanMotif = rawMotif.replace(/\[[^\]]*\]/g, '').trim()

    const qteNature = qteMatch ? Number(qteMatch[1]) : null
    const puNature = puMatch ? Number(puMatch[1]) : null
    const prodNature = prodMatch ? prodMatch[1].trim() : null
    const varNature = varMatch ? varMatch[1].trim() : null
    const refPiece = refMatch ? refMatch[1].trim() : null
    const uniteNature = uniteMatch ? uniteMatch[1].trim() : 'kg'

    let designation = cleanMotif ? `Paiement reçu (${cleanMotif})` : 'Paiement reçu'
    if (mode === 'nature' && qteNature) {
      designation = `Paiement en nature : ${qteNature} ${uniteNature} de ${prodNature || 'produit'}${varNature ? ` (Var. ${varNature})` : ''}`
    } else if (mode === 'cheque') {
      designation = cleanMotif || `Paiement par chèque${refPiece ? ` (N° ${refPiece})` : ''}`
    } else if (mode === 'bon') {
      designation = cleanMotif || `Paiement par bon${refPiece ? ` (N° ${refPiece})` : ''}`
    } else if (mode === 'autre') {
      designation = cleanMotif || `Autre paiement${refPiece ? ` (${refPiece})` : ''}`
    } else if (cleanMotif) {
      designation = cleanMotif
    }

    mouvements.push({
      id: p.id,
      date: p.date_paiement,
      type: 'paiement',
      designation,
      quantite: mode === 'nature' && qteNature ? qteNature : null,
      unite: mode === 'nature' && qteNature ? uniteNature : null,
      prix_unitaire: mode === 'nature' && puNature ? puNature : null,
      montant: Number(p.montant),
    })
  }

  for (const r of (remboursementsRes.data || []) as any[]) {
    if (rembIdsFromPaiements.has(r.id)) continue
    const cleanProd = String(r.produit_nature || 'produit').replace(/\[[^\]]*\]/g, '').trim()
    const rUniteMatch = String(r.produit_nature || '').match(/\[UNITE:([^\]]+)\]/)
    const rUnite = rUniteMatch ? rUniteMatch[1].trim() : 'kg'
    const desc = r.type_remboursement === 'nature'
      ? `Remboursement en nature : ${r.quantite_nature || ''} ${rUnite} de ${cleanProd}`
      : `Remboursement (${r.type_remboursement || 'espèces'})${r.reference_piece ? ` - Réf: ${r.reference_piece}` : ''}`
    mouvements.push({
      id: r.id,
      date: r.date_paiement ? r.date_paiement.slice(0, 10) : new Date().toISOString().slice(0, 10),
      type: 'remboursement',
      designation: desc,
      quantite: r.quantite_nature ? Number(r.quantite_nature) : null,
      unite: r.quantite_nature ? rUnite : null,
      prix_unitaire: r.quantite_nature && Number(r.quantite_nature) > 0 ? Math.round(Number(r.montant_fcfa || 0) / Number(r.quantite_nature)) : null,
      montant: Number(r.montant_fcfa || 0),
    })
  }

  for (const tx of (transactionsRes.data || []) as any[]) {
    const txMotif = String(tx.motif || '').toLowerCase()
    const isDirectMatch = txMotif.includes(clientNomLower) || txMotif.includes(`tiers:${clientNomLower}`)
    if (!isDirectMatch) continue

    // Éviter le double comptage si déjà comptabilisé dans paiements_clients
    const alreadyInPaiements = (paiementsRes.data || []).some((pc: any) => {
      return Number(pc.montant || 0) === Number(tx.montant || 0)
    })
    if (alreadyInPaiements) continue

    const cleanMotif = String(tx.motif || '').replace(/\[[^\]]*\]/g, '').trim()
    mouvements.push({
      id: `tx-${tx.id}`,
      date: tx.date_transaction || new Date().toISOString().slice(0, 10),
      type: 'paiement',
      designation: cleanMotif ? `Règlement Trésorerie (${cleanMotif})` : 'Règlement Trésorerie (Caisse/Banque)',
      quantite: null,
      unite: null,
      prix_unitaire: null,
      montant: Number(tx.montant || 0),
    })
  }

  mouvements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let solde = 0
  const journal = mouvements.map((m) => {
    solde += (m.type === 'paiement' || m.type === 'remboursement') ? -m.montant : m.montant
    return { ...m, solde }
  })

  return {
    client,
    journal: journal.reverse(),
    soldeActuel: solde,
  }
}

export async function getContextePaiementClient() {
  const supabase = await createClient()
  const [{ data: comptes }, { data: campagnes }] = await Promise.all([
    supabase.from('comptes').select('id, nom, type_compte').order('nom', { ascending: true }),
    supabase
      .from('campagnes')
      .select('id, nom, statut, produit_collecte, prix_collecte')
      .order('created_at', { ascending: false }),
  ])
  return {
    comptes: comptes || [],
    campagnes: campagnes || [],
  }
}

export async function addPaiementClient(input: {
  client_id: string
  montant: number
  date_paiement?: string
  motif?: string
  mode_paiement?: 'espece' | 'cheque' | 'bon' | 'nature' | 'autre'
  compte_id?: string | null
  reference_piece?: string | null
  quantite_nature?: number | null
  produit_nature?: string | null
  unite_nature?: string | null
  prix_unitaire_nature?: number | null
  variete?: string | null
  origine_stock?: 'exploitation' | 'materiel' | 'achat'
  campagne_id?: string | null
}) {
  const denied = await requirePermission('bilans_clients', 'create')
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

  const mode = input.mode_paiement || 'espece'
  const datePaiement = input.date_paiement || new Date().toISOString().slice(0, 10)
  const compteId = input.compte_id?.trim() || null
  const refPiece = input.reference_piece?.trim() || null
  const variete = input.variete?.trim() || null
  const origineStock = input.origine_stock || 'materiel'

  let montantEffectif = Number(input.montant || 0)
  const qteNature = mode === 'nature' ? Number(input.quantite_nature || 0) : null
  const puNature = mode === 'nature' ? Number(input.prix_unitaire_nature || 0) : null
  const cleanProdName = mode === 'nature' ? (input.produit_nature || 'Riz paddy').trim() : null
  const uniteNature = mode === 'nature' ? (input.unite_nature?.trim() || 'kg') : 'kg'

  if (mode === 'nature') {
    if (!qteNature || qteNature <= 0) return { error: "Veuillez saisir une quantité en nature valide (kg)." }
    if (!puNature || puNature <= 0) return { error: "Veuillez saisir un prix unitaire d'évaluation valide." }
    montantEffectif = Math.round(qteNature * puNature)
  }

  if (!montantEffectif || montantEffectif <= 0) return { error: "Montant invalide" }

  if ((mode === 'espece' || mode === 'cheque') && !compteId) {
    return {
      error: mode === 'cheque'
        ? "Veuillez sélectionner le compte bancaire de destination."
        : "Veuillez sélectionner le compte de trésorerie de destination.",
    }
  }

  // Récupérer le nom du client
  const { data: clientRow } = await supabase
    .from('clients_externes')
    .select('nom')
    .eq('id', input.client_id)
    .maybeSingle()
  const nomClient = clientRow?.nom || 'Client externe'

  // Campagne de rattachement pour le stock en nature
  let effectiveCampagneId = input.campagne_id?.trim() || null
  if (mode === 'nature' && !effectiveCampagneId) {
    const { data: activeCamp } = await supabase
      .from('campagnes')
      .select('id')
      .eq('gie_id', userData.gie_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    effectiveCampagneId = activeCamp?.id || null
  }

  // 1. Si paiement en nature (ou règlement client), tenter l'ajout dans remboursements pour le stock en nature
  let rembId: string | null = null
  if (mode === 'nature') {
    const safeProduitNature = `${cleanProdName}${variete ? ` [VARIETE:${variete}]` : ''} [ORIGINE:${origineStock}] [UNITE:${uniteNature}] [CLIENT:${nomClient}]${effectiveCampagneId ? ` [CAMPAGNE:${effectiveCampagneId}]` : ''}`
    const tryRemb = await supabase
      .from('remboursements')
      .insert({
        gie_id: userData.gie_id,
        client_id: input.client_id,
        type_remboursement: 'nature',
        montant_fcfa: montantEffectif,
        quantite_nature: qteNature,
        produit_nature: safeProduitNature,
        origine_stock: origineStock,
        variete: variete,
        date_paiement: datePaiement,
      })
      .select('id')
      .maybeSingle()

    if (tryRemb.data?.id) {
      rembId = tryRemb.data.id
    } else {
      const fallbackRemb = await supabase
        .from('remboursements')
        .insert({
          gie_id: userData.gie_id,
          type_remboursement: 'nature',
          montant_fcfa: montantEffectif,
          quantite_nature: qteNature,
          produit_nature: safeProduitNature,
          date_paiement: datePaiement,
        })
        .select('id')
        .maybeSingle()
      if (fallbackRemb.data?.id) {
        rembId = fallbackRemb.data.id
      }
    }
  }

  // 2. Libellé humain et écriture de trésorerie sur le compte de destination choisi
  const userNote = input.motif?.trim() || ''
  let motifHumain = userNote || `Règlement client - ${nomClient}`
  let typePiece = 'remboursement_client'

  if (mode === 'espece') {
    motifHumain = `Paiement espèces - ${nomClient}${userNote ? ` (${userNote})` : ''}`
  } else if (mode === 'cheque') {
    motifHumain = `Paiement par chèque${refPiece ? ` N° ${refPiece}` : ''} - ${nomClient}${userNote ? ` (${userNote})` : ''}`
    typePiece = 'remboursement_cheque'
  } else if (mode === 'bon') {
    motifHumain = `Paiement par bon${refPiece ? ` N° ${refPiece}` : ''} - ${nomClient}${userNote ? ` (${userNote})` : ''}`
    typePiece = 'remboursement_bon'
  } else if (mode === 'autre') {
    motifHumain = `Autre paiement${refPiece ? ` (${refPiece})` : ''} - ${nomClient}${userNote ? ` - ${userNote}` : ''}`
    typePiece = 'remboursement_autre'
  } else if (mode === 'nature') {
    motifHumain = `Paiement en nature : ${qteNature} ${uniteNature} de ${cleanProdName}${variete ? ` (Var. ${variete})` : ''}${userNote ? ` - ${userNote}` : ''}`
  }

  if (compteId && (mode === 'espece' || mode === 'cheque' || mode === 'bon' || mode === 'autre')) {
    const { error: txError } = await supabase.from('transactions').insert({
      gie_id: userData.gie_id,
      compte_id: compteId,
      type_transaction: 'entree',
      montant: montantEffectif,
      motif: motifHumain,
      type_piece: typePiece,
      date_transaction: datePaiement,
      campagne_id: effectiveCampagneId,
    })

    if (txError) {
      if (rembId) await supabase.from('remboursements').delete().eq('id', rembId)
      return { error: txError.message }
    }
  }

  // 3. Enregistrer dans paiements_clients avec les méta-tags complets
  const metaTags = [
    `[MODE:${mode}]`,
    rembId ? `[REMB_ID:${rembId}]` : '',
    compteId ? `[COMPTE:${compteId}]` : '',
    refPiece ? `[REF:${refPiece}]` : '',
    mode === 'nature' && qteNature ? `[QTE:${qteNature}]` : '',
    mode === 'nature' && uniteNature ? `[UNITE:${uniteNature}]` : '',
    mode === 'nature' && puNature ? `[PU:${puNature}]` : '',
    mode === 'nature' && cleanProdName ? `[PRODUIT:${cleanProdName}]` : '',
    mode === 'nature' && variete ? `[VARIETE:${variete}]` : '',
    mode === 'nature' ? `[ORIGINE:${origineStock}]` : '',
    mode === 'nature' && effectiveCampagneId ? `[CAMPAGNE:${effectiveCampagneId}]` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const { error } = await supabase.from('paiements_clients').insert({
    gie_id: userData.gie_id,
    client_id: input.client_id,
    montant: montantEffectif,
    date_paiement: datePaiement,
    motif: `${metaTags} ${motifHumain}`.trim(),
  })

  if (error) return { error: error.message }

  revalidatePath('/bilans/releve-client')
  revalidatePath('/remboursements')
  revalidatePath('/remboursements/stock-nature')
  revalidatePath('/tresorerie')
  revalidatePath('/tresorerie/journaux')
  revalidatePath('/facturation')
  return { success: true }
}
