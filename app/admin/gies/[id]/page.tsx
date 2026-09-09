import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createAdminClient } from '@/utils/supabase/admin'
import GieActions from './GieActions'
import UtilisateurRow from './UtilisateurRow'
import AjouterUtilisateurButton from './AjouterUtilisateurButton'
import SupprimerGieButton from './SupprimerGieButton'

export default async function AdminGieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: gie } = await supabase
    .from('gies')
    .select('id, nom, subscription_tier, essai_expire_le, compte_verrouille, abonnement_statut, created_at')
    .eq('id', id)
    .maybeSingle()

  if (!gie) notFound()

  const { data: utilisateurs } = await supabase.from('utilisateurs').select('id, role').eq('gie_id', id)

  // Les emails (et le statut désactivé) vivent dans auth.users, pas dans public.utilisateurs.
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const authParId = new Map(authUsers?.users.map((u) => [u.id, u]) ?? [])

  const { data: paiements } = await supabase
    .from('abonnement_paiements')
    .select('id, niveau, montant, provider, moyen_paiement, statut, created_at')
    .eq('gie_id', id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <Link href="/admin/gies" className="text-foreground-muted hover:text-primary flex items-center gap-2 w-fit mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour aux GIE
      </Link>

      <h1 className="text-2xl font-bold font-heading mb-6">{gie.nom}</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-background rounded-xl p-5 border border-surface-border">
          <h2 className="font-semibold mb-4">Détails</h2>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-foreground-muted">Forfait</dt><dd className="capitalize font-medium">{gie.subscription_tier || 'standard'}</dd></div>
            <div className="flex justify-between"><dt className="text-foreground-muted">Essai jusqu&apos;au</dt><dd>{gie.essai_expire_le ? new Date(gie.essai_expire_le).toLocaleString('fr-FR') : '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-foreground-muted">Verrouillé</dt><dd>{gie.compte_verrouille ? 'Oui' : 'Non'}</dd></div>
            <div className="flex justify-between"><dt className="text-foreground-muted">Créé le</dt><dd>{gie.created_at ? new Date(gie.created_at).toLocaleDateString('fr-FR') : '-'}</dd></div>
          </dl>
        </div>

        <div className="bg-background rounded-xl p-5 border border-surface-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Utilisateurs</h2>
            <AjouterUtilisateurButton gieId={gie.id} />
          </div>
          <ul className="text-sm divide-y divide-surface-border">
            {(utilisateurs ?? []).map((u) => {
              const authUser = authParId.get(u.id)
              return (
                <UtilisateurRow
                  key={u.id}
                  gieId={gie.id}
                  utilisateurId={u.id}
                  email={authUser?.email || u.id}
                  roleActuel={u.role || ''}
                  banni={Boolean(authUser?.banned_until && new Date(authUser.banned_until) > new Date())}
                />
              )
            })}
            {(utilisateurs ?? []).length === 0 && <li className="text-foreground-muted py-2">Aucun utilisateur</li>}
          </ul>
        </div>
      </div>

      <GieActions gieId={gie.id} forfaitActuel={gie.subscription_tier || 'standard'} verrouille={gie.compte_verrouille} />

      <h2 className="font-semibold mt-8 mb-4">Historique des paiements</h2>
      <div className="bg-background rounded-xl border border-surface-border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-foreground-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Forfait</th>
              <th className="px-4 py-3 font-medium">Montant</th>
              <th className="px-4 py-3 font-medium">Prestataire</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {(paiements ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-foreground-muted">{p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '-'}</td>
                <td className="px-4 py-3 capitalize">{p.niveau}</td>
                <td className="px-4 py-3">{Number(p.montant).toLocaleString('fr-FR')} FCFA</td>
                <td className="px-4 py-3 capitalize">{p.provider} ({p.moyen_paiement})</td>
                <td className="px-4 py-3">
                  <span className={p.statut === 'completed' ? 'text-success' : p.statut === 'failed' ? 'text-danger' : 'text-primary'}>
                    {p.statut}
                  </span>
                </td>
              </tr>
            ))}
            {(paiements ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-foreground-muted">Aucun paiement</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <SupprimerGieButton gieId={gie.id} nomGie={gie.nom} />
    </div>
  )
}
