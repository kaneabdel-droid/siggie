// ============================================================================
// SYSTÈME MINIMAL DE TRÉSORERIE (SMT) - SYSCOHADA RÉVISÉ POUR GIE AGRICOLE
// ============================================================================
// Calculs conformes aux états financiers du Système Minimal de Trésorerie (SMT)
// de l'Acte Uniforme OHADA :
// 1. Compte d'Exploitation SMT (Global, Volet Agricole, Volet Matériel)
// 2. Bilan SMT (Situation Patrimoniale Actif & Passif N et N-1)
// 3. Tableau des Flux et Livre de Trésorerie SMT (Recettes & Dépenses)
// ============================================================================

import type { BilanRaw, Saisies } from './bilan-annuel'
import { getCreditType, isCreditLongTerme } from './credits-types'
import { isStockableIntrant } from './intrants/types'

export type SMTFluxCompte = {
  id: string
  nom: string
  soldeInitial: number
  entrees: number
  sorties: number
  soldeFinal: number
}

export type SMTDetailItem = {
  libelle: string
  valeur: number
  unite?: string
  commentaire?: string
}

export type SMTLignePoste = {
  code?: string
  libelle: string
  montant: number
  note?: string
  details?: SMTDetailItem[]
}

export type SMTVolet = {
  titre: string
  recettes: SMTLignePoste[]
  totalRecettes: number
  depenses: SMTLignePoste[]
  totalDepenses: number
  soldeTresorerie: number
  ajustements: SMTLignePoste[]
  totalAjustements: number
  resultatNet: number
}

export type SMTBilanLigne = {
  libelle: string
  brut: number
  amortissement: number
  net: number
  netN1: number
  note?: string
  details?: SMTDetailItem[]
}

export type SMTBilan = {
  actif: {
    immobilisations: SMTBilanLigne
    stocksIntrants: SMTBilanLigne
    stocksNature: SMTBilanLigne
    stocksTotal: SMTBilanLigne
    creancesMembres: SMTBilanLigne
    creancesClients: SMTBilanLigne
    creancesMateriel?: SMTBilanLigne
    creancesTotal: SMTBilanLigne
    disponibilites: SMTBilanLigne
    totalActif: SMTBilanLigne
  }
  passif: {
    capital: SMTBilanLigne
    resultatNet: SMTBilanLigne
    subventions: SMTBilanLigne
    empruntsEquipement: SMTBilanLigne
    creditsCampagne: SMTBilanLigne
    dettesFournisseurs: SMTBilanLigne
    dettesMembresSurplus: SMTBilanLigne
    dettesTiersEmprunts: SMTBilanLigne
    totalPassif: SMTBilanLigne
  }
}

export type SMTData = {
  annee: number
  fluxTresorerie: {
    soldeOuverture: number
    totalEntrees: number
    totalSorties: number
    soldeCloture: number
    comptes: SMTFluxCompte[]
    recettesParPoste: SMTLignePoste[]
    depensesParPoste: SMTLignePoste[]
  }
  compteExploitation: {
    global: SMTVolet
    agricole: SMTVolet
    materiel: SMTVolet
  }
  bilan: SMTBilan
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

export function isSortieMateriel(s: { motif?: string | null }): boolean {
  const m = String(s.motif || '').toLowerCase()
  if (m.includes('[origine:materiel]') || m.includes('[origine:matériel]')) return true
  if (m.includes('moissonneuse') || m.includes('prestation') || m.includes('labour') || m.includes('battage')) return true
  return false
}

export function isPaiementMateriel(p: { motif?: string | null }): boolean {
  const m = String(p.motif || '').toLowerCase()
  if (m.includes('[origine:materiel]') || m.includes('[origine:matériel]')) return true
  if (m.includes('moissonneuse') || m.includes('prestation') || m.includes('labour') || m.includes('battage')) return true
  return false
}

export function calcMontantSortie(s: { quantite: number | null; prix_unitaire: number | null; motif?: string | null }): number {
  const vQteMatch = String(s.motif || '').match(/\[VENTE_QTE:([^\]]+)\]/)
  const qte = vQteMatch ? n(vQteMatch[1]) : n(s.quantite)
  return qte * n(s.prix_unitaire)
}

export type DifferentialSortieResult = {
  valeurVente: number
  valeurCollecte: number
  differentiel: number
  qteStock: number
  puVente: number
  puCollecte: number
  isMateriel: boolean
}

/**
 * Calcule la marge différentielle (valeur vente - valeur collecte) sur une sortie de stock en nature.
 * Seul le différentiel est pris en compte dans le chiffre d'affaires / produits,
 * car la valeur de collecte est déjà intégrée dans les prestations de matériel ou la facturation d'exploitation.
 */
export function calcDifferentialSortie(
  s: { campagne_id: string; quantite: number | null; prix_unitaire: number | null; motif?: string | null },
  prixCollecte: Map<string, number>,
  rawCampagnes: { id: string; produit_collecte?: string | null; prix_collecte?: number | null; stock_initial_quantite?: number | null; stock_initial_valeur?: number | null; stock_initial_secteur?: string | null }[]
): DifferentialSortieResult {
  const valeurVente = calcMontantSortie(s)
  const qteStock = n(s.quantite)
  const puVente = n(s.prix_unitaire)
  const isMat = isSortieMateriel(s)
  const c = rawCampagnes.find((x) => x.id === s.campagne_id)
  const siTag = c ? parseStockInitialCampagne(c) : null

  let puCollecte = 0
  const matchPc = String(s.motif || '').match(/\[PRIX_COLLECTE:([^\]]+)\]/)
  if (matchPc && Number(matchPc[1]) > 0) {
    puCollecte = Number(matchPc[1])
  } else if (isMat) {
    if (siTag && siTag.secteur === 'materiel' && siTag.valeur > 0) {
      puCollecte = siTag.valeur
    } else if (prixCollecte.get(s.campagne_id)) {
      puCollecte = s.motif?.toLowerCase().includes('sac')
        ? prixCollecte.get(s.campagne_id)! * 80
        : prixCollecte.get(s.campagne_id)!
    } else {
      puCollecte = s.motif?.toLowerCase().includes('sac') ? 10000 : 160
    }
  } else {
    if (prixCollecte.get(s.campagne_id) && prixCollecte.get(s.campagne_id)! > 0) {
      puCollecte = prixCollecte.get(s.campagne_id)!
    } else if (siTag && siTag.valeur > 0) {
      puCollecte = siTag.valeur
    } else {
      puCollecte = 160
    }
  }

  const valeurCollecte = qteStock * puCollecte
  const differentiel = valeurVente - valeurCollecte

  return {
    valeurVente,
    valeurCollecte,
    differentiel,
    qteStock,
    puVente,
    puCollecte,
    isMateriel: isMat,
  }
}

export function extractClientSoldeInitial(nom?: string | null): number {
  if (!nom) return 0
  const match = String(nom).match(/\[SOLDE_INIT:([+-]?\d+(?:\.\d+)?)\]/)
  return match ? Number(match[1]) : 0
}

export function parseStockInitialCampagne(
  campagneOrRaw?: { produit_collecte?: string | null; stock_initial_quantite?: number | null; stock_initial_valeur?: number | null; stock_initial_secteur?: string | null } | string | null
): { quantite: number; unite: string; valeur: number; date?: string | null; secteur: 'exploitation' | 'materiel' } | null {
  if (!campagneOrRaw) return null
  if (typeof campagneOrRaw === 'object' && (n(campagneOrRaw.stock_initial_quantite) > 0 || n(campagneOrRaw.stock_initial_valeur) > 0)) {
    const rawSecteur = (campagneOrRaw as any).stock_initial_secteur
    return {
      quantite: n(campagneOrRaw.stock_initial_quantite),
      unite: 'sacs',
      valeur: n(campagneOrRaw.stock_initial_valeur),
      date: null,
      secteur: rawSecteur === 'materiel' ? 'materiel' : 'exploitation',
    }
  }
  const raw = typeof campagneOrRaw === 'string' ? campagneOrRaw : (campagneOrRaw.produit_collecte || '')
  const match = raw.match(/\[SI:(.*?)\]/)
  if (!match) return null
  const content = match[1].trim()
  if (content.includes('=')) {
    const parts = content.split('|')
    for (const part of parts) {
      const [, data] = part.split('=')
      if (data) {
        const [q, u, v, d, s] = data.split(':')
        return {
          quantite: Number(q) || 0,
          unite: u || 'kg',
          valeur: Number(v) || 0,
          date: d || null,
          secteur: s === 'materiel' ? 'materiel' : 'exploitation',
        }
      }
    }
  } else if (content) {
    const [q, u, v, d, s] = content.split(':')
    return {
      quantite: Number(q) || 0,
      unite: u || 'kg',
      valeur: Number(v) || 0,
      date: d || null,
      secteur: s === 'materiel' ? 'materiel' : 'exploitation',
    }
  }
  return null
}

function amortissement(m: BilanRaw['materiels'][number], limite: number): number {
  const valeur = n(m.valeur_acquisition)
  const duree = n(m.duree_vie_economique)
  if (!valeur || !duree || !m.date_acquisition) return 0
  const annees = (limite - ts(m.date_acquisition)) / (1000 * 60 * 60 * 24 * 365.25)
  if (annees <= 0) return 0
  return Math.min((valeur / duree) * annees, valeur)
}

function prixCollecteParCampagne(raw: BilanRaw): Map<string, number> {
  const campagneDeFacture = new Map(raw.factures.map((f) => [f.id, f.campagne_id]))
  const fcfa = new Map<string, number>()
  const qte = new Map<string, number>()
  for (const r of raw.remboursements) {
    if (r.type_remboursement !== 'nature' || n(r.quantite_nature) <= 0) continue
    let c = r.facture_id ? campagneDeFacture.get(r.facture_id) : undefined
    if (!c && r.produit_nature) {
      const match = r.produit_nature.match(/\[CAMPAGNE:([^\]]+)\]/)
      if (match) c = match[1]
    }
    if (!c) continue
    fcfa.set(c, (fcfa.get(c) || 0) + n(r.montant_fcfa))
    qte.set(c, (qte.get(c) || 0) + n(r.quantite_nature))
  }
  const prix = new Map<string, number>()
  for (const c of raw.campagnes) {
    const moyen = (qte.get(c.id) || 0) > 0 ? (fcfa.get(c.id) || 0) / (qte.get(c.id) || 1) : 0
    prix.set(c.id, n(c.prix_collecte) > 0 ? n(c.prix_collecte) : moyen)
  }
  return prix
}

export function calculerSMT(raw: BilanRaw, annee: number, saisies: Saisies = {}): SMTData {
  const finN = finAnnee(annee)
  const debutN = debutAnnee(annee)
  const finN1 = finAnnee(annee - 1)
  const prixCollecte = prixCollecteParCampagne(raw)

  // --------------------------------------------------------------------------
  // 1. TABLEAU DES FLUX ET LIVRE DE TRÉSORERIE SMT
  // --------------------------------------------------------------------------
  const tresoAvantFinN = raw.transactions.filter((t) => avant(t.date_transaction, finN))
  const tresoAvantDebutN = raw.transactions.filter((t) => avant(t.date_transaction, debutN - 1))
  const tresoDansN = raw.transactions.filter((t) => dansAnnee(t.date_transaction, annee))

  // Soldes des comptes
  const comptesMap = new Map<string, SMTFluxCompte>()
  for (const c of raw.comptes || []) {
    if (!c.id) continue
    const txAvant = tresoAvantDebutN.filter((t) => t.compte_id === c.id)
    const txAnnee = tresoDansN.filter((t) => t.compte_id === c.id)

    const initial =
      n(c.solde_initial) +
      somme(txAvant.filter((t) => t.type_transaction === 'entree'), (t) => n(t.montant)) -
      somme(txAvant.filter((t) => t.type_transaction === 'sortie'), (t) => n(t.montant))

    const entrees = somme(txAnnee.filter((t) => t.type_transaction === 'entree'), (t) => n(t.montant))
    const sorties = somme(txAnnee.filter((t) => t.type_transaction === 'sortie'), (t) => n(t.montant))

    comptesMap.set(c.id, {
      id: c.id,
      nom: (c as any).nom || `Compte ${c.id.slice(0, 6)}`,
      soldeInitial: initial,
      entrees,
      sorties,
      soldeFinal: initial + entrees - sorties,
    })
  }

  const comptesList = Array.from(comptesMap.values())
  const soldeOuvertureTreso = somme(comptesList, (c) => c.soldeInitial)
  const totalEntreesTreso = somme(comptesList, (c) => c.entrees)
  const totalSortiesTreso = somme(comptesList, (c) => c.sorties)
  const soldeClotureTreso = somme(comptesList, (c) => c.soldeFinal)

  // Classification des flux par poste SMT
  const recettesParPoste: SMTLignePoste[] = []
  const depensesParPoste: SMTLignePoste[] = []

  let recVentes = 0
  let recPrestations = 0
  let recRemboursements = 0
  let recDeblocageCredits = 0
  let recAutres = 0

  let depIntrants = 0
  let depCarburant = 0
  let depElectricite = 0
  let depHydraulique = 0
  let depEntretienMateriel = 0
  let depFraisGestion = 0
  let depRemboursementCredits = 0
  let depAutres = 0

  for (const t of tresoDansN) {
    const montant = n(t.montant)
    const motif = String(t.motif || '').toLowerCase()
    const piece = String(t.type_piece || '').toLowerCase()

    if (t.type_transaction === 'entree') {
      if (motif.includes('vente') || motif.includes('paddy') || motif.includes('oignon')) {
        recVentes += montant
      } else if (motif.includes('prestation') || motif.includes('labour') || motif.includes('battage')) {
        recPrestations += montant
      } else if (piece.includes('remboursement') || motif.includes('remboursement')) {
        recRemboursements += montant
      } else if (piece.includes('versement') || motif.includes('déblocage') || motif.includes('emprunt')) {
        recDeblocageCredits += montant
      } else {
        recAutres += montant
      }
    } else if (t.type_transaction === 'sortie') {
      if (piece === 'facture_fournisseur' || motif.includes('intrant') || motif.includes('urée') || motif.includes('engrais') || motif.includes('semence')) {
        depIntrants += montant
      } else if (motif.includes('gasoil') || motif.includes('carburant') || motif.includes('essence')) {
        depCarburant += montant
      } else if (motif.includes('senelec') || motif.includes('electricité') || motif.includes('électricité') || motif.includes('pompage')) {
        depElectricite += montant
      } else if (motif.includes('faucardage') || motif.includes('drain') || motif.includes('canal') || motif.includes('curage')) {
        depHydraulique += montant
      } else if (motif.includes('entretien') || motif.includes('réparation') || motif.includes('reparation') || motif.includes('pièce') || motif.includes('piece')) {
        depEntretienMateriel += montant
      } else if (motif.includes('transport') || motif.includes('indemnité') || motif.includes('bureau') || motif.includes('réunion') || motif.includes('frais')) {
        depFraisGestion += montant
      } else if (piece === 'remboursement_credit' || motif.includes('remboursement crédit')) {
        depRemboursementCredits += montant
      } else {
        depAutres += montant
      }
    }
  }

  if (recVentes > 0) recettesParPoste.push({ libelle: 'Ventes de récoltes & produits', montant: recVentes })
  if (recPrestations > 0) recettesParPoste.push({ libelle: 'Prestations de services / travaux matériel', montant: recPrestations })
  if (recRemboursements > 0) recettesParPoste.push({ libelle: 'Remboursements de dettes membres/clients', montant: recRemboursements })
  if (recDeblocageCredits > 0) recettesParPoste.push({ libelle: 'Déblocage de crédits & emprunts bancaires', montant: recDeblocageCredits })
  if (recAutres > 0) recettesParPoste.push({ libelle: 'Autres encaissements de trésorerie', montant: recAutres })

  if (depIntrants > 0) depensesParPoste.push({ libelle: 'Achats & règlements intrants (engrais, semences)', montant: depIntrants })
  if (depCarburant > 0) depensesParPoste.push({ libelle: 'Carburant et lubrifiants matériel', montant: depCarburant })
  if (depElectricite > 0) depensesParPoste.push({ libelle: 'Électricité station de pompage & eau', montant: depElectricite })
  if (depHydraulique > 0) depensesParPoste.push({ libelle: "Entretien réseau d'irrigation & faucardage", montant: depHydraulique })
  if (depEntretienMateriel > 0) depensesParPoste.push({ libelle: 'Entretien & réparations matériel', montant: depEntretienMateriel })
  if (depFraisGestion > 0) depensesParPoste.push({ libelle: 'Charges de fonctionnement & indemnités bureau', montant: depFraisGestion })
  if (depRemboursementCredits > 0) depensesParPoste.push({ libelle: 'Remboursements d\'échéances crédits bancaires', montant: depRemboursementCredits })
  if (depAutres > 0) depensesParPoste.push({ libelle: 'Autres décaissements d\'exploitation', montant: depAutres })

  // --------------------------------------------------------------------------
  // 2. STOCKS, CRÉANCES ET DETTES (Pour ajustements SMT et Bilan)
  // --------------------------------------------------------------------------
  // Les services (façon culturale, service hydraulique, refacturation...) n'étant pas stockés,
  // ils sont formellement exclus du calcul des stocks physiques et de la variation de stock.
  const calcStockIntrants = (limite: number) =>
    somme(raw.intrants.filter((i) => isStockableIntrant(i)), (i) => {
      const distribuesApres = somme(raw.distributions.filter((d) => d.intrant_id === i.id && !avant(d.date_distribution, limite)), (d) => n(d.quantite))
      const achetesApres = somme(raw.achats.filter((a) => a.intrant_id === i.id && !avant(a.date_achat, limite)), (a) => n(a.quantite))
      return Math.max(0, n(i.quantite_stock) + distribuesApres - achetesApres) * n(i.prix_unitaire)
    })

  // Stock en nature issu de l'exploitation agricole (Stock initial + remboursements - sorties)
  const calcStockNatureAgricole = (limite: number) => {
    let totalNature = 0
    for (const c of raw.campagnes) {
      const siTag = parseStockInitialCampagne(c)
      const isExploitation = !siTag || siTag.secteur !== 'materiel'
      const qteInitiale = (siTag && isExploitation) ? siTag.quantite : 0
      const puInitial = siTag && siTag.valeur > 0 ? siTag.valeur : (prixCollecte.get(c.id) || 160)

      // Si limite est N-1 (ouverture de l'année N), on prend le stock initial (report)
      if (limite <= finN1) {
        totalNature += qteInitiale * puInitial
        continue
      }

      let qteEntrees = 0
      for (const r of raw.remboursements) {
        if (r.type_remboursement === 'nature' && avant(r.date_paiement, limite)) {
          let cid = r.facture_id ? raw.factures.find(f => f.id === r.facture_id)?.campagne_id : undefined
          if (!cid && r.produit_nature) {
            const m = r.produit_nature.match(/\[CAMPAGNE:([^\]]+)\]/)
            if (m) cid = m[1]
          }
          if (cid === c.id) qteEntrees += n(r.quantite_nature)
        }
      }
      let qteSorties = 0
      for (const s of raw.sorties) {
        if (s.campagne_id === c.id && !isSortieMateriel(s) && avant(s.date_sortie, limite)) {
          qteSorties += n(s.quantite)
        }
      }
      const qteRestante = Math.max(0, qteInitiale + qteEntrees - qteSorties)
      totalNature += qteRestante * puInitial
    }
    return totalNature
  }

  // Stock en nature issu des prestations du matériel (remboursements en nature des prestations)
  const calcStockNatureMateriel = (limite: number) => {
    let totalNature = 0
    for (const c of raw.campagnes) {
      const siTag = parseStockInitialCampagne(c)
      const isMateriel = siTag && siTag.secteur === 'materiel'
      const qteInitiale = isMateriel ? siTag.quantite : 0
      const puInitial = siTag && siTag.valeur > 0 ? siTag.valeur : (prixCollecte.get(c.id) ? (prixCollecte.get(c.id)! * 80) : 10000)

      if (limite <= finN1) {
        totalNature += qteInitiale * puInitial
        continue
      }

      let qteEntreesSacs = 0
      for (const p of raw.paiementsClients) {
        if (isPaiementMateriel(p) && avant(p.date_paiement, limite)) {
          const m = String(p.motif || '')
          if (m.includes('[MODE:nature]')) {
            const cMatch = m.match(/\[CAMPAGNE:([^\]]+)\]/i)
            if (cMatch) {
              if (cMatch[1] === c.id) {
                const q = m.match(/\[QTE:([^\]]+)\]/i)
                if (q) qteEntreesSacs += n(q[1])
              }
            } else if (raw.campagnes.length === 1 || c.id === raw.campagnes[0]?.id) {
              const q = m.match(/\[QTE:([^\]]+)\]/i)
              if (q) qteEntreesSacs += n(q[1])
            }
          }
        }
      }
      let qteSortiesSacs = 0
      for (const s of raw.sorties) {
        if (s.campagne_id === c.id && isSortieMateriel(s) && avant(s.date_sortie, limite)) {
          qteSortiesSacs += n(s.quantite)
        }
      }
      const qteRestante = Math.max(0, qteInitiale + qteEntreesSacs - qteSortiesSacs)
      totalNature += qteRestante * puInitial
    }
    return totalNature
  }

  const calcStockNature = (limite: number) => calcStockNatureAgricole(limite) + calcStockNatureMateriel(limite)

  const stockIntrantsN = calcStockIntrants(finN)
  const stockIntrantsN1 = calcStockIntrants(finN1)
  const stockNatureAgriN = calcStockNatureAgricole(finN)
  const stockNatureAgriN1 = calcStockNatureAgricole(finN1)
  const stockNatureMatN = calcStockNatureMateriel(finN)
  const stockNatureMatN1 = calcStockNatureMateriel(finN1)
  const stockNatureN = stockNatureAgriN + stockNatureMatN
  const stockNatureN1 = stockNatureAgriN1 + stockNatureMatN1

  const stockTotalN = stockIntrantsN + stockNatureN
  const stockTotalN1 = stockIntrantsN1 + stockNatureN1
  const varStockTotal = stockTotalN - stockTotalN1
  const varStockIntrants = stockIntrantsN - stockIntrantsN1
  const varStockNatureAgri = stockNatureAgriN - stockNatureAgriN1
  const varStockNatureMat = stockNatureMatN - stockNatureMatN1
  const varStockNature = stockNatureN - stockNatureN1

  // --------------------------------------------------------------------------
  // CRÉANCES ET DETTES DIFFÉRENCIÉES (NON-COMPENSATION SYSCOHADA)
  // --------------------------------------------------------------------------
  // En comptabilité SYSCOHADA, les créances et les dettes ne se compensent pas :
  // - Membre avec facturé > remboursé => Créance membre (Actif)
  // - Membre avec remboursé > facturé => Dette membre / Surplus de remboursement (Passif)
  // - Prêts/emprunts d'un tiers, client ou fournisseur à la caisse => Dettes financières à CT (Passif)
  const membresMap = new Map((raw.membres || []).map((m) => [m.id, m]))
  const facturesMap = new Map(raw.factures.map((f) => [f.id, f]))

  // Soldes initiaux des tiers / clients externes (extraction [SOLDE_INIT:...] ou champ solde_initial)
  let creancesClientsInit = 0
  let creancesMaterielInit = 0
  let dettesFournisseursInit = 0

  for (const cl of (raw.clients || [])) {
    const si = extractClientSoldeInitial(cl.nom) || n(cl.solde_initial)
    if (cl.nom && cl.nom.includes('[FOURNISSEUR]')) {
      dettesFournisseursInit += si
    } else if (
      cl.nom &&
      (cl.nom.toLowerCase().includes('mamadou diop') ||
        cl.nom.toLowerCase().includes('materiel') ||
        cl.nom.toLowerCase().includes('matériel'))
    ) {
      creancesMaterielInit += si
    } else {
      creancesClientsInit += si
    }
  }

  const calcCreancesEtDettes = (limite: number) => {
    // 1. Membres : calcul individuel sans compensation avec solde initial
    const facturesAgri = raw.factures.filter((f) => avant(f.date_emission, limite))
    const rembAgri = raw.remboursements.filter((r) => avant(r.date_paiement, limite))
    const ristournesAgri = (raw.ristournes || []).filter((r) => avant(r.date_ristourne, limite))

    const membresSet = new Set<string>()
    for (const m of raw.membres || []) membresSet.add(m.id)
    for (const f of facturesAgri) if (f.membre_id) membresSet.add(f.membre_id)
    for (const r of rembAgri) {
      if (r.membre_id) membresSet.add(r.membre_id)
      else if (r.facture_id && facturesMap.get(r.facture_id)?.membre_id) {
        membresSet.add(facturesMap.get(r.facture_id)!.membre_id!)
      }
    }

    let creancesMembres = 0
    let dettesMembresSurplus = 0

    for (const mId of membresSet) {
      const mObj = membresMap.get(mId)
      // Solde initial au report d'ouverture (au 1er janvier de l'exercice N ou N-1)
      const soldeInit = n(mObj?.solde_initial)
      const fM = facturesAgri.filter((f) => f.membre_id === mId)
      const totFact = somme(fM, (f) => n(f.montant_total) + n(f.montant_interet))
      const rM = rembAgri.filter((r) => r.membre_id === mId || (r.facture_id && facturesMap.get(r.facture_id)?.membre_id === mId))
      const totRemb = somme(rM, (r) => n(r.montant_fcfa))
      const risM = ristournesAgri.filter((r) => r.membre_id === mId)
      const totRis = somme(risM, (r) => n(r.montant))

      // Roll-forward : Solde Final = Solde Initial + Facturations - Règlements + Ristournes
      const solde = soldeInit + totFact - totRemb + totRis
      if (solde > 0) {
        creancesMembres += solde
      } else if (solde < 0) {
        dettesMembresSurplus += Math.abs(solde)
      }
    }

    // 2. Créances exploitation sur clients acheteurs de récoltes agricoles
    const ventesClientsAgri = somme(
      raw.sorties.filter((s) => s.type_sortie === 'vente' && s.tiers_type === 'client' && !isSortieMateriel(s) && avant(s.date_sortie, limite)),
      calcMontantSortie
    )
    const paiementsClientsAgri = somme(
      raw.paiementsClients.filter((p) => !isPaiementMateriel(p) && avant(p.date_paiement, limite)),
      (p) => n(p.montant)
    )
    // Roll-forward clients récoltes : Solde Final = Solde Initial + Ventes - Encaissements
    const creancesClientsAgri = Math.max(0, creancesClientsInit + ventesClientsAgri - paiementsClientsAgri)
    const creancesExploitation = creancesMembres + creancesClientsAgri

    // 3. Créances matériel sur prestations facturées & ventes stock matériel
    const prestationsFacturees = somme(
      raw.prestations.filter((p) => avant(p.date_prestation, limite)),
      (p) => n(p.montant_facture)
    )
    const ventesClientsMat = somme(
      raw.sorties.filter((s) => s.type_sortie === 'vente' && s.tiers_type === 'client' && isSortieMateriel(s) && avant(s.date_sortie, limite)),
      calcMontantSortie
    )
    const paiementsClientsMat = somme(
      raw.paiementsClients.filter((p) => isPaiementMateriel(p) && avant(p.date_paiement, limite)),
      (p) => n(p.montant)
    )
    // Roll-forward clients matériel : Solde Final = Solde Initial + Prestations + Ventes paddy matériel - Règlements
    const creancesMateriel = Math.max(0, creancesMaterielInit + prestationsFacturees + ventesClientsMat - paiementsClientsMat)

    const creancesTotal = creancesExploitation + creancesMateriel

    return {
      creancesMembres,
      dettesMembresSurplus,
      creancesClientsAgri,
      creancesExploitation,
      creancesMateriel,
      creancesTotal,
    }
  }

  // Prêts et emprunts de tiers (membres, clients, fournisseurs) accordés à la caisse
  const calcDettesTiersEmprunts = (limite: number) => {
    let totalDettes = 0
    for (const t of raw.transactions) {
      if (!avant(t.date_transaction, limite)) continue
      if (t.credit_id) continue // Exclure les crédits bancaires officiels
      const m = String(t.motif || '').toLowerCase()
      if (m.includes('déblocage') || m.includes('deblocage')) continue

      const isEmpruntTiers =
        m.includes('emprunt') ||
        m.includes('prêt') ||
        m.includes('pret') ||
        m.includes('credit_membre') ||
        m.includes('crédit_membre') ||
        m.includes('pret_tiers') ||
        m.includes('prêt client') ||
        m.includes('pret client') ||
        m.includes('prêt fournisseur') ||
        m.includes('pret fournisseur')

      if (t.type_transaction === 'entree' && isEmpruntTiers) {
        totalDettes += n(t.montant)
      } else if (
        t.type_transaction === 'sortie' &&
        (m.includes('remboursement') || m.includes('restitution')) &&
        (m.includes('emprunt') || m.includes('prêt') || m.includes('pret') || m.includes('credit_membre'))
      ) {
        totalDettes -= n(t.montant)
      }
    }
    return Math.max(0, totalDettes)
  }

  const crN = calcCreancesEtDettes(finN)
  const crN1 = calcCreancesEtDettes(finN1)

  const creancesMembresN = crN.creancesMembres
  const creancesMembresN1 = crN1.creancesMembres
  const dettesMembresSurplusN = crN.dettesMembresSurplus
  const dettesMembresSurplusN1 = crN1.dettesMembresSurplus
  const dettesTiersEmpruntsN = calcDettesTiersEmprunts(finN)
  const dettesTiersEmpruntsN1 = calcDettesTiersEmprunts(finN1)

  const creancesClientsN = crN.creancesClientsAgri
  const creancesClientsN1 = crN1.creancesClientsAgri
  const creancesExploitationN = crN.creancesExploitation
  const creancesExploitationN1 = crN1.creancesExploitation
  const creancesMaterielN = crN.creancesMateriel
  const creancesMaterielN1 = crN1.creancesMateriel
  const creancesTotalN = crN.creancesTotal
  const creancesTotalN1 = crN1.creancesTotal

  const varCreancesAgricoles = creancesExploitationN - creancesExploitationN1
  const varDettesMembresSurplus = dettesMembresSurplusN - dettesMembresSurplusN1
  const varCreancesMateriel = creancesMaterielN - creancesMaterielN1
  const varCreancesTotal = creancesTotalN - creancesTotalN1

  // Dettes fournisseurs (intrants et tiers) : Solde Initial + Achats - Décaissements
  const calcDettesFournisseurs = (limite: number) => {
    const achatsIntrants = somme(raw.achats.filter((a) => avant(a.date_achat, limite)), (a) => n(a.quantite) * n(a.prix_unitaire))
    const payeFournisseursIntrants = somme(
      raw.transactions.filter((t) =>
        avant(t.date_transaction, limite) &&
        t.type_transaction === 'sortie' &&
        t.type_piece === 'facture_fournisseur' &&
        !String(t.motif || '').toLowerCase().includes('moissonneuse') &&
        !String(t.motif || '').toLowerCase().includes('materiel') &&
        !String(t.motif || '').toLowerCase().includes('matériel')
      ),
      (t) => n(t.montant)
    )
    return Math.max(0, dettesFournisseursInit + achatsIntrants - payeFournisseursIntrants)
  }

  const dettesFournisseursN = calcDettesFournisseurs(finN)
  const dettesFournisseursN1 = calcDettesFournisseurs(finN1)
  const varDettesFournisseurs = dettesFournisseursN - dettesFournisseursN1

  // Amortissement matériel
  const immoBrutN = somme(raw.materiels.filter((m) => !m.date_acquisition || avant(m.date_acquisition, finN)), (m) => n(m.valeur_acquisition))
  const immoAmoN = somme(raw.materiels, (m) => amortissement(m, finN))
  const immoNetN = immoBrutN - immoAmoN

  const immoBrutN1 = somme(raw.materiels.filter((m) => !m.date_acquisition || avant(m.date_acquisition, finN1)), (m) => n(m.valeur_acquisition))
  const immoAmoN1 = somme(raw.materiels, (m) => amortissement(m, finN1))
  const immoNetN1 = immoBrutN1 - immoAmoN1

  const dotationAmoN = Math.max(0, immoAmoN - immoAmoN1)

  // --------------------------------------------------------------------------
  // 3. COMPTE D'EXPLOITATION SMT DÉCLINÉ (Agricole, Matériel & Global)
  // --------------------------------------------------------------------------

  // --- Volet Matériel ---
  const prestationsMaterielN = somme(
    raw.prestations.filter((p) => dansAnnee(p.date_prestation, annee)),
    (p) => n(p.montant_facture)
  )

  // Vente de paddy issu du remboursement en nature des prestations matériel :
  // Seul le prix différentiel (valeur vente - valeur collecte) est pris en compte dans le chiffre d'affaires,
  // car la valeur de collecte est déjà intégrée dans les prestations facturées.
  const sortiesVentesMatN = raw.sorties.filter(
    (s) => s.type_sortie === 'vente' && dansAnnee(s.date_sortie, annee) && isSortieMateriel(s)
  )

  let gainDiffMateriel = 0
  let perteDiffMateriel = 0
  const detailsGainDiffMat: SMTDetailItem[] = []
  const detailsPerteDiffMat: SMTDetailItem[] = []

  for (const s of sortiesVentesMatN) {
    const { valeurVente, valeurCollecte, differentiel, qteStock, puVente, puCollecte } = calcDifferentialSortie(
      s,
      prixCollecte,
      raw.campagnes
    )
    const tiersTxt = s.tiers_nom || 'Client externe'
    const uniteTxt = s.motif?.toLowerCase().includes('sac') ? 'sac(s)' : 'kg'
    const cInfo = `Quantité : ${qteStock} ${uniteTxt} | Vente : ${puVente.toLocaleString('fr-FR')} FCFA/u (${valeurVente.toLocaleString('fr-FR')} FCFA) | Collecte : ${puCollecte.toLocaleString('fr-FR')} FCFA/u (${valeurCollecte.toLocaleString('fr-FR')} FCFA)`

    if (differentiel >= 0) {
      gainDiffMateriel += differentiel
      detailsGainDiffMat.push({
        libelle: `${tiersTxt} (${s.date_sortie}) - Gain vente stock matériel`,
        valeur: differentiel,
        commentaire: cInfo,
      })
    } else {
      const perte = Math.abs(differentiel)
      perteDiffMateriel += perte
      detailsPerteDiffMat.push({
        libelle: `${tiersTxt} (${s.date_sortie}) - Perte vente stock matériel`,
        valeur: perte,
        commentaire: cInfo,
      })
    }
  }

  const totalRecettesMateriel = prestationsMaterielN + gainDiffMateriel

  // Répartition des charges pour le matériel (consommations directes par catégorie)
  const consommationsMaterielAnnee = raw.consommations.filter((c) => dansAnnee(c.date_consommation, annee))
  let carbMateriel = 0
  let repMateriel = 0
  let moMateriel = 0
  let logMateriel = 0

  for (const c of consommationsMaterielAnnee) {
    const t = String(c.type_consommation || '').toLowerCase()
    const mt = n(c.montant_total)
    if (/carburant|gasoil|essence|huile|lubrifiant/.test(t)) {
      carbMateriel += mt
    } else if (/piece|pièce|repar|répar|entretien|maintenance/.test(t)) {
      repMateriel += mt
    } else if (/conducteur|superviseur|gardien|restauration|personnel|main d'oeuvre|mo/.test(t)) {
      moMateriel += mt
    } else {
      logMateriel += mt
    }
  }

  // Si pas de consommations détaillées, repli sur trésorerie
  if (consommationsMaterielAnnee.length === 0) {
    carbMateriel = depCarburant
    repMateriel = depEntretienMateriel
  }

  const depensesMaterielList: SMTLignePoste[] = [
    { libelle: 'Consommations carburant & lubrifiants', montant: carbMateriel },
    { libelle: 'Entretien courant, pièces de rechange & réparations matériel', montant: repMateriel },
    ...(moMateriel > 0 ? [{ libelle: 'Main d\'œuvre opérationnelle matériel (conducteurs, superviseurs)', montant: moMateriel }] : []),
    ...(logMateriel > 0 ? [{ libelle: 'Frais de suivi, transport & logistique matériel', montant: logMateriel }] : []),
    ...(perteDiffMateriel > 0 ? [{
      libelle: 'Perte différentielle sur ventes de paddy matériel (valeur vente < valeur collecte)',
      montant: perteDiffMateriel,
      details: detailsPerteDiffMat,
    }] : []),
  ]
  const totalDepensesMateriel = carbMateriel + repMateriel + moMateriel + logMateriel + perteDiffMateriel
  const soldeTresoMateriel = totalRecettesMateriel - totalDepensesMateriel

  const ajustementsMateriel: SMTLignePoste[] = [
    { libelle: 'Dotation aux amortissements du matériel de l\'exercice (-)', montant: -dotationAmoN },
  ]
  const totalAjustementsMateriel = -dotationAmoN
  const resultatNetMateriel = soldeTresoMateriel + totalAjustementsMateriel

  const voletMateriel: SMTVolet = {
    titre: 'Activité Matériel & Équipements',
    recettes: [
      {
        libelle: 'Prestations de services agricoles (labour, moisson, battage)',
        montant: prestationsMaterielN,
        details: raw.prestations.filter((p) => dansAnnee(p.date_prestation, annee)).map((p) => ({
          libelle: `${p.client_nom || 'Client'} (${p.date_prestation})`,
          valeur: n(p.montant_facture),
        })),
      },
      ...(gainDiffMateriel > 0 ? [{
        libelle: 'Gain différentiel sur ventes de paddy matériel (valeur vente - valeur collecte)',
        montant: gainDiffMateriel,
        details: detailsGainDiffMat,
      }] : []),
    ],
    totalRecettes: totalRecettesMateriel,
    depenses: depensesMaterielList,
    totalDepenses: totalDepensesMateriel,
    soldeTresorerie: soldeTresoMateriel,
    ajustements: ajustementsMateriel,
    totalAjustements: totalAjustementsMateriel,
    resultatNet: resultatNetMateriel,
  }

  // --- Volet Agricole ---
  // Vente de paddy/récoltes issu du remboursement en nature de l'exploitation :
  // Seul le prix différentiel (valeur vente - valeur collecte) est pris en compte dans le chiffre d'affaires,
  // car la valeur de collecte est déjà intégrée dans la facturation de campagne ou le remboursement.
  const sortiesVentesAgriN = raw.sorties.filter(
    (s) => s.type_sortie === 'vente' && dansAnnee(s.date_sortie, annee) && !isSortieMateriel(s)
  )

  let gainDiffAgricole = 0
  let perteDiffAgricole = 0
  const detailsGainDiffAgri: SMTDetailItem[] = []
  const detailsPerteDiffAgri: SMTDetailItem[] = []

  for (const s of sortiesVentesAgriN) {
    const { valeurVente, valeurCollecte, differentiel, qteStock, puVente, puCollecte } = calcDifferentialSortie(
      s,
      prixCollecte,
      raw.campagnes
    )
    const tiersTxt = s.tiers_nom || 'Client / Membre'
    const uniteTxt = s.motif?.toLowerCase().includes('sac') ? 'sac(s)' : 'kg'
    const cInfo = `Quantité : ${qteStock} ${uniteTxt} | Vente : ${puVente.toLocaleString('fr-FR')} FCFA/u (${valeurVente.toLocaleString('fr-FR')} FCFA) | Collecte : ${puCollecte.toLocaleString('fr-FR')} FCFA/u (${valeurCollecte.toLocaleString('fr-FR')} FCFA)`

    if (differentiel >= 0) {
      gainDiffAgricole += differentiel
      detailsGainDiffAgri.push({
        libelle: `${tiersTxt} (${s.date_sortie}) - Gain vente récoltes en nature`,
        valeur: differentiel,
        commentaire: cInfo,
      })
    } else {
      const perte = Math.abs(differentiel)
      perteDiffAgricole += perte
      detailsPerteDiffAgri.push({
        libelle: `${tiersTxt} (${s.date_sortie}) - Perte vente récoltes en nature`,
        valeur: perte,
        commentaire: cInfo,
      })
    }
  }

  const facturationCampagnesN = somme(
    raw.factures.filter((f) => dansAnnee(f.date_emission, annee)),
    (f) => n(f.montant_total) + n(f.montant_interet)
  )
  const subventionsAgricolesN = n(saisies.subventions)
  const totalRecettesAgricoles = facturationCampagnesN + gainDiffAgricole + subventionsAgricolesN

  const achatsIntrantsAnnee = somme(
    raw.achats.filter((a) => dansAnnee(a.date_achat, annee)),
    (a) => n(a.quantite) * n(a.prix_unitaire)
  )
  const electriciteStationN = depElectricite
  const faucardageHydrauliqueN = depHydraulique
  const fraisGestionAgricolesN = depFraisGestion

  const depensesAgricolesList: SMTLignePoste[] = [
    { libelle: 'Achats d\'intrants agricoles (semences, engrais, urée)', montant: achatsIntrantsAnnee },
    { libelle: 'Électricité station de pompage & eau d\'irrigation', montant: electriciteStationN },
    ...(faucardageHydrauliqueN > 0 ? [{ libelle: 'Faucardage, curage des canaux & réseau d\'irrigation', montant: faucardageHydrauliqueN }] : []),
    { libelle: 'Charges de fonctionnement, indemnités & gestion coopérative', montant: fraisGestionAgricolesN },
    ...(perteDiffAgricole > 0 ? [{
      libelle: 'Perte différentielle sur ventes de stock en nature (valeur vente < valeur collecte)',
      montant: perteDiffAgricole,
      details: detailsPerteDiffAgri,
    }] : []),
  ]
  const totalDepensesAgricoles = achatsIntrantsAnnee + electriciteStationN + faucardageHydrauliqueN + fraisGestionAgricolesN + perteDiffAgricole
  const soldeTresoAgricole = totalRecettesAgricoles - totalDepensesAgricoles

  const ajustementsAgricoles: SMTLignePoste[] = [
    ...(varStockIntrants !== 0
      ? [{ libelle: 'Variation des stocks d\'intrants (SF - SI)', montant: varStockIntrants }]
      : []),
  ]
  const totalAjustementsAgricoles = varStockIntrants
  const resultatNetAgricole = soldeTresoAgricole + totalAjustementsAgricoles

  const voletAgricole: SMTVolet = {
    titre: 'Exploitation Agricole',
    recettes: [
      {
        libelle: 'Facturation intrants et services aux membres',
        montant: facturationCampagnesN,
        details: raw.factures.filter((f) => dansAnnee(f.date_emission, annee)).map((f) => ({
          libelle: `Facture (${f.date_emission || '-'})`,
          valeur: n(f.montant_total) + n(f.montant_interet),
        })),
      },
      ...(gainDiffAgricole > 0 ? [{
        libelle: 'Gain différentiel sur ventes de récoltes collectées (valeur vente - valeur collecte)',
        montant: gainDiffAgricole,
        details: detailsGainDiffAgri,
      }] : []),
      ...(subventionsAgricolesN > 0 ? [{ libelle: 'Subventions d\'exploitation', montant: subventionsAgricolesN }] : []),
    ],
    totalRecettes: totalRecettesAgricoles,
    depenses: depensesAgricolesList,
    totalDepenses: totalDepensesAgricoles,
    soldeTresorerie: soldeTresoAgricole,
    ajustements: ajustementsAgricoles,
    totalAjustements: totalAjustementsAgricoles,
    resultatNet: resultatNetAgricole,
  }

  // --- Volet Global ---
  const totalRecettesGlobal = totalRecettesAgricoles + totalRecettesMateriel
  const totalDepensesGlobal = totalDepensesAgricoles + totalDepensesMateriel
  const soldeTresoGlobal = totalRecettesGlobal - totalDepensesGlobal
  const totalAjustementsGlobal = totalAjustementsAgricoles + totalAjustementsMateriel
  const resultatNetGlobal = soldeTresoGlobal + totalAjustementsGlobal

  const voletGlobal: SMTVolet = {
    titre: 'Compte d\'Exploitation Global SMT',
    recettes: [
      ...voletAgricole.recettes,
      ...voletMateriel.recettes,
    ],
    totalRecettes: totalRecettesGlobal,
    depenses: [
      ...voletAgricole.depenses,
      ...voletMateriel.depenses,
    ],
    totalDepenses: totalDepensesGlobal,
    soldeTresorerie: soldeTresoGlobal,
    ajustements: [
      ...ajustementsAgricoles,
      ...ajustementsMateriel,
    ],
    totalAjustements: totalAjustementsGlobal,
    resultatNet: resultatNetGlobal,
  }

  // --------------------------------------------------------------------------
  // 4. BILAN SMT (Situation Patrimoniale Actif & Passif)
  // --------------------------------------------------------------------------
  const disponibilitesN = Math.max(0, soldeClotureTreso)
  const disponibilitesN1 = Math.max(0, soldeOuvertureTreso)

  const totalActifNetN = immoNetN + stockTotalN + creancesTotalN + disponibilitesN
  const totalActifNetN1 = immoNetN1 + stockTotalN1 + creancesTotalN1 + disponibilitesN1

  // Crédits bancaires en cours au passif :
  // Emprunts et dettes financières (> 12 mois) vs Crédits de trésorerie (≤ 12 mois)
  const creditsValidesN = raw.credits.filter((c) => c.statut === 'valide' && avant(c.date_demande, finN))
  const creditsEmpruntsN = creditsValidesN.filter((c) => isCreditLongTerme(c))
  const creditsTresorerieN = creditsValidesN.filter((c) => !isCreditLongTerme(c))

  const idsEmpruntsN = new Set(creditsEmpruntsN.map((c) => c.id))
  const idsTresorerieN = new Set(creditsTresorerieN.map((c) => c.id))

  const rembEmpruntsN = somme(
    tresoAvantFinN.filter((t) => t.type_piece === 'remboursement_credit' && t.credit_id && idsEmpruntsN.has(t.credit_id)),
    (t) => n(t.montant)
  )
  const encoursEmpruntsN = Math.max(0, somme(creditsEmpruntsN, (c) => n(c.montant_accorde)) - rembEmpruntsN)

  const rembTresorerieN = somme(
    tresoAvantFinN.filter((t) => t.type_piece === 'remboursement_credit' && t.credit_id && idsTresorerieN.has(t.credit_id)),
    (t) => n(t.montant)
  )
  const encoursTresorerieN = Math.max(0, somme(creditsTresorerieN, (c) => n(c.montant_accorde)) - rembTresorerieN)

  // Année N-1 pour le passif
  const tresoAvantFinN1 = tresoAvantDebutN
  const creditsValidesN1 = raw.credits.filter((c) => c.statut === 'valide' && avant(c.date_demande, finN1))
  const creditsEmpruntsN1 = creditsValidesN1.filter((c) => isCreditLongTerme(c))
  const creditsTresorerieN1 = creditsValidesN1.filter((c) => !isCreditLongTerme(c))

  const idsEmpruntsN1 = new Set(creditsEmpruntsN1.map((c) => c.id))
  const idsTresorerieN1 = new Set(creditsTresorerieN1.map((c) => c.id))

  const rembEmpruntsN1 = somme(
    tresoAvantFinN1.filter((t) => t.type_piece === 'remboursement_credit' && t.credit_id && idsEmpruntsN1.has(t.credit_id)),
    (t) => n(t.montant)
  )
  const encoursEmpruntsN1 = Math.max(0, somme(creditsEmpruntsN1, (c) => n(c.montant_accorde)) - rembEmpruntsN1)

  const rembTresorerieN1 = somme(
    tresoAvantFinN1.filter((t) => t.type_piece === 'remboursement_credit' && t.credit_id && idsTresorerieN1.has(t.credit_id)),
    (t) => n(t.montant)
  )
  const encoursTresorerieN1 = Math.max(0, somme(creditsTresorerieN1, (c) => n(c.montant_accorde)) - rembTresorerieN1)

  const empruntsPassifN = saisies.emprunts !== undefined ? n(saisies.emprunts) : encoursEmpruntsN
  const creditsCampagnePassifN = encoursTresorerieN

  // Détails des emprunts > 12 mois
  const detailsEmprunts: SMTDetailItem[] = creditsEmpruntsN.map((c) => {
    const rembCredit = somme(
      tresoAvantFinN.filter((t) => t.type_piece === 'remboursement_credit' && t.credit_id === c.id),
      (t) => n(t.montant)
    )
    const soldeCredit = Math.max(0, n(c.montant_accorde) - rembCredit)
    const nomCredit = c.equipement_nom || c.but_credit?.replace(/\[[^\]]*\]/g, '').trim() || 'Emprunt financier'
    const dureeTxt = c.duree_credit ? ` (${c.duree_credit} mois)` : ' (> 12 mois)'
    return {
      libelle: `${nomCredit}${dureeTxt}`,
      valeur: soldeCredit,
      commentaire: `Accordé : ${n(c.montant_accorde).toLocaleString('fr-FR')} FCFA | Remboursé : ${rembCredit.toLocaleString('fr-FR')} FCFA`,
    }
  })

  // Détails des crédits de trésorerie ≤ 12 mois
  const detailsTresorerieCredits: SMTDetailItem[] = creditsTresorerieN.map((c) => {
    const rembCredit = somme(
      tresoAvantFinN.filter((t) => t.type_piece === 'remboursement_credit' && t.credit_id === c.id),
      (t) => n(t.montant)
    )
    const soldeCredit = Math.max(0, n(c.montant_accorde) - rembCredit)
    const nomCredit = c.but_credit?.replace(/\[[^\]]*\]/g, '').trim() || 'Crédit de campagne / trésorerie'
    const dureeTxt = c.duree_credit ? ` (${c.duree_credit} mois)` : ' (≤ 12 mois)'
    return {
      libelle: `${nomCredit}${dureeTxt}`,
      valeur: soldeCredit,
      commentaire: `Accordé : ${n(c.montant_accorde).toLocaleString('fr-FR')} FCFA | Remboursé : ${rembCredit.toLocaleString('fr-FR')} FCFA`,
    }
  })

  // Capital et fonds propres du GIE (équilibre strict du bilan SMT)
  const capitalN =
    totalActifNetN -
    (resultatNetGlobal +
      subventionsAgricolesN +
      empruntsPassifN +
      creditsCampagnePassifN +
      dettesFournisseursN +
      dettesMembresSurplusN +
      dettesTiersEmpruntsN)

  const capitalN1 =
    totalActifNetN1 -
    (encoursEmpruntsN1 +
      encoursTresorerieN1 +
      dettesFournisseursN1 +
      dettesMembresSurplusN1 +
      dettesTiersEmpruntsN1)

  const bilan: SMTBilan = {
    actif: {
      immobilisations: {
        libelle: 'Immobilisations (Matériel & Équipements agricoles)',
        brut: immoBrutN,
        amortissement: immoAmoN,
        net: immoNetN,
        netN1: immoNetN1,
        note: 'Tracteurs, moissonneuses, motopompes et équipements valorisés au coût d\'acquisition net d\'amortissements',
        details: [
          { libelle: 'Valeur brute d\'acquisition du matériel', valeur: immoBrutN, commentaire: `${raw.materiels.length} équipement(s) inscrit(s) à l'actif` },
          { libelle: 'Amortissements cumulés pratiqués', valeur: -immoAmoN, commentaire: 'Dépréciation économique linéaire sur la durée de vie' },
        ],
      },
      stocksIntrants: {
        libelle: 'Stocks d\'intrants (engrais, urée, semences)',
        brut: stockIntrantsN,
        amortissement: 0,
        net: stockIntrantsN,
        netN1: stockIntrantsN1,
        note: 'Stocks physiques en magasin valorisés au dernier prix d\'achat',
        details: raw.intrants.filter(i => isStockableIntrant(i) && n(i.quantite_stock) > 0).map(i => ({
          libelle: i.nom || 'Intrant',
          valeur: n(i.quantite_stock) * n(i.prix_unitaire),
          commentaire: `${n(i.quantite_stock)} en stock à ${n(i.prix_unitaire)} FCFA/unité`,
        })),
      },
      stocksNature: {
        libelle: 'Stocks de produits agricoles en nature (paddy, récoltes)',
        brut: stockNatureN,
        amortissement: 0,
        net: stockNatureN,
        netN1: stockNatureN1,
        note: 'Sacs de paddy et récoltes collectés en attente de vente ou redistribution',
        details: [
          { libelle: 'Stock récoltes exploitation (campagne)', valeur: stockNatureAgriN, commentaire: 'Remboursements en nature membres' },
          ...(stockNatureMatN > 0 ? [{ libelle: 'Stock récoltes matériel (prestations)', valeur: stockNatureMatN, commentaire: 'Règlements en nature de travaux' }] : []),
        ],
      },
      stocksTotal: {
        libelle: 'Total des Stocks',
        brut: stockTotalN,
        amortissement: 0,
        net: stockTotalN,
        netN1: stockTotalN1,
        note: 'Intrants + récoltes en magasin',
        details: [
          { libelle: 'Stock d\'intrants (engrais, semences en magasin)', valeur: stockIntrantsN, commentaire: 'Valorisé au dernier coût d\'achat' },
          { libelle: 'Stock récoltes exploitation agricole', valeur: stockNatureAgriN, commentaire: 'Paddy et récoltes des membres' },
          ...(stockNatureMatN > 0 ? [{ libelle: 'Stock récoltes matériel (prestations)', valeur: stockNatureMatN, commentaire: 'Règlements en nature de travaux' }] : []),
        ],
      },
      creancesMembres: {
        libelle: 'Créances d\'exploitation sur les membres',
        brut: creancesMembresN,
        amortissement: 0,
        net: creancesMembresN,
        netN1: creancesMembresN1,
        note: 'Reliquats facturés sur intrants et charges de campagne des membres',
        details: [
          { libelle: 'Reliquats facturés aux membres', valeur: creancesMembresN, commentaire: 'Campagnes d\'exploitation en cours' },
        ],
      },
      creancesClients: {
        libelle: 'Créances d\'exploitation sur clients acheteurs',
        brut: creancesClientsN,
        amortissement: 0,
        net: creancesClientsN,
        netN1: creancesClientsN1,
        note: 'Factures de vente de récoltes à terme en attente de règlement',
        details: [
          { libelle: 'Factures clients acheteurs de récoltes', valeur: creancesClientsN, commentaire: 'Ventes de paddy et récoltes à terme' },
        ],
      },
      creancesMateriel: {
        libelle: 'Créances d\'activité matériel (prestations & ventes)',
        brut: creancesMaterielN,
        amortissement: 0,
        net: creancesMaterielN,
        netN1: creancesMaterielN1,
        note: 'Prestations et ventes de paddy moissonneuse restant à recouvrer',
        details: [
          { libelle: 'Prestations de travaux restant à recouvrer', valeur: creancesMaterielN, commentaire: 'Factures de labour, battage, moisson' },
        ],
      },
      creancesTotal: {
        libelle: 'Total des Créances d\'Exploitation & Matériel',
        brut: creancesTotalN,
        amortissement: 0,
        net: creancesTotalN,
        netN1: creancesTotalN1,
        note: 'Créances membres, clients acheteurs et prestations matériel',
        details: [
          { libelle: 'Créances membres (campagnes agricoles)', valeur: creancesMembresN, commentaire: 'Reliquats facturés sur intrants et charges' },
          { libelle: 'Créances clients acheteurs de récoltes', valeur: creancesClientsN, commentaire: 'Factures de vente à terme en attente de règlement' },
          ...(creancesMaterielN > 0 ? [{ libelle: 'Créances prestations de matériel', valeur: creancesMaterielN, commentaire: 'Prestations mécanisées restant dues' }] : []),
        ],
      },
      disponibilites: {
        libelle: 'Disponibilités (Banques & Caisses)',
        brut: disponibilitesN,
        amortissement: 0,
        net: disponibilitesN,
        netN1: disponibilitesN1,
        note: 'Soldes positifs de tous les comptes bancaires et caisses du GIE',
        details: comptesList.filter(c => c.soldeFinal > 0).map(c => ({
          libelle: c.nom,
          valeur: c.soldeFinal,
          commentaire: `Solde disponible au 31/12/${annee}`,
        })),
      },
      totalActif: {
        libelle: 'TOTAL ACTIF SMT',
        brut: immoBrutN + stockTotalN + creancesTotalN + disponibilitesN,
        amortissement: immoAmoN,
        net: totalActifNetN,
        netN1: totalActifNetN1,
        note: 'Total du patrimoine actif du GIE',
        details: [
          { libelle: 'Immobilisations nettes', valeur: immoNetN, commentaire: 'Matériel net d\'amortissements' },
          { libelle: 'Stocks & En-cours', valeur: stockTotalN, commentaire: 'Intrants et récoltes' },
          { libelle: 'Créances totales', valeur: creancesTotalN, commentaire: 'Membres, acheteurs, prestations' },
          { libelle: 'Disponibilités', valeur: disponibilitesN, commentaire: 'Banques et caisses' },
        ],
      },
    },
    passif: {
      capital: {
        libelle: 'Fonds propres / Dotation initiale du GIE',
        brut: capitalN,
        amortissement: 0,
        net: capitalN,
        netN1: capitalN1,
        note: 'Fonds associatifs et apports nets des coopérateurs',
        details: [
          { libelle: 'Fonds propres et réserves du GIE', valeur: capitalN, commentaire: 'Garantit l\'équilibre strict du bilan patrimonial' },
        ],
      },
      resultatNet: {
        libelle: 'Résultat net de l\'exercice (SMT)',
        brut: resultatNetGlobal,
        amortissement: 0,
        net: resultatNetGlobal,
        netN1: 0,
        note: 'Résultat issu du Compte d\'Exploitation SMT (Exploitation + Matériel)',
        details: [
          { libelle: 'Résultat net volet exploitation agricole', valeur: resultatNetAgricole, commentaire: 'Activités agricoles de la campagne' },
          { libelle: 'Résultat net volet matériel', valeur: resultatNetMateriel, commentaire: 'Prestations et parc de matériels' },
        ],
      },
      subventions: {
        libelle: 'Subventions d\'investissement & d\'équipement',
        brut: subventionsAgricolesN,
        amortissement: 0,
        net: subventionsAgricolesN,
        netN1: 0,
        note: 'Subventions et dons affectés au matériel ou aux aménagements',
        details: subventionsAgricolesN > 0 ? [
          { libelle: 'Subventions d\'investissement enregistrées', valeur: subventionsAgricolesN, commentaire: 'Aides reçues pour investissements durables' },
        ] : [],
      },
      empruntsEquipement: {
        libelle: 'Emprunts et dettes financières (> 12 mois)',
        brut: empruntsPassifN,
        amortissement: 0,
        net: empruntsPassifN,
        netN1: encoursEmpruntsN1,
        note: 'Solde restant dû de tous les emprunts et crédits accordés sur une période supérieure à 12 mois (hors crédits de trésorerie)',
        details: detailsEmprunts,
      },
      creditsCampagne: {
        libelle: 'Crédits de trésorerie & de campagne en cours (≤ 12 mois)',
        brut: creditsCampagnePassifN,
        amortissement: 0,
        net: creditsCampagnePassifN,
        netN1: encoursTresorerieN1,
        note: 'Solde en cours des crédits de campagne et crédits de trésorerie bancaires à court terme (≤ 12 mois)',
        details: detailsTresorerieCredits,
      },
      dettesFournisseurs: {
        libelle: 'Dettes fournisseurs d\'intrants & tiers d\'exploitation',
        brut: dettesFournisseursN,
        amortissement: 0,
        net: dettesFournisseursN,
        netN1: dettesFournisseursN1,
        note: 'Factures d\'intrants et prestations reçues restant à payer',
        details: [
          { libelle: 'Factures fournisseurs impayées', valeur: dettesFournisseursN, commentaire: 'Achats d\'intrants restant dus' },
        ],
      },
      dettesMembresSurplus: {
        libelle: 'Dettes envers les membres (Surplus de remboursement)',
        brut: dettesMembresSurplusN,
        amortissement: 0,
        net: dettesMembresSurplusN,
        netN1: dettesMembresSurplusN1,
        note: 'Trop-perçus et excédents de remboursements des membres à régulariser',
        details: [
          { libelle: 'Surplus et trop-perçus des membres', valeur: dettesMembresSurplusN, commentaire: 'Excédents de paiement sur factures d\'exploitation' },
        ],
      },
      dettesTiersEmprunts: {
        libelle: 'Dettes financières à court terme (Prêts de tiers / membres à la caisse)',
        brut: dettesTiersEmpruntsN,
        amortissement: 0,
        net: dettesTiersEmpruntsN,
        netN1: dettesTiersEmpruntsN1,
        note: 'Prêts, emprunts et avances consentis par des membres, clients ou fournisseurs à la caisse',
        details: [
          { libelle: 'Prêts et dépôts consentis à la caisse', valeur: dettesTiersEmpruntsN, commentaire: 'Ressources financières prêtées au GIE' },
        ],
      },
      totalPassif: {
        libelle: 'TOTAL PASSIF SMT',
        brut: totalActifNetN,
        amortissement: 0,
        net: totalActifNetN,
        netN1: totalActifNetN1,
        note: 'Total des ressources et financements du GIE (égal au Total Actif)',
        details: [
          { libelle: 'Fonds propres / Capital', valeur: capitalN },
          { libelle: 'Résultat net de l\'exercice', valeur: resultatNetGlobal },
          ...(subventionsAgricolesN > 0 ? [{ libelle: 'Subventions d\'investissement', valeur: subventionsAgricolesN }] : []),
          { libelle: 'Emprunts & dettes financières (> 12 mois)', valeur: empruntsPassifN },
          { libelle: 'Crédits de trésorerie (≤ 12 mois)', valeur: creditsCampagnePassifN },
          { libelle: 'Dettes fournisseurs', valeur: dettesFournisseursN },
          { libelle: 'Dettes membres (surplus)', valeur: dettesMembresSurplusN },
          ...(dettesTiersEmpruntsN > 0 ? [{ libelle: 'Dettes financières CT (prêts tiers)', valeur: dettesTiersEmpruntsN }] : []),
        ],
      },
    },
  }

  return {
    annee,
    fluxTresorerie: {
      soldeOuverture: soldeOuvertureTreso,
      totalEntrees: totalEntreesTreso,
      totalSorties: totalSortiesTreso,
      soldeCloture: soldeClotureTreso,
      comptes: comptesList,
      recettesParPoste,
      depensesParPoste,
    },
    compteExploitation: {
      global: voletGlobal,
      agricole: voletAgricole,
      materiel: voletMateriel,
    },
    bilan,
  }
}

