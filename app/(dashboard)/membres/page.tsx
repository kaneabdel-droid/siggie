import { createClient } from '@/utils/supabase/server'
import { Search, Users, UserCheck } from 'lucide-react'
import Link from 'next/link'
import SearchMembres from './SearchMembres'
import CreateMembreButton from './CreateMembreButton'
import MembreRowActions from './MembreRowActions'
import ClientsListTab from './ClientsListTab'
import { getDictionary, getLocale } from '@/dictionaries'
import { getClients } from '@/app/(dashboard)/bilans/releve-client/actions'
import { getTenantContext } from '@/utils/supabase/tenant'

export default async function MembresPage({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string; tab?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const query = params?.query || ''
  const currentTab = params?.tab === 'clients' ? 'clients' : 'membres'
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()

  // Fetch members for the current GIE
  let queryBuilder = supabase
    .from('membres')
    .select('*')
    .order('nom', { ascending: true })

  if (query && currentTab === 'membres') {
    queryBuilder = queryBuilder.or(`nom.ilike.%${query}%,prenom.ilike.%${query}%,village.ilike.%${query}%`)
  }

  const [{ data: membres, error }, { clients }] = await Promise.all([
    queryBuilder,
    getClients(),
  ])

  const totalClients = clients?.length || 0

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-heading text-foreground break-words">{dict.membres.title}</h2>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {currentTab === 'membres'
                ? `${membres?.length || 0} membre${(membres?.length || 0) > 1 ? 's' : ''}`
                : `${totalClients} client${totalClients > 1 ? 's' : ''}`}
            </span>
          </div>
          <p className="mt-2 text-sm text-foreground-muted">
            {dict.membres.desc}
          </p>
        </div>
        {currentTab === 'membres' && (
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <CreateMembreButton dict={dict} />
          </div>
        )}
      </div>

      {/* Tabs Switcher: Membres vs Clients Externes */}
      <div className="mt-6 border-b border-surface-border">
        <nav className="flex space-x-6" aria-label="Tabs">
          <Link
            href="/membres"
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              currentTab === 'membres'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Membres du GIE</span>
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
              currentTab === 'membres' ? 'bg-primary/15 text-primary' : 'bg-surface text-foreground-muted'
            }`}>
              {membres?.length || 0}
            </span>
          </Link>

          <Link
            href="/membres?tab=clients"
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              currentTab === 'clients'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Clients Externes (Acheteurs & Prestations)</span>
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
              currentTab === 'clients' ? 'bg-primary/15 text-primary' : 'bg-surface text-foreground-muted'
            }`}>
              {totalClients}
            </span>
          </Link>
        </nav>
      </div>

      {/* Tab Content */}
      {currentTab === 'clients' ? (
        <div className="mt-6">
          <ClientsListTab
            initialClients={clients || []}
            gieName={tenant?.gieName || 'Mon GIE'}
            dict={dict}
            locale={locale}
          />
        </div>
      ) : (
        <>
          {/* Barre de recherche Membres */}
          <div className="mt-6 flex items-center space-x-4">
            <SearchMembres dict={dict} />
          </div>

          {/* Table des membres */}
          <div className="mt-6 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
                  <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-2 text-left text-xs font-semibold text-foreground-muted sm:pl-6 w-14">
                      N°
                    </th>
                    <th scope="col" className="py-3.5 pl-3 pr-3 text-left text-sm font-semibold text-foreground">
                      {dict.membres.table.name}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      {dict.membres.table.village}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      {dict.membres.table.phone}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">
                      {dict.membres.table.superficie}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">
                      {dict.membres?.table?.solde_initial || 'Solde initial'}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      {dict.membres.table.status}
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">{dict.membres.table.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {membres && membres.length > 0 ? (
                    membres.map((membre, index) => (
                      <tr key={membre.id} className="hover:bg-background/50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-2 text-xs font-mono font-semibold text-foreground-muted sm:pl-6">
                          {String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="whitespace-nowrap py-4 pl-3 pr-3 text-sm font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{membre.nom} {membre.prenom}</span>
                            {membre.code_membre && (
                              <span className="inline-flex items-center rounded bg-background px-1.5 py-0.5 text-[11px] font-mono font-medium text-foreground-muted border border-surface-border">
                                {membre.code_membre}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                          {membre.village || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                          {membre.telephone || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted text-right">
                          {membre.superficie ? Number(membre.superficie).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                          {membre.solde_initial ? (
                            <span className={Number(membre.solde_initial) > 0 ? 'text-danger font-medium' : Number(membre.solde_initial) < 0 ? 'text-success font-medium' : 'text-foreground-muted'}>
                              {Number(membre.solde_initial).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} F
                            </span>
                          ) : (
                            <span className="text-foreground-muted">0 F</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            membre.statut === 'actif' ? 'bg-primary/10 text-primary ring-primary/20' : 'bg-foreground-muted/10 text-foreground-muted ring-foreground-muted/20'
                          }`}>
                            {membre.statut === 'actif' ? dict.membres.status.active : dict.membres.status.inactive}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <MembreRowActions membre={membre} dict={dict} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        {dict.membres.empty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )}
</div>
)
}
