'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { pageSuivante, suitePaiement } from '@/lib/suite'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const plan = (formData.get('plan') as string) || 'standard'
  // Inscription depuis les tarifs ou la page de paiement : la page de paiement du forfait choisi
  // s'ouvre juste après (ou après la confirmation de l'adresse email), au lieu du tableau de bord.
  const suite = pageSuivante(formData.get('next')) ?? suitePaiement(formData.get('plan') as string | null)

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        gie_nom: formData.get('gie_nom') as string,
        plan,
      },
      // Passe par /auth/callback pour échanger le code Supabase contre une session
      // avant d'atterrir sur la page suivante (paiement du forfait, sinon /login) —
      // sans ça, le lien de confirmation renvoie un visiteur déconnecté vers l'accueil.
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(suite ?? '/login')}`,
    }
  }

  const { data: inscription, error } = await supabase.auth.signUp(data)

  if (error) {
    return redirect('/signup?message=' + encodeURIComponent(error.message))
  }

  // Confirmation d'email désactivée : la session est ouverte, on va directement au paiement.
  if (inscription.session && suite) {
    return redirect(suite)
  }

  // Sinon, on demande de confirmer l'adresse ; le lien mènera à la page de paiement.
  const message = suite
    ? "Compte créé avec succès ! Vérifiez votre boîte mail : le lien de confirmation vous mènera au paiement de votre abonnement."
    : "Compte créé avec succès ! Un lien de confirmation a été envoyé à votre adresse e-mail. Vous devez cliquer sur ce lien avant de pouvoir vous connecter."
  return redirect('/login?message=' + encodeURIComponent(message) + (suite ? '&next=' + encodeURIComponent(suite) : ''))
}
