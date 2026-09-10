import Link from 'next/link'
import {
  ArrowRight, ArrowLeft, UserPlus, LogIn, CreditCard, LayoutDashboard,
  Users, Calendar, Package, Truck, Landmark, Receipt, HandCoins, Wallet,
  Wrench, FileBarChart, CheckCircle2, Clock, Lock,
} from 'lucide-react'
import ClientNavbar from '@/components/ClientNavbar'
import { getDictionary, getLocale } from '@/dictionaries'

export const metadata = {
  title: 'Découvrir SIGGIE - Comment ça marche',
}

export default async function DecouvrirSiggiePage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const d = dict.decouvrir

  const modulesBase = [
    { icon: LayoutDashboard, label: d.modules.dashboard },
    { icon: Users, label: d.modules.membres },
    { icon: Calendar, label: d.modules.campagnes },
    { icon: Package, label: d.modules.intrants },
    { icon: Truck, label: d.modules.distribution },
    { icon: Landmark, label: d.modules.credits },
    { icon: Receipt, label: d.modules.facturation },
    { icon: HandCoins, label: d.modules.remboursements },
    { icon: Wallet, label: d.modules.tresorerie },
  ]

  const plans = [
    {
      id: 'standard',
      nom: 'Standard',
      prix: `50 000 ${dict.landing.pricing.per_year}`,
      resume: d.plans.standard_resume,
      inclus: modulesBase,
      color: 'border-surface-border',
    },
    {
      id: 'medium',
      nom: 'Medium',
      prix: `75 000 ${dict.landing.pricing.per_year}`,
      resume: d.plans.medium_resume,
      inclus: [
        ...modulesBase,
        { icon: Wrench, label: d.modules.materiel },
      ],
      color: 'border-primary',
      populaire: true,
    },
    {
      id: 'premium',
      nom: 'Premium',
      prix: `100 000 ${dict.landing.pricing.per_year}`,
      resume: d.plans.premium_resume,
      inclus: [
        ...modulesBase,
        { icon: Wrench, label: d.modules.materiel },
        { icon: FileBarChart, label: d.modules.bilans },
      ],
      color: 'border-success',
    },
  ]

  return (
    <div className="bg-background min-h-screen font-sans text-foreground">
      <ClientNavbar dict={dict} currentLang={locale} />

      <main>
        {/* Hero */}
        <section className="py-16 lg:py-24 bg-gradient-to-br from-surface to-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
            <Link href="/" className="text-sm font-medium text-foreground-muted hover:text-primary flex items-center justify-center gap-2 mb-6">
              <ArrowLeft className="w-4 h-4" /> {d.back_home}
            </Link>
            <h1 className="text-4xl md:text-6xl font-bold font-heading tracking-tight mb-6">
              {d.hero_title_prefix} <span className="text-primary">SIGGIE</span> ?
            </h1>
            <p className="text-lg md:text-xl text-foreground-muted leading-relaxed">
              {d.hero_desc}
            </p>
          </div>
        </section>

        {/* Démo en direct */}
        <section className="py-16 bg-primary/5 border-y border-surface-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold font-heading mb-3">{d.demo_title}</h2>
            <p className="text-foreground-muted mb-8">{d.demo_desc}</p>
            <div className="inline-flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-8 bg-surface border border-surface-border rounded-2xl p-6 shadow-sm">
              <div className="text-left">
                <p className="text-xs uppercase tracking-wide text-foreground-muted font-semibold mb-1">{d.demo_email_label}</p>
                <p className="font-mono font-semibold text-foreground">kaneabdou@yahoo.fr</p>
              </div>
              <div className="hidden sm:block w-px bg-surface-border" />
              <div className="text-left">
                <p className="text-xs uppercase tracking-wide text-foreground-muted font-semibold mb-1">{d.demo_password_label}</p>
                <p className="font-mono font-semibold text-foreground">DecouvrezSiggie2026</p>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-primary-hover hover:scale-105 transition-all">
                {d.demo_login_btn} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="mt-4 text-xs text-foreground-muted">{d.demo_note}</p>
          </div>
        </section>

        {/* Parcours : inscription, connexion, abonnement */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <h2 className="text-3xl font-bold font-heading text-center mb-12">{d.steps_title}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="rounded-2xl border border-surface-border bg-surface p-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">{d.step1_title}</h3>
                <p className="text-foreground-muted mb-4">
                  {d.step1_desc_before} <strong>{d.step1_desc_strong}</strong> {d.step1_desc_after}
                </p>
                <Link href="/signup" className="text-primary font-semibold hover:underline flex items-center gap-1 text-sm">
                  {d.step1_link} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="rounded-2xl border border-surface-border bg-surface p-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <LogIn className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">{d.step2_title}</h3>
                <p className="text-foreground-muted mb-4">
                  {d.step2_desc}
                </p>
                <Link href="/login" className="text-primary font-semibold hover:underline flex items-center gap-1 text-sm">
                  {d.step2_link} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="rounded-2xl border border-surface-border bg-surface p-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">{d.step3_title}</h3>
                <p className="text-foreground-muted mb-4">
                  {d.step3_desc}
                </p>
              </div>
            </div>

            <div className="mt-10 flex items-start gap-3 bg-warning/10 border border-warning/20 text-warning rounded-xl p-4 max-w-2xl mx-auto">
              <Clock className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">
                {d.warning_before} <Lock className="inline w-4 h-4 -mt-1" /> {d.warning_after}
              </p>
            </div>
          </div>
        </section>

        {/* Fenêtres par niveau d'abonnement */}
        <section className="py-20 bg-surface border-t border-surface-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-heading mb-4">{d.modules_title}</h2>
              <p className="text-lg text-foreground-muted max-w-2xl mx-auto">
                {d.modules_desc}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-3xl border-2 ${plan.color} bg-background p-8 flex flex-col relative ${plan.populaire ? 'shadow-xl md:-translate-y-2' : ''}`}
                >
                  {plan.populaire && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                      {dict.landing.pricing.popular_badge}
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-1">{plan.nom}</h3>
                  <p className="text-sm text-foreground-muted mb-1">{plan.prix}</p>
                  <p className="text-sm text-foreground-muted mb-6">{plan.resume}</p>
                  <ul className="space-y-3 flex-1">
                    {plan.inclus.map((m, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <span>{m.label}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/checkout?plan=${plan.id}`}
                    className="mt-8 w-full rounded-xl bg-primary text-white px-4 py-3 font-bold text-center hover:bg-primary-hover transition-colors"
                  >
                    {d.choose_prefix} {plan.nom}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-16 bg-background text-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-primary-hover hover:scale-105 transition-all">
              {d.cta_text} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-foreground text-background py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-2xl font-bold font-heading text-background mb-4 block">DEMBA SOLUTION</span>
          <p className="text-background/50 text-sm">© {new Date().getFullYear()} Demba Solution.</p>
        </div>
      </footer>
    </div>
  )
}
