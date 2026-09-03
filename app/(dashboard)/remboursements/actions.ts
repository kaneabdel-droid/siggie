'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getFacturesPourRemboursement() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: factures, error } = await supabase
    .from('factures')
    .select(`
      *,
      membre:membre_id (id, nom, prenom, code_membre),
      campagne:campagne_id (id, nom, produit_collecte, prix_collecte)
    `)
    .in('statut', ['impayee', 'partiellement_paye']) // Only show unpaid or partially paid
    .order('date_emission', { ascending: false })

  if (error) return { error: error.message }
  return { factures }
}

export async function enregistrerRemboursement(
  factureId: string,
  membreId: string,
  type: 'espece' | 'nature',
  montantFcfa: number,
  quantiteNature?: number | null,
  produitNature?: string | null
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('id, gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  // 1. Enregistrer dans la table remboursements
  const { error: rembError } = await supabase
    .from('remboursements')
    .insert({
      gie_id: userData.gie_id,
      facture_id: factureId,
      membre_id: membreId,
      type_remboursement: type,
      montant_fcfa: montantFcfa,
      quantite_nature: type === 'nature' ? quantiteNature : null,
      produit_nature: type === 'nature' ? produitNature : null
    })

  if (rembError) return { error: rembError.message }

  // 2. Mettre à jour la facture (montant_paye et statut)
  const { data: facture } = await supabase
    .from('factures')
    .select('montant_total, montant_paye')
    .eq('id', factureId)
    .single()

  if (facture) {
    const nouveauMontantPaye = Number(facture.montant_paye || 0) + Number(montantFcfa)
    let nouveauStatut = 'impayee'
    if (nouveauMontantPaye > 0) nouveauStatut = 'partiellement_paye'
    if (nouveauMontantPaye >= facture.montant_total) nouveauStatut = 'payee'

    await supabase
      .from('factures')
      .update({ 
        montant_paye: nouveauMontantPaye,
        statut: nouveauStatut
      })
      .eq('id', factureId)
  }

  // 3. Enregistrer dans la Trésorerie
  const { data: compte } = await supabase
    .from('comptes_tresorerie')
    .select('id')
    .eq('gie_id', userData.gie_id)
    .limit(1)
    .single()

  if (compte) {
    await supabase
      .from('transactions')
      .insert({
        gie_id: userData.gie_id,
        compte_id: compte.id,
        type: 'entree',
        montant: montantFcfa,
        categorie: 'Remboursement Membre',
        description: `Remboursement facture ${factureId} en ${type === 'espece' ? 'espèces' : 'nature'}`,
        enregistre_par: userData.id
      })
  }

  revalidatePath('/remboursements')
  revalidatePath('/facturation')
  revalidatePath('/bilans')
  
  return { success: true }
}
