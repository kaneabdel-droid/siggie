'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isAdminEmail } from '@/lib/admin/auth'
import { applyPaymentResult } from '@/lib/payments/fulfill'

export async function confirmerVirement(paymentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) {
    return { error: 'Non autorisé' }
  }

  const admin = createAdminClient()
  const { data: paiement } = await admin
    .from('abonnement_paiements')
    .select('id, montant, provider, statut')
    .eq('id', paymentId)
    .maybeSingle()

  if (!paiement) return { error: 'Paiement introuvable' }
  if (paiement.provider !== 'virement') return { error: "Ce paiement n'est pas un virement" }
  if (paiement.statut !== 'pending') return { error: 'Ce paiement a déjà été traité' }

  // applyPaymentResult recherche par (provider, provider_reference) : les virements
  // n'ont pas de référence prestataire, on utilise l'id du paiement lui-même.
  await admin.from('abonnement_paiements').update({ provider_reference: paymentId }).eq('id', paymentId)

  const result = await applyPaymentResult('virement', {
    providerTransactionId: paymentId,
    status: 'completed',
  })

  revalidatePath('/admin/paiements')
  return result.processed ? { success: true } : { error: 'Échec de la confirmation' }
}
