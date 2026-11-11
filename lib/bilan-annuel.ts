// Calcul du bilan annuel et du compte de résultat d'un GIE à partir des données
// de gestion (matériel, stocks, factures, trésorerie, crédits...). Fonctions pures :
// aucune requête ici, tout est calculé depuis `BilanRaw` pour pouvoir produire
// l'exercice N et l'exercice N-1 avec un seul chargement de données.

import { getCreditType } from './credits-types'
import { isStockableIntrant } from './intrants/types'

export type BilanRaw = {
  intrants: { id: string; nom?: string | null; type_intrant?: string | null; quantite_stock: number | null; prix_unitaire: number | null }[]
  achats: { intrant_id: string; quantite: number | null; prix_unitaire: number | null; date_achat: string }[]
  distributions: { intrant_id: string; quantite: number | null; date_distribution: string | null }[]
  factures: { id: string; membre_id: string | null; campagne_id: string | null; montant_total: number | null; montant_interet: number | null; date_emission: string | null }[]
  remboursements: {
    id?: string
    facture_id: string | null
    membre_id: string | null
    type_remboursement: string
    montant_fcfa: number | null
    quantite_nature: number | null
    date_paiement: string | null
    document_id?: string | null
    document_type?: string | null
    produit_nature?: string | null
  }[]
  sorties: { id?: string; campagne_id: string; membre_id: string | null; client_id?: string | null; type_sortie: string; tiers_type: string; tiers_nom?: string | null; quantite: number | null; prix_unitaire: number | null; date_sortie: string; motif?: string | null }[]
  campagnes: { id: string; prix_collecte: number | null }[]
  paiementsClients: { id?: string; client_id?: string | null; montant: number | null; date_paiement: string; motif?: string | null }[]
  materiels: { id?: string; valeur_acquisition: number | null; duree_vie_economique: number | null; date_acquisition: string | null }[]
  prestations: { id?: string; montant_facture: number | null; date_prestation: string; tiers_type?: string | null; membre_id?: string | null; client_id?: string | null; client_nom?: string | null }[]
  consommations: { montant_total: number | null; date_consommation: string }[]
  comptes: { id?: string; solde_initial: number | null }[]
  transactions: { id?: string; compte_id?: string | null; type_transaction: string; montant: number | null; date_transaction: string | null; type_piece: string | null; credit_id: string | null; motif?: string | null }[]
  ristournes: { membre_id: string; montant: number | null; date_ristourne: string }[]
  credits: {
    id: string
    statut: string | null
    montant_accorde: number | null
    taux_interet: number | null
    duree_credit: number | null
    date_demande: string | null
    type_credit?: string | null
    but_credit?: string | null
    equipement_nom?: string | null
    materiel_id?: string | null
  }[]
  membres?: { id: string; solde_initial: number | null }[]
  clients?: { id: string; nom?: string | null; solde_initial?: number | null }[]
}

export const RUBRIQUES_SAISIE = ['subventions', 'emprunts', 'autres_produits', 'autres_charges'] as const
export type RubriqueSaisie = (typeof RUBRIQUES_SAISIE)[number]
export type Saisies = Partial<Record<RubriqueSaisie, number>>

export type Ligne = { brut: number; amo: number; net: number }

export type BilanCalcule = {
  annee: number
  actif: {
    immobilisations: Ligne
    stocks_intrants: Ligne
    stocks_remboursement: Ligne
    stocks: Ligne
    creances: Ligne
    disponibilites: Ligne
    total: Ligne
  }
  passif: {
    capital: Ligne
    resultat: Ligne
    subventions: Ligne
    emprunts: Ligne
    dettes: Ligne
    credits_tresorerie: Ligne
    total: Ligne
  }
  resultat: {
    ventes: number
    gain_remboursement: number
    prestations: number
    autres_produits: number
    total_produits: number
    achats: number
    variation_stock: number
    perte_remboursement: number
    charges_materiel: number
    interets: number
    autres_charges: number
    total_charges: number
    resultat: number
  }
}

const n = (v: unknown) => Number(v) || 0
const ts = (d: string | null | undefined) => (d ? new Date(d).getTime() : NaN)
const finAnnee = (y: number) => Date.UTC(y, 11, 31, 23, 59, 59, 999)
const debutAnnee = (y: number) => Date.UTC(y, 0, 1)
const avant = (d: string | null | undefined, limite: number) => ts(d) <= limite
const dansAnnee = (d: string | null | undefined, y: number) => {
  const t = ts(d)
  return t >= debutAnnee(y) && t <= finAnnee(y)
}
const somme = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0)
const ligne = (brut: number, amo = 0): Ligne => ({ brut, amo, net: brut - amo })

function cleanClientNom(nom?: string | null): string {
  if (!nom) return ''
  return nom.replace(/\[.*?\]/g, '').trim()
}

function extractClientSoldeInitial(nom?: string | null): number {
  if (!nom) return 0
  const match = String(nom).match(/\[SOLDE_INIT:([+-]?\d+(?:\.\d+)?)\]/)
  return match ? Number(match[1]) : 0
}

// Amortissement linéaire cumulé à la date `limite` (même règle que la page Amortissements).
function amortissement(m: BilanRaw['materiels'][number], limite: number): number {
  const valeur = n(m.valeur_acquisition)
  const duree = n(m.duree_vie_economique)
  if (!valeur || !duree || !m.date_acquisition) return 0
  const annees = (limite - ts(m.date_acquisition)) / (1000 * 60 * 60 * 24 * 365.25)
  if (annees <= 0) return 0
  return Math.min((valeur / duree) * annees, valeur)
}

// Prix de collecte d'une campagne : prix fixé sur la campagne, à défaut prix moyen
// des remboursements en nature réellement encaissés.
function prixCollecteParCampagne(raw: BilanRaw): Map<string, number> {
  const campagneDeFacture = new Map(raw.factures.map((f) => [f.id, f.campagne_id]))
  const fcfa = new Map<string, number>()
  const qte = new Map<string, number>()
  for (const r of raw.remboursements) {
    if (r.type_remboursement !== 'nature' || n(r.quantite_nature) <= 0) continue
    let c = r.facture_id ? campagneDeFacture.get(r.facture_id) : undefined
    if (!c && r.document_type === 'campagne' && r.document_id) c = r.document_id
    if (!c && r.produit_nature) {
      const match = r.produit_nature.match(/\[CAMPAGNE:([^\]]+)\]/)
      if (match) c = match[1]
    }
    if (!c) continue
    fcfa.set(c, (fcfa.get(c) || 0) + n(r.montant_fcfa))
    qte.set(c, (qte.get(c) || 0) + n(r.quantite_nature))
  }
  for (const pc of raw.paiementsClients || []) {
    const motifStr = String(pc.motif || '')
    if (!motifStr.includes('[MODE:nature]')) continue
    const cMatch = motifStr.match(/\[CAMPAGNE:([^\]]+)\]/)
    const qMatch = motifStr.match(/\[QTE:([^\]]+)\]/)
    if (cMatch && qMatch) {
      const c = cMatch[1]
      const q = n(qMatch[1])
      if (q > 0) {
        fcfa.set(c, (fcfa.get(c) || 0) + n(pc.montant))
        qte.set(c, (qte.get(c) || 0) + q)
      }
    }
  }
  const prix = new Map<string, number>()
  for (const c of raw.campagnes) {
    const moyen = (qte.get(c.id) || 0) > 0 ? (fcfa.get(c.id) || 0) / (qte.get(c.id) || 1) : 0
    prix.set(c.id, n(c.prix_collecte) > 0 ? n(c.prix_collecte) : moyen)
  }
  return prix
}

export function calculerBilan(raw: BilanRaw, annee: number, saisies: Saisies): BilanCalcule {
  const fin = finAnnee(annee)
  const prixCollecte = prixCollecteParCampagne(raw)
  const campagneDeFacture = new Map(raw.factures.map((f) => [f.id, f.campagne_id]))

  // ---- Actif ----
  const immoBrut = somme(raw.materiels.filter((m) => !m.date_acquisition || avant(m.date_acquisition, fin)), (m) => n(m.valeur_acquisition))
  const immoAmo = somme(raw.materiels, (m) => amortissement(m, fin))

  // Stock d'intrants à une date : stock actuel, en remontant les mouvements postérieurs.
  // Valorisé au dernier prix connu de l'intrant.
  // Les services (façon culturale, service hydraulique, refacturation...) n'étant pas stockés,
  // ils sont formellement exclus du calcul des stocks et de la variation de stock.
  const stockIntrantsA = (limite: number) =>
    somme(raw.intrants.filter((i) => isStockableIntrant(i)), (i) => {
      const distribuesApres = somme(raw.distributions.filter((d) => d.intrant_id === i.id && !avant(d.date_distribution, limite)), (d) => n(d.quantite))
      const achetesApres = somme(raw.achats.filter((a) => a.intrant_id === i.id && !avant(a.date_achat, limite)), (a) => n(a.quantite))
      return Math.max(0, n(i.quantite_stock) + distribuesApres - achetesApres) * n(i.prix_unitaire)
    })

  // Stock en nature (produits agricoles en stock issus des remboursements en nature et règlements de récolte)
  const stockNatureA = (limite: number) => {
    const knownCampagneIds = new Set(raw.campagnes.map((c) => c.id))
    const rembIdsIncluded = new Set<string>()

    let totalNature = somme(raw.campagnes, (c) => {
      let qteEntrees = 0
      let valEntrees = 0

      // 1. Remboursements directs en nature
      for (const r of raw.remboursements) {
        if (r.type_remboursement !== 'nature' || !avant(r.date_paiement, limite)) continue
        let cid = r.facture_id ? campagneDeFacture.get(r.facture_id) : undefined
        if (!cid && r.document_type === 'campagne' && r.document_id) cid = r.document_id
        if (!cid && r.produit_nature) {
          const m = r.produit_nature.match(/\[CAMPAGNE:([^\]]+)\]/)
          if (m) cid = m[1]
        }
        if (cid === c.id) {
          if (r.id) rembIdsIncluded.add(r.id)
          const q = n(r.quantite_nature)
          qteEntrees += q
          valEntrees += n(r.montant_fcfa) > 0 ? n(r.montant_fcfa) : q * (prixCollecte.get(c.id) || 0)
        }
      }

      // 2. Paiements clients en nature (prestations, etc.)
      for (const pc of raw.paiementsClients || []) {
        if (!avant(pc.date_paiement, limite)) continue
        const motifStr = String(pc.motif || '')
        if (!motifStr.includes('[MODE:nature]')) continue
        const rembIdMatch = motifStr.match(/\[REMB_ID:([^\]]+)\]/)
        if (rembIdMatch && rembIdMatch[1] && rembIdsIncluded.has(rembIdMatch[1].trim())) {
          continue
        }
        const cMatch = motifStr.match(/\[CAMPAGNE:([^\]]+)\]/)
        if (cMatch && cMatch[1] === c.id) {
          const qMatch = motifStr.match(/\[QTE:([^\]]+)\]/)
          const q = qMatch ? n(qMatch[1]) : 0
          qteEntrees += q
          valEntrees += n(pc.montant) > 0 ? n(pc.montant) : q * (prixCollecte.get(c.id) || 0)
        }
      }

      // Sorties (ventes et ristournes)
      let qteSorties = 0
      let valSorties = 0
      for (const s of raw.sorties) {
        if (s.campagne_id === c.id && avant(s.date_sortie, limite)) {
          const q = n(s.quantite)
          qteSorties += q
          valSorties += q * (prixCollecte.get(c.id) || n(s.prix_unitaire))
        }
      }

      const qteRestante = Math.max(0, qteEntrees - qteSorties)
      if (qteRestante <= 0) return 0

      if (qteEntrees > 0 && valEntrees > 0) {
        return Math.max(0, valEntrees - valSorties)
      }
      return qteRestante * (prixCollecte.get(c.id) || 0)
    })

    // Remboursements en nature hors campagne ou sur campagne non configurée
    for (const r of raw.remboursements) {
      if (r.type_remboursement !== 'nature' || !avant(r.date_paiement, limite)) continue
      let cid = r.facture_id ? campagneDeFacture.get(r.facture_id) : undefined
      if (!cid && r.document_type === 'campagne' && r.document_id) cid = r.document_id
      if (!cid && r.produit_nature) {
        const m = r.produit_nature.match(/\[CAMPAGNE:([^\]]+)\]/)
        if (m) cid = m[1]
      }
      if (!cid || !knownCampagneIds.has(cid)) {
        totalNature += n(r.montant_fcfa) > 0 ? n(r.montant_fcfa) : n(r.quantite_nature) * 100
      }
    }

    // Paiements clients nature orphelins (sans campagne configurée)
    for (const pc of raw.paiementsClients || []) {
      if (!avant(pc.date_paiement, limite)) continue
      const motifStr = String(pc.motif || '')
      if (!motifStr.includes('[MODE:nature]')) continue
      const cMatch = motifStr.match(/\[CAMPAGNE:([^\]]+)\]/)
      const cid = cMatch ? cMatch[1] : null
      if (!cid || !knownCampagneIds.has(cid)) {
        const rembIdMatch = motifStr.match(/\[REMB_ID:([^\]]+)\]/)
        if (!rembIdMatch || !rembIdsIncluded.has(rembIdMatch[1].trim())) {
          totalNature += n(pc.montant)
        }
      }
    }

    return totalNature
  }

  // Stock total de fin d'année (intrants + produits de remboursement)
  const stockIntrants = stockIntrantsA(fin)
  const stockNature = stockNatureA(fin)
  const stockTotal = stockIntrants + stockNature

  // Stock total de début d'année (clôture N-1)
  const stockIntrantsDebut = stockIntrantsA(debutAnnee(annee) - 1)
  const stockNatureDebut = stockNatureA(debutAnnee(annee) - 1)
  const stockTotalDebut = stockIntrantsDebut + stockNatureDebut

  // 1. Solde par membre = solde_initial + facturé - remboursé + ristournes + prestations + ventes stock.
  // Une ristourne rend au membre son surplus de remboursement : elle réduit ce qu'il a remboursé.
  // Un solde positif est une créance du GIE ; un solde négatif (surplus non encore rendu / avance)
  // est une dette du GIE envers le membre, à porter au passif et non en créance négative.
  const soldeMembre = new Map<string, number>()
  for (const m of raw.membres || []) {
    soldeMembre.set(m.id, n(m.solde_initial))
  }
  const ajouterMembre = (id: string | null | undefined, v: number) => {
    if (!id) return
    soldeMembre.set(id, (soldeMembre.get(id) || 0) + v)
  }

  for (const f of raw.factures.filter((x) => avant(x.date_emission, fin))) {
    ajouterMembre(f.membre_id, n(f.montant_total) + n(f.montant_interet))
  }
  for (const p of raw.prestations.filter((x) => (x.tiers_type === 'membre' || Boolean(x.membre_id)) && avant(x.date_prestation, fin))) {
    ajouterMembre(p.membre_id, n(p.montant_facture))
  }
  for (const s of raw.sorties.filter((x) => x.type_sortie === 'vente' && x.tiers_type === 'membre' && x.membre_id && avant(x.date_sortie, fin))) {
    ajouterMembre(s.membre_id, n(s.quantite) * n(s.prix_unitaire))
  }
  for (const r of raw.remboursements.filter((x) => x.membre_id && avant(x.date_paiement, fin))) {
    ajouterMembre(r.membre_id, -n(r.montant_fcfa))
  }
  for (const s of raw.sorties.filter((x) => x.type_sortie === 'ristourne' && x.tiers_type === 'membre' && x.membre_id && avant(x.date_sortie, fin))) {
    ajouterMembre(s.membre_id, n(s.quantite) * n(s.prix_unitaire))
  }
  // Ristournes en numéraire (commande Ristourne du module Remboursements).
  for (const r of raw.ristournes.filter((x) => avant(x.date_ristourne, fin))) {
    ajouterMembre(r.membre_id, n(r.montant))
  }

  const soldesMembres = [...soldeMembre.values()]
  const creancesMembres = somme(soldesMembres, (v) => Math.max(0, v))
  const dettesMembres = somme(soldesMembres, (v) => Math.max(0, -v))

  // 2. Solde par client externe = solde initial + ventes stock nature + prestations matériel - paiements.
  // Même principe : un solde positif est une créance client (actif), un solde négatif est une avance reçue (dette au passif).
  type ClientInfo = {
    id: string
    cleanNom: string
    solde: number
  }
  const clientMap = new Map<string, ClientInfo>()
  for (const c of (raw.clients || []).filter((cl) => !cl.nom?.startsWith('[FOURNISSEUR]'))) {
    const rawNom = c.nom || ''
    const si = c.solde_initial != null && !isNaN(Number(c.solde_initial)) && Number(c.solde_initial) !== 0
      ? Number(c.solde_initial)
      : extractClientSoldeInitial(rawNom)
    clientMap.set(c.id, {
      id: c.id,
      cleanNom: cleanClientNom(rawNom).toLowerCase(),
      solde: si,
    })
  }

  const findClientId = (id?: string | null, nom?: string | null): string | null => {
    if (id && clientMap.has(id)) return id
    if (nom) {
      const lower = cleanClientNom(nom).toLowerCase()
      if (!lower) return null
      for (const [cid, cl] of clientMap.entries()) {
        if (cl.cleanNom === lower || cl.cleanNom.includes(lower) || lower.includes(cl.cleanNom)) {
          return cid
        }
      }
    }
    return null
  }

  // Ventes aux clients externes
  for (const s of raw.sorties.filter((x) => x.type_sortie === 'vente' && x.tiers_type === 'client' && avant(x.date_sortie, fin))) {
    const cid = findClientId(s.client_id, s.tiers_nom)
    const vQteMatch = String(s.motif || '').match(/\[VENTE_QTE:([^\]]+)\]/)
    const quantiteFacturee = vQteMatch ? n(vQteMatch[1]) : n(s.quantite)
    const montant = quantiteFacturee * n(s.prix_unitaire)
    if (cid && clientMap.has(cid)) {
      clientMap.get(cid)!.solde += montant
    } else {
      const fallbackKey = s.tiers_nom ? `nom:${cleanClientNom(s.tiers_nom).toLowerCase()}` : 'client-divers'
      if (!clientMap.has(fallbackKey)) {
        clientMap.set(fallbackKey, { id: fallbackKey, cleanNom: fallbackKey, solde: 0 })
      }
      clientMap.get(fallbackKey)!.solde += montant
    }
  }

  // Prestations matériel aux clients externes
  for (const p of raw.prestations.filter((x) => x.tiers_type !== 'membre' && !x.membre_id && avant(x.date_prestation, fin))) {
    const cid = findClientId(p.client_id, p.client_nom)
    const montant = n(p.montant_facture)
    if (cid && clientMap.has(cid)) {
      clientMap.get(cid)!.solde += montant
    } else {
      const fallbackKey = p.client_nom ? `nom:${cleanClientNom(p.client_nom).toLowerCase()}` : 'client-divers'
      if (!clientMap.has(fallbackKey)) {
        clientMap.set(fallbackKey, { id: fallbackKey, cleanNom: fallbackKey, solde: 0 })
      }
      clientMap.get(fallbackKey)!.solde += montant
    }
  }

  // Paiements des clients externes
  for (const pc of (raw.paiementsClients || []).filter((x) => avant(x.date_paiement, fin))) {
    const cid = findClientId(pc.client_id, null)
    const montant = n(pc.montant)
    if (cid && clientMap.has(cid)) {
      clientMap.get(cid)!.solde -= montant
    } else {
      const fallbackKey = 'client-divers'
      if (!clientMap.has(fallbackKey)) {
        clientMap.set(fallbackKey, { id: fallbackKey, cleanNom: fallbackKey, solde: 0 })
      }
      clientMap.get(fallbackKey)!.solde -= montant
    }
  }

  const soldesClients = [...clientMap.values()].map((c) => c.solde)
  const creancesClients = somme(soldesClients, (v) => Math.max(0, v))
  const dettesClients = somme(soldesClients, (v) => Math.max(0, -v))

  const totalCreances = creancesMembres + creancesClients

  // 3. Disponibilités : soldes positifs de tous les comptes de trésorerie
  const tresoAvant = raw.transactions.filter((t) => avant(t.date_transaction, fin))

  let disponibilites = 0
  let decouvertsComptes = 0

  const comptesTraites = new Set<string>()
  for (const c of raw.comptes || []) {
    if (c.id) comptesTraites.add(c.id)
    const txCompte = tresoAvant.filter((t) => c.id && t.compte_id === c.id)
    const entrees = somme(txCompte.filter((t) => t.type_transaction === 'entree'), (t) => n(t.montant))
    const sorties = somme(txCompte.filter((t) => t.type_transaction === 'sortie'), (t) => n(t.montant))
    const solde = n(c.solde_initial) + entrees - sorties
    if (solde > 0) {
      disponibilites += solde
    } else if (solde < 0) {
      decouvertsComptes += -solde
    }
  }

  // Transactions sans compte_id rattaché
  const txOrphelines = tresoAvant.filter((t) => !t.compte_id || !comptesTraites.has(t.compte_id))
  if (txOrphelines.length > 0) {
    const netOrphelin =
      somme(txOrphelines.filter((t) => t.type_transaction === 'entree'), (t) => n(t.montant)) -
      somme(txOrphelines.filter((t) => t.type_transaction === 'sortie'), (t) => n(t.montant))
    if (netOrphelin > 0) disponibilites += netOrphelin
    else if (netOrphelin < 0) decouvertsComptes += -netOrphelin
  }

  const actif = {
    immobilisations: ligne(immoBrut, immoAmo),
    stocks_intrants: ligne(stockIntrants),
    stocks_remboursement: ligne(stockNature),
    stocks: ligne(stockTotal),
    creances: ligne(totalCreances),
    disponibilites: ligne(disponibilites),
  }
  const totalActif = ligne(
    actif.immobilisations.brut + actif.stocks.brut + actif.creances.brut + actif.disponibilites.brut,
    actif.immobilisations.amo
  )

  // ---- Compte de résultat ----
  const ventes = somme(raw.factures.filter((f) => dansAnnee(f.date_emission, annee)), (f) => n(f.montant_total) + n(f.montant_interet))

  // Uniquement la vente du produit issu des remboursements en nature (stock en nature) ;
  // la vente d'intrants aux membres est dans "ventes" (factures), les ristournes sont prises en compte dans le solde de chaque membre.
  let gain = 0
  let perte = 0
  for (const s of raw.sorties.filter((x) => x.type_sortie === 'vente' && dansAnnee(x.date_sortie, annee))) {
    const vQteMatch = String(s.motif || '').match(/\[VENTE_QTE:([^\]]+)\]/)
    const quantiteFacturee = vQteMatch ? n(vQteMatch[1]) : n(s.quantite)
    const ecart = (n(s.prix_unitaire) - (prixCollecte.get(s.campagne_id) || 0)) * quantiteFacturee
    if (ecart >= 0) gain += ecart
    else perte += -ecart
  }

  const prestations = somme(raw.prestations.filter((p) => dansAnnee(p.date_prestation, annee)), (p) => n(p.montant_facture))
  const autresProduits = n(saisies.autres_produits)
  const totalProduits = ventes + gain + prestations + autresProduits

  const achatsAnnee = somme(raw.achats.filter((a) => dansAnnee(a.date_achat, annee)), (a) => n(a.quantite) * n(a.prix_unitaire))

  // Variation de stock globale (intrants et produits récoltés) = stock initial (clôture N-1) - stock final (clôture N) :
  // positive quand le stock global baisse (consommé/vendu pendant l'année), négative quand il augmente.
  const variationStock = stockTotalDebut - stockTotal

  const consommations = somme(raw.consommations.filter((c) => dansAnnee(c.date_consommation, annee)), (c) => n(c.montant_total))
  const dotation = somme(raw.materiels, (m) => amortissement(m, fin) - amortissement(m, debutAnnee(annee) - 1))
  const chargesMateriel = consommations + dotation

  // Charges d'intérêts bancaires de l'année :
  // - Crédits de campagne (court terme) : imputés sur l'exercice de demande/campagne
  // - Crédits d'équipement (moyen terme) : intérêts de l'année pour les exercices où le crédit est actif
  const interets = somme(
    raw.credits.filter((c) => c.statut === 'valide'),
    (c) => {
      const type = getCreditType(c)
      const montant = n(c.montant_accorde)
      const taux = n(c.taux_interet) / 100
      if (montant <= 0 || taux <= 0) return 0

      if (type === 'campagne') {
        if (!dansAnnee(c.date_demande, annee)) return 0
        const duree = n(c.duree_credit) || 12
        return montant * taux * (duree / 12)
      } else {
        // Crédit équipement
        const dateDebut = ts(c.date_demande)
        if (!dateDebut || Number.isNaN(dateDebut)) return 0
        const dureeMois = n(c.duree_credit) || 36
        const dateFin = dateDebut + dureeMois * 30.4375 * 24 * 60 * 60 * 1000
        // Actif si le crédit démarre avant la clôture et se termine après l'ouverture de l'année
        if (dateDebut <= fin && dateFin >= debutAnnee(annee)) {
          return montant * taux
        }
        return 0
      }
    }
  )

  const autresCharges = n(saisies.autres_charges)
  const totalCharges = achatsAnnee + variationStock + perte + chargesMateriel + interets + autresCharges
  const resultat = totalProduits - totalCharges

  // ---- Passif ----
  const creditsValides = raw.credits.filter((c) => c.statut === 'valide' && avant(c.date_demande, fin))

  // Séparation Crédits de Campagne vs Crédits d'Équipement
  const creditsCampagne = creditsValides.filter((c) => getCreditType(c) === 'campagne')
  const creditsEquipement = creditsValides.filter((c) => getCreditType(c) === 'equipement')

  const idsCampagne = new Set(creditsCampagne.map((c) => c.id))
  const idsEquipement = new Set(creditsEquipement.map((c) => c.id))

  const remboursementsCampagne = somme(
    tresoAvant.filter((t) => t.type_piece === 'remboursement_credit' && t.credit_id && idsCampagne.has(t.credit_id)),
    (t) => n(t.montant)
  )
  const creditCampagneRestant = Math.max(
    0,
    somme(creditsCampagne, (c) => n(c.montant_accorde)) - remboursementsCampagne
  )

  const remboursementsEquipement = somme(
    tresoAvant.filter((t) => t.type_piece === 'remboursement_credit' && t.credit_id && idsEquipement.has(t.credit_id)),
    (t) => n(t.montant)
  )
  const creditEquipementRestant = Math.max(
    0,
    somme(creditsEquipement, (c) => n(c.montant_accorde)) - remboursementsEquipement
  )

  const dettesFournisseurs = Math.max(
    0,
    somme(raw.achats.filter((a) => avant(a.date_achat, fin)), (a) => n(a.quantite) * n(a.prix_unitaire)) -
      somme(tresoAvant.filter((t) => t.type_transaction === 'sortie' && t.type_piece === 'facture_fournisseur'), (t) => n(t.montant))
  )

  const dettes = dettesFournisseurs + dettesMembres + dettesClients
  const subventions = n(saisies.subventions)

  // Emprunts : solde en cours du crédit équipement par défaut (ou valeur manuelle saisie)
  const emprunts = saisies.emprunts !== undefined ? n(saisies.emprunts) : creditEquipementRestant

  // Crédit de trésorerie : solde en cours du crédit de campagne + découverts bancaires
  const creditsTresorerie = creditCampagneRestant + decouvertsComptes

  // Capital = solde du bilan : ce qu'il faut pour équilibrer le total du passif avec l'actif net.
  const capital = totalActif.net - (resultat + subventions + emprunts + dettes + creditsTresorerie)

  const passif = {
    capital: ligne(capital),
    resultat: ligne(resultat),
    subventions: ligne(subventions),
    emprunts: ligne(emprunts),
    dettes: ligne(dettes),
    credits_tresorerie: ligne(creditsTresorerie),
  }
  const totalPassif = ligne(capital + resultat + subventions + emprunts + dettes + creditsTresorerie)

  return {
    annee,
    actif: { ...actif, total: totalActif },
    passif: { ...passif, total: totalPassif },
    resultat: {
      ventes,
      gain_remboursement: gain,
      prestations,
      autres_produits: autresProduits,
      total_produits: totalProduits,
      achats: achatsAnnee,
      variation_stock: variationStock,
      perte_remboursement: perte,
      charges_materiel: chargesMateriel,
      interets,
      autres_charges: autresCharges,
      total_charges: totalCharges,
      resultat,
    },
  }
}
