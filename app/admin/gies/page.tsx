import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'

export default async function AdminGiesPage() {
  const supabase = createAdminClient()

  const { data: gies } = await supabase
    .from('gies')
    .select('id, nom, subscription_tier, essai_expire_le, compte_verrouille, created_at')
    .order('created_at', { ascending: false })

  const maintenant = new Date()

  return (
    <div>
      <h1 className="text-2xl font-bold font-heading mb-6">GIE ({gies?.length ?? 0})</h1>

      <div className="bg-background rounded-xl border border-surface-border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-foreground-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Forfait</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Créé le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {(gies ?? []).map((gie) => {
              const essaiExpire = gie.essai_expire_le ? new Date(gie.essai_expire_le) < maintenant : false
              return (
                <tr key={gie.id} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/gies/${gie.id}`} className="font-medium text-primary hover:text-primary-hover">
                      {gie.nom}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{gie.subscription_tier || 'standard'}</td>
                  <td className="px-4 py-3">
                    {gie.compte_verrouille ? (
                      <span className="text-danger font-medium">Verrouillé</span>
                    ) : essaiExpire ? (
                      <span className="text-danger font-medium">Essai expiré</span>
                    ) : gie.essai_expire_le ? (
                      <span className="text-primary font-medium">En essai</span>
                    ) : (
                      <span className="text-success font-medium">Actif</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {gie.created_at ? new Date(gie.created_at).toLocaleDateString('fr-FR') : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
