import { createClient } from '@/utils/supabase/server'
import RapprochementClient from './RapprochementClient'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function RapprochementPage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.tresorerie_pages.rapprochement

  // On récupère toutes les campagnes du GIE
  const { data: campagnes, error } = await supabase
    .from('campagnes')
    .select('id, nom, statut')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error.message}</div>
  }

  if (!campagnes || campagnes.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
        {t.no_campaigns}
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

      <RapprochementClient campagnes={campagnes} dict={dict} locale={locale} />
    </div>
  )
}
