'use server'

import { getDictionary } from '@/dictionaries'
import { transfererAuSupport, SUJET_MAX, MESSAGE_MAX } from '@/lib/support/transferer'

// Formulaire "Nous contacter" de la landing : visiteurs non connectés (prospects), donc
// pas d'enregistrement en base (aucun tenant auquel rattacher la demande) — uniquement
// le transfert par email vers support@dembasolution.com, Reply-To = email du prospect.

const PRODUITS = ['SIGGIE', 'D-QUINCA', 'D-INTRANTS', 'D-AGROBUSINESS']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Un humain met plus de 3 s à remplir le formulaire ; un robot le soumet aussitôt.
const DELAI_MIN_MS = 3000

export async function envoyerContactProspect(formData: FormData): Promise<{ success?: true; error?: string }> {
  const errors = (await getDictionary()).landing.contact.errors

  // Pot de miel : champ caché que seuls les robots remplissent. On simule un succès
  // pour ne pas leur indiquer qu'ils ont été repérés.
  const ouvertLe = Number(formData.get('ouvert_le'))
  if (formData.get('site_web') || !ouvertLe || Date.now() - ouvertLe < DELAI_MIN_MS) {
    return { success: true }
  }

  const nom = String(formData.get('nom') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const telephone = String(formData.get('telephone') || '').trim()
  const produitSaisi = String(formData.get('produit') || '')
  const message = String(formData.get('message') || '').trim()

  if (!nom || !email || !message) return { error: errors.required }
  if (!EMAIL_RE.test(email) || email.length > 200) return { error: errors.email }
  if (nom.length > 120 || telephone.length > 30 || message.length > MESSAGE_MAX) return { error: errors.too_long }

  const produit = PRODUITS.includes(produitSaisi) ? produitSaisi : 'DembaSolution'
  const premiereLigne = message.split('\n')[0].slice(0, SUJET_MAX - 40)

  const envoye = await transfererAuSupport({
    produit,
    email,
    organisation: `Prospect : ${nom}${telephone ? ` — ${telephone}` : ''}`,
    sujet: `Demande de contact — ${premiereLigne}`,
    message,
  })

  return envoye ? { success: true } : { error: errors.failed }
}
