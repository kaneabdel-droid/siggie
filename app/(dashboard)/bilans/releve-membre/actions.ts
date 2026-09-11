'use server'

import { createClient } from '@/utils/supabase/server'

export async function getReleveMembre(membreId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: membre } = await supabase
    .from('membres')
    .select('prenom, nom, code_membre')
    .eq('id', membreId)
    .single()

  if (!membre) return { error: "Membre introuvable" }

  const { data: factures, error } = await supabase
    .from('factures')
    .select('id, montant_total, montant_interet, montant_paye, date_emission, created_at, campagnes(nom, date_debut)')
    .eq('membre_id', membreId)
    .order('date_emission', { ascending: true })

  if (error) return { error: error.message }

  let solde = 0
  const lignes = (factures || []).map((f) => {
    const campagne = Array.isArray(f.campagnes) ? f.campagnes[0] : f.campagnes
    // Le montant facturé inclut l'intérêt réparti sur cette facture (voir calculerInteret).
    const facture = Number(f.montant_total || 0) + Number(f.montant_interet || 0)
    const paye = Number(f.montant_paye || 0)
    solde += facture - paye
    return {
      id: f.id,
      campagne: campagne?.nom || '-',
      date: f.date_emission || f.created_at,
      montant_facture: facture,
      montant_paye: paye,
      solde_progressif: solde,
    }
  })

  return { membre, lignes, soldeFinal: solde }
}
