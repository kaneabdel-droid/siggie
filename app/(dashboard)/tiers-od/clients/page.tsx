import { getClients } from '@/app/(dashboard)/bilans/releve-client/actions'
import ClientsListTab from '@/app/(dashboard)/membres/ClientsListTab'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'

export default async function TiersClientsPage() {
  const [{ clients }, locale, tenant] = await Promise.all([
    getClients(),
    getLocale(),
    getTenantContext(),
  ])

  const dict = await getDictionary(locale)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Comptes Clients Externes</h3>
          <p className="text-sm text-foreground-muted">
            Gestion du répertoire des acheteurs, bénéficiaires de prestations et clients du GIE.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {clients?.length || 0} client{(clients?.length || 0) > 1 ? 's' : ''}
        </span>
      </div>

      <ClientsListTab
        initialClients={clients || []}
        gieName={tenant?.gieName || 'Mon GIE'}
        dict={dict}
        locale={locale}
      />
    </div>
  )
}

