import { getGlobalStats } from './actions'
import BilansClient from './BilansClient'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'

import { redirect } from 'next/navigation'

export default async function BilansPage() {
  const tenant = await getTenantContext()
  if (tenant?.subscriptionTier !== 'premium') {
    redirect('/bilans/releve-membre')
  }

  const stats = await getGlobalStats()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return <BilansClient stats={stats} dict={dict} gieName={tenant?.gieName || 'Mon GIE'} />
}
