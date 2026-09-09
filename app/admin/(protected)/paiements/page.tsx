import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import ConfirmerVirementButton from './ConfirmerVirementButton'

export default async function AdminPaiementsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>
}) {
  const { statut } = await searchParams
  const supabase = createAdminClient()

  let query = supabase
    .from('abonnement_paiements')
    .select('id, gie_id, niveau, montant, provider, moyen_paiement, statut, created_at, gies(nom)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (statut) query = query.eq('statut', statut)

  const { data: paiements } = await query

  const filtres = [
    { label: 'Tous', value: undefined },
    { label: 'En attente', value: 'pending' },
    { label: 'Complétés', value: 'completed' },
    { label: 'Échoués', value: 'failed' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold font-heading mb-6">Paiements</h1>

      <div className="flex gap-2 mb-6">
        {filtres.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/admin/paiements?statut=${f.value}` : '/admin/paiements'}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
              statut === f.value ? 'bg-primary text-white border-primary' : 'border-surface-border text-foreground-muted hover:bg-surface'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="bg-background rounded-xl border border-surface-border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-foreground-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">GIE</th>
              <th className="px-4 py-3 font-medium">Forfait</th>
              <th className="px-4 py-3 font-medium">Montant</th>
              <th className="px-4 py-3 font-medium">Prestataire</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {(paiements ?? []).map((p) => {
              const gie = Array.isArray(p.gies) ? p.gies[0] : p.gies
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-foreground-muted">{p.created_at ? new Date(p.created_at).toLocaleString('fr-FR') : '-'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/gies/${p.gie_id}`} className="text-primary hover:text-primary-hover">
                      {gie?.nom || p.gie_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{p.niveau}</td>
                  <td className="px-4 py-3">{Number(p.montant).toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-4 py-3 capitalize">{p.provider} ({p.moyen_paiement})</td>
                  <td className="px-4 py-3">
                    <span className={p.statut === 'completed' ? 'text-success' : p.statut === 'failed' ? 'text-danger' : 'text-primary'}>
                      {p.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.provider === 'virement' && p.statut === 'pending' && <ConfirmerVirementButton paymentId={p.id} />}
                  </td>
                </tr>
              )
            })}
            {(paiements ?? []).length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-foreground-muted">Aucun paiement</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
