import crypto from 'node:crypto'
import { createAdminClient } from '@/utils/supabase/admin'
import type { NormalizedWebhookEvent } from './types'

/**
 * Traite un événement de webhook déjà vérifié (signature OK) et normalisé :
 * dédoublonne, vérifie le montant, met à jour le paiement de façon idempotente,
 * puis crédite l'abonnement du GIE si le paiement est complet.
 */
export async function fulfillWebhookEvent(
  provider: 'bictorys' | 'moneroo',
  rawBody: string,
  event: NormalizedWebhookEvent
) {
  const supabase = createAdminClient()

  // Dédoublonnage atomique : la clé primaire (provider, event_hash) rejette les doublons.
  const eventHash = crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 32)
  const { error: dedupError } = await supabase
    .from('paiement_webhook_events')
    .insert({ provider, event_hash: eventHash })
  if (dedupError) {
    return { deduped: true }
  }

  const { data: payment } = await supabase
    .from('abonnement_paiements')
    .select('id, gie_id, niveau, montant, statut')
    .eq('provider', provider)
    .eq('provider_reference', event.providerTransactionId)
    .maybeSingle()

  if (!payment) {
    console.error('[webhook] paiement introuvable', { provider, reference: event.providerTransactionId })
    return { orphaned: true }
  }

  if (event.status === 'completed' && typeof event.reportedAmount === 'number' && event.reportedAmount !== payment.montant) {
    console.error('[webhook] montant incohérent — paiement refusé', {
      provider,
      paymentId: payment.id,
      attendu: payment.montant,
      recu: event.reportedAmount,
    })
    return { rejected: 'amount_mismatch' }
  }

  const target = event.status === 'completed' ? 'completed' : 'failed'

  const { data: updated } = await supabase
    .from('abonnement_paiements')
    .update({ statut: target, updated_at: new Date().toISOString() })
    .eq('id', payment.id)
    .eq('statut', 'pending')
    .select('id')

  if (!updated || updated.length === 0) {
    return { alreadyProcessed: true }
  }

  if (target === 'completed') {
    // Le paiement lève la contrainte d'essai : le GIE n'est plus sur une horloge d'expiration.
    await supabase
      .from('gies')
      .update({ subscription_tier: payment.niveau, essai_expire_le: null })
      .eq('id', payment.gie_id)
  }

  return { processed: true, statut: target }
}
