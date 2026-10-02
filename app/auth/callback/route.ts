import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { pageSuivante } from '@/lib/suite'

// Point de passage obligé pour tous les liens envoyés par Supabase Auth (récupération
// de mot de passe, confirmation d'inscription) : Supabase redirige ici avec un `code`
// à échanger contre une session AVANT d'atterrir sur la page finale (`next`). Sans
// cette route, le code n'est jamais échangé et l'utilisateur atterrit déconnecté.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = pageSuivante(searchParams.get('next')) || '/update-password'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Confirmation d'inscription ouverte dans un autre navigateur que celui de l'inscription :
  // l'échange échoue mais l'adresse est confirmée. On demande de se connecter en gardant la
  // page suivante (paiement du forfait choisi).
  if (next.startsWith('/checkout')) {
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent('Adresse e-mail confirmée avec succès. Connectez-vous pour finaliser votre abonnement.')}&next=${encodeURIComponent(next)}`
    )
  }

  return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent('Lien invalide ou expiré, merci de refaire la demande.')}`)
}
