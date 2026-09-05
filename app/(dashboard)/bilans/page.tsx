import { getGlobalStats } from './actions'
import BilansClient from './BilansClient'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function BilansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: userData } = await supabase
      .from('utilisateurs')
      .select('gies(subscription_tier)')
      .eq('id', user.id)
      .single()

    const gie = Array.isArray(userData?.gies) ? userData.gies[0] : userData?.gies
    const tier = gie?.subscription_tier || 'standard'
    if (tier !== 'premium') {
      redirect('/dashboard?error=upgrade_required')
    }
  } else {
    redirect('/login')
  }

  const stats = await getGlobalStats()

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl sm:tracking-tight font-heading">
          Bilans & Relevés
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Tableau de bord récapitulatif de la santé financière et opérationnelle du GIE.
        </p>
      </div>

      <BilansClient stats={stats} />
    </div>
  )
}
