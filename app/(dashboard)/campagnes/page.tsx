import { createClient } from '@/utils/supabase/server'
import { Calendar, Settings, FileText } from 'lucide-react'
import Link from 'next/link'
import CreateCampagneButton from './CreateCampagneButton'
import CampagneRowActions from './CampagneRowActions'
import SearchCampagnes from './SearchCampagnes'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function CampagnesPage({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const query = params?.query || ''
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  // Fetch campagnes for the current GIE
  let queryBuilder = supabase
    .from('campagnes')
    .select('*')
    .order('date_debut', { ascending: false })

  if (query) {
    queryBuilder = queryBuilder.or(`nom.ilike.%${query}%,produit_collecte.ilike.%${query}%`)
  }

  const { data: campagnes, error } = await queryBuilder

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold font-heading text-foreground">{dict.campagnes.title}</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            {dict.campagnes.desc}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <CreateCampagneButton dict={dict} />
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mt-8 flex items-center space-x-4">
        <SearchCampagnes dict={dict} />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {campagnes && campagnes.length > 0 ? (
          campagnes.map((campagne) => (
            <div key={campagne.id} className="col-span-1 divide-y divide-surface-border rounded-lg bg-surface border border-surface-border shadow">
              <div className="flex w-full items-center justify-between space-x-6 p-6">
                <div className="flex-1 truncate">
                  <div className="flex items-center justify-between space-x-3 mb-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="truncate text-lg font-medium text-foreground">{campagne.nom}</h3>
                      <span className={`inline-flex flex-shrink-0 items-center rounded-full px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        campagne.statut === 'en_cours' ? 'bg-primary/10 text-primary ring-primary/20' : 
                        campagne.statut === 'terminee' ? 'bg-success/10 text-success ring-success/20' : 
                        'bg-danger/10 text-danger ring-danger/20'
                      }`}>
                        {campagne.statut === 'en_cours' ? dict.campagnes.status.active : campagne.statut === 'terminee' ? dict.campagnes.status.completed : dict.campagnes.status.cancelled}
                      </span>
                    </div>
                    <CampagneRowActions campagne={campagne} dict={dict} />
                  </div>
                  <p className="mt-1 truncate text-sm text-foreground-muted">
                    {dict.campagnes.card.from} {campagne.date_debut ? new Date(campagne.date_debut).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US') : '-'} {dict.campagnes.card.to} {campagne.date_fin ? new Date(campagne.date_fin).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US') : '-'}
                  </p>
                  <div className="mt-4 flex items-center text-sm text-foreground-muted gap-2">
                    <span className="font-semibold text-foreground">{dict.campagnes.card.repayment}</span> 
                    <span className="capitalize">{campagne.mode_remboursement}</span>
                    {campagne.produit_collecte && ` (${campagne.produit_collecte})`}
                  </div>
                </div>
              </div>
              <div>
                <div className="-mt-px flex divide-x divide-surface-border">
                  <div className="flex w-0 flex-1">
                    <Link
                      href={`/campagnes/${campagne.id}/config`}
                      className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      <Settings className="h-5 w-5 text-foreground-muted" aria-hidden="true" />
                      {dict.campagnes.card.configure}
                    </Link>
                  </div>
                  <div className="-ml-px flex w-0 flex-1">
                    <Link
                      href={`/campagnes/${campagne.id}/bilan`}
                      className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      <FileText className="h-5 w-5 text-foreground-muted" aria-hidden="true" />
                      {dict.campagnes.card.report}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-8 text-center text-sm text-foreground-muted border-2 border-dashed border-surface-border rounded-lg">
            {dict.campagnes.empty}
          </div>
        )}
      </div>
    </div>
  )
}
