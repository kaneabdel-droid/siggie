'use server'

import { createClient } from '@/utils/supabase/server'
import { initiateBictorysPayment } from '@/lib/payments/bictorys'
import { initiateMonerooPayment } from '@/lib/payments/moneroo'
import { siteUrl } from '@/lib/payments/config'

type MoyenPaiement = 'wave' | 'orange' | 'carte' | 'virement'

type InitiateResult =
  | { ok: true; checkoutUrl: string }
  | { ok: true; virement: true; paymentId: string }
  | { ok: false; error: string }

export async function initiateSubscriptionPayment(
  planId: string,
  isUpgrade: boolean,
  moyenPaiement: MoyenPaiement
): Promise<InitiateResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Non authentifié' }
  }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id, gies(subscription_tier)')
    .eq('id', user.id)
    .single()

  if (!userData?.gie_id) {
    return { ok: false, error: 'GIE introuvable' }
  }

  const gie = Array.isArray(userData.gies) ? userData.gies[0] : userData.gies
  const currentTier = gie?.subscription_tier || 'standard'

  // Ne jamais faire confiance au prix envoyé par le client : on relit les tarifs en base.
  const { data: tarifs } = await supabase
    .from('tarif_abonnement')
    .select('niveau, prix_annuel')
    .in('niveau', [planId, currentTier])

  const selectedTarif = tarifs?.find((t) => t.niveau === planId)
  const currentTarif = tarifs?.find((t) => t.niveau === currentTier)

  if (!selectedTarif) {
    return { ok: false, error: 'Forfait inconnu' }
  }

  let montant = selectedTarif.prix_annuel
  if (isUpgrade && currentTarif) {
    montant = selectedTarif.prix_annuel - currentTarif.prix_annuel
    if (montant <= 0) montant = selectedTarif.prix_annuel
  }

  const provider = moyenPaiement === 'carte' ? 'moneroo' : moyenPaiement === 'virement' ? 'virement' : 'bictorys'

  const { data: payment, error: insertError } = await supabase
    .from('abonnement_paiements')
    .insert({
      gie_id: userData.gie_id,
      niveau: planId,
      montant,
      provider,
      moyen_paiement: moyenPaiement,
      statut: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !payment) {
    console.error('Erreur création paiement abonnement', insertError)
    return { ok: false, error: "Impossible d'initier le paiement" }
  }

  if (moyenPaiement === 'virement') {
    // Le virement est confirmé manuellement après réception des fonds — pas d'appel prestataire.
    return { ok: true, virement: true, paymentId: payment.id }
  }

  const returnUrl = `${siteUrl}/checkout/retour?ref=${payment.id}`
  const description = `Abonnement SIGGIE — forfait ${planId}`

  const result =
    provider === 'moneroo'
      ? await initiateMonerooPayment({
          amount: montant,
          currency: 'XOF',
          description,
          reference: payment.id,
          returnUrl,
          cancelUrl: returnUrl,
          customerEmail: user.email || '',
        })
      : await initiateBictorysPayment({
          amount: montant,
          currency: 'XOF',
          description,
          reference: payment.id,
          returnUrl,
          cancelUrl: returnUrl,
          customerEmail: user.email || '',
        })

  if (!result.ok) {
    await supabase.from('abonnement_paiements').update({ statut: 'failed' }).eq('id', payment.id)
    return { ok: false, error: result.error }
  }

  await supabase
    .from('abonnement_paiements')
    .update({ provider_reference: result.providerTransactionId })
    .eq('id', payment.id)

  return { ok: true, checkoutUrl: result.checkoutUrl }
}
