import { createClient } from '@/utils/supabase/server'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import { hasPermission } from '@/lib/permissions'
import { getRistournesData } from './actions'
import RistournesClient from './RistournesClient'

export default async function RistournesPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()
  const t = dict.ristournes

  const supabase = await createClient()
  const [data, { data: gie }] = await Promise.all([
    getRistournesData(),
    supabase.from('gies').select('devise').limit(1).maybeSingle(),
  ])

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-base font-semibold leading-6 text-foreground">{t.title}</h3>
        <p className="mt-2 text-sm text-foreground-muted">{t.desc}</p>
      </div>

      {'error' in data ? (
        <div className="p-4 bg-danger/10 text-danger rounded-md">{data.error}</div>
      ) : (
        <RistournesClient
          surplus={data.surplus}
          historique={data.historique}
          comptes={data.comptes}
          devise={gie?.devise ?? 'XOF'}
          canCreate={tenant ? hasPermission(tenant.role, tenant.permissions, 'ristournes', 'create') : false}
          canDelete={tenant ? hasPermission(tenant.role, tenant.permissions, 'ristournes', 'delete') : false}
          dict={dict}
        />
      )}
    </div>
  )
}
