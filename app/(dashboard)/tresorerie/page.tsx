import { getComptes } from './actions'
import { Landmark, Plus, Wallet } from 'lucide-react'
import AddCompteModal from './AddCompteModal'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function TresoreriePage() {
  const { comptes, error } = await getComptes()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  const totalGlobal = comptes?.reduce((acc, c) => acc + (c.solde_courant || 0), 0) || 0

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h3 className="text-base font-semibold leading-6 text-foreground">{dict.tresorerie.balances.title}</h3>
          <p className="mt-2 text-sm text-foreground-muted">
            {dict.tresorerie.balances.desc}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <AddCompteModal />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="overflow-hidden rounded-lg bg-primary px-4 py-5 shadow sm:p-6 text-white">
          <dt className="truncate text-sm font-medium text-white/80">{dict.tresorerie.balances.total}</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight">{totalGlobal.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} FCFA</dd>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {comptes?.map((compte) => (
          <div key={compte.id} className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center gap-4">
            <div className="p-3 bg-secondary/10 text-secondary rounded-lg">
              {compte.type_compte === 'caisse' ? <Wallet className="h-6 w-6" /> : <Landmark className="h-6 w-6" />}
            </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">{compte.nom}</dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground truncate">
                {(compte.solde_courant || 0).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-foreground-muted">FCFA</span>
              </dd>
            </div>
          </div>
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
