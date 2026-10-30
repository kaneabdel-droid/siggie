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
    { data: intrants },
    { data: remboursementsData },
    { data: paiementsClientsData },
    { data: sortiesData },
    { data: campagnesData },
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
    // 5. Stocks (Intrants & Remboursements en Nature)
    supabase.from('intrants').select('quantite_stock, prix_unitaire'),
    supabase.from('remboursements').select('id, montant_fcfa, quantite_nature, type_remboursement, produit_nature, facture_id'),
    supabase.from('paiements_clients').select('id, montant, motif'),
    supabase.from('sorties_stock_nature').select('quantite, prix_unitaire'),
    supabase.from('campagnes').select('id, prix_collecte'),
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

  // 5. État des Stocks (Intrants & Remboursements)
  const stockIntrants = (intrants || []).reduce(
    (sum, i) => sum + Math.max(0, Number(i.quantite_stock || 0)) * Number(i.prix_unitaire || 0),
    0
  )

  let stockRemboursement = 0
  const rembIdsIncluded = new Set<string>()
  for (const r of (remboursementsData || []) as any[]) {
    if (r.type_remboursement !== 'nature') continue
    rembIdsIncluded.add(r.id)
    stockRemboursement += Number(r.montant_fcfa || 0)
  }
  for (const pc of (paiementsClientsData || []) as any[]) {
    const motifStr = String(pc.motif || '')
    if (!motifStr.includes('[MODE:nature]')) continue
    const rembIdMatch = motifStr.match(/\[REMB_ID:([^\]]+)\]/)
    if (rembIdMatch && rembIdMatch[1] && rembIdsIncluded.has(rembIdMatch[1].trim())) continue
    stockRemboursement += Number(pc.montant || 0)
  }
  const sortiesVal = (sortiesData || []).reduce(
    (sum, s) => sum + Number(s.quantite || 0) * Number(s.prix_unitaire || 0),
    0
  )
  stockRemboursement = Math.max(0, stockRemboursement - sortiesVal)

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
    },
    stocks: {
      total: stockIntrants + stockRemboursement,
      intrants: stockIntrants,
      remboursement: stockRemboursement,
    }
  }
}
