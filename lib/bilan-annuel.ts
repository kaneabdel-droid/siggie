// Calcul du bilan annuel et du compte de résultat d'un GIE à partir des données
// de gestion (matériel, stocks, factures, trésorerie, crédits...). Fonctions pures :
// aucune requête ici, tout est calculé depuis `BilanRaw` pour pouvoir produire
// l'exercice N et l'exercice N-1 avec un seul chargement de données.

export type BilanRaw = {
  intrants: { id: string; quantite_stock: number | null; prix_unitaire: number | null }[]
  achats: { intrant_id: string; quantite: number | null; prix_unitaire: number | null; date_achat: string }[]
  distributions: { intrant_id: string; quantite: number | null; date_distribution: string | null }[]
  factures: { id: string; campagne_id: string | null; montant_total: number | null; montant_interet: number | null; date_emission: string | null }[]
  remboursements: { facture_id: string; type_remboursement: string; montant_fcfa: number | null; quantite_nature: number | null; date_paiement: string | null }[]
  sorties: { campagne_id: string; type_sortie: string; tiers_type: string; quantite: number | null; prix_unitaire: number | null; date_sortie: string }[]
  campagnes: { id: string; prix_collecte: number | null }[]
  paiementsClients: { montant: number | null; date_paiement: string }[]
  materiels: { valeur_acquisition: number | null; duree_vie_economique: number | null; date_acquisition: string | null }[]
  prestations: { montant_facture: number | null; date_prestation: string }[]
  consommations: { montant_total: number | null; date_consommation: string }[]
  comptes: { solde_initial: number | null }[]
  transactions: { type_transaction: string; montant: number | null; date_transaction: string | null; type_piece: string | null; credit_id: string | null }[]
  credits: { id: string; statut: string | null; montant_accorde: number | null; taux_interet: number | null; duree_credit: number | null; date_demande: string | null }[]
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
    const c = campagneDeFacture.get(r.facture_id)
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
  const stockIntrants = stockIntrantsA(fin)

  // Stock en nature (produit collecté via remboursements), valorisé au prix de collecte.
  const stockNature = somme(raw.campagnes, (c) => {
    const entrees = somme(
      raw.remboursements.filter((r) => r.type_remboursement === 'nature' && campagneDeFacture.get(r.facture_id) === c.id && avant(r.date_paiement, fin)),
      (r) => n(r.quantite_nature)
    )
    const sorties = somme(raw.sorties.filter((s) => s.campagne_id === c.id && avant(s.date_sortie, fin)), (s) => n(s.quantite))
    return Math.max(0, entrees - sorties) * (prixCollecte.get(c.id) || 0)
  })

  const creancesMembres =
    somme(raw.factures.filter((f) => avant(f.date_emission, fin)), (f) => n(f.montant_total) + n(f.montant_interet)) -
    somme(raw.remboursements.filter((r) => avant(r.date_paiement, fin)), (r) => n(r.montant_fcfa))
  const creancesClients =
    somme(raw.sorties.filter((s) => s.type_sortie === 'vente' && s.tiers_type === 'client' && avant(s.date_sortie, fin)), (s) => n(s.quantite) * n(s.prix_unitaire)) -
    somme(raw.paiementsClients.filter((p) => avant(p.date_paiement, fin)), (p) => n(p.montant))

  const tresoAvant = raw.transactions.filter((t) => avant(t.date_transaction, fin))
  const disponibilites =
    somme(raw.comptes, (c) => n(c.solde_initial)) +
    somme(tresoAvant.filter((t) => t.type_transaction === 'entree'), (t) => n(t.montant)) -
    somme(tresoAvant.filter((t) => t.type_transaction === 'sortie'), (t) => n(t.montant))

  const actif = {
    immobilisations: ligne(immoBrut, immoAmo),
    stocks: ligne(stockIntrants + stockNature),
    creances: ligne(creancesMembres + creancesClients),
    disponibilites: ligne(disponibilites),
  }
  const totalActif = ligne(
    actif.immobilisations.brut + actif.stocks.brut + actif.creances.brut + actif.disponibilites.brut,
    actif.immobilisations.amo
  )

  // ---- Compte de résultat ----
  const ventes = somme(raw.factures.filter((f) => dansAnnee(f.date_emission, annee)), (f) => n(f.montant_total) + n(f.montant_interet))

  let gain = 0
  let perte = 0
  for (const s of raw.sorties.filter((x) => dansAnnee(x.date_sortie, annee))) {
    const ecart = (n(s.prix_unitaire) - (prixCollecte.get(s.campagne_id) || 0)) * n(s.quantite)
    if (ecart >= 0) gain += ecart
    else perte += -ecart
  }

  const prestations = somme(raw.prestations.filter((p) => dansAnnee(p.date_prestation, annee)), (p) => n(p.montant_facture))
  const autresProduits = n(saisies.autres_produits)
  const totalProduits = ventes + gain + prestations + autresProduits

  const achatsAnnee = somme(raw.achats.filter((a) => dansAnnee(a.date_achat, annee)), (a) => n(a.quantite) * n(a.prix_unitaire))
  // Variation de stock d'intrants = stock initial (clôture N-1) - stock final (clôture N) :
  // positive quand le stock baisse (consommé pendant l'année), négative quand il augmente.
  const variationStock = stockIntrantsA(debutAnnee(annee) - 1) - stockIntrants

  const consommations = somme(raw.consommations.filter((c) => dansAnnee(c.date_consommation, annee)), (c) => n(c.montant_total))
  const dotation = somme(raw.materiels, (m) => amortissement(m, fin) - amortissement(m, debutAnnee(annee) - 1))
  const chargesMateriel = consommations + dotation

  const interets = somme(
    raw.credits.filter((c) => c.statut === 'valide' && dansAnnee(c.date_demande, annee)),
    (c) => n(c.montant_accorde) * (n(c.taux_interet) / 100) * (n(c.duree_credit) / 12)
  )
  const autresCharges = n(saisies.autres_charges)
  const totalCharges = achatsAnnee + variationStock + perte + chargesMateriel + interets + autresCharges
  const resultat = totalProduits - totalCharges

  // ---- Passif ----
  const creditsValides = raw.credits.filter((c) => c.statut === 'valide' && avant(c.date_demande, fin))
  const idsCredits = new Set(creditsValides.map((c) => c.id))
  const creditsRestants = Math.max(
    0,
    somme(creditsValides, (c) => n(c.montant_accorde)) -
      somme(tresoAvant.filter((t) => t.type_piece === 'remboursement_credit' && t.credit_id && idsCredits.has(t.credit_id)), (t) => n(t.montant))
  )

  const dettes = Math.max(
    0,
    somme(raw.achats.filter((a) => avant(a.date_achat, fin)), (a) => n(a.quantite) * n(a.prix_unitaire)) -
      somme(tresoAvant.filter((t) => t.type_transaction === 'sortie' && t.type_piece === 'facture_fournisseur'), (t) => n(t.montant))
  )

  const subventions = n(saisies.subventions)
  const emprunts = n(saisies.emprunts)
  // Capital = solde du bilan : ce qu'il faut pour équilibrer le total du passif avec l'actif net.
  const capital = totalActif.net - (resultat + subventions + emprunts + dettes + creditsRestants)

  const passif = {
    capital: ligne(capital),
    resultat: ligne(resultat),
    subventions: ligne(subventions),
    emprunts: ligne(emprunts),
    dettes: ligne(dettes),
    credits_tresorerie: ligne(creditsRestants),
  }
  const totalPassif = ligne(capital + resultat + subventions + emprunts + dettes + creditsRestants)

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
