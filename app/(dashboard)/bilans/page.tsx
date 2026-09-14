import { getGlobalStats } from './actions'
import BilansClient from './BilansClient'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'

export default async function BilansPage() {
  const stats = await getGlobalStats()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()

  return <BilansClient stats={stats} dict={dict} gieName={tenant?.gieName || 'Mon GIE'} />
}
