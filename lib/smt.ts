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
  let depEntretien = 0
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
      } else if (motif.includes('senelec') || motif.includes('electricité') || motif.includes('pompage')) {
        depElectricite += montant
      } else if (motif.includes('entretien') || motif.includes('réparation') || motif.includes('pièce') || motif.includes('faucardage')) {
        depEntretien += montant
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
  if (depEntretien > 0) depensesParPoste.push({ libelle: 'Entretien réseau & réparations matériel', montant: depEntretien })
  if (depFraisGestion > 0) depensesParPoste.push({ libelle: 'Charges de fonctionnement & indemnités bureau', montant: depFraisGestion })
  if (depRemboursementCredits > 0) depensesParPoste.push({ libelle: 'Remboursements d\'échéances crédits bancaires', montant: depRemboursementCredits })
  if (depAutres > 0) depensesParPoste.push({ libelle: 'Autres décaissements d\'exploitation', montant: depAutres })

  // --------------------------------------------------------------------------
  // 2. STOCKS, CRÉANCES ET DETTES (Pour ajustements SMT et Bilan)
  // --------------------------------------------------------------------------
  const calcStockIntrants = (limite: number) =>
    somme(raw.intrants, (i) => {
      const distribuesApres = somme(raw.distributions.filter((d) => d.intrant_id === i.id && !avant(d.date_distribution, limite)), (d) => n(d.quantite))
      const achetesApres = somme(raw.achats.filter((a) => a.intrant_id === i.id && !avant(a.date_achat, limite)), (a) => n(a.quantite))
      return Math.max(0, n(i.quantite_stock) + distribuesApres - achetesApres) * n(i.prix_unitaire)
    })

  const calcStockNature = (limite: number) => {
    let totalNature = 0
    for (const c of raw.campagnes) {
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
        if (s.campagne_id === c.id && avant(s.date_sortie, limite)) {
          qteSorties += n(s.quantite)
        }
      }
      const qteRestante = Math.max(0, qteEntrees - qteSorties)
      totalNature += qteRestante * (prixCollecte.get(c.id) || 160)
    }
    return totalNature
  }

  const stockIntrantsN = calcStockIntrants(finN)
  const stockIntrantsN1 = calcStockIntrants(finN1)
  const stockNatureN = calcStockNature(finN)
  const stockNatureN1 = calcStockNature(finN1)

  const stockTotalN = stockIntrantsN + stockNatureN
  const stockTotalN1 = stockIntrantsN1 + stockNatureN1
  const varStockTotal = stockTotalN - stockTotalN1
  const varStockIntrants = stockIntrantsN - stockIntrantsN1
  const varStockNature = stockNatureN - stockNatureN1

  // Créances membres et clients
  const facturesN = raw.factures.filter((f) => avant(f.date_emission, finN))
  const facturesN1 = raw.factures.filter((f) => avant(f.date_emission, finN1))
  const paiementsN = raw.remboursements.filter((r) => avant(r.date_paiement, finN))
  const paiementsN1 = raw.remboursements.filter((r) => avant(r.date_paiement, finN1))

  const totalFactureMembresN = somme(facturesN, (f) => n(f.montant_total) + n(f.montant_interet))
  const totalRembMembresN = somme(paiementsN, (r) => n(r.montant_fcfa))
  const creancesMembresN = Math.max(0, totalFactureMembresN - totalRembMembresN)

  const totalFactureMembresN1 = somme(facturesN1, (f) => n(f.montant_total) + n(f.montant_interet))
  const totalRembMembresN1 = somme(paiementsN1, (r) => n(r.montant_fcfa))
  const creancesMembresN1 = Math.max(0, totalFactureMembresN1 - totalRembMembresN1)

  // Créances clients acheteurs
  const ventesClientsN = somme(
    raw.sorties.filter((s) => s.type_sortie === 'vente' && s.tiers_type === 'client' && avant(s.date_sortie, finN)),
    (s) => n(s.quantite) * n(s.prix_unitaire)
  )
  const paiementsClientsN = somme(
    raw.paiementsClients.filter((p) => avant(p.date_paiement, finN)),
    (p) => n(p.montant)
  )
  const creancesClientsN = Math.max(0, ventesClientsN - paiementsClientsN)

  const ventesClientsN1 = somme(
    raw.sorties.filter((s) => s.type_sortie === 'vente' && s.tiers_type === 'client' && avant(s.date_sortie, finN1)),
    (s) => n(s.quantite) * n(s.prix_unitaire)
  )
  const paiementsClientsN1 = somme(
    raw.paiementsClients.filter((p) => avant(p.date_paiement, finN1)),
    (p) => n(p.montant)
  )
  const creancesClientsN1 = Math.max(0, ventesClientsN1 - paiementsClientsN1)

  const creancesTotalN = creancesMembresN + creancesClientsN
  const creancesTotalN1 = creancesMembresN1 + creancesClientsN1
  const varCreancesTotal = creancesTotalN - creancesTotalN1

  // Dettes fournisseurs intrants
  const achatsIntrantsN = somme(raw.achats.filter((a) => avant(a.date_achat, finN)), (a) => n(a.quantite) * n(a.prix_unitaire))
  const payeFournisseursN = somme(
    tresoAvantFinN.filter((t) => t.type_transaction === 'sortie' && t.type_piece === 'facture_fournisseur'),
    (t) => n(t.montant)
  )
  const dettesFournisseursN = Math.max(0, achatsIntrantsN - payeFournisseursN)

  const achatsIntrantsN1 = somme(raw.achats.filter((a) => avant(a.date_achat, finN1)), (a) => n(a.quantite) * n(a.prix_unitaire))
  const payeFournisseursN1 = somme(
    tresoAvantDebutN.filter((t) => t.type_transaction === 'sortie' && t.type_piece === 'facture_fournisseur'),
    (t) => n(t.montant)
  )
  const dettesFournisseursN1 = Math.max(0, achatsIntrantsN1 - payeFournisseursN1)
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
  const carburantMaterielN = somme(
    raw.consommations.filter((c) => dansAnnee(c.date_consommation, annee)),
    (c) => n(c.montant_total)
  )
  // Réparations matériel et entretien enregistrés en trésorerie
  const entretienMaterielN = depEntretien
  const totalDepensesMateriel = carburantMaterielN + entretienMaterielN
  const soldeTresoMateriel = prestationsMaterielN - totalDepensesMateriel
  const resultatNetMateriel = soldeTresoMateriel - dotationAmoN

  const voletMateriel: SMTVolet = {
    titre: 'Activité Matériel & Équipements',
    recettes: [
      { libelle: 'Prestations de services agricoles (labour, moisson, battage)', montant: prestationsMaterielN },
    ],
    totalRecettes: prestationsMaterielN,
    depenses: [
      { libelle: 'Consommations carburant & lubrifiants', montant: carburantMaterielN },
      { libelle: 'Entretien courant, réparations et pièces détachées', montant: entretienMaterielN },
    ],
    totalDepenses: totalDepensesMateriel,
    soldeTresorerie: soldeTresoMateriel,
    ajustements: [
      { libelle: 'Dotation aux amortissements du matériel de l\'exercice (-)', montant: -dotationAmoN },
    ],
    totalAjustements: -dotationAmoN,
    resultatNet: resultatNetMateriel,
  }

  // --- Volet Agricole ---
  const ventesAgricolesN = somme(
    raw.sorties.filter((s) => s.type_sortie === 'vente' && dansAnnee(s.date_sortie, annee)),
    (s) => n(s.quantite) * n(s.prix_unitaire)
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
  const fraisGestionAgricolesN = depFraisGestion
  const totalDepensesAgricoles = achatsIntrantsAnnee + electriciteStationN + fraisGestionAgricolesN
  const soldeTresoAgricole = totalRecettesAgricoles - totalDepensesAgricoles

  const ajustementsAgricoles: SMTLignePoste[] = [
    { libelle: 'Variation des stocks d\'intrants (SF - SI)', montant: varStockIntrants },
    { libelle: 'Variation des stocks de récoltes en nature (SF - SI)', montant: varStockNature },
    { libelle: 'Variation des créances d\'exploitation (CF - CI)', montant: varCreancesTotal },
    { libelle: 'Variation des dettes fournisseurs (- [DF - DI])', montant: -varDettesFournisseurs },
  ]
  const totalAjustementsAgricoles = varStockIntrants + varStockNature + varCreancesTotal - varDettesFournisseurs
  const resultatNetAgricole = soldeTresoAgricole + totalAjustementsAgricoles

  const voletAgricole: SMTVolet = {
    titre: 'Exploitation Agricole',
    recettes: [
      { libelle: 'Ventes de paddy et récoltes collectées', montant: ventesAgricolesN },
      { libelle: 'Facturation intrants et services aux membres', montant: facturationCampagnesN },
      ...(subventionsAgricolesN > 0 ? [{ libelle: 'Subventions d\'exploitation', montant: subventionsAgricolesN }] : []),
    ],
    totalRecettes: totalRecettesAgricoles,
    depenses: [
      { libelle: 'Achats d\'intrants agricoles (semences, engrais, urée)', montant: achatsIntrantsAnnee },
      { libelle: 'Électricité station de pompage & eau d\'irrigation', montant: electriciteStationN },
      { libelle: 'Frais de campagne, faucardage & gestion coopérative', montant: fraisGestionAgricolesN },
    ],
    totalDepenses: totalDepensesAgricoles,
    soldeTresorerie: soldeTresoAgricole,
    ajustements: ajustementsAgricoles,
    totalAjustements: totalAjustementsAgricoles,
    resultatNet: resultatNetAgricole,
  }

  // --- Volet Global ---
  const totalRecettesGlobal = totalRecettesAgricoles + prestationsMaterielN
  const totalDepensesGlobal = totalDepensesAgricoles + totalDepensesMateriel
  const soldeTresoGlobal = totalRecettesGlobal - totalDepensesGlobal
  const totalAjustementsGlobal = totalAjustementsAgricoles - dotationAmoN
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
      { libelle: 'Dotation aux amortissements du matériel (-)', montant: -dotationAmoN },
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

  // Capital et fonds propres du GIE (équilibre du bilan SMT)
  const capitalN = totalActifNetN - (resultatNetGlobal + subventionsAgricolesN + empruntsPassifN + creditsCampagnePassifN + dettesFournisseursN)
  const capitalN1 = totalActifNetN1 - (subventionsAgricolesN + encoursCreditEquipementN1 + encoursCreditCampagneN1 + dettesFournisseursN1)

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
        note: 'Reliquats facturés sur intrants et prestations de campagne',
      },
      creancesClients: {
        libelle: 'Créances d\'exploitation sur clients acheteurs',
        brut: creancesClientsN,
        amortissement: 0,
        net: creancesClientsN,
        netN1: creancesClientsN1,
        note: 'Factures de vente de récoltes à terme en attente de règlement',
      },
      creancesTotal: {
        libelle: 'Total des Créances d\'Exploitation',
        brut: creancesTotalN,
        amortissement: 0,
        net: creancesTotalN,
        netN1: creancesTotalN1,
        note: 'Créances membres et acheteurs',
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
