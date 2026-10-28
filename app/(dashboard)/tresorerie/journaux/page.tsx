import { createClient } from '@/utils/supabase/server'
import { getComptes } from '../actions'
import { getImputations } from '../imputations/actions'
import JournalClient from './JournalClient'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'

export default async function JournauxPage({
  searchParams,
}: {
  searchParams?: Promise<{ compteId?: string }>
}) {
  const resolvedParams = searchParams ? await searchParams : undefined
  const initialCompteId = resolvedParams?.compteId
  const supabase = await createClient()
  const [
    { comptes, error },
    { imputations },
    { data: campagnes },
    { data: clients },
    { data: membres },
    { data: materiels },
  ] = await Promise.all([
    getComptes(),
    getImputations(),
    supabase.from('campagnes').select('id, nom, statut').order('date_debut', { ascending: false }),
    supabase.from('clients_externes').select('id, nom, telephone').order('nom', { ascending: true }),
    supabase.from('membres').select('id, nom, prenom, code_membre').order('nom', { ascending: true }),
    supabase.from('materiels').select('id, nom, code_materiel').order('nom', { ascending: true }),
  ])
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()
  const t = dict.tresorerie_pages.journaux

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  if (!comptes || comptes.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
        {t.no_account}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-base font-semibold leading-6 text-foreground">{t.title}</h3>
        <p className="mt-2 text-sm text-foreground-muted">
          {t.desc}
        </p>
      </div>

      <JournalClient
        comptes={comptes}
        imputations={imputations || []}
        campagnes={campagnes || []}
        clients={clients || []}
        membres={membres || []}
        materiels={materiels || []}
        initialCompteId={initialCompteId}
        dict={dict}
        locale={locale}
        gieName={tenant?.gieName || 'Mon GIE'}
      />
    </div>
  )
}
