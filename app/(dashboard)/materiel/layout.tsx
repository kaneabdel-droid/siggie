import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ClientMaterielLayout from './ClientMaterielLayout'

export default async function MaterielLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: userData } = await supabase
      .from('utilisateurs')
      .select('gies(subscription_tier)')
      .eq('id', user.id)
      .single()

    const tier = userData?.gies?.subscription_tier || 'standard'
    if (tier === 'standard') {
      redirect('/dashboard?error=upgrade_required')
    }
  } else {
    redirect('/login')
  }

  return (
    <ClientMaterielLayout>
      {children}
    </ClientMaterielLayout>
  )
}
