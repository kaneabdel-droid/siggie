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
    .select('id, nom, telephone, code_client, solde_initial')
    .not('nom', 'ilike', '[FOURNISSEUR]%')
    .order('nom', { ascending: true })
  if (clientsRes.error && (clientsRes.error.message?.includes('solde_initial') || clientsRes.error.message?.includes('code_client') || clientsRes.error.code === '42703')) {
    clientsRes = await supabase
      .from('clients_externes')
      .select('id, nom, telephone, code_client')
      .not('nom', 'ilike', '[FOURNISSEUR]%')
      .order('nom', { ascending: true })
  }
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

export async function addClient(nom: string, telephone?: string, solde_initial?: number) {
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

  const sInitial = Number(solde_initial || 0)

  // Generate a code client
  const { data: countData } = await supabase
    .from('clients_externes')
    .select('id', { count: 'exact', head: true })
  const nextNum = (countData ? Number(countData) : 0) + 1
  const codeClient = `CLI-${String(nextNum).padStart(3, '0')}`

  let insertRes = await supabase
    .from('clients_externes')
    .insert({
      gie_id: userData.gie_id,
      nom: nom.trim(),
      telephone: telephone?.trim() || null,
      code_client: codeClient,
      solde_initial: sInitial,
    })
    .select('id, nom, telephone, code_client, solde_initial')
    .single()

  if (insertRes.error && (insertRes.error.message?.includes('solde_initial') || insertRes.error.code === '42703')) {
    insertRes = await supabase
      .from('clients_externes')
      .insert({ gie_id: userData.gie_id, nom: nom.trim(), telephone: telephone?.trim() || null, code_client: codeClient })
      .select('id, nom, telephone, code_client')
      .single()
  }

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
    code_client: (insertRes.data as any)?.code_client || codeClient,
    solde_initial: sInitial,
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
    .select('id, nom, telephone, code_client, solde_initial')
    .eq('id', clientId)
    .single()

  if (clientRes.error && (clientRes.error.message?.includes('solde_initial') || clientRes.error.code === '42703')) {
    clientRes = await supabase
      .from('clients_externes')
      .select('id, nom, telephone, code_client')
      .eq('id', clientId)
      .single()
  }

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

  let ventesQuery = supabase
    .from('sorties_stock_nature')
    .select('id, client_id, tiers_nom, tiers_type, quantite, prix_unitaire, date_sortie, motif, campagnes(id, nom, produit_collecte)')
    .eq('type_sortie', 'vente')
    .eq('tiers_type', 'client')

  let [ventesRes, prestationsRes, paiementsRes, remboursementsRes, transactionsRes]: [any, any, any, any, any] = await Promise.all([
    ventesQuery,
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

  // Solde initial du client si renseigné
  const soldeInit = Number((client as any).solde_initial || 0)
  if (soldeInit !== 0) {
    mouvements.push({
      id: `solde-init-${client.id}`,
      date: '2025-01-01',
      type: soldeInit > 0 ? 'vente' : 'paiement',
      designation: soldeInit > 0 ? 'Solde initial (Créance antérieure reportée)' : 'Solde initial (Acompte reporté)',
      quantite: null,
      unite: null,
      prix_unitaire: null,
      montant: Math.abs(soldeInit),
      raw: { isSoldeInitial: true, solde_initial: soldeInit },
    })
  }

  for (const v of ventesClient) {
    const camp = Array.isArray(v.campagnes) ? v.campagnes[0] : v.campagnes
    const prod = camp?.produit_collecte || 'Stock en nature'
    const motifStr = String(v.motif || '')

    const sUniteMatch = motifStr.match(/\[STOCK_UNITE:([^\]]+)\]/) || motifStr.match(/\[UNITE:([^\]]+)\]/)
    const sUnite = (v as any).unite || (sUniteMatch ? sUniteMatch[1].trim() : 'kg')

    const vUniteMatch = motifStr.match(/\[VENTE_UNITE:([^\]]+)\]/)
    const uniteVente = (v as any).unite_vente || (vUniteMatch ? vUniteMatch[1].trim() : sUnite)

    const vQteMatch = motifStr.match(/\[VENTE_QTE:([^\]]+)\]/)
    const quantiteVente = (v as any).quantite_vente != null ? Number((v as any).quantite_vente) : (vQteMatch ? Number(vQteMatch[1]) : Number(v.quantite))

    const nbContMatch = motifStr.match(/\[NB_CONTENANCE:([^\]]+)\]/)
    const nbContenance = (v as any).nb_contenance != null ? Number((v as any).nb_contenance) : (nbContMatch ? Number(nbContMatch[1]) : null)

    const cleanMotif = motifStr.replace(/\[[^\]]*\]/g, '').trim()

    let designationSuffix = ''
    if (uniteVente !== sUnite && nbContenance) {
      designationSuffix = ` (${quantiteVente} ${uniteVente} - ${nbContenance} sacs)`
    } else if (nbContenance) {
      designationSuffix = ` (${nbContenance} sacs)`
    }

    const totalMontant = quantiteVente * Number(v.prix_unitaire || 0)

    mouvements.push({
      id: v.id,
      date: v.date_sortie,
      type: 'vente',
      designation: `Facture Vente : ${prod}${camp?.nom ? ` (${camp.nom})` : ''}${designationSuffix}${cleanMotif ? ` - ${cleanMotif}` : ''}`,
      quantite: quantiteVente,
      unite: uniteVente,
      prix_unitaire: Number(v.prix_unitaire),
      montant: totalMontant,
      raw: {
        ...v,
        client,
        campagne: camp,
        quantite_stock: Number(v.quantite),
        unite_stock: sUnite,
        quantite_vente: quantiteVente,
        unite_vente: uniteVente,
        nb_contenance: nbContenance,
        cleanMotif,
      },
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
      raw: {
        ...p,
        mode,
        cleanMotif,
        refPiece,
        qteNature,
        puNature,
        prodNature,
        varNature,
        uniteNature,
        isPaiementClient: true,
      },
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

/**
 * Modifier le solde initial (créance ou acompte reporté) d'un client externe
 */
export async function updateClientSoldeInitial(clientId: string, solde_initial: number) {
  const denied = await requirePermission('bilans_clients', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const sInit = Number(solde_initial || 0)

  let updateRes = await supabase
    .from('clients_externes')
    .update({ solde_initial: sInit })
    .eq('id', clientId)

  if (updateRes.error && (updateRes.error.message?.includes('solde_initial') || updateRes.error.code === '42703')) {
    // Si la colonne n'est pas encore créée dans Postgres, le stocker avec un tag dans le téléphone ou autre
    console.warn("Colonne solde_initial manquante sur clients_externes, appliquer la migration 63.")
  }

  if (updateRes.error) return { error: updateRes.error.message }

  revalidatePath('/bilans/releve-client')
  return { success: true }
}

/**
 * Modifier une vente de stock depuis le relevé client
 */
export async function updateVenteClient(sortieId: string, input: {
  quantite: number
  prix_unitaire: number
  date_sortie?: string
  motif?: string
  unite?: string
  unite_vente?: string
  quantite_vente?: number
  nb_contenance?: number
}) {
  const denied = await requirePermission('bilans_clients', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const qte = Number(input.quantite || 0)
  const pu = Number(input.prix_unitaire || 0)
  if (!qte || qte <= 0) return { error: "Quantité invalide" }

  const stockUnite = input.unite || 'kg'
  const venteUnite = input.unite_vente || stockUnite
  const quantiteVente = input.quantite_vente != null ? input.quantite_vente : qte
  const nbContenance = input.nb_contenance != null ? input.nb_contenance : null

  const metaTags = [
    `[STOCK_UNITE:${stockUnite}]`,
    `[VENTE_UNITE:${venteUnite}]`,
    `[VENTE_QTE:${quantiteVente}]`,
    nbContenance ? `[NB_CONTENANCE:${nbContenance}]` : '',
  ].filter(Boolean).join(' ')

  const cleanMotif = (input.motif || '').replace(/\[[^\]]*\]/g, '').trim()
  const motifComplet = `${metaTags} ${cleanMotif}`.trim()

  const payload: any = {
    quantite: qte,
    prix_unitaire: pu,
    motif: motifComplet,
    date_sortie: input.date_sortie || new Date().toISOString().slice(0, 10),
  }

  const { error } = await supabase
    .from('sorties_stock_nature')
    .update(payload)
    .eq('id', sortieId)

  if (error) return { error: error.message }

  revalidatePath('/bilans/releve-client')
  revalidatePath('/remboursements/stock-nature')
  revalidatePath('/facturation')
  revalidatePath('/bilans/bilan-annuel')
  return { success: true }
}

/**
 * Supprimer une écriture de vente client
 */
export async function deleteVenteClient(sortieId: string) {
  const denied = await requirePermission('bilans_clients', 'delete')
  if (denied) return denied as never
  const supabase = await createClient()

  const { error } = await supabase
    .from('sorties_stock_nature')
    .delete()
    .eq('id', sortieId)

  if (error) return { error: error.message }

  revalidatePath('/bilans/releve-client')
  revalidatePath('/remboursements/stock-nature')
  revalidatePath('/facturation')
  revalidatePath('/bilans/bilan-annuel')
  return { success: true }
}

/**
 * Modifier un paiement reçu d'un client externe
 */
export async function updatePaiementClient(paiementId: string, input: {
  montant: number
  date_paiement?: string
  motif?: string
  reference_piece?: string | null
}) {
  const denied = await requirePermission('bilans_clients', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const montantEffectif = Number(input.montant || 0)
  if (!montantEffectif || montantEffectif <= 0) return { error: "Montant invalide" }

  // 1. Lire le paiement existant pour adapter les métas et écritures de contrepartie
  const { data: p } = await supabase
    .from('paiements_clients')
    .select('*')
    .eq('id', paiementId)
    .single()

  if (!p) return { error: "Paiement introuvable" }

  const rawMotif = String(p.motif || '')
  const datePaiement = input.date_paiement || p.date_paiement || new Date().toISOString().slice(0, 10)
  const userNote = input.motif !== undefined ? input.motif.trim() : rawMotif.replace(/\[[^\]]*\]/g, '').trim()
  const refPiece = input.reference_piece !== undefined ? input.reference_piece?.trim() : null

  // Conserver les tags techniques existants en mettant à jour la référence si nécessaire
  let newMotif = rawMotif
  if (refPiece) {
    if (newMotif.includes('[REF:')) {
      newMotif = newMotif.replace(/\[REF:[^\]]+\]/, `[REF:${refPiece}]`)
    } else {
      newMotif = `[REF:${refPiece}] ${newMotif}`
    }
  }

  // Remplacer la partie texte humaine
  const existingTags = (newMotif.match(/\[[^\]]+\]/g) || []).join(' ')
  const finalMotif = `${existingTags} ${userNote}`.trim()

  const { error: updateErr } = await supabase
    .from('paiements_clients')
    .update({
      montant: montantEffectif,
      date_paiement: datePaiement,
      motif: finalMotif,
    })
    .eq('id', paiementId)

  if (updateErr) return { error: updateErr.message }

  // 2. Mettre à jour dans remboursements si en nature
  const rembMatch = rawMotif.match(/\[REMB_ID:([^\]]+)\]/)
  if (rembMatch && rembMatch[1]) {
    await supabase
      .from('remboursements')
      .update({
        montant_fcfa: montantEffectif,
        date_paiement: datePaiement,
      })
      .eq('id', rembMatch[1].trim())
  }

  // 3. Mettre à jour dans transactions de trésorerie si liée
  const { data: clientRow } = await supabase.from('clients_externes').select('nom').eq('id', p.client_id).maybeSingle()
  const clientNomLower = clientRow?.nom ? clientRow.nom.trim().toLowerCase() : ''

  const { data: txs } = await supabase
    .from('transactions')
    .select('id, motif, montant')
    .eq('date_transaction', p.date_paiement)
    .eq('type_transaction', 'entree')

  for (const tx of txs || []) {
    const mLower = String(tx.motif || '').toLowerCase()
    if (Number(tx.montant) === Number(p.montant) && (clientNomLower && mLower.includes(clientNomLower))) {
      await supabase
        .from('transactions')
        .update({
          montant: montantEffectif,
          date_transaction: datePaiement,
        })
        .eq('id', tx.id)
      break
    }
  }

  revalidatePath('/bilans/releve-client')
  revalidatePath('/remboursements')
  revalidatePath('/remboursements/stock-nature')
  revalidatePath('/tresorerie')
  revalidatePath('/tresorerie/journaux')
  return { success: true }
}

/**
 * Supprimer un paiement client externe (et ses écritures liées de trésorerie / stock nature)
 */
export async function deletePaiementClient(paiementId: string) {
  const denied = await requirePermission('bilans_clients', 'delete')
  if (denied) return denied as never
  const supabase = await createClient()

  // 1. Lire le paiement pour nettoyer les écritures liées
  const { data: p } = await supabase
    .from('paiements_clients')
    .select('*')
    .eq('id', paiementId)
    .single()

  if (!p) return { error: "Paiement introuvable" }

  const rawMotif = String(p.motif || '')

  // Si c'est un remboursement en nature
  const rembMatch = rawMotif.match(/\[REMB_ID:([^\]]+)\]/)
  if (rembMatch && rembMatch[1]) {
    await supabase.from('remboursements').delete().eq('id', rembMatch[1].trim())
  }

  // Nettoyer dans transactions si transaction de trésorerie liée
  const { data: clientRow } = await supabase.from('clients_externes').select('nom').eq('id', p.client_id).maybeSingle()
  const clientNomLower = clientRow?.nom ? clientRow.nom.trim().toLowerCase() : ''

  const { data: txs } = await supabase
    .from('transactions')
    .select('id, motif, montant')
    .eq('date_transaction', p.date_paiement)
    .eq('type_transaction', 'entree')

  for (const tx of txs || []) {
    const mLower = String(tx.motif || '').toLowerCase()
    if (Number(tx.montant) === Number(p.montant) && (clientNomLower && mLower.includes(clientNomLower))) {
      await supabase.from('transactions').delete().eq('id', tx.id)
      break
    }
  }

  const { error } = await supabase.from('paiements_clients').delete().eq('id', paiementId)
  if (error) return { error: error.message }

  revalidatePath('/bilans/releve-client')
  revalidatePath('/remboursements')
  revalidatePath('/remboursements/stock-nature')
  revalidatePath('/tresorerie')
  revalidatePath('/tresorerie/journaux')
  return { success: true }
}
