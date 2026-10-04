import { createClient } from '@/utils/supabase/server'
import CheckoutClient from './CheckoutClient'
import { redirect } from 'next/navigation'
import { hasBictorysKeys, hasMonerooKeys, hasChariowKeys, hasMaketouKeys } from '@/lib/payments/config'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string, upgrade?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  
  const plan = params.plan || 'standard'
  const isUpgrade = params.upgrade === 'true'

  if (isUpgrade && !user) {
    redirect('/login')
  }

  // Visiteur sans compte : inscription d'abord, sans passer par le formulaire de paiement
  // (il y saisissait son moyen de paiement et son numéro pour rien, puis à nouveau au retour).
  // Après l'inscription, il revient ici connecté pour payer le forfait choisi.
  if (!user) {
    redirect(`/signup?plan=${encodeURIComponent(plan)}`)
  }

  let currentTier = 'standard'
  // GIE d'un autre pays (devise « sans unité ») : abonnement payé par carte en dollars US
  let enDollars = false
  if (user) {
    const { data: userData } = await supabase
      .from('utilisateurs')
      .select('gies(subscription_tier, devise)')
      .eq('id', user.id)
      .single()

    const gie = Array.isArray(userData?.gies) ? userData.gies[0] : userData?.gies
    if (gie) {
      currentTier = gie.subscription_tier || 'standard'
      enDollars = gie.devise === 'AUCUNE'
    }
  }

  return (
    <CheckoutClient
      initialPlan={plan}
      isLoggedIn={!!user}
      currentTier={currentTier}
      isUpgrade={isUpgrade}
      enDollars={enDollars}
      hasOnlinePayment={{ mobileMoney: hasBictorysKeys, carte: hasMonerooKeys, chariow: hasChariowKeys, maketou: hasMaketouKeys }}
      dict={dict}
      locale={locale}
    />
  )
}
