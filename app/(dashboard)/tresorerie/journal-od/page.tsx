import { getOperationsOD, getContexteOD } from './actions'
import JournalODClient from './JournalODClient'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'

export default async function JournalODPage() {
  const [{ operations, error }, { imputations, comptes }, locale, tenant] = await Promise.all([
    getOperationsOD(),
    getContexteOD(),
    getLocale(),
    getTenantContext(),
  ])

  const dict = await getDictionary(locale)
  const gieName = tenant?.gieName || 'Mon GIE'

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur : {error}</div>
  }

  return (
    <JournalODClient
      initialOperations={operations || []}
      imputations={imputations || []}
      comptes={comptes || []}
      dict={dict}
      locale={locale}
      gieName={gieName}
    />
  )
}
