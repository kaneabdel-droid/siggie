'use server'

import { createClient } from '@/utils/supabase/server'

type Ligne = {
  imputation_id: string
  libelle: string
  compte: string
  categorie: string
  nature: string
  prevu: number
  realise: number
  ecart: number
  taux: number | null
}

type Totals = { prevu: number; realise: number; ecart: number }

type Groupe = { lignes: Ligne[]; totals: Totals }

function buildTotals(lignes: Ligne[]): Totals {
  const prevu = lignes.reduce((sum, l) => sum + l.prevu, 0)
  const realise = lignes.reduce((sum, l) => sum + l.realise, 0)
  const ecart = lignes.reduce((sum, l) => sum + l.ecart, 0)
  return { prevu, realise, ecart }
}

function buildSolde(recettes: Totals, depenses: Totals): Totals {
  // L'écart "favorable" (positif = mieux que prévu) s'additionne directement,
  // qu'il vienne d'une rubrique de recette ou de dépense : voir le calcul de
  // chaque ligne ci-dessous.
  return {
    prevu: recettes.prevu - depenses.prevu,
    realise: recettes.realise - depenses.realise,
    ecart: recettes.ecart + depenses.ecart,
  }
}

// Clé de rapprochement pour le budget Matériel : la rubrique est l'équipement
// (imputations.libelle = materiels.nom) et la sous-rubrique son type de
// prestation/consommation (imputations.compte = type_prestation /
// type_consommation) — voir campagnes/[id]/config/BudgetPrevisionsManager.tsx.
function cleMateriel(nom: string, type: string) {
  return `${nom}::${type}`
}

export async function getSuiviBudgetaire(campagneId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: imputations, error: impError } = await supabase
    .from('imputations')
    .select('id, libelle, compte, categorie, nature')
    .order('libelle')

  if (impError) return { error: impError.message }

  const { data: previsions } = await supabase
    .from('budget_previsions')
    .select('imputation_id, montant_prevu')
    .eq('campagne_id', campagneId)

  // Réalisation Exploitation : opérations de caisse/banque imputées à la
  // rubrique pour cette campagne.
  const { data: transactions } = await supabase
    .from('transactions')
    .select('imputation_id, type_transaction, montant')
    .eq('campagne_id', campagneId)

  // Réalisation Matériel : pas de transaction imputée, elle est tirée des
  // prestations (recettes) et consommations (dépenses) de chaque équipement
  // enregistrées pour cette campagne.
  const { data: materiels } = await supabase
    .from('materiels')
    .select('id, nom')

  const { data: prestations } = await supabase
    .from('materiel_prestations')
    .select('materiel_id, type_prestation, montant_facture')
    .eq('campagne_id', campagneId)

  const { data: consommations } = await supabase
    .from('materiel_consommations')
    .select('materiel_id, type_consommation, montant_total')
    .eq('campagne_id', campagneId)

  const previsionParImputation = new Map(
    (previsions || []).map((p) => [p.imputation_id, Number(p.montant_prevu) || 0])
  )

  // Solde net des opérations de trésorerie imputées à chaque rubrique
  // (sorties - entrées), pour le budget Exploitation uniquement.
  const soldeParImputation = new Map<string, number>()
  for (const tx of transactions || []) {
    if (!tx.imputation_id) continue
    const courant = soldeParImputation.get(tx.imputation_id) || 0
    const montant = Number(tx.montant) || 0
    if (tx.type_transaction === 'sortie') {
      soldeParImputation.set(tx.imputation_id, courant + montant)
    } else if (tx.type_transaction === 'entree') {
      soldeParImputation.set(tx.imputation_id, courant - montant)
    }
  }

  const nomMaterielParId = new Map((materiels || []).map((m) => [m.id, m.nom]))

  const realiseRecetteMateriel = new Map<string, number>()
  for (const p of prestations || []) {
    const nom = nomMaterielParId.get(p.materiel_id)
    if (!nom) continue
    const cle = cleMateriel(nom, p.type_prestation)
    realiseRecetteMateriel.set(cle, (realiseRecetteMateriel.get(cle) || 0) + (Number(p.montant_facture) || 0))
  }

  const realiseDepenseMateriel = new Map<string, number>()
  for (const c of consommations || []) {
    const nom = nomMaterielParId.get(c.materiel_id)
    if (!nom) continue
    const cle = cleMateriel(nom, c.type_consommation)
    realiseDepenseMateriel.set(cle, (realiseDepenseMateriel.get(cle) || 0) + (Number(c.montant_total) || 0))
  }

  // Calcule le montant réalisé d'une rubrique, dans le sens "favorable si
  // positif par rapport à la prévision" : une recette se lit en entrées
  // nettes, une dépense en sorties nettes.
  function getRealise(imp: { id: string; libelle: string; compte: string; categorie: string; nature: string }): number {
    if (imp.categorie === 'materiel') {
      const cle = cleMateriel(imp.libelle, imp.compte)
      return imp.nature === 'recette'
        ? (realiseRecetteMateriel.get(cle) || 0)
        : (realiseDepenseMateriel.get(cle) || 0)
    }

    const soldeNet = soldeParImputation.get(imp.id) || 0
    return imp.nature === 'recette' ? -soldeNet : soldeNet
  }

  function buildLigne(imp: { id: string; libelle: string; compte: string; categorie: string; nature: string }): Ligne | null {
    const prevu = previsionParImputation.get(imp.id) || 0
    const realise = getRealise(imp)

    // Masque les rubriques ni budgétées ni utilisées cette campagne, pour ne
    // pas polluer le suivi avec tout le référentiel du GIE.
    if (prevu === 0 && realise === 0) return null

    const ecart = imp.nature === 'recette' ? realise - prevu : prevu - realise

    return {
      imputation_id: imp.id,
      libelle: imp.libelle,
      compte: imp.compte,
      categorie: imp.categorie,
      nature: imp.nature,
      prevu,
      realise,
      ecart,
      taux: prevu > 0 ? (realise / prevu) * 100 : null,
    }
  }

  function buildCategorie(categorie: 'exploitation' | 'materiel') {
    const lignesCategorie = (imputations || [])
      .filter((imp) => imp.categorie === categorie)
      .map(buildLigne)
      .filter((l): l is Ligne => l !== null)

    const recetteLignes = lignesCategorie.filter((l) => l.nature === 'recette')
    const depenseLignes = lignesCategorie.filter((l) => l.nature === 'depense')

    const recettes: Groupe = { lignes: recetteLignes, totals: buildTotals(recetteLignes) }
    const depenses: Groupe = { lignes: depenseLignes, totals: buildTotals(depenseLignes) }
    const solde = buildSolde(recettes.totals, depenses.totals)

    return { recettes, depenses, solde }
  }

  const exploitation = buildCategorie('exploitation')
  const materiel = buildCategorie('materiel')

  const consolideRecetteLignes = [...exploitation.recettes.lignes, ...materiel.recettes.lignes]
  const consolideDepenseLignes = [...exploitation.depenses.lignes, ...materiel.depenses.lignes]
  const consolideRecettes: Groupe = { lignes: consolideRecetteLignes, totals: buildTotals(consolideRecetteLignes) }
  const consolideDepenses: Groupe = { lignes: consolideDepenseLignes, totals: buildTotals(consolideDepenseLignes) }
  const consolide = {
    recettes: consolideRecettes,
    depenses: consolideDepenses,
    solde: buildSolde(consolideRecettes.totals, consolideDepenses.totals),
  }

  return { exploitation, materiel, consolide }
}
