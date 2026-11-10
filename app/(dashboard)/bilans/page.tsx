import { getGlobalStats } from './actions'
import BilansClient from './BilansClient'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'

export default async function BilansPage() {
  const tenant = await getTenantContext()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  if (tenant?.subscriptionTier !== 'premium') {
    return (
      <div className="bg-surface rounded-xl border border-surface-border p-8 text-center max-w-lg mx-auto shadow-sm my-12">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Bilan & Suivi budgétaire</h3>
        <p className="text-sm text-foreground-muted mt-2">
          La vue consolidée des bilans d&apos;exploitation et le suivi budgétaire sont des fonctionnalités réservées au forfait Premium.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/abonnement"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
          >
            Passer à Premium
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-surface border border-surface-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
          >
            Tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  const stats = await getGlobalStats()

  return <BilansClient stats={stats} dict={dict} gieName={tenant?.gieName || 'Mon GIE'} />
}
