'use server'

import { createClient } from '@/utils/supabase/server'

export async function getGlobalStats() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  // Ces 6 requêtes sont indépendantes les unes des autres : les lancer en
  // parallèle évite de cumuler leurs latences réseau. Seule la requête des
  // remboursements de crédits (plus bas) dépend du résultat de "credits",
  // elle reste donc séquentielle après ce bloc.
  const [
    { data: comptes },
    { data: transactions },
    { data: factures },
    { data: credits },
    { data: materiels },
    { data: prestations },
    { data: consommations },
  ] = await Promise.all([
    // 1. Trésorerie : Solde des comptes
    supabase.from('comptes').select('solde_initial'),
    supabase.from('transactions').select('type_transaction, montant'),
    // 2. Créances (Factures)
    supabase.from('factures').select('montant_total, statut'),
    // 3. Crédits Non Remboursés = montant accordé des crédits validés, moins
    // les remboursements déjà effectués (transactions type_piece='remboursement_credit')
    supabase.from('credits').select('id, montant_accorde, statut'),
    // 4. Rentabilité Matériel
    supabase.from('materiels').select('id, valeur_acquisition, duree_vie_economique, date_acquisition'),
    supabase.from('materiel_prestations').select('montant_facture'),
    supabase.from('materiel_consommations').select('montant_total'),
  ])

  let soldeTresorerie = (comptes || []).reduce((sum, c) => sum + (c.solde_initial || 0), 0)

  const totalEntrees = (transactions || []).filter(t => t.type_transaction === 'entree').reduce((sum, t) => sum + t.montant, 0)
  const totalSorties = (transactions || []).filter(t => t.type_transaction === 'sortie').reduce((sum, t) => sum + t.montant, 0)

  soldeTresorerie += (totalEntrees - totalSorties)

  const facturesImpayees = (factures || []).filter(f => f.statut === 'impayee').reduce((sum, f) => sum + f.montant_total, 0)
  const facturesPayees = (factures || []).filter(f => f.statut === 'payee').reduce((sum, f) => sum + f.montant_total, 0)

  const creditsValides = (credits || []).filter(c => c.statut === 'valide')
  const totalAccordeCredits = creditsValides.reduce((sum, c) => sum + Number(c.montant_accorde || 0), 0)

  let totalRembourseCredits = 0
  const creditIds = creditsValides.map(c => c.id)
  if (creditIds.length > 0) {
    const { data: remboursementsCredits } = await supabase
      .from('transactions')
      .select('montant')
      .in('credit_id', creditIds)
      .eq('type_piece', 'remboursement_credit')

    totalRembourseCredits = (remboursementsCredits || []).reduce((sum, t) => sum + Number(t.montant || 0), 0)
  }

  const creditsEnCours = totalAccordeCredits - totalRembourseCredits

  const totalRecettesMateriel = (prestations || []).reduce((sum, p) => sum + (p.montant_facture || 0), 0)
  const totalDepensesMateriel = (consommations || []).reduce((sum, c) => sum + (c.montant_total || 0), 0)
  
  let totalAmortissement = 0
  if (materiels) {
    const now = new Date()
    materiels.forEach(mat => {
      if (mat.valeur_acquisition && mat.duree_vie_economique && mat.date_acquisition) {
        const dateAcq = new Date(mat.date_acquisition)
        const yearsDiff = (now.getTime() - dateAcq.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
        const amortissement = (mat.valeur_acquisition / mat.duree_vie_economique) * yearsDiff
        if (amortissement > 0) {
          totalAmortissement += Math.min(amortissement, mat.valeur_acquisition)
        }
      }
    })
  }

  const rentabiliteMateriel = totalRecettesMateriel - totalDepensesMateriel - totalAmortissement

  return {
    tresorerie: {
      soldeActuel: soldeTresorerie,
      totalEntrees,
      totalSorties
    },
    creances: {
      facturesImpayees,
      creditsEnCours,
      totalCreances: facturesImpayees + creditsEnCours
    },
    materiel: {
      rentabiliteNette: rentabiliteMateriel,
      totalRecettes: totalRecettesMateriel,
      totalDepenses: totalDepensesMateriel,
      amortissementCumule: totalAmortissement
    }
  }
}
