import crypto from 'node:crypto'
import { createAdminClient } from '@/utils/supabase/admin'
import type { NormalizedWebhookEvent } from './types'

export type PaymentProvider = 'bictorys' | 'moneroo' | 'chariow'

/**
 * Cœur idempotent du crédit d'abonnement : vérifie le montant, fait transitionner le
 * paiement de 'pending' vers 'completed'/'failed' (une seule fois, `WHERE statut='pending'`
 * comme garde-fou), puis met à jour le forfait et lève l'horloge d'essai du GIE.
 *
 * Réutilisé par les webhooks (avec dédoublonnage en amont) et par la confirmation
 * manuelle d'un virement depuis l'admin (déclenchement explicite, pas de dédoublonnage).
 */
export async function applyPaymentResult(
  provider: PaymentProvider | 'virement',
  event: NormalizedWebhookEvent
) {
  const supabase = createAdminClient()

  const { data: payment } = await supabase
    .from('abonnement_paiements')
    .select('id, gie_id, niveau, montant, statut')
    .eq('provider', provider)
    .eq('provider_reference', event.providerTransactionId)
    .maybeSingle()

  if (!payment) {
    console.error('[paiement] introuvable', { provider, reference: event.providerTransactionId })
    return { orphaned: true }
  }

  if (event.status === 'completed' && typeof event.reportedAmount === 'number' && event.reportedAmount !== payment.montant) {
    console.error('[paiement] montant incohérent — refusé', {
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

/**
 * Traite un événement de webhook déjà vérifié (signature/secret OK) et normalisé :
 * dédoublonne puis délègue à applyPaymentResult().
 */
export async function fulfillWebhookEvent(provider: PaymentProvider, rawBody: string, event: NormalizedWebhookEvent) {
  const supabase = createAdminClient()

  // Dédoublonnage atomique : la clé primaire (provider, event_hash) rejette les doublons.
  const eventHash = crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 32)
  const { error: dedupError } = await supabase
    .from('paiement_webhook_events')
    .insert({ provider, event_hash: eventHash })
  if (dedupError) {
    return { deduped: true }
  }

  return applyPaymentResult(provider, event)
}
