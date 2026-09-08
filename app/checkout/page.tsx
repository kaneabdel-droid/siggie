import { createClient } from '@/utils/supabase/server'
import CheckoutClient from './CheckoutClient'
import { redirect } from 'next/navigation'
import { hasBictorysKeys, hasMonerooKeys, hasChariowKeys } from '@/lib/payments/config'
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

  let currentTier = 'standard'
  if (user) {
    const { data: userData } = await supabase
      .from('utilisateurs')
      .select('gies(subscription_tier)')
      .eq('id', user.id)
      .single()

    const gie = Array.isArray(userData?.gies) ? userData.gies[0] : userData?.gies
    if (gie) {
      currentTier = gie.subscription_tier || 'standard'
    }
  }

  return (
    <CheckoutClient
      initialPlan={plan}
      isLoggedIn={!!user}
      currentTier={currentTier}
      isUpgrade={isUpgrade}
      hasOnlinePayment={{ mobileMoney: hasBictorysKeys, carte: hasMonerooKeys, chariow: hasChariowKeys }}
      dict={dict}
      locale={locale}
    />
  )
}
