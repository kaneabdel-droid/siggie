import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { getDictionary, getLocale } from '@/dictionaries'
import PlanFinancementClient from './PlanFinancementClient'

export default async function PlanFinancementPage() {
  const supabase = await createClient()
  const tenant = await getTenantContext()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  const [
    { data: campagnes },
    { data: comptes },
    { data: transactions },
  ] = await Promise.all([
    supabase
      .from('campagnes')
      .select('id, nom, statut, date_debut, date_fin')
      .order('date_debut', { ascending: false }),
    supabase
      .from('comptes')
      .select('id, nom, type_compte, solde_initial'),
    supabase
      .from('transactions')
      .select('id, compte_id, type_transaction, montant, date_transaction, created_at, motif, type_piece, campagne_id')
      .order('created_at', { ascending: true }),
  ])

  return (
    <PlanFinancementClient
      campagnes={campagnes || []}
      comptes={comptes || []}
      transactions={transactions || []}
      subscriptionTier={tenant?.subscriptionTier || 'standard'}
      gieName={tenant?.gieName || 'Mon GIE'}
      dict={dict}
      locale={locale}
    />
  )
}
