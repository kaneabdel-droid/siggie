import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, CheckCircle2, ArrowRight, Clock, AlertTriangle } from 'lucide-react'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function AbonnementPage({
  searchParams,
}: {
  searchParams?: Promise<{ essai_expire?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.abonnement

  const params = await searchParams
  const essaiVerrouille = params?.essai_expire === '1'

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gies(nom, subscription_tier, essai_expire_le)')
    .eq('id', user.id)
    .single()

  const gie = Array.isArray(userData?.gies) ? userData.gies[0] : userData?.gies
  const currentTier = gie?.subscription_tier || 'standard'
  const maintenant = new Date()
  const essaiExpireLe = gie?.essai_expire_le ? new Date(gie.essai_expire_le) : null
  const essaiExpire = essaiExpireLe ? essaiExpireLe < maintenant : false
  const joursRestants = essaiExpireLe && !essaiExpire
    ? Math.max(0, Math.ceil((essaiExpireLe.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24)))
    : null

  const plans = [
    {
      id: 'standard',
      name: t.plans.standard.name,
      price: '50.000 FCFA / an',
      value: 50000,
      features: t.plans.standard.features,
      color: 'border-surface-border'
    },
    {
      id: 'medium',
      name: t.plans.medium.name,
      price: '75.000 FCFA / an',
      value: 75000,
      features: t.plans.medium.features,
      color: 'border-primary'
    },
    {
      id: 'premium',
      name: t.plans.premium.name,
      price: '100.000 FCFA / an',
      value: 100000,
      features: t.plans.premium.features,
      color: 'border-success'
    }
  ]

  const currentPlanIndex = plans.findIndex(p => p.id === currentTier)
  const currentPlan = plans[currentPlanIndex]

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading">{t.title}</h1>
        <p className="text-foreground-muted mt-2">{t.manage_desc} {gie?.nom}</p>
      </div>

      {(essaiExpire || essaiVerrouille) && (
        <div className="mb-8 flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">
            {t.trial_locked}
          </p>
        </div>
      )}

      {!essaiExpire && joursRestants !== null && (
        <div className="mb-8 flex items-start gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary">
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">
            {t.trial_remaining_prefix} {joursRestants} {joursRestants > 1 ? t.trial_remaining_days : t.trial_remaining_day} {t.trial_remaining_suffix}
          </p>
        </div>
      )}

      <div className="bg-surface rounded-2xl p-6 border border-surface-border shadow-sm mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t.current_plan} {currentPlan.name}</h2>
            <p className="text-foreground-muted">{t.renewal} {currentPlan.price}</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold font-heading mb-6">{t.upgrade_title}</h2>
      <p className="text-foreground-muted mb-8">
        {t.upgrade_desc}
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
                    {t.current_badge}
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
                  {t.current_plan_btn}
                </button>
              ) : isDowngrade ? (
                <button disabled className="w-full rounded-xl bg-surface border-2 border-surface-border text-foreground-muted px-4 py-3 font-bold text-center opacity-50 cursor-not-allowed">
                  {t.lower_tier}
                </button>
              ) : (
                <Link
                  href={`/checkout?plan=${plan.id}&upgrade=true`}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-white px-4 py-3 font-bold text-center hover:bg-primary-hover transition-colors"
                >
                  {t.pay_prefix} {upgradeCost.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} FCFA <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
