/**
 * Adaptateur Chariow — checkout hébergé Mobile Money + carte (Sénégal).
 *
 * Compte plateforme unique (SIGGIE encaisse ses propres abonnements), pas le modèle
 * per-créateur/BYOK de la doc Chariow.md d'origine. Chariow ne facture jamais un
 * montant libre : il débite le prix d'un "produit" préconfiguré dans sa boutique —
 * d'où le mapping montant -> product_id géré depuis /admin/config (table
 * chariow_produits), un produit par forfait à prix plein.
 */

import crypto from 'node:crypto'
import { chariowApiKey, chariowApiUrl, chariowWebhookSecret } from './config'
import type { VerifyWebhookResult } from './types'

type InitiateChariowParams = {
  productId: string
  montantAttendu: number
  reference: string
  phoneLocal: string
  customerEmail: string
  customerName?: string
  returnUrl: string
}

export type InitiateChariowResult =
  | { ok: true; providerTransactionId: string; checkoutUrl: string }
  | { ok: false; error: string }

function splitName(full: string | undefined, fallbackEmail: string): { first: string; last: string } {
  const v = (full ?? '').trim()
  if (!v) {
    const local = fallbackEmail.split('@')[0] || 'Client'
    return { first: local, last: '-' }
  }
  const parts = v.split(/\s+/)
  return { first: parts[0]!, last: parts.slice(1).join(' ') || '-' }
}

export async function initiateChariowPayment(params: InitiateChariowParams): Promise<InitiateChariowResult> {
  if (!chariowApiKey) {
    return { ok: false, error: 'Chariow non configuré (CHARIOW_API_KEY manquant)' }
  }

  const { first, last } = splitName(params.customerName, params.customerEmail)

  const body = {
    product_id: params.productId,
    email: params.customerEmail,
    first_name: first,
    last_name: last,
    // Sénégal uniquement pour l'instant : numéro local sans le 0 initial, pays fixe.
    phone: { number: params.phoneLocal.replace(/^0/, ''), country_code: 'SN' },
    redirect_url: params.returnUrl,
    custom_metadata: { paymentId: params.reference },
  }

  let res: Response
  try {
    res = await fetch(`${chariowApiUrl}/checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chariowApiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err) {
    return { ok: false, error: `Erreur réseau Chariow : ${(err as Error).message}` }
  }

  let parsed: {
    data?: { purchase?: { id?: string; amount?: { value?: number; currency?: string } }; payment?: { checkout_url?: string } }
    message?: string
  }
  try {
    parsed = await res.json()
  } catch {
    return { ok: false, error: `Chariow a répondu ${res.status} (réponse non-JSON)` }
  }

  const providerTransactionId = parsed.data?.purchase?.id
  const checkoutUrl = parsed.data?.payment?.checkout_url
  const montantDebite = parsed.data?.purchase?.amount?.value

  if (!res.ok || !providerTransactionId || !checkoutUrl) {
    return { ok: false, error: parsed.message || `Chariow a répondu ${res.status}` }
  }

  // Chariow débite le prix du produit configuré dans sa boutique — on vérifie qu'il
  // correspond bien au montant attendu (le produit a pu être mal configuré côté admin).
  if (typeof montantDebite === 'number' && montantDebite !== params.montantAttendu) {
    return {
      ok: false,
      error: `Le produit Chariow configuré facture ${montantDebite}, attendu ${params.montantAttendu}. Vérifie /admin/config.`,
    }
  }

  return { ok: true, providerTransactionId, checkoutUrl }
}

/** Source de vérité : on ne crédite jamais sur la foi du seul webhook (Chariow.md §11). */
export async function fetchChariowSale(saleId: string): Promise<{ status: string; amount?: number; currency?: string } | null> {
  if (!chariowApiKey) return null
  let res: Response
  try {
    res = await fetch(`${chariowApiUrl}/sales/${encodeURIComponent(saleId)}`, {
      headers: { Authorization: `Bearer ${chariowApiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    return null
  }
  if (!res.ok) return null
  const json = (await res.json().catch(() => null)) as {
    data?: { status?: string; amount?: { value?: number; currency?: string } }
  } | null
  if (!json?.data?.status) return null
  return { status: json.data.status, amount: json.data.amount?.value, currency: json.data.amount?.currency }
}

/**
 * Ordre de test impératif : "unpaid" contient "paid" — le tester en premier évite de
 * créditer une vente non payée (piège documenté dans Chariow.md §3.3).
 */
export function mapChariowStatus(raw: string): 'completed' | 'failed' | 'pending' {
  const s = raw.toLowerCase()
  if (s.includes('unpaid')) return 'pending'
  if (s.includes('fail') || s.includes('error')) return 'failed'
  if (s.includes('cancel') || s.includes('abandon') || s.includes('refund')) return 'failed'
  if (s.includes('settle') || s.includes('complete') || s.includes('paid') || s.includes('success')) return 'completed'
  return 'pending'
}

/** Chariow n'a pas de signature : un secret partagé transite dans le query param `?secret=`. */
export function verifyChariowWebhookSecret(url: URL): VerifyWebhookResult {
  if (!chariowWebhookSecret) {
    return { ok: false, error: 'CHARIOW_WEBHOOK_SECRET manquant' }
  }
  const provided = url.searchParams.get('secret')
  if (!provided) {
    return { ok: false, error: 'Paramètre secret manquant' }
  }
  const a = Buffer.from(provided)
  const b = Buffer.from(chariowWebhookSecret)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: 'Secret Chariow invalide' }
  }
  return { ok: true }
}
