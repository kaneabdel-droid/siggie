import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { getLocale } from '@/dictionaries'
import { notFound } from 'next/navigation'
import FinancementIntrantsManager from './FinancementIntrantsManager'

export default async function CreditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const [tenant, locale] = await Promise.all([
    getTenantContext(),
    getLocale(),
  ])

  const [
    { data: credit },
    { data: lignes },
    { data: intrants },
  ] = await Promise.all([
    supabase
      .from('credits')
      .select(`
        *,
        campagnes ( id, nom )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('credit_lignes')
      .select(`
        *,
        intrants ( id, nom, type_intrant )
      `)
      .eq('credit_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('intrants')
      .select('id, nom, type_intrant, prix_unitaire')
      .order('nom', { ascending: true }),
  ])

  if (!credit) {
    notFound()
  }

  return (
    <FinancementIntrantsManager
      credit={credit}
      lignesInitiales={lignes || []}
      intrantsCatalogue={intrants || []}
      gieNom={tenant?.gieName}
      locale={locale}
    />
  )
}
