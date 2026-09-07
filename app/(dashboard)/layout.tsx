import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ClientLayout from './ClientLayout'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user details
  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('role, gies(nom, subscription_tier)')
    .eq('id', user.id)
    .single()

  const gie = Array.isArray(userData?.gies) ? userData.gies[0] : userData?.gies
  const subscriptionTier = gie?.subscription_tier || 'standard'
  const gieName = gie?.nom || 'Mon GIE'

  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <ClientLayout 
      subscriptionTier={subscriptionTier} 
      gieName={gieName}
      dict={dict}
      locale={locale}
    >
      {children}
    </ClientLayout>
  )
}
