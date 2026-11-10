'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

export type Mouvement = {
  id: string
  date: string
  type: 'entree' | 'vente' | 'ristourne'
  tiers: string
  tiers_type?: string
  produit: string
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
  solde_produit?: number
  solde?: number
  raw?: any
}

export type ProductStockSummary = {
  produit: string
  stockInitial: {
    quantite: number
    unite: string
    valeur: number
    date?: string | null
  }
  totalEntrees: number
  totalSorties: number
  soldeActuel: number
  uniteStock: string
  prixUnitaireRef: number
  nbMouvements: number
}

/**
 * Nettoie le nom d'un produit en retirant tous les méta-tags [TAG:...]
 */
function cleanNomProduit(raw?: string | null, fallback: string = 'Riz Paddy'): string {
  if (!raw) return fallback
  const clean = raw.replace(/\[.*?\]/g, '').trim()
  return clean || fallback
}

/**
 * Parse les stocks initiaux encodés dans le champ produit_collecte (fallback résilient sans migration)
 * Format : [SI:Riz Paddy=12500:kg:160|Oignon=3000:kg:200] ou [SI:12500:kg:160]
 */
function parseStockInitialTag(raw?: string | null): Record<string, { quantite: number; unite: string; valeur: number; date?: string | null }> {
  if (!raw) return {}
  const match = raw.match(/\[SI:(.*?)\]/)
  if (!match) return {}
  const content = match[1].trim()
  const result: Record<string, { quantite: number; unite: string; valeur: number; date?: string | null }> = {}

  if (content.includes('=')) {
    const parts = content.split('|')
    for (const part of parts) {
      const [prod, data] = part.split('=')
      if (prod && data) {
        const [q, u, v, d] = data.split(':')
        result[prod.trim()] = {
          quantite: Number(q) || 0,
          unite: u || 'kg',
          valeur: Number(v) || 0,
          date: d || null,
        }
      }
    }
  } else if (content) {
    const [q, u, v, d] = content.split(':')
    const prodName = cleanNomProduit(raw)
    result[prodName] = {
      quantite: Number(q) || 0,
      unite: u || 'kg',
      valeur: Number(v) || 0,
      date: d || null,
    }
  }

  return result
}

/**
 * Récupère le stock en nature de la campagne, ventilé par produit / nature de produit
 */
export async function getStockNature(campagneId: string) {
  const supabase = await createClient()

  // 1. Charger la campagne (tolérance sur colonnes stock_initial)
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

  const defaultProduitCampagne = cleanNomProduit(campagne.produit_collecte, 'Riz Paddy')
  const prixCollecteCampagne = Number(campagne.prix_collecte || 0)

  // 2. Factures de cette campagne pour filtrer les remboursements
  const { data: factures } = await supabase
    .from('factures')
    .select('id')
    .eq('campagne_id', campagneId)

  const factureIds = factures?.map((f) => f.id) || []

  // 3. Charger les clients externes et les stocks initiaux multi-produits
  const [clientsRes, allRembRes, paiementsClientsRes, sortiesRes, initialStocksTableRes] = await Promise.all([
    supabase.from('clients_externes').select('id, nom, telephone'),
    supabase
      .from('remboursements')
      .select('id, quantite_nature, produit_nature, montant_fcfa, date_paiement, membre_id, facture_id, factures(client_nom), membres(id, prenom, nom, code_membre, telephone)')
      .eq('type_remboursement', 'nature')
      .not('quantite_nature', 'is', null),
    supabase.from('paiements_clients').select('id, client_id, montant, date_paiement, motif'),
    supabase
      .from('sorties_stock_nature')
      .select('id, type_sortie, tiers_type, membre_id, tiers_nom, client_id, quantite, prix_unitaire, motif, date_sortie, membres(id, prenom, nom, code_membre, telephone)')
      .eq('campagne_id', campagneId),
    supabase
      .from('stock_nature_initial')
      .select('produit, quantite, unite, valeur_unitaire, date_inventaire')
      .eq('campagne_id', campagneId),
  ])

  const clientMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]))

  // Filtrer les remboursements rattachés à cette campagne
  const remboursements = (allRembRes.data || []).filter((r: any) => {
    const prodStr = String(r.produit_nature || '')
    const campMatch = prodStr.match(/\[CAMPAGNE:([^\]]+)\]/)
    if (campMatch && campMatch[1]) {
      return campMatch[1].trim() === campagneId
    }
    if (r.facture_id && factureIds.length > 0) return factureIds.includes(r.facture_id)
    return true
  })

  const rembIdsIncluded = new Set(remboursements.map((r: any) => r.id))

  // Structure de regroupement des stocks par produit
  const stocksParProduit: Record<string, ProductStockSummary> = {}

  // Helper pour initialiser un produit dans la map
  function ensureProduit(prodName: string, defaultUnite: string = 'kg'): ProductStockSummary {
    const key = prodName.trim()
    if (!stocksParProduit[key]) {
      stocksParProduit[key] = {
        produit: key,
        stockInitial: { quantite: 0, unite: defaultUnite, valeur: prixCollecteCampagne, date: null },
        totalEntrees: 0,
        totalSorties: 0,
        soldeActuel: 0,
        uniteStock: defaultUnite,
        prixUnitaireRef: prixCollecteCampagne,
        nbMouvements: 0,
      }
    }
    return stocksParProduit[key]
  }

  // Toujours s'assurer que le produit principal de la campagne est initialisé
  ensureProduit(defaultProduitCampagne)

  // 4. Initialisation des stocks initiaux (Inventaire d'ouverture)
  // Source A : Table dédiée stock_nature_initial (si migration 64 appliquée)
  if (initialStocksTableRes.data && initialStocksTableRes.data.length > 0) {
    for (const initRow of initialStocksTableRes.data) {
      const prod = cleanNomProduit(initRow.produit, defaultProduitCampagne)
      const pSummary = ensureProduit(prod, initRow.unite || 'kg')
      pSummary.stockInitial = {
        quantite: Number(initRow.quantite || 0),
        unite: initRow.unite || 'kg',
        valeur: Number(initRow.valeur_unitaire || 0),
        date: initRow.date_inventaire || null,
      }
      pSummary.uniteStock = initRow.unite || pSummary.uniteStock
    }
  }

  // Source B : Colonnes stock_initial sur campagnes (si migration 63 appliquée)
  const stockInitCampagneQte = Number((campagne as any).stock_initial_quantite || 0)
  if (stockInitCampagneQte > 0 && stocksParProduit[defaultProduitCampagne].stockInitial.quantite === 0) {
    stocksParProduit[defaultProduitCampagne].stockInitial = {
      quantite: stockInitCampagneQte,
      unite: (campagne as any).stock_initial_unite || 'kg',
      valeur: Number((campagne as any).stock_initial_valeur || campagne.prix_collecte || 0),
      date: (campagne as any).stock_initial_date || null,
    }
    stocksParProduit[defaultProduitCampagne].uniteStock = (campagne as any).stock_initial_unite || 'kg'
  }

  // Source C : Méta-tag résilient encodé dans produit_collecte [SI:...]
  const parsedTagSI = parseStockInitialTag(campagne.produit_collecte)
  for (const [prodName, siData] of Object.entries(parsedTagSI)) {
    const prodClean = cleanNomProduit(prodName, defaultProduitCampagne)
    const pSummary = ensureProduit(prodClean, siData.unite)
    if (pSummary.stockInitial.quantite === 0 && siData.quantite > 0) {
      pSummary.stockInitial = {
        quantite: siData.quantite,
        unite: siData.unite,
        valeur: siData.valeur,
        date: siData.date || null,
      }
      pSummary.uniteStock = siData.unite
    }
  }

  const mouvements: Mouvement[] = []

  // 5. Injecter les mouvements de Stock Initial dans le journal
  for (const [prodName, summary] of Object.entries(stocksParProduit)) {
    if (summary.stockInitial.quantite > 0) {
      mouvements.push({
        id: `stock-initial-${campagne.id}-${encodeURIComponent(prodName)}`,
        date: summary.stockInitial.date || (campagne as any).date_debut || '2025-01-01',
        type: 'entree',
        tiers: `Stock initial (${prodName})`,
        tiers_type: 'report',
        produit: prodName,
        prix_unitaire: summary.stockInitial.valeur || Number(campagne.prix_collecte || 0),
        quantite: summary.stockInitial.quantite,
        unite: summary.stockInitial.unite,
        origine_stock: 'report',
        motif: `Inventaire d'ouverture / Report de stock [${prodName}]`,
      })
    }
  }

  // 6. Entrées de remboursements en nature des membres / clients
  for (const r of remboursements) {
    const membre = Array.isArray(r.membres) ? r.membres[0] : r.membres
    const factureData = Array.isArray(r.factures) ? r.factures[0] : r.factures
    const prodStr = String(r.produit_nature || '')
    const clientTagMatch = prodStr.match(/\[CLIENT:([^\]]+)\]/)
    const clientNomFacture = clientTagMatch ? clientTagMatch[1].trim() : factureData?.client_nom
    const client = clientNomFacture ? { nom: clientNomFacture } : null
    const quantite = Number(r.quantite_nature || 0)

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

    // Identifier le produit spécifique de ce remboursement
    let produitMvt = defaultProduitCampagne
    const prodTagMatch = prodStr.match(/\[PRODUIT:([^\]]+)\]/)
    if (prodTagMatch && prodTagMatch[1].trim()) {
      produitMvt = prodTagMatch[1].trim()
    } else {
      const cleanLabel = cleanNomProduit(prodStr, '')
      if (cleanLabel && cleanLabel !== 'Stock initial (Inventaire d\'ouverture)' && cleanLabel !== 'Produit') {
        produitMvt = cleanLabel
      }
    }

    ensureProduit(produitMvt, uniteMesure)

    const tiersNom = isReport
      ? `Stock initial (${produitMvt})`
      : membre
        ? `${membre.prenom} ${membre.nom}`
        : client?.nom || 'Client externe'

    mouvements.push({
      id: r.id,
      date: r.date_paiement,
      type: 'entree',
      tiers: tiersNom,
      tiers_type: isReport ? 'report' : (membre ? 'membre' : 'client'),
      produit: produitMvt,
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

  // 7. Paiements en nature des clients externes
  for (const pc of (paiementsClientsRes.data || []) as any[]) {
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

    const produitMvt = prodMatch && prodMatch[1].trim() ? prodMatch[1].trim() : defaultProduitCampagne
    const uniteMvt = uniteMatch ? uniteMatch[1].trim() : 'kg'

    ensureProduit(produitMvt, uniteMvt)

    const clientObj = pc.client_id ? clientMap.get(pc.client_id) : null
    const tiersNom = clientObj?.nom || 'Client externe'

    mouvements.push({
      id: `pc-${pc.id}`,
      date: pc.date_paiement,
      type: 'entree',
      tiers: tiersNom,
      tiers_type: 'client',
      produit: produitMvt,
      membre: null,
      client: clientObj || { id: pc.client_id, nom: tiersNom },
      prix_unitaire: prixUnitaire,
      quantite,
      unite: uniteMvt,
      origine_stock: origMatch ? origMatch[1].trim() : 'materiel',
      variete: varMatch ? varMatch[1].trim() : null,
      motif: prodMatch ? prodMatch[1].trim() : motifStr.replace(/\[[^\]]*\]/g, '').trim(),
      raw: pc,
    })
  }

  // 8. Sorties de stock (ventes et ristournes)
  for (const s of sortiesRes.data || []) {
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

    const prodMatch = motifStr.match(/\[PRODUIT:([^\]]+)\]/)
    const produitMvt = prodMatch && prodMatch[1].trim() ? prodMatch[1].trim() : defaultProduitCampagne

    ensureProduit(produitMvt, sUnite)

    const cleanMotif = motifStr.replace(/\[[^\]]*\]/g, '').trim()

    mouvements.push({
      id: s.id,
      date: s.date_sortie,
      type: s.type_sortie as 'vente' | 'ristourne',
      tiers: s.tiers_type === 'membre' ? (membre ? `${membre.prenom} ${membre.nom}` : '-') : (client?.nom || s.tiers_nom || '-'),
      tiers_type: s.tiers_type,
      produit: produitMvt,
      membre,
      client: client || (s.tiers_nom ? { nom: s.tiers_nom } : null),
      motif: cleanMotif,
      raw_motif: s.motif,
      prix_unitaire: Number(s.prix_unitaire || 0),
      quantite: Number(s.quantite),
      unite: sUnite,
      unite_vente: uniteVente,
      quantite_vente: quantiteVente,
      nb_contenance: nbContenance,
      raw: s,
    })
  }

  // 9. Trier chronologiquement et calculer les soldes par produit
  mouvements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Initialiser les compteurs de solde par produit
  const runningSoldes: Record<string, number> = {}
  for (const prodName of Object.keys(stocksParProduit)) {
    runningSoldes[prodName] = 0
  }

  let soldeGlobal = 0
  const journal = mouvements.map((m) => {
    const prod = m.produit || defaultProduitCampagne
    const pSummary = ensureProduit(prod, m.unite || 'kg')

    if (m.type === 'entree') {
      if (m.tiers_type !== 'report') {
        pSummary.totalEntrees += m.quantite
      }
      pSummary.soldeActuel += m.quantite
      runningSoldes[prod] = (runningSoldes[prod] || 0) + m.quantite
      soldeGlobal += m.quantite
    } else {
      pSummary.totalSorties += m.quantite
      pSummary.soldeActuel -= m.quantite
      runningSoldes[prod] = (runningSoldes[prod] || 0) - m.quantite
      soldeGlobal -= m.quantite
    }

    pSummary.nbMouvements++
    return {
      ...m,
      solde_produit: runningSoldes[prod],
      solde: soldeGlobal,
    }
  })

  const listeProduits = Object.keys(stocksParProduit)
  const defaultSummary = stocksParProduit[defaultProduitCampagne] || Object.values(stocksParProduit)[0]

  return {
    journal: journal.reverse(),
    soldeActuel: defaultSummary?.soldeActuel || 0,
    uniteStock: defaultSummary?.uniteStock || 'kg',
    campagne: {
      ...campagne,
      produit_collecte: defaultProduitCampagne,
    },
    produits: listeProduits,
    stocksParProduit,
    stockInitial: defaultSummary?.stockInitial || null,
  }
}

/**
 * Définir ou modifier le stock initial (inventaire d'ouverture) de la campagne pour un produit donné
 */
export async function setStockInitial(input: {
  campagne_id: string
  produit?: string
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

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  const qte = Number(input.quantite || 0)
  const unite = input.unite?.trim() || 'kg'
  const valUnit = Number(input.valeur_unitaire || 0)
  const dateStock = input.date || new Date().toISOString().slice(0, 10)

  // Récupérer la campagne
  const { data: camp } = await supabase
    .from('campagnes')
    .select('id, nom, produit_collecte, prix_collecte')
    .eq('id', input.campagne_id)
    .single()

  if (!camp) return { error: "Campagne introuvable" }

  const produitCible = cleanNomProduit(input.produit || camp.produit_collecte, 'Riz Paddy')

  // 1. Tenter la table dédiée stock_nature_initial (si migration 64 appliquée)
  try {
    const { error: sniErr } = await supabase
      .from('stock_nature_initial')
      .upsert({
        gie_id: userData.gie_id,
        campagne_id: input.campagne_id,
        produit: produitCible,
        quantite: qte,
        unite,
        valeur_unitaire: valUnit,
        date_inventaire: dateStock,
      }, { onConflict: 'gie_id,campagne_id,produit' })

    if (sniErr) {
      console.warn("stock_nature_initial table non présente, utilisation du fallback:", sniErr.message)
    }
  } catch (_) { }

  // 2. Tenter la mise à jour directe sur la table campagnes (si migration 63 appliquée)
  try {
    await supabase
      .from('campagnes')
      .update({
        stock_initial_quantite: qte,
        stock_initial_unite: unite,
        stock_initial_valeur: valUnit,
        stock_initial_date: dateStock,
      })
      .eq('id', input.campagne_id)
  } catch (_) { }

  // 3. Fallback pérenne universel : encoder dans le champ produit_collecte
  // Format : "Riz Paddy [SI:Riz Paddy=15000:kg:160|Oignon=3000:kg:200]"
  try {
    const currentRaw = camp.produit_collecte || 'Riz Paddy'
    const cleanBase = cleanNomProduit(currentRaw, produitCible)
    const currentTagMap = parseStockInitialTag(currentRaw)

    currentTagMap[produitCible] = {
      quantite: qte,
      unite,
      valeur: valUnit,
      date: dateStock,
    }

    const tagParts: string[] = []
    for (const [pName, pData] of Object.entries(currentTagMap)) {
      if (pData.quantite > 0) {
        tagParts.push(`${pName}=${pData.quantite}:${pData.unite}:${pData.valeur}:${pData.date || ''}`)
      }
    }

    const newTag = tagParts.length > 0 ? ` [SI:${tagParts.join('|')}]` : ''
    // Tronquer avec précaution si la taille maximale est dépassée
    const safeString = `${cleanBase}${newTag}`.slice(0, 100)

    await supabase
      .from('campagnes')
      .update({ produit_collecte: safeString })
      .eq('id', input.campagne_id)
  } catch (err: any) {
    console.error("Erreur sauvegarde tag stock initial:", err)
  }

  revalidatePath('/remboursements/stock-nature')
  revalidatePath('/intrants/stock-nature')
  return { success: true }
}

/**
 * Enregistrer une sortie de stock (vente ou ristourne)
 * Prend en charge :
 * - Le produit spécifique
 * - La distinction entre unité de vente (kg ou contenance/sacs) et unité de stock
 */
export async function addSortieStockNature(input: {
  campagne_id: string
  type_sortie: string
  tiers_type: string
  produit?: string
  membre_id?: string
  client_id?: string
  tiers_nom?: string
  quantite: number
  prix_unitaire: number
  motif?: string
  date_sortie?: string
  unite?: string
  unite_vente?: string
  quantite_vente?: number
  nb_contenance?: number
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
  const produitChoisi = cleanNomProduit(input.produit, 'Riz Paddy')

  // Méta-tags pour traçabilité parfaite sans dépendance de colonnes
  const metaTags = [
    `[PRODUIT:${produitChoisi}]`,
    `[STOCK_UNITE:${stockUnite}]`,
    `[VENTE_UNITE:${venteUnite}]`,
    `[VENTE_QTE:${quantiteVente}]`,
    nbContenance ? `[NB_CONTENANCE:${nbContenance}]` : '',
  ].filter(Boolean).join(' ')

  const cleanMotif = (input.motif || '').replace(/\[[^\]]*\]/g, '').trim()
  const motifComplet = `${metaTags} ${cleanMotif}`.trim()

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
  revalidatePath('/intrants/stock-nature')
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
  produit?: string
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

  // Récupérer le motif existant pour conserver le produit s'il n'est pas fourni
  let produitFinal = input.produit
  if (!produitFinal) {
    const { data: current } = await supabase.from('sorties_stock_nature').select('motif').eq('id', id).single()
    const pMatch = String(current?.motif || '').match(/\[PRODUIT:([^\]]+)\]/)
    if (pMatch) produitFinal = pMatch[1].trim()
  }

  const metaTags = [
    produitFinal ? `[PRODUIT:${cleanNomProduit(produitFinal)}]` : '',
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
  revalidatePath('/intrants/stock-nature')
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
  revalidatePath('/intrants/stock-nature')
  revalidatePath('/facturation')
  revalidatePath('/bilans/releve-membre')
  revalidatePath('/bilans/releve-client')
  revalidatePath('/bilans/bilan-annuel')
  return { success: true }
}
