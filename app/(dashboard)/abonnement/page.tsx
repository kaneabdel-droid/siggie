import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, CheckCircle2, ArrowRight } from 'lucide-react'

export default async function AbonnementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gies(nom, subscription_tier)')
    .eq('id', user.id)
    .single()

  const currentTier = userData?.gies?.subscription_tier || 'standard'

  const plans = [
    {
      id: 'standard',
      name: 'Standard',
      price: '50.000 FCFA / an',
      value: 50000,
      features: ['Tableau de bord', 'Gestion des membres', 'Cotisations', 'Emprunts'],
      color: 'border-surface-border'
    },
    {
      id: 'medium',
      name: 'Medium',
      price: '75.000 FCFA / an',
      value: 75000,
      features: ['Tableau de bord', 'Gestion des membres', 'Cotisations', 'Emprunts', 'Gestion du matériel & stocks'],
      color: 'border-primary'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '100.000 FCFA / an',
      value: 100000,
      features: ['Tableau de bord', 'Gestion des membres', 'Cotisations', 'Emprunts', 'Gestion du matériel & stocks', 'États financiers avancés'],
      color: 'border-success'
    }
  ]

  const currentPlanIndex = plans.findIndex(p => p.id === currentTier)
  const currentPlan = plans[currentPlanIndex]

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading">Mon Abonnement</h1>
        <p className="text-foreground-muted mt-2">Gérez le forfait de votre GIE : {userData?.gies?.nom}</p>
      </div>

      <div className="bg-surface rounded-2xl p-6 border border-surface-border shadow-sm mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Forfait actuel : {currentPlan.name}</h2>
            <p className="text-foreground-muted">Renouvellement annuel - {currentPlan.price}</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold font-heading mb-6">Mettre à niveau (Upgrade)</h2>
      <p className="text-foreground-muted mb-8">
        Passez au niveau supérieur en ne payant que la différence entre votre forfait actuel et le nouveau forfait.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const isCurrent = plan.id === currentTier
          const isDowngrade = index < currentPlanIndex
          let upgradeCost = plan.value - currentPlan.value
          if (upgradeCost < 0) upgradeCost = 0

          return (
            <div 
              key={plan.id} 
              className={`bg-surface rounded-3xl p-8 border-2 ${isCurrent ? 'border-primary shadow-lg relative' : 'border-surface-border shadow-sm hover:border-primary/30 transition-colors'}`}
            >
              {isCurrent && (
                <div className="absolute top-0 right-8 transform -translate-y-1/2">
                  <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Actuel
                  </span>
                </div>
              )}
              
              <h3 className="text-xl font-bold font-heading mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-3xl font-black">{plan.price.split(' ')[0]}</span>
                <span className="text-foreground-muted font-medium"> FCFA</span>
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {isCurrent ? (
                <button disabled className="w-full rounded-xl bg-surface border-2 border-surface-border text-foreground-muted px-4 py-3 font-bold text-center opacity-70 cursor-not-allowed">
                  Forfait Actuel
                </button>
              ) : isDowngrade ? (
                <button disabled className="w-full rounded-xl bg-surface border-2 border-surface-border text-foreground-muted px-4 py-3 font-bold text-center opacity-50 cursor-not-allowed">
                  Niveau inférieur
                </button>
              ) : (
                <Link 
                  href={`/checkout?plan=${plan.id}&upgrade=true`}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-white px-4 py-3 font-bold text-center hover:bg-primary-hover transition-colors"
                >
                  Payer {upgradeCost.toLocaleString('fr-FR')} FCFA <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
