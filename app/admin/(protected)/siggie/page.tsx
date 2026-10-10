import { createAdminClient } from '@/utils/supabase/admin'
import { Building2, Clock, Wallet, TrendingUp } from 'lucide-react'
import { equivalentFcfa } from '@/lib/payments/dollars'

export default async function AdminSiggieDashboardPage() {
  const supabase = createAdminClient()

  const { data: gies } = await supabase.from('gies').select('subscription_tier, essai_expire_le, compte_verrouille')
  const { data: paiementsEnAttente } = await supabase
    .from('abonnement_paiements')
    .select('id')
    .eq('statut', 'pending')
    .neq('provider', 'virement')
  const { data: virementsEnAttente } = await supabase
    .from('abonnement_paiements')
    .select('id')
    .eq('statut', 'pending')
    .eq('provider', 'virement')

  const debutMois = new Date()
  debutMois.setDate(1)
  debutMois.setHours(0, 0, 0, 0)
  const { data: paiementsDuMois } = await supabase
    .from('abonnement_paiements')
    .select('montant, devise')
    .eq('statut', 'completed')
    .eq('doublon', false) // un doublon encaissé est à rembourser : ce n'est pas une vente
    .gte('updated_at', debutMois.toISOString())

  // Paiements en dollars (GIE d'autres pays) ramenés en FCFA au taux de lib/payments/dollars.ts
  const revenuDuMois = (paiementsDuMois ?? []).reduce((sum, p) => sum + equivalentFcfa(Number(p.montant), p.devise), 0)

  const maintenant = new Date()
  const dans48h = new Date(maintenant.getTime() + 48 * 60 * 60 * 1000)
  const essaisExpirantBientot = (gies ?? []).filter((g) => {
    if (!g.essai_expire_le) return false
    const d = new Date(g.essai_expire_le)
    return d > maintenant && d < dans48h
  }).length

  const { data: paiementsMaketouMois } = await supabase
    .from('abonnement_paiements')
    .select('montant, devise')
    .eq('statut', 'completed')
    .eq('doublon', false)
    .eq('provider', 'maketou')
    .gte('updated_at', debutMois.toISOString())

  const revenuMaketouDuMois = (paiementsMaketouMois ?? []).reduce((sum, p) => sum + equivalentFcfa(Number(p.montant), p.devise), 0)

  const parForfait = ['standard', 'medium', 'premium'].map((niveau) => ({
    niveau,
    count: (gies ?? []).filter((g) => g.subscription_tier === niveau).length,
  }))

  const cards = [
    { label: 'GIE au total', value: gies?.length ?? 0, icon: Building2 },
    { label: 'Virements en attente de confirmation', value: virementsEnAttente?.length ?? 0, icon: Clock },
    { label: 'Autres paiements en attente', value: paiementsEnAttente?.length ?? 0, icon: Wallet },
    { label: 'Revenu global du mois (FCFA)', value: revenuDuMois.toLocaleString('fr-FR'), icon: TrendingUp },
    { label: 'Revenu Maketou (FCFA)', value: revenuMaketouDuMois.toLocaleString('fr-FR'), icon: Wallet },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold font-heading mb-6">Tableau de bord SIGGIE</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-background rounded-xl p-5 border border-surface-border">
            <Icon className="w-5 h-5 text-primary mb-3" />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-foreground-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-background rounded-xl p-5 border border-surface-border mb-8">
        <h2 className="font-semibold mb-3">Répartition par forfait</h2>
        <div className="flex flex-wrap gap-6">
          {parForfait.map(({ niveau, count }) => (
            <div key={niveau}>
              <p className="text-xl font-bold">{count}</p>
              <p className="text-sm text-foreground-muted capitalize">{niveau}</p>
            </div>
          ))}
        </div>
      </div>

      {essaisExpirantBientot > 0 && (
        <div className="bg-danger/10 border border-danger/20 text-danger rounded-xl p-4 text-sm font-medium">
          {essaisExpirantBientot} essai{essaisExpirantBientot > 1 ? 's' : ''} expire{essaisExpirantBientot > 1 ? 'nt' : ''} dans les 48 prochaines heures.
        </div>
      )}
    </div>
  )
}
