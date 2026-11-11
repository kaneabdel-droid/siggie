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
import { getCreditType } from './credits-types'
import { isStockableIntrant } from './intrants/types'

export type SMTFluxCompte = {
  id: string
  nom: string
  soldeInitial: number
  entrees: number
  sorties: number
  soldeFinal: number
}

export type SMTLignePoste = {
  code?: string
  libelle: string
  montant: number
  note?: string
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

export function extractClientSoldeInitial(nom?: string | null): number {
  if (!nom) return 0
  const match = String(nom).match(/\[SOLDE_INIT:([+-]?\d+(?:\.\d+)?)\]/)
  return match ? Number(match[1]) : 0
}

export function parseStockInitialCampagne(
  campagneOrRaw?: { produit_collecte?: string | null; stock_initial_quantite?: number | null; stock_initial_valeur?: number | null } | string | null
): { quantite: number; unite: string; valeur: number; date?: string | null } | null {
  if (!campagneOrRaw) return null
  if (typeof campagneOrRaw === 'object' && (n(campagneOrRaw.stock_initial_quantite) > 0 || n(campagneOrRaw.stock_initial_valeur) > 0)) {
    return {
      quantite: n(campagneOrRaw.stock_initial_quantite),
      unite: 'sacs',
      valeur: n(campagneOrRaw.stock_initial_valeur),
      date: null,
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
        const [q, u, v, d] = data.split(':')
        return {
          quantite: Number(q) || 0,
          unite: u || 'kg',
          valeur: Number(v) || 0,
          date: d || null,
        }
      }
    }
  } else if (content) {
    const [q, u, v, d] = content.split(':')
    return {
      quantite: Number(q) || 0,
      unite: u || 'kg',
      valeur: Number(v) || 0,
      date: d || null,
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
      const siTag = parseStockInitialCampagne(c.produit_collecte)
      const qteInitiale = siTag ? siTag.quantite : 0
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
      const qteRestante = Math.max(0, qteEntreesSacs - qteSortiesSacs)
      totalNature += qteRestante * (prixCollecte.get(c.id) ? (prixCollecte.get(c.id)! * 80) : 10000)
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

  // Vente de paddy/récoltes issu du remboursement en nature des prestations matériel
  const ventesStockMaterielN = somme(
    raw.sorties.filter((s) => s.type_sortie === 'vente' && dansAnnee(s.date_sortie, annee) && isSortieMateriel(s)),
    calcMontantSortie
  )
  const totalRecettesMateriel = prestationsMaterielN + ventesStockMaterielN

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
  ]
  const totalDepensesMateriel = carbMateriel + repMateriel + moMateriel + logMateriel
  const soldeTresoMateriel = totalRecettesMateriel - totalDepensesMateriel

  const ajustementsMateriel: SMTLignePoste[] = [
    ...(varStockNatureMat !== 0 ? [{ libelle: 'Variation du stock de paddy issu des prestations (SF - SI)', montant: varStockNatureMat }] : []),
    { libelle: 'Variation des créances de prestations & ventes matériel (CF - CI)', montant: varCreancesMateriel },
    { libelle: 'Dotation aux amortissements du matériel de l\'exercice (-)', montant: -dotationAmoN },
  ]
  const totalAjustementsMateriel = varStockNatureMat + varCreancesMateriel - dotationAmoN
  const resultatNetMateriel = soldeTresoMateriel + totalAjustementsMateriel

  const voletMateriel: SMTVolet = {
    titre: 'Activité Matériel & Équipements',
    recettes: [
      { libelle: 'Prestations de services agricoles (labour, moisson, battage)', montant: prestationsMaterielN },
      ...(ventesStockMaterielN > 0 ? [{ libelle: 'Ventes de paddy collecté en remboursement de prestations', montant: ventesStockMaterielN }] : []),
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
  const ventesAgricolesN = somme(
    raw.sorties.filter((s) => s.type_sortie === 'vente' && dansAnnee(s.date_sortie, annee) && !isSortieMateriel(s)),
    calcMontantSortie
  )
  const facturationCampagnesN = somme(
    raw.factures.filter((f) => dansAnnee(f.date_emission, annee)),
    (f) => n(f.montant_total) + n(f.montant_interet)
  )
  const subventionsAgricolesN = n(saisies.subventions)
  const totalRecettesAgricoles = ventesAgricolesN + facturationCampagnesN + subventionsAgricolesN

  const achatsIntrantsAnnee = somme(
    raw.achats.filter((a) => dansAnnee(a.date_achat, annee)),
    (a) => n(a.quantite) * n(a.prix_unitaire)
  )
  const electriciteStationN = depElectricite
  const faucardageHydrauliqueN = depHydraulique
  const fraisGestionAgricolesN = depFraisGestion
  const totalDepensesAgricoles = achatsIntrantsAnnee + electriciteStationN + faucardageHydrauliqueN + fraisGestionAgricolesN
  const soldeTresoAgricole = totalRecettesAgricoles - totalDepensesAgricoles

  const ajustementsAgricoles: SMTLignePoste[] = [
    { libelle: 'Variation des stocks d\'intrants (SF - SI)', montant: varStockIntrants },
    { libelle: 'Variation des stocks de récoltes en nature (SF - SI)', montant: varStockNatureAgri },
    { libelle: 'Variation des créances d\'exploitation agricole (CF - CI)', montant: varCreancesAgricoles },
    ...(varDettesMembresSurplus !== 0
      ? [{ libelle: 'Variation des dettes envers membres / surplus (- [DF - DI])', montant: -varDettesMembresSurplus }]
      : []),
    { libelle: 'Variation des dettes fournisseurs (- [DF - DI])', montant: -varDettesFournisseurs },
  ]
  const totalAjustementsAgricoles =
    varStockIntrants + varStockNatureAgri + varCreancesAgricoles - varDettesMembresSurplus - varDettesFournisseurs
  const resultatNetAgricole = soldeTresoAgricole + totalAjustementsAgricoles

  const voletAgricole: SMTVolet = {
    titre: 'Exploitation Agricole',
    recettes: [
      { libelle: 'Ventes de paddy et récoltes collectées (exploitation)', montant: ventesAgricolesN },
      { libelle: 'Facturation intrants et services aux membres', montant: facturationCampagnesN },
      ...(subventionsAgricolesN > 0 ? [{ libelle: 'Subventions d\'exploitation', montant: subventionsAgricolesN }] : []),
    ],
    totalRecettes: totalRecettesAgricoles,
    depenses: [
      { libelle: 'Achats d\'intrants agricoles (semences, engrais, urée)', montant: achatsIntrantsAnnee },
      { libelle: 'Électricité station de pompage & eau d\'irrigation', montant: electriciteStationN },
      ...(faucardageHydrauliqueN > 0 ? [{ libelle: 'Faucardage, curage des canaux & réseau d\'irrigation', montant: faucardageHydrauliqueN }] : []),
      { libelle: 'Charges de fonctionnement, indemnités & gestion coopérative', montant: fraisGestionAgricolesN },
    ],
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

  // Crédits bancaires en cours au passif
  const creditsValidesN = raw.credits.filter((c) => c.statut === 'valide' && avant(c.date_demande, finN))
  const creditsCampagneValides = creditsValidesN.filter((c) => getCreditType(c) === 'campagne')
  const creditsEquipementValides = creditsValidesN.filter((c) => getCreditType(c) === 'equipement')

  const rembCampagneN = somme(
    tresoAvantFinN.filter((t) => t.type_piece === 'remboursement_credit' && creditsCampagneValides.some((c) => c.id === t.credit_id)),
    (t) => n(t.montant)
  )
  const encoursCreditCampagneN = Math.max(0, somme(creditsCampagneValides, (c) => n(c.montant_accorde)) - rembCampagneN)

  const rembEquipementN = somme(
    tresoAvantFinN.filter((t) => t.type_piece === 'remboursement_credit' && creditsEquipementValides.some((c) => c.id === t.credit_id)),
    (t) => n(t.montant)
  )
  const encoursCreditEquipementN = Math.max(0, somme(creditsEquipementValides, (c) => n(c.montant_accorde)) - rembEquipementN)

  // Année N-1 pour le passif
  const creditsValidesN1 = raw.credits.filter((c) => c.statut === 'valide' && avant(c.date_demande, finN1))
  const encoursCreditCampagneN1 = Math.max(0, somme(creditsValidesN1.filter((c) => getCreditType(c) === 'campagne'), (c) => n(c.montant_accorde)))
  const encoursCreditEquipementN1 = Math.max(0, somme(creditsValidesN1.filter((c) => getCreditType(c) === 'equipement'), (c) => n(c.montant_accorde)))

  const empruntsPassifN = saisies.emprunts !== undefined ? n(saisies.emprunts) : encoursCreditEquipementN
  const creditsCampagnePassifN = encoursCreditCampagneN

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
    (encoursCreditEquipementN1 +
      encoursCreditCampagneN1 +
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
        note: 'Tracteurs, moissonneuses, motopompes, matériel valorisés au coût d\'acquisition net d\'amortissements',
      },
      stocksIntrants: {
        libelle: 'Stocks d\'intrants (engrais, urée, semences)',
        brut: stockIntrantsN,
        amortissement: 0,
        net: stockIntrantsN,
        netN1: stockIntrantsN1,
        note: 'Stocks physiques en magasin valorisés au dernier prix d\'achat',
      },
      stocksNature: {
        libelle: 'Stocks de produits agricoles en nature (paddy, récoltes)',
        brut: stockNatureN,
        amortissement: 0,
        net: stockNatureN,
        netN1: stockNatureN1,
        note: 'Sacs de paddy et récoltes collectés en attente de vente ou redistribution',
      },
      stocksTotal: {
        libelle: 'Total des Stocks',
        brut: stockTotalN,
        amortissement: 0,
        net: stockTotalN,
        netN1: stockTotalN1,
        note: 'Intrants + récoltes en magasin',
      },
      creancesMembres: {
        libelle: 'Créances d\'exploitation sur les membres',
        brut: creancesMembresN,
        amortissement: 0,
        net: creancesMembresN,
        netN1: creancesMembresN1,
        note: 'Reliquats facturés sur intrants et charges de campagne des membres',
      },
      creancesClients: {
        libelle: 'Créances d\'exploitation sur clients acheteurs',
        brut: creancesClientsN,
        amortissement: 0,
        net: creancesClientsN,
        netN1: creancesClientsN1,
        note: 'Factures de vente de récoltes à terme en attente de règlement',
      },
      creancesMateriel: {
        libelle: 'Créances d\'activité matériel (prestations & ventes)',
        brut: creancesMaterielN,
        amortissement: 0,
        net: creancesMaterielN,
        netN1: creancesMaterielN1,
        note: 'Prestations et ventes de paddy moissonneuse restant à recouvrer',
      },
      creancesTotal: {
        libelle: 'Total des Créances d\'Exploitation & Matériel',
        brut: creancesTotalN,
        amortissement: 0,
        net: creancesTotalN,
        netN1: creancesTotalN1,
        note: 'Créances membres, clients acheteurs et prestations matériel',
      },
      disponibilites: {
        libelle: 'Disponibilités (Banques & Caisses)',
        brut: disponibilitesN,
        amortissement: 0,
        net: disponibilitesN,
        netN1: disponibilitesN1,
        note: 'Soldes positifs de tous les comptes bancaires et caisses du GIE',
      },
      totalActif: {
        libelle: 'TOTAL ACTIF SMT',
        brut: immoBrutN + stockTotalN + creancesTotalN + disponibilitesN,
        amortissement: immoAmoN,
        net: totalActifNetN,
        netN1: totalActifNetN1,
        note: 'Total du patrimoine actif du GIE',
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
      },
      resultatNet: {
        libelle: 'Résultat net de l\'exercice (SMT)',
        brut: resultatNetGlobal,
        amortissement: 0,
        net: resultatNetGlobal,
        netN1: 0,
        note: 'Résultat issu du Compte d\'Exploitation SMT (Exploitation + Matériel)',
      },
      subventions: {
        libelle: 'Subventions d\'investissement & d\'équipement',
        brut: subventionsAgricolesN,
        amortissement: 0,
        net: subventionsAgricolesN,
        netN1: 0,
        note: 'Subventions et dons affectés au matériel ou aux aménagements',
      },
      empruntsEquipement: {
        libelle: 'Emprunts et dettes financières (Crédit Équipement)',
        brut: empruntsPassifN,
        amortissement: 0,
        net: empruntsPassifN,
        netN1: encoursCreditEquipementN1,
        note: 'Capital restant dû sur le crédit bancaire d\'acquisition du matériel',
      },
      creditsCampagne: {
        libelle: 'Crédits de trésorerie & de campagne en cours',
        brut: creditsCampagnePassifN,
        amortissement: 0,
        net: creditsCampagnePassifN,
        netN1: encoursCreditCampagneN1,
        note: 'Encours du crédit de campagne bancaire pour intrants',
      },
      dettesFournisseurs: {
        libelle: 'Dettes fournisseurs d\'intrants & tiers d\'exploitation',
        brut: dettesFournisseursN,
        amortissement: 0,
        net: dettesFournisseursN,
        netN1: dettesFournisseursN1,
        note: 'Factures d\'intrants et prestations reçues restant à payer',
      },
      dettesMembresSurplus: {
        libelle: 'Dettes envers les membres (Surplus de remboursement)',
        brut: dettesMembresSurplusN,
        amortissement: 0,
        net: dettesMembresSurplusN,
        netN1: dettesMembresSurplusN1,
        note: 'Trop-perçus et excédents de remboursements des membres à régulariser',
      },
      dettesTiersEmprunts: {
        libelle: 'Dettes financières à court terme (Prêts de tiers / membres à la caisse)',
        brut: dettesTiersEmpruntsN,
        amortissement: 0,
        net: dettesTiersEmpruntsN,
        netN1: dettesTiersEmpruntsN1,
        note: 'Prêts, emprunts et avances consentis par des membres, clients ou fournisseurs à la caisse',
      },
      totalPassif: {
        libelle: 'TOTAL PASSIF SMT',
        brut: totalActifNetN,
        amortissement: 0,
        net: totalActifNetN,
        netN1: totalActifNetN1,
        note: 'Total des ressources et financements du GIE (égal au Total Actif)',
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

