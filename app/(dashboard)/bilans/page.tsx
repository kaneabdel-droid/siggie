import { getGlobalStats } from './actions'
import BilansClient from './BilansClient'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function BilansPage() {
  const stats = await getGlobalStats()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return <BilansClient stats={stats} dict={dict} />
}
