import { createClient } from '@/utils/supabase/server'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import SuiviBudgetaireClient from './SuiviBudgetaireClient'

export default async function SuiviBudgetairePage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()
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
