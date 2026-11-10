import { getClients } from '@/app/(dashboard)/bilans/releve-client/actions'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import ReleveClientClient from '@/app/(dashboard)/bilans/releve-client/ReleveClientClient'

export default async function TiersReleveClientPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()
  const { clients, error } = await getClients()

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return (
    <ReleveClientClient
      initialClients={clients || []}
      dict={dict}
      locale={locale}
      gieName={tenant?.gieName || 'Mon GIE'}
    />
  )
}
