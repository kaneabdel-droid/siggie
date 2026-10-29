import Link from 'next/link'
import { getComptes } from './actions'
import { Landmark, Plus, Wallet, ArrowRight } from 'lucide-react'
import AddCompteModal from './AddCompteModal'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import { uniteMontant } from '@/lib/currency'

export default async function TresoreriePage() {
  const unite = uniteMontant((await getTenantContext())?.devise)
  const { comptes, error } = await getComptes()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  const totalGlobal = comptes?.reduce((acc, c) => acc + (c.solde_courant || 0), 0) || 0

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-4 mb-8">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-6 text-foreground break-words">{dict.tresorerie.balances.title}</h3>
          <p className="mt-2 text-sm text-foreground-muted break-words">
            {dict.tresorerie.balances.desc}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:flex-none">
          <AddCompteModal dict={dict} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="overflow-hidden rounded-lg bg-primary px-4 py-5 shadow sm:p-6 text-white">
          <dt className="truncate text-sm font-medium text-white/80">{dict.tresorerie.balances.total}</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight">{totalGlobal.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}{unite}</dd>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {comptes?.map((compte) => (
          <Link
            key={compte.id}
            href={`/tresorerie/journaux?compteId=${compte.id}`}
            className="group overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center justify-between gap-4 hover:border-primary hover:shadow-md transition-all cursor-pointer"
            title="Consulter le journal de ce compte"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-secondary/10 text-secondary rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                {compte.type_compte === 'caisse' ? <Wallet className="h-6 w-6" /> : <Landmark className="h-6 w-6" />}
              </div>
              <div className="min-w-0">
                <dt className="truncate text-sm font-medium text-foreground-muted group-hover:text-foreground transition-colors">{compte.nom}</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground truncate font-mono">
                  {(compte.solde_courant || 0).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-foreground-muted font-sans">{unite.trim()}</span>
                </dd>
                <div className="text-[11px] text-foreground-muted/80 mt-0.5">
                  Solde initial au 01/01/2026
                </div>
              </div>
            </div>
            <div className="shrink-0 text-foreground-muted/60 group-hover:text-primary group-hover:translate-x-1 transition-all">
              <ArrowRight className="h-5 w-5" />
            </div>
          </Link>
        ))}
        {comptes?.length === 0 && (
          <div className="col-span-full text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
            {dict.tresorerie.balances.empty}
          </div>
        )}
      </div>
    </div>
  )
}
