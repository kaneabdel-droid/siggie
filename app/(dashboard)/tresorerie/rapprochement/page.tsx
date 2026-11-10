import { createClient } from '@/utils/supabase/server'
import RapprochementClient from './RapprochementClient'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import { getCreditType } from '@/lib/credits-types'

export default async function RapprochementPage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()
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

  // On récupère les crédits du GIE pour identifier les campagnes associées à un crédit de campagne (court terme)
  const { data: allCredits } = await supabase
    .from('credits')
    .select('id, campagne_id, type_credit, but_credit, montant_accorde, banque_nom, statut')

  // Annoter chaque campagne pour guider l'utilisateur
  const campagnesWithCredits = campagnes.map((campagne) => {
    const creditsCampagne = (allCredits || []).filter(
      (c) => c.campagne_id === campagne.id && getCreditType(c) === 'campagne'
    )
    const creditsEquipement = (allCredits || []).filter(
      (c) => c.campagne_id === campagne.id && getCreditType(c) === 'equipement'
    )
    return {
      ...campagne,
      hasCreditCampagne: creditsCampagne.length > 0,
      hasCreditEquipement: creditsEquipement.length > 0,
      creditsCampagneCount: creditsCampagne.length,
    }
  })

  // Trier les campagnes : celles avec un crédit de campagne en premier
  const sortedCampagnes = [...campagnesWithCredits].sort((a, b) => {
    if (a.hasCreditCampagne && !b.hasCreditCampagne) return -1
    if (!a.hasCreditCampagne && b.hasCreditCampagne) return 1
    return 0
  })

  // Identifier la campagne par défaut (la première avec crédit de campagne si disponible)
  const defaultCampagneId =
    sortedCampagnes.find((c) => c.hasCreditCampagne)?.id || sortedCampagnes[0]?.id || ''

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-base font-semibold leading-6 text-foreground">{t.title}</h3>
        <p className="mt-2 text-sm text-foreground-muted">
          {t.desc}
        </p>
      </div>

      <RapprochementClient
        campagnes={sortedCampagnes}
        initialCampagneId={defaultCampagneId}
        dict={dict}
        locale={locale}
        gieName={tenant?.gieName || 'Mon GIE'}
      />
    </div>
  )
}
