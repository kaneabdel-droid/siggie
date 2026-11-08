'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

type Mouvement = {
  id: string
  date: string
  type: 'entree' | 'vente' | 'ristourne'
  tiers: string
  tiers_type?: string
  membre?: any
  client?: any
  motif?: string | null
  raw_motif?: string | null
  prix_unitaire: number
  quantite: number
  unite?: string
  unite_vente?: string
  quantite_vente?: number
  nb_contenance?: number | null
  origine_stock?: 'exploitation' | 'materiel' | 'achat' | 'report' | string
  variete?: string | null
  raw?: any
}

export async function getStockNature(campagneId: string) {
  const supabase = await createClient()

  let campagneRes = await supabase
    .from('campagnes')
    .select('id, nom, produit_collecte, prix_collecte, date_debut, stock_initial_quantite, stock_initial_unite, stock_initial_valeur, stock_initial_date')
    .eq('id', campagneId)
    .single()

  if (campagneRes.error && (campagneRes.error.message?.includes('stock_initial') || campagneRes.error.code === '42703')) {
    campagneRes = await supabase
      .from('campagnes')
      .select('id, nom, produit_collecte, prix_collecte, date_debut')
      .eq('id', campagneId)
      .single()
  }

  const campagne = campagneRes.data
  if (!campagne) return { error: "Campagne introuvable" }

  // Entrées : remboursements en nature
  const { data: factures } = await supabase
    .from('factures')
    .select('id')
    .eq('campagne_id', campagneId)

  const factureIds = factures?.map(f => f.id) || []

  // Récupérer les clients externes séparément
  const { data: clientsData } = await supabase
    .from('clients_externes')
    .select('id, nom, telephone')
  const clientMap = new Map((clientsData || []).map((c: any) => [c.id, c]))

  // Remboursements en nature pour cette campagne
  let rembQuery = supabase
    .from('remboursements')
    .select('id, quantite_nature, produit_nature, montant_fcfa, date_paiement, membre_id, facture_id, factures(client_nom), membres(id, prenom, nom, code_membre, telephone)')
    .eq('type_remboursement', 'nature')
    .not('quantite_nature', 'is', null)

  const [{ data: allRemb, error: rembError }, { data: paiementsClients }] = await Promise.all([
    rembQuery,
    supabase.from('paiements_clients').select('id, client_id, montant, date_paiement, motif'),
  ])
  if (rembError) return { error: rembError.message }

  const remboursements = (allRemb || []).filter((r: any) => {
    const prodStr = String(r.produit_nature || '')
    const campMatch = prodStr.match(/\[CAMPAGNE:([^\]]+)\]/)
    if (campMatch && campMatch[1]) {
      return campMatch[1].trim() === campagneId
    }
    if (r.facture_id && factureIds.length > 0) return factureIds.includes(r.facture_id)
    return true
  })

  const rembIdsIncluded = new Set(remboursements.map((r: any) => r.id))

  // Sorties : ventes et ristournes enregistrées
  const { data: sorties, error: sortiesError } = await supabase
    .from('sorties_stock_nature')
    .select('id, type_sortie, tiers_type, membre_id, tiers_nom, client_id, quantite, prix_unitaire, motif, date_sortie, membres(id, prenom, nom, code_membre, telephone)')
    .eq('campagne_id', campagneId)

  if (sortiesError) return { error: sortiesError.message }

  const mouvements: Mouvement[] = []

  // 1. Stock Initial / Inventaire d'ouverture si configuré sur la campagne
  const stockInitQte = Number((campagne as any).stock_initial_quantite || 0)
  if (stockInitQte > 0) {
    const sInitUnite = (campagne as any).stock_initial_unite || 'kg'
    const sInitPu = Number((campagne as any).stock_initial_valeur || campagne.prix_collecte || 0)
    const sInitDate = (campagne as any).stock_initial_date || (campagne as any).date_debut || '2025-01-01'

    mouvements.push({
      id: `stock-initial-${campagne.id}`,
      date: sInitDate,
      type: 'entree',
      tiers: 'Stock initial (Inventaire d\'ouverture)',
      tiers_type: 'report',
      prix_unitaire: sInitPu,
      quantite: stockInitQte,
      unite: sInitUnite,
      origine_stock: 'report',
      motif: 'Inventaire d\'ouverture / Report de stock',
    })
  }

  // 2. Entrées de remboursements en nature des membres / clients
  for (const r of remboursements) {
    const membre = Array.isArray(r.membres) ? r.membres[0] : r.membres
    const factureData = Array.isArray(r.factures) ? r.factures[0] : r.factures
    const prodStr = String(r.produit_nature || '')
    const clientTagMatch = prodStr.match(/\[CLIENT:([^\]]+)\]/)
    const clientNomFacture = clientTagMatch ? clientTagMatch[1].trim() : factureData?.client_nom
    const client = clientNomFacture ? { nom: clientNomFacture } : null
    const quantite = Number(r.quantite_nature || 0)

    // Vérifier si c'est un tag de stock initial enregistré dans les remboursements
    const isReport = prodStr.includes('[STOCK_INITIAL]')

    let variete: string | null = null
    const varMatch = prodStr.match(/\[VARIETE:(.*?)\]/)
    if (varMatch) variete = varMatch[1].trim()

    let origineStock = isReport ? 'report' : 'exploitation'
    const origMatch = prodStr.match(/\[ORIGINE:(.*?)\]/)
    if (origMatch) origineStock = origMatch[1].trim()
    else if (!membre && client && !isReport) origineStock = 'materiel'

    let uniteMesure = 'kg'
    const uniteMatch = prodStr.match(/\[UNITE:(.*?)\]/)
    if (uniteMatch) uniteMesure = uniteMatch[1].trim()

    const tiersNom = isReport
      ? 'Stock initial (Inventaire d\'ouverture)'
      : membre
        ? `${membre.prenom} ${membre.nom}`
        : client?.nom || 'Client externe'

    mouvements.push({
      id: r.id,
      date: r.date_paiement,
      type: 'entree',
      tiers: tiersNom,
      tiers_type: isReport ? 'report' : (membre ? 'membre' : 'client'),
      membre,
      client,
      prix_unitaire: quantite > 0 ? Number(r.montant_fcfa) / quantite : Number(campagne.prix_collecte || 0),
      quantite,
      unite: uniteMesure,
      origine_stock: origineStock,
      variete,
      motif: prodStr.replace(/\[.*?\]/g, '').trim(),
      raw: r,
    })
  }

  // 3. Paiements en nature des clients externes
  for (const pc of (paiementsClients || []) as any[]) {
    const motifStr = String(pc.motif || '')
    if (!motifStr.includes('[MODE:nature]')) continue

    const rembIdMatch = motifStr.match(/\[REMB_ID:([^\]]+)\]/)
    if (rembIdMatch && rembIdMatch[1] && rembIdsIncluded.has(rembIdMatch[1].trim())) {
      continue
    }

    const campMatch = motifStr.match(/\[CAMPAGNE:([^\]]+)\]/)
    if (campMatch && campMatch[1] && campMatch[1].trim() !== campagneId) {
      continue
    }

    const qteMatch = motifStr.match(/\[QTE:([^\]]+)\]/)
    const quantite = qteMatch ? Number(qteMatch[1]) : 0
    if (!quantite || quantite <= 0) continue

    const puMatch = motifStr.match(/\[PU:([^\]]+)\]/)
    const prixUnitaire = puMatch
      ? Number(puMatch[1])
      : quantite > 0
        ? Number(pc.montant || 0) / quantite
        : Number(campagne.prix_collecte || 0)

    const prodMatch = motifStr.match(/\[PRODUIT:([^\]]+)\]/)
    const varMatch = motifStr.match(/\[VARIETE:([^\]]+)\]/)
    const origMatch = motifStr.match(/\[ORIGINE:([^\]]+)\]/)
    const uniteMatch = motifStr.match(/\[UNITE:([^\]]+)\]/)

    const clientObj = pc.client_id ? clientMap.get(pc.client_id) : null
    const tiersNom = clientObj?.nom || 'Client externe'

    mouvements.push({
      id: `pc-${pc.id}`,
      date: pc.date_paiement,
      type: 'entree',
      tiers: tiersNom,
      tiers_type: 'client',
      membre: null,
      client: clientObj || { id: pc.client_id, nom: tiersNom },
      prix_unitaire: prixUnitaire,
      quantite,
      unite: uniteMatch ? uniteMatch[1].trim() : 'kg',
      origine_stock: origMatch ? origMatch[1].trim() : 'materiel',
      variete: varMatch ? varMatch[1].trim() : null,
      motif: prodMatch ? prodMatch[1].trim() : motifStr.replace(/\[[^\]]*\]/g, '').trim(),
      raw: pc,
    })
  }

  // 4. Sorties de stock (ventes et ristournes)
  for (const s of sorties || []) {
    const membre = Array.isArray(s.membres) ? s.membres[0] : s.membres
    const client = s.client_id ? clientMap.get(s.client_id) : (s.tiers_nom ? { nom: s.tiers_nom } : null)
    const motifStr = String(s.motif || '')

    const sUniteMatch = motifStr.match(/\[STOCK_UNITE:([^\]]+)\]/) || motifStr.match(/\[UNITE:([^\]]+)\]/)
    const sUnite = (s as any).unite || (sUniteMatch ? sUniteMatch[1].trim() : 'kg')

    const vUniteMatch = motifStr.match(/\[VENTE_UNITE:([^\]]+)\]/)
    const uniteVente = (s as any).unite_vente || (vUniteMatch ? vUniteMatch[1].trim() : sUnite)

    const vQteMatch = motifStr.match(/\[VENTE_QTE:([^\]]+)\]/)
    const quantiteVente = (s as any).quantite_vente != null ? Number((s as any).quantite_vente) : (vQteMatch ? Number(vQteMatch[1]) : Number(s.quantite))

    const nbContMatch = motifStr.match(/\[NB_CONTENANCE:([^\]]+)\]/)
    const nbContenance = (s as any).nb_contenance != null ? Number((s as any).nb_contenance) : (nbContMatch ? Number(nbContMatch[1]) : null)

    const cleanMotif = motifStr.replace(/\[[^\]]*\]/g, '').trim()

    mouvements.push({
      id: s.id,
      date: s.date_sortie,
      type: s.type_sortie as 'vente' | 'ristourne',
      tiers: s.tiers_type === 'membre' ? (membre ? `${membre.prenom} ${membre.nom}` : '-') : (client?.nom || s.tiers_nom || '-'),
      tiers_type: s.tiers_type,
      membre,
      client: client || (s.tiers_nom ? { nom: s.tiers_nom } : null),
      motif: cleanMotif,
      raw_motif: s.motif,
      prix_unitaire: Number(s.prix_unitaire || 0),
      quantite: Number(s.quantite), // Quantité déduite du stock
      unite: sUnite,
      unite_vente: uniteVente,
      quantite_vente: quantiteVente,
      nb_contenance: nbContenance,
      raw: s,
    })
  }

  mouvements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Déterminer l'unité dominante du stock (ex: sacs ou kg)
  let unitCount: Record<string, number> = {}
  mouvements.forEach((m) => {
    const u = m.unite || 'kg'
    unitCount[u] = (unitCount[u] || 0) + 1
  })
  const defaultUnite = Object.keys(unitCount).sort((a, b) => unitCount[b] - unitCount[a])[0] || 'kg'

  let solde = 0
  const journal = mouvements.map((m) => {
    if (m.type === 'entree') solde += m.quantite
    else solde -= m.quantite
    return { ...m, solde }
  })

  return {
    journal: journal.reverse(),
    soldeActuel: solde,
    uniteStock: defaultUnite,
    campagne,
    stockInitial: stockInitQte > 0 ? {
      quantite: stockInitQte,
      unite: (campagne as any).stock_initial_unite || defaultUnite,
      valeur: Number((campagne as any).stock_initial_valeur || 0),
      date: (campagne as any).stock_initial_date || null,
    } : null,
  }
}

/**
 * Définir ou modifier le stock initial (inventaire d'ouverture) de la campagne
 */
export async function setStockInitial(input: {
  campagne_id: string
  quantite: number
  unite?: string
  valeur_unitaire?: number
  date?: string
}) {
  const denied = await requirePermission('stock_nature', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const qte = Number(input.quantite || 0)
  const unite = input.unite?.trim() || 'kg'
  const valUnit = Number(input.valeur_unitaire || 0)
  const dateStock = input.date || new Date().toISOString().slice(0, 10)

  // 1. Tenter d'abord la mise à jour directe sur la table campagnes
  try {
    const { error: campErr } = await supabase
      .from('campagnes')
      .update({
        stock_initial_quantite: qte,
        stock_initial_unite: unite,
        stock_initial_valeur: valUnit,
        stock_initial_date: dateStock,
      })
      .eq('id', input.campagne_id)

    if (!campErr) {
      revalidatePath('/remboursements/stock-nature')
      return { success: true }
    }
  } catch (_) { }

  // 2. Fallback pérenne : enregistrer dans les remboursements en nature avec le tag [STOCK_INITIAL]
  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  // Supprimer un ancien stock initial tagué si existant
  const { data: existingInit } = await supabase
    .from('remboursements')
    .select('id, produit_nature')
    .ilike('produit_nature', '%[STOCK_INITIAL]%')

  for (const ex of existingInit || []) {
    if (String(ex.produit_nature || '').includes(`[CAMPAGNE:${input.campagne_id}]`)) {
      await supabase.from('remboursements').delete().eq('id', ex.id)
    }
  }

  if (qte > 0) {
    const motifTag = `Stock initial (Inventaire d'ouverture) [STOCK_INITIAL] [CAMPAGNE:${input.campagne_id}] [UNITE:${unite}] [ORIGINE:report]`
    await supabase.from('remboursements').insert({
      gie_id: userData.gie_id,
      type_remboursement: 'nature',
      quantite_nature: qte,
      montant_fcfa: Math.round(qte * valUnit),
      produit_nature: motifTag,
      date_paiement: dateStock,
    })
  }

  revalidatePath('/remboursements/stock-nature')
  return { success: true }
}

/**
 * Enregistrer une sortie de stock (vente ou ristourne)
 * Prend en charge la distinction entre unité de vente (kg ou contenance/sacs) et unité de stock
 */
export async function addSortieStockNature(input: {
  campagne_id: string
  type_sortie: string
  tiers_type: string
  membre_id?: string
  client_id?: string
  tiers_nom?: string
  quantite: number // Quantité déduite du stock (dans l'unité du stock)
  prix_unitaire: number
  motif?: string
  date_sortie?: string
  unite?: string // Unité du stock (ex: 'sacs' ou 'kg')
  unite_vente?: string // Unité de vente (ex: 'kg' ou 'sacs')
  quantite_vente?: number // Quantité vendue (ex: 5 000 kg)
  nb_contenance?: number // Nombre de contenances/sacs (ex: 60 sacs)
}) {
  const denied = await requirePermission('stock_nature', 'create')
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
  if (!input.quantite || input.quantite <= 0) return { error: "Quantité déduite du stock invalide" }
  if (input.tiers_type === 'membre' && !input.membre_id) return { error: "Sélectionnez un membre" }
  if (input.tiers_type === 'client' && !input.client_id && !input.tiers_nom) return { error: "Sélectionnez un client" }

  const stockUnite = input.unite || 'kg'
  const venteUnite = input.unite_vente || stockUnite
  const quantiteVente = input.quantite_vente != null ? input.quantite_vente : input.quantite
  const nbContenance = input.nb_contenance != null ? input.nb_contenance : null

  // Construire les méta-tags pour traçabilité parfaite
  const metaTags = [
    `[STOCK_UNITE:${stockUnite}]`,
    `[VENTE_UNITE:${venteUnite}]`,
    `[VENTE_QTE:${quantiteVente}]`,
    nbContenance ? `[NB_CONTENANCE:${nbContenance}]` : '',
  ].filter(Boolean).join(' ')

  const motifComplet = `${metaTags} ${input.motif?.trim() || ''}`.trim()

  const { error } = await supabase.from('sorties_stock_nature').insert({
    gie_id: userData.gie_id,
    campagne_id: input.campagne_id,
    type_sortie: input.type_sortie,
    tiers_type: input.tiers_type,
    membre_id: input.tiers_type === 'membre' ? input.membre_id : null,
    client_id: input.tiers_type === 'client' ? input.client_id : null,
    tiers_nom: input.tiers_nom || null,
    quantite: input.quantite,
    prix_unitaire: input.prix_unitaire,
    motif: motifComplet,
    date_sortie: input.date_sortie || new Date().toISOString().slice(0, 10),
  })

  if (error) return { error: error.message }

  revalidatePath('/remboursements/stock-nature')
  revalidatePath('/facturation')
  revalidatePath('/bilans/releve-membre')
  revalidatePath('/bilans/releve-client')
  revalidatePath('/bilans/bilan-annuel')
  return { success: true }
}

/**
 * Modifier une sortie de stock (vente ou ristourne)
 */
export async function updateSortieStockNature(id: string, input: {
  quantite: number
  prix_unitaire: number
  motif?: string
  date_sortie?: string
  tiers_type?: string
  membre_id?: string
  client_id?: string
  tiers_nom?: string
  unite?: string
  unite_vente?: string
  quantite_vente?: number
  nb_contenance?: number
}) {
  const denied = await requirePermission('stock_nature', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  if (!input.quantite || input.quantite <= 0) return { error: "Quantité invalide" }

  const stockUnite = input.unite || 'kg'
  const venteUnite = input.unite_vente || stockUnite
  const quantiteVente = input.quantite_vente != null ? input.quantite_vente : input.quantite
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
    quantite: input.quantite,
    prix_unitaire: input.prix_unitaire,
    motif: motifComplet,
    date_sortie: input.date_sortie || new Date().toISOString().slice(0, 10),
  }

  if (input.tiers_type) payload.tiers_type = input.tiers_type
  if (input.membre_id !== undefined) payload.membre_id = input.membre_id || null
  if (input.client_id !== undefined) payload.client_id = input.client_id || null
  if (input.tiers_nom !== undefined) payload.tiers_nom = input.tiers_nom || null

  const { error } = await supabase
    .from('sorties_stock_nature')
    .update(payload)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/remboursements/stock-nature')
  revalidatePath('/facturation')
  revalidatePath('/bilans/releve-membre')
  revalidatePath('/bilans/releve-client')
  revalidatePath('/bilans/bilan-annuel')
  return { success: true }
}

/**
 * Supprimer une sortie de stock (vente ou ristourne)
 */
export async function deleteSortieStockNature(id: string) {
  const denied = await requirePermission('stock_nature', 'delete')
  if (denied) return denied as never
  const supabase = await createClient()

  const { error } = await supabase
    .from('sorties_stock_nature')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/remboursements/stock-nature')
  revalidatePath('/facturation')
  revalidatePath('/bilans/releve-membre')
  revalidatePath('/bilans/releve-client')
  revalidatePath('/bilans/bilan-annuel')
  return { success: true }
}
