import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ClientLayout from './ClientLayout'

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

  const subscriptionTier = userData?.gies?.subscription_tier || 'standard'
  const gieName = userData?.gies?.nom || 'Mon GIE'

  return (
    <ClientLayout subscriptionTier={subscriptionTier} gieName={gieName}>
      {children}
    </ClientLayout>
  )
}
