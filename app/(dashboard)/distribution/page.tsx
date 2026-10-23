import { createClient } from '@/utils/supabase/server'
import DistributionClient from './DistributionClient'
import { getDictionary, getLocale } from '@/dictionaries'

export const dynamic = 'force-dynamic'

export default async function DistributionPage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  // 1. Fetch campaigns (active ones)
  const { data: campagnes } = await supabase
    .from('campagnes')
    .select('id, nom')
    .in('statut', ['en_cours', 'planifiee'])
    .order('created_at', { ascending: false })

  // 2. Fetch all intrants configured for a campaign (les intrants non stockables
  // comme Refacturation/Service Hydraulique n'ont pas de quantité en stock à filtrer)
  const { data: intrants } = await supabase
    .from('intrants')
    .select('id, nom, type_intrant, quantite_stock, prix_unitaire')
    .order('nom', { ascending: true })

  // 3. Fetch campagne_membres (to get members enrolled per campaign)
  const { data: campagneMembresData, error: cmError } = await supabase
    .from('campagne_membres')
    .select(`
      campagne_id,
      superficie,
      membres (id, prenom, nom, telephone, code_membre)
    `)
  if (cmError) console.error("Erreur Fetch CampagneMembres:", cmError)

  // Format for the client component
  const campagneMembres = (campagneMembresData || []).map((cm: any) => ({
    campagne_id: cm.campagne_id,
    superficie: cm.superficie || 0,
    membre: cm.membres
  }))

  // 4. Fetch campagne_intrants
  const { data: campagneIntrants } = await supabase
    .from('campagne_intrants')
    .select('*')

  // 5. Fetch distributions history (avec telephone pour la recherche)
  const { data: distributions } = await supabase
    .from('distribution_intrants')
    .select(`
      *,
      campagnes ( nom ),
      membres ( prenom, nom, code_membre, telephone ),
      intrants ( nom, type_intrant )
    `)
    .order('created_at', { ascending: false })

  // Quantités déjà distribuées par campagne / membre / intrant
  const dejaDistribue: Record<string, number> = {}
  for (const d of distributions || []) {
    const key = `${d.campagne_id}|${d.membre_id}|${d.intrant_id}`
    dejaDistribue[key] = (dejaDistribue[key] || 0) + (Number(d.quantite) || 0)
  }

  return (
    <DistributionClient
      distributions={distributions || []}
      campagnes={campagnes || []}
      campagneMembres={campagneMembres}
      intrants={intrants || []}
      campagneIntrants={campagneIntrants || []}
      dejaDistribue={dejaDistribue}
      dict={dict}
      locale={locale}
    />
  )
}
