import { createClient } from '@/utils/supabase/server'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import SuiviBudgetaireClient from './SuiviBudgetaireClient'

import Link from 'next/link'
import { ClipboardList } from 'lucide-react'

export default async function SuiviBudgetairePage() {
  const tenant = await getTenantContext()

  if (tenant?.subscriptionTier !== 'premium') {
    return (
      <div className="bg-surface rounded-xl border border-surface-border p-8 text-center max-w-lg mx-auto shadow-sm my-12">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Suivi Budgétaire Campagne</h3>
        <p className="text-sm text-foreground-muted mt-2">
          Le suivi budgétaire temps réel (prévisions vs réalisations) est une fonctionnalité réservée au forfait Premium. Vos relevés membre et client restent consultables.
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

  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.suivi_budgetaire

  const { data: campagnes } = await supabase
    .from('campagnes')
    .select('id, nom, statut')
    .order('date_debut', { ascending: false })

  const campagneEnCours = (campagnes || []).find((c) => c.statut === 'en_cours')
  const defaultCampagneId = campagneEnCours?.id || campagnes?.[0]?.id || ''

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-4 mb-6">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-6 text-foreground break-words">{t.title}</h3>
          <p className="mt-2 text-sm text-foreground-muted break-words">{t.desc}</p>
        </div>
      </div>

      {!campagnes || campagnes.length === 0 ? (
        <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
          {t.no_campaigns}
        </div>
      ) : (
        <SuiviBudgetaireClient campagnes={campagnes} defaultCampagneId={defaultCampagneId} dict={dict} gieName={tenant?.gieName || 'Mon GIE'} />
      )}
    </div>
  )
}
