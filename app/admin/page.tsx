import { createAdminClient } from '@/utils/supabase/admin'
import { Building2, Clock, Wallet, TrendingUp } from 'lucide-react'

export default async function AdminDashboardPage() {
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
    .select('montant')
    .eq('statut', 'completed')
    .gte('updated_at', debutMois.toISOString())

  const revenuDuMois = (paiementsDuMois ?? []).reduce((sum, p) => sum + Number(p.montant), 0)

  const maintenant = new Date()
  const dans48h = new Date(maintenant.getTime() + 48 * 60 * 60 * 1000)
  const essaisExpirantBientot = (gies ?? []).filter((g) => {
    if (!g.essai_expire_le) return false
    const d = new Date(g.essai_expire_le)
    return d > maintenant && d < dans48h
  }).length

  const parForfait = ['standard', 'medium', 'premium'].map((niveau) => ({
    niveau,
    count: (gies ?? []).filter((g) => g.subscription_tier === niveau).length,
  }))

  const cards = [
    { label: 'GIE au total', value: gies?.length ?? 0, icon: Building2 },
    { label: 'Virements en attente de confirmation', value: virementsEnAttente?.length ?? 0, icon: Clock },
    { label: 'Autres paiements en attente', value: paiementsEnAttente?.length ?? 0, icon: Wallet },
    { label: 'Revenu du mois (FCFA)', value: revenuDuMois.toLocaleString('fr-FR'), icon: TrendingUp },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold font-heading mb-6">Tableau de bord</h1>

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
        <div className="flex gap-6">
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
