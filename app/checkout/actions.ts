'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { initiateBictorysPayment } from '@/lib/payments/bictorys'
import { initiateMonerooPayment } from '@/lib/payments/moneroo'
import { initiateChariowPayment } from '@/lib/payments/chariow'
import { initiateMaketouPayment } from '@/lib/payments/maketou'
import { siteUrl } from '@/lib/payments/config'
import { montantUsd } from '@/lib/payments/dollars'

type MoyenPaiement = 'wave' | 'orange' | 'carte' | 'virement' | 'chariow' | 'maketou'

type InitiateResult =
  | { ok: true; checkoutUrl: string }
  | { ok: true; virement: true; paymentId: string }
  | { ok: false; error: string }

export async function initiateSubscriptionPayment(
  planId: string,
  isUpgrade: boolean,
  moyenPaiement: MoyenPaiement,
  phoneLocal?: string
): Promise<InitiateResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Non authentifié' }
  }

  if (moyenPaiement === 'chariow' && isUpgrade) {
    // Chariow facture le prix d'un produit préconfiguré dans sa boutique, jamais un
    // montant libre — inutilisable pour un montant de proratisation arbitraire.
    return { ok: false, error: "Chariow n'est disponible que pour un forfait à prix plein" }
  }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id, gies(subscription_tier, devise, pays)')
    .eq('id', user.id)
    .single()

  if (!userData?.gie_id) {
    return { ok: false, error: 'GIE introuvable' }
  }

  const gie = Array.isArray(userData.gies) ? userData.gies[0] : userData.gies
  const currentTier = gie?.subscription_tier || 'standard'
  // GIE d'un autre pays (devise « sans unité ») : abonnement payé par carte, en dollars US.
  const enDollars = gie?.devise === 'AUCUNE'
  if (enDollars && moyenPaiement !== 'carte') {
    return { ok: false, error: 'Depuis votre pays, l’abonnement se paie par carte bancaire en dollars US' }
  }

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
  const devise = enDollars ? 'USD' : 'XOF'
  if (enDollars) montant = montantUsd(montant)

  const provider = moyenPaiement === 'carte' ? 'moneroo' : moyenPaiement === 'virement' ? 'virement' : moyenPaiement === 'chariow' ? 'chariow' : moyenPaiement === 'maketou' ? 'maketou' : 'bictorys'

  let chariowProductId: string | null = null
  if (provider === 'chariow') {
    // chariow_produits n'a aucune policy RLS publique (config admin) : lecture via le client admin.
    const { data: produit } = await createAdminClient()
      .from('chariow_produits')
      .select('product_id')
      .eq('montant', montant)
      .maybeSingle()
    if (!produit) {
      return { ok: false, error: "Chariow n'est pas configuré pour ce montant" }
    }
    chariowProductId = produit.product_id
  }
  let maketouProductId: string | null = null
  if (provider === 'maketou') {
    const { data: produit } = await createAdminClient()
      .from('maketou_produits')
      .select('product_id')
      .eq('montant', montant)
      .maybeSingle()
    maketouProductId = produit?.product_id || process.env.MAKETOU_PRODUCT_ID || null
    if (!maketouProductId) {
      return { ok: false, error: "Maketou n'est pas configuré pour ce montant" }
    }
  }

  // Anti double paiement (1/2) : un forfait déjà réglé ne se paie pas une seconde fois
  // (SIGGIE n'a pas d'échéance : un paiement vaut pour le forfait tant qu'il est actif).
  if (planId === currentTier) {
    const { count } = await supabase
      .from('abonnement_paiements')
      .select('id', { count: 'exact', head: true })
      .eq('gie_id', userData.gie_id)
      .eq('niveau', planId)
      .eq('statut', 'completed')
      .eq('doublon', false)
    if (count) {
      return { ok: false, error: `Votre GIE est déjà abonné au forfait ${planId} : aucun nouveau paiement n'est nécessaire.` }
    }
  }

  // Anti double paiement (2/2) : relancer la même offre renvoie vers le paiement déjà
  // ouvert au lieu d'en créer un second (double clic, second onglet, retour arrière).
  const reutilisable = await paiementEnCoursReutilisable(supabase, userData.gie_id, planId, moyenPaiement, montant)
  if (reutilisable) return reutilisable

  const { data: payment, error: insertError } = await supabase
    .from('abonnement_paiements')
    .insert({
      gie_id: userData.gie_id,
      niveau: planId,
      montant,
      provider,
      moyen_paiement: moyenPaiement,
      devise,
      statut: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !payment) {
    // 23505 = index unique « un paiement en cours par GIE » : une requête concurrente
    // (double clic) vient d'en créer un — on renvoie celui-là.
    if (insertError?.code === '23505') {
      const concurrent = await paiementEnCoursReutilisable(supabase, userData.gie_id, planId, moyenPaiement, montant)
      if (concurrent) return concurrent
      return { ok: false, error: 'Un paiement est déjà en cours pour votre GIE. Patientez quelques secondes puis réessayez.' }
    }
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
          currency: devise,
          description,
          reference: payment.id,
          returnUrl,
          cancelUrl: returnUrl,
          customerEmail: user.email || '',
        })
      : provider === 'chariow'
        ? await initiateChariowPayment({
            productId: chariowProductId!,
            montantAttendu: montant,
            reference: payment.id,
            phoneLocal: phoneLocal || '',
            countryCode: gie?.pays && gie.pays !== 'AUTRE' ? gie.pays : 'SN',
            customerEmail: user.email || '',
            returnUrl,
          })
        : provider === 'maketou'
          ? await initiateMaketouPayment({
              productId: maketouProductId!,
              reference: payment.id,
              phoneLocal: phoneLocal || '',
              countryCode: gie?.pays && gie.pays !== 'AUTRE' ? gie.pays : 'SN',
              customerEmail: user.email || '',
              returnUrl,
              montantAttendu: montant,
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
    .update({ provider_reference: result.providerTransactionId, checkout_url: result.checkoutUrl })
    .eq('id', payment.id)

  return { ok: true, checkoutUrl: result.checkoutUrl }
}

// Au-delà, une page de paiement prestataire est considérée expirée : on en ouvre une nouvelle.
const DUREE_REUTILISATION_MS = 30 * 60 * 1000

/**
 * Paiement en cours du GIE (au plus un, cf. index unique de la migration 36) :
 * - même offre (forfait, moyen, montant) et encore récent → on le renvoie tel quel ;
 * - sinon il est marqué abandonné (il reste 'pending' : s'il est payé plus tard,
 *   le webhook le traite et le marque doublon si besoin) et on laisse en créer un neuf.
 */
async function paiementEnCoursReutilisable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gieId: string,
  niveau: string,
  moyenPaiement: MoyenPaiement,
  montant: number
): Promise<InitiateResult | null> {
  const { data: enCours } = await supabase
    .from('abonnement_paiements')
    .select('id, niveau, moyen_paiement, montant, checkout_url, created_at')
    .eq('gie_id', gieId)
    .eq('statut', 'pending')
    .is('abandonne_le', null)
    .maybeSingle()

  if (!enCours) return null

  const memeOffre = enCours.niveau === niveau && enCours.moyen_paiement === moyenPaiement && Number(enCours.montant) === montant
  if (memeOffre && moyenPaiement === 'virement') {
    // Virement déjà déclaré pour cette offre : il attend la confirmation de réception des fonds.
    return { ok: true, virement: true, paymentId: enCours.id }
  }
  const recent = enCours.created_at && Date.now() - new Date(enCours.created_at).getTime() < DUREE_REUTILISATION_MS
  if (memeOffre && recent && enCours.checkout_url) {
    return { ok: true, checkoutUrl: enCours.checkout_url }
  }

  await supabase
    .from('abonnement_paiements')
    .update({ abandonne_le: new Date().toISOString() })
    .eq('id', enCours.id)
  return null
}
