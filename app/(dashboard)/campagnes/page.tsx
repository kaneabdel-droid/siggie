import { createClient } from '@/utils/supabase/server'
import { Calendar, Settings, FileText, PieChart, CheckSquare, GitCompare } from 'lucide-react'
import Link from 'next/link'
import CreateCampagneButton from './CreateCampagneButton'
import CampagneRowActions from './CampagneRowActions'
import SearchCampagnes from './SearchCampagnes'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'

export default async function CampagnesPage({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string }>
}) {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  const isPremium = tenant?.subscriptionTier === 'premium'
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
        <div className="sm:flex-auto min-w-0">
          <h2 className="text-2xl font-bold font-heading text-foreground break-words">{dict.campagnes.title}</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            {dict.campagnes.desc}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex sm:items-center sm:gap-3">
          <Link
            href="/dashboard#comparatif-campagnes"
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:bg-background hover:border-primary/40 transition shadow-xs"
            title={isPremium ? "Accéder au comparatif des campagnes N vs N-1" : "Comparatif inter-campagnes réservé à la formule Premium"}
          >
            <GitCompare className="h-4 w-4 text-primary shrink-0" />
            <span>Comparatif inter-campagnes</span>
            {!isPremium && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                Premium
              </span>
            )}
          </Link>
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
              <div className="p-3 bg-surface/40 border-t border-surface-border">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Link
                    href={`/campagnes/${campagne.id}/config`}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-surface-border bg-background hover:bg-surface hover:border-primary/40 px-2.5 py-2 text-xs font-semibold text-foreground hover:text-primary transition-all text-center"
                    title={dict.campagnes.card.configure}
                  >
                    <Settings className="h-4 w-4 text-foreground-muted shrink-0" aria-hidden="true" />
                    <span className="truncate">{dict.campagnes.card.configure}</span>
                  </Link>

                  <Link
                    href={isPremium ? `/superficies?campagne_id=${campagne.id}` : `/superficies`}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-surface-border bg-background hover:bg-surface hover:border-emerald-500/40 px-2.5 py-2 text-xs font-semibold text-foreground hover:text-emerald-500 transition-all text-center"
                    title={isPremium ? "Validation des superficies après tour de casier" : "Module Tour de casier réservé à la formule Premium"}
                  >
                    <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
                    <span className="truncate">Tour de casier</span>
                    {!isPremium && (
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                        Pro
                      </span>
                    )}
                  </Link>

                  <Link
                    href={`/campagnes/${campagne.id}/repartition`}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-surface-border bg-background hover:bg-surface hover:border-primary/40 px-2.5 py-2 text-xs font-semibold text-foreground hover:text-primary transition-all text-center"
                    title={dict.campagnes.card.repartition}
                  >
                    <PieChart className="h-4 w-4 text-foreground-muted shrink-0" aria-hidden="true" />
                    <span className="truncate">{dict.campagnes.card.repartition}</span>
                  </Link>

                  <Link
                    href={`/campagnes/${campagne.id}/bilan`}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-surface-border bg-background hover:bg-surface hover:border-primary/40 px-2.5 py-2 text-xs font-semibold text-foreground hover:text-primary transition-all text-center"
                    title={dict.campagnes.card.report}
                  >
                    <FileText className="h-4 w-4 text-foreground-muted shrink-0" aria-hidden="true" />
                    <span className="truncate">{dict.campagnes.card.report}</span>
                  </Link>
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
