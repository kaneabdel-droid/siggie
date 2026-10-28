import { createClient } from '@/utils/supabase/server'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import { hasPermission } from '@/lib/permissions'
import { getBilanAnnuel } from './actions'
import BilanAnnuelClient from './BilanAnnuelClient'

import Link from 'next/link'
import { Scale } from 'lucide-react'

export default async function BilanAnnuelPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>
}) {
  const tenant = await getTenantContext()

  if (tenant?.subscriptionTier !== 'premium') {
    return (
      <div className="bg-surface rounded-xl border border-surface-border p-8 text-center max-w-lg mx-auto shadow-sm my-12">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <Scale className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Bilan Annuel d&apos;Exploitation</h3>
        <p className="text-sm text-foreground-muted mt-2">
          Le bilan financier annuel consolidé est une fonctionnalité réservée au forfait Premium. Vos relevés membre et client restent quant à eux accessibles.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/abonnement"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
          >
            Passer à Premium
          </Link>
          <Link
            href="/bilans/releve-membre"
            className="inline-flex items-center justify-center rounded-md bg-surface border border-surface-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
          >
            Voir les Relevés
          </Link>
        </div>
      </div>
    )
  }

  const { annee: anneeParam } = await searchParams
  const anneeCourante = new Date().getFullYear()
  const parsed = Number(anneeParam)
  const annee = Number.isInteger(parsed) && parsed >= 2000 && parsed <= anneeCourante + 1 ? parsed : anneeCourante

  const locale = await getLocale()
  const dict = await getDictionary(locale)
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
