'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

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
  produitNature?: string | null,
  compteId?: string | null
) {
  const denied = await requirePermission('remboursements', 'create')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('id, gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  // Un remboursement en espèces entre en trésorerie : le compte à créditer est obligatoire.
  // En nature, il alimente le stock en nature et ne touche pas à la trésorerie.
  if (type === 'espece' && !compteId) return { error: "Sélectionnez le compte de trésorerie à créditer" }

  // 1. Enregistrer dans la table remboursements
  const { data: remboursement, error: rembError } = await supabase
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
    .select('id')
    .single()

  if (rembError || !remboursement) return { error: rembError?.message || "Échec de l'enregistrement du remboursement" }

  // 2. Entrée de trésorerie sur le compte choisi (espèces uniquement). En cas d'échec on annule
  // le remboursement pour ne pas laisser un paiement sans écriture de trésorerie.
  if (type === 'espece') {
    const { data: membre } = await supabase.from('membres').select('prenom, nom').eq('id', membreId).single()
    const { error: txError } = await supabase.from('transactions').insert({
      gie_id: userData.gie_id,
      compte_id: compteId,
      type_transaction: 'entree',
      montant: montantFcfa,
      motif: `Remboursement - ${membre ? `${membre.prenom} ${membre.nom}` : 'membre'}`,
      type_piece: 'remboursement_membre',
    })
    if (txError) {
      await supabase.from('remboursements').delete().eq('id', remboursement.id)
      return { error: txError.message }
    }
  }

  // 3. Mettre à jour la facture (montant_paye et statut)
  const { data: facture } = await supabase
    .from('factures')
    .select('montant_total, montant_interet, montant_paye')
    .eq('id', factureId)
    .single()

  if (facture) {
    const totalDu = Number(facture.montant_total || 0) + Number(facture.montant_interet || 0)
    const nouveauMontantPaye = Number(facture.montant_paye || 0) + Number(montantFcfa)
    let nouveauStatut = 'impayee'
    if (nouveauMontantPaye > 0) nouveauStatut = 'partiellement_paye'
    if (nouveauMontantPaye >= totalDu) nouveauStatut = 'payee'

    await supabase
      .from('factures')
      .update({ 
        montant_paye: nouveauMontantPaye,
        statut: nouveauStatut
      })
      .eq('id', factureId)
  }

  revalidatePath('/remboursements')
  revalidatePath('/tresorerie')
  revalidatePath('/facturation')
  revalidatePath('/bilans')
  
  return { success: true }
}
