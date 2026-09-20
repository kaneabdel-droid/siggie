import { createClient } from '@/utils/supabase/server'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import { hasPermission } from '@/lib/permissions'
import { getBilanAnnuel } from './actions'
import BilanAnnuelClient from './BilanAnnuelClient'

export default async function BilanAnnuelPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>
}) {
  const { annee: anneeParam } = await searchParams
  const anneeCourante = new Date().getFullYear()
  const parsed = Number(anneeParam)
  const annee = Number.isInteger(parsed) && parsed >= 2000 && parsed <= anneeCourante + 1 ? parsed : anneeCourante

  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()
  const t = dict.bilan_annuel

  const supabase = await createClient()
  const [data, { data: gie }] = await Promise.all([
    getBilanAnnuel(annee),
    supabase.from('gies').select('nom, adresse, telephone, email, identification, devise, logo_url').limit(1).maybeSingle(),
  ])

  const annees = Array.from({ length: 8 }, (_, i) => anneeCourante + 1 - i)
  const canEdit = tenant ? hasPermission(tenant.role, tenant.permissions, 'bilan_annuel', 'update') : false

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-base font-semibold leading-6 text-foreground break-words">{t.title}</h3>
        <p className="mt-2 text-sm text-foreground-muted break-words">{t.desc}</p>
      </div>

      {'error' in data ? (
        <div className="p-4 bg-danger/10 text-danger rounded-md">{data.error}</div>
      ) : (
        <BilanAnnuelClient
          annee={annee}
          annees={annees}
          n={data.n}
          n1={data.n1}
          devise={gie?.devise ?? 'XOF'}
          canEdit={canEdit}
          gie={{
            nom: gie?.nom || tenant?.gieName || 'Mon GIE',
            adresse: gie?.adresse ?? '',
            telephone: gie?.telephone ?? '',
            email: gie?.email ?? '',
            identification: gie?.identification ?? '',
            logoUrl: gie?.logo_url ?? null,
          }}
          locale={locale}
          dict={dict}
        />
      )}
    </div>
  )
}
