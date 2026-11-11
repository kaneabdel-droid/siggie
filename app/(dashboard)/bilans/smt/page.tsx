import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import { hasPermission } from '@/lib/permissions'
import { getSMT } from './actions'
import SMTClient from './SMTClient'
import Link from 'next/link'
import { Scale } from 'lucide-react'

export default async function SMTPage({
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
        <h3 className="text-lg font-bold text-foreground">Système Minimal de Trésorerie (SMT)</h3>
        <p className="text-sm text-foreground-muted mt-2">
          Le Système Minimal de Trésorerie consolidé (Compte d&apos;exploitation global et décliné, Bilan patrimonial et Livre de trésorerie) est réservé au forfait Premium.
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

  const { annee: anneeParam } = await searchParams
  const anneeCourante = new Date().getFullYear()
  const parsed = Number(anneeParam)
  const annee = Number.isInteger(parsed) && parsed >= 2000 && parsed <= anneeCourante + 1 ? parsed : anneeCourante

  const locale = await getLocale()
  const dict = await getDictionary(locale)

  const data = await getSMT(annee)
  const annees = Array.from({ length: 8 }, (_, i) => anneeCourante + 1 - i)
  const canEdit = tenant ? hasPermission(tenant.role, tenant.permissions, 'bilan_annuel', 'update') : false

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-bold leading-6 text-foreground break-words font-heading">
          Système Minimal de Trésorerie (SMT)
        </h3>
        <p className="mt-1.5 text-sm text-foreground-muted break-words">
          États financiers annuels conformes SYSCOHADA : Compte d&apos;exploitation (Global, Exploitation agricole, Matériel), Bilan patrimonial et Livre de trésorerie.
        </p>
      </div>

      {'error' in data ? (
        <div className="p-4 bg-danger/10 text-danger rounded-md border border-danger/20">
          {data.error}
        </div>
      ) : (
        <SMTClient
          annee={annee}
          annees={annees}
          data={data}
          gieName={tenant?.gieName || 'Mon GIE'}
          canEdit={canEdit}
          dict={dict}
          locale={locale}
        />
      )}
    </div>
  )
}

