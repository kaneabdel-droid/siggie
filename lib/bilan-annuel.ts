// Calcul du bilan annuel et du compte de résultat d'un GIE à partir des données
// de gestion (matériel, stocks, factures, trésorerie, crédits...). Fonctions pures :
// aucune requête ici, tout est calculé depuis `BilanRaw` pour pouvoir produire
// l'exercice N et l'exercice N-1 avec un seul chargement de données.

import { getCreditType } from './credits-types'

export type BilanRaw = {
  intrants: { id: string; quantite_stock: number | null; prix_unitaire: number | null }[]
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
  sorties: { campagne_id: string; membre_id: string | null; type_sortie: string; tiers_type: string; quantite: number | null; prix_unitaire: number | null; date_sortie: string }[]
  campagnes: { id: string; prix_collecte: number | null }[]
  paiementsClients: { montant: number | null; date_paiement: string }[]
  materiels: { id?: string; valeur_acquisition: number | null; duree_vie_economique: number | null; date_acquisition: string | null }[]
  prestations: { montant_facture: number | null; date_prestation: string; tiers_type?: string | null; membre_id?: string | null }[]
  consommations: { montant_total: number | null; date_consommation: string }[]
  comptes: { solde_initial: number | null }[]
  transactions: { type_transaction: string; montant: number | null; date_transaction: string | null; type_piece: string | null; credit_id: string | null }[]
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
}

export const RUBRIQUES_SAISIE = ['subventions', 'emprunts', 'autres_produits', 'autres_charges'] as const
export type RubriqueSaisie = (typeof RUBRIQUES_SAISIE)[number]
export type Saisies = Partial<Record<RubriqueSaisie, number>>

export type Ligne = { brut: number; amo: number; net: number }

export type BilanCalcule = {
  annee: number
  actif: {
    immobilisations: Ligne
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
  const stockIntrantsA = (limite: number) =>
    somme(raw.intrants, (i) => {
      const distribuesApres = somme(raw.distributions.filter((d) => d.intrant_id === i.id && !avant(d.date_distribution, limite)), (d) => n(d.quantite))
      const achetesApres = somme(raw.achats.filter((a) => a.intrant_id === i.id && !avant(a.date_achat, limite)), (a) => n(a.quantite))
      return Math.max(0, n(i.quantite_stock) + distribuesApres - achetesApres) * n(i.prix_unitaire)
    })

  // Stock en nature (produits agricoles en stock issus des remboursements en nature), valorisé au prix de collecte.
  const stockNatureA = (limite: number) => {
    const knownCampagneIds = new Set(raw.campagnes.map((c) => c.id))
    let totalNature = somme(raw.campagnes, (c) => {
      const entrees = somme(
        raw.remboursements.filter((r) => {
          if (r.type_remboursement !== 'nature' || !avant(r.date_paiement, limite)) return false
          let cid = r.facture_id ? campagneDeFacture.get(r.facture_id) : undefined
          if (!cid && r.document_type === 'campagne' && r.document_id) cid = r.document_id
          if (!cid && r.produit_nature) {
            const m = r.produit_nature.match(/\[CAMPAGNE:([^\]]+)\]/)
            if (m) cid = m[1]
          }
          return cid === c.id
        }),
        (r) => n(r.quantite_nature)
      )
      const sorties = somme(
        raw.sorties.filter((s) => s.campagne_id === c.id && avant(s.date_sortie, limite)),
        (s) => n(s.quantite)
      )
      return Math.max(0, entrees - sorties) * (prixCollecte.get(c.id) || 0)
    })

    // Remboursements en nature hors campagne ou sur campagne non configurée
    const orphelins = raw.remboursements.filter((r) => {
      if (r.type_remboursement !== 'nature' || !avant(r.date_paiement, limite)) return false
      let cid = r.facture_id ? campagneDeFacture.get(r.facture_id) : undefined
      if (!cid && r.document_type === 'campagne' && r.document_id) cid = r.document_id
      if (!cid && r.produit_nature) {
        const m = r.produit_nature.match(/\[CAMPAGNE:([^\]]+)\]/)
        if (m) cid = m[1]
      }
      return !cid || !knownCampagneIds.has(cid)
    })
    if (orphelins.length > 0) {
      totalNature += somme(orphelins, (r) => n(r.montant_fcfa))
    }

    return totalNature
  }

  // Stock total de fin d'année (intrants + produits)
  const stockIntrants = stockIntrantsA(fin)
  const stockNature = stockNatureA(fin)
  const stockTotal = stockIntrants + stockNature

  // Stock total de début d'année (clôture N-1)
  const stockIntrantsDebut = stockIntrantsA(debutAnnee(annee) - 1)
  const stockNatureDebut = stockNatureA(debutAnnee(annee) - 1)
  const stockTotalDebut = stockIntrantsDebut + stockNatureDebut

  // Solde par membre = facturé - remboursé + ristournes. Une ristourne rend au membre son surplus
  // de remboursement (en nature ou en numéraire) : elle réduit ce qu'il a remboursé. Un solde
  // positif est une créance du GIE ; un solde négatif (surplus non encore rendu) est une dette
  // du GIE envers le membre, à porter au passif et non en créance négative.
  const soldeMembre = new Map<string, number>()
  const ajouter = (id: string | null, v: number) => soldeMembre.set(id ?? 'externe', (soldeMembre.get(id ?? 'externe') || 0) + v)
  for (const f of raw.factures.filter((x) => avant(x.date_emission, fin))) ajouter(f.membre_id, n(f.montant_total) + n(f.montant_interet))
  for (const p of raw.prestations.filter((x) => (x.tiers_type === 'membre' || Boolean(x.membre_id)) && avant(x.date_prestation, fin))) {
    ajouter(p.membre_id ?? null, n(p.montant_facture))
  }
  for (const s of raw.sorties.filter((x) => x.type_sortie === 'vente' && x.tiers_type === 'membre' && x.membre_id && avant(x.date_sortie, fin))) {
    ajouter(s.membre_id, n(s.quantite) * n(s.prix_unitaire))
  }
  for (const r of raw.remboursements.filter((x) => avant(x.date_paiement, fin))) ajouter(r.membre_id, -n(r.montant_fcfa))
  for (const s of raw.sorties.filter((x) => x.type_sortie === 'ristourne' && x.tiers_type === 'membre' && x.membre_id && avant(x.date_sortie, fin))) {
    ajouter(s.membre_id, n(s.quantite) * n(s.prix_unitaire))
  }
  // Ristournes en numéraire (commande Ristourne du module Remboursements).
  for (const r of raw.ristournes.filter((x) => avant(x.date_ristourne, fin))) ajouter(r.membre_id, n(r.montant))
  const soldes = [...soldeMembre.values()]
  const creancesMembres = somme(soldes, (v) => Math.max(0, v))
  const dettesMembres = somme(soldes, (v) => Math.max(0, -v))
  const prestationsClients = somme(
    raw.prestations.filter((p) => p.tiers_type !== 'membre' && !p.membre_id && avant(p.date_prestation, fin)),
    (p) => n(p.montant_facture)
  )
  const creancesClients = Math.max(
    0,
    somme(raw.sorties.filter((s) => s.type_sortie === 'vente' && s.tiers_type === 'client' && avant(s.date_sortie, fin)), (s) => n(s.quantite) * n(s.prix_unitaire)) +
      prestationsClients -
      somme(raw.paiementsClients.filter((p) => avant(p.date_paiement, fin)), (p) => n(p.montant))
  )

  const tresoAvant = raw.transactions.filter((t) => avant(t.date_transaction, fin))
  const disponibilites =
    somme(raw.comptes, (c) => n(c.solde_initial)) +
    somme(tresoAvant.filter((t) => t.type_transaction === 'entree'), (t) => n(t.montant)) -
    somme(tresoAvant.filter((t) => t.type_transaction === 'sortie'), (t) => n(t.montant))

  const actif = {
    immobilisations: ligne(immoBrut, immoAmo),
    stocks: ligne(stockTotal),
    creances: ligne(creancesMembres + creancesClients),
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
    const ecart = (n(s.prix_unitaire) - (prixCollecte.get(s.campagne_id) || 0)) * n(s.quantite)
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

  const dettes = dettesFournisseurs + dettesMembres
  const subventions = n(saisies.subventions)

  // Emprunts : solde en cours du crédit équipement par défaut (ou valeur manuelle saisie)
  const emprunts = saisies.emprunts !== undefined ? n(saisies.emprunts) : creditEquipementRestant

  // Crédit de trésorerie : solde en cours du crédit de campagne
  const creditsTresorerie = creditCampagneRestant

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
