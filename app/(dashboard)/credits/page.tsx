import { createClient } from '@/utils/supabase/server'
import CreateCreditButton from './CreateCreditButton'
import CreditsListClient from './CreditsListClient'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import { uniteMontant } from '@/lib/currency'

export default async function CreditsPage() {
  const unite = uniteMontant((await getTenantContext())?.devise)
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  // Ces requêtes sont indépendantes les unes des autres : les lancer en
  // parallèle évite de cumuler leurs latences réseau.
  const [
    { data: campagnes },
    { data: credits },
    { data: comptes },
    { data: materiels },
  ] = await Promise.all([
    supabase.from('campagnes').select('id, nom').order('created_at', { ascending: false }),
    supabase.from('credits').select(`
      *,
      campagnes ( nom )
    `).order('created_at', { ascending: false }),
    supabase.from('comptes').select('id, nom, type_compte'),
    supabase.from('materiels').select('id, nom, date_acquisition, valeur_acquisition, duree_vie_economique').order('nom', { ascending: true }),
  ])

  // Total décaissé rattaché aux crédits
  const creditIds = credits?.map(c => c.id) || []
  let totalDecaisse = 0
  if (creditIds.length > 0) {
    const { data: decaissements } = await supabase
      .from('transactions')
      .select('montant')
      .in('credit_id', creditIds)
      .eq('type_transaction', 'sortie')
      .neq('type_piece', 'remboursement_credit')

    totalDecaisse = decaissements?.reduce((sum, d) => sum + Number(d.montant || 0), 0) || 0
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center justify-between gap-4">
        <div className="sm:flex-auto min-w-0">
          <h1 className="text-2xl font-bold font-heading text-foreground break-words">
            Crédits & Financements Bancaires
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Gestion des crédits de campagne (trésorerie / court terme) et des crédits d&apos;équipement (investissement / moyen terme).
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:flex-none">
          <CreateCreditButton campagnes={campagnes || []} materiels={materiels || []} dict={dict} />
        </div>
      </div>

      <CreditsListClient
        credits={credits || []}
        comptes={comptes || []}
        materiels={materiels || []}
        dict={dict}
        locale={locale}
        unite={unite}
        totalDecaisse={totalDecaisse}
      />
    </div>
  )
}
