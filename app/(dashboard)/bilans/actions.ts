'use server'

import { createClient } from '@/utils/supabase/server'

export async function getGlobalStats() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  // 1. Trésorerie : Solde des comptes
  const { data: comptes } = await supabase
    .from('comptes')
    .select('solde_initial')
  
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type_transaction, montant')

  let soldeTresorerie = (comptes || []).reduce((sum, c) => sum + (c.solde_initial || 0), 0)
  
  const totalEntrees = (transactions || []).filter(t => t.type_transaction === 'entree').reduce((sum, t) => sum + t.montant, 0)
  const totalSorties = (transactions || []).filter(t => t.type_transaction === 'sortie').reduce((sum, t) => sum + t.montant, 0)
  
  soldeTresorerie += (totalEntrees - totalSorties)

  // 2. Créances (Factures)
  const { data: factures } = await supabase
    .from('factures')
    .select('montant_total, statut')
  
  const facturesImpayees = (factures || []).filter(f => f.statut === 'impayee').reduce((sum, f) => sum + f.montant_total, 0)
  const facturesPayees = (factures || []).filter(f => f.statut === 'payee').reduce((sum, f) => sum + f.montant_total, 0)

  // 3. Crédits Membres
  const { data: credits } = await supabase
    .from('credits')
    .select('montant_demande, statut')

  const creditsEnCours = (credits || []).filter(c => c.statut === 'valide').reduce((sum, c) => sum + c.montant_demande, 0)

  // 4. Rentabilité Matériel
  const { data: materiels } = await supabase
    .from('materiels')
    .select('id, valeur_acquisition, duree_vie_economique, date_acquisition')
  
  const { data: prestations } = await supabase
    .from('materiel_prestations')
    .select('montant_facture')

  const { data: consommations } = await supabase
    .from('materiel_consommations')
    .select('montant_total')

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
