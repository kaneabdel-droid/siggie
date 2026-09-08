import Link from 'next/link'
import { ArrowRight, CheckCircle2, Package, Smartphone, Zap, Shield, MonitorSmartphone, TrendingUp, X, Users } from 'lucide-react'
import ClientNavbar from '@/components/ClientNavbar'
import LanguageSelector from '@/components/LanguageSelector'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function LandingPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const params = await searchParams
  const message = params?.message
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <div className="bg-background min-h-screen font-sans text-foreground">
      {message && (
        <div className="bg-danger text-white text-center py-2 px-4 font-medium text-sm">
          {message}
        </div>
      )}
      
      <ClientNavbar dict={dict} currentLang={locale} />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32 bg-gradient-to-br from-surface to-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-7xl font-bold font-heading tracking-tight text-foreground mb-6">
                {dict.landing.hero.title_1} <span className="text-primary">{dict.landing.hero.title_2}</span>
              </h1>
              <p className="mt-4 text-xl md:text-2xl text-foreground-muted mb-10 leading-relaxed">
                {dict.landing.hero.desc}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#tarifs" className="rounded-full bg-primary px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-semibold text-white shadow-lg hover:bg-primary-hover hover:scale-105 transition-all flex items-center justify-center gap-2">
                  {dict.landing.hero.btn_offers} <ArrowRight className="w-5 h-5" />
                </a>
                <Link href="/login" className="rounded-full bg-surface border border-surface-border px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-semibold text-foreground hover:bg-black/5 transition-all flex items-center justify-center gap-2">
                  {dict.landing.hero.btn_client}
                </Link>
              </div>
            </div>
          </div>
          {/* Background decorative elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10"></div>
        </section>

        {/* Pourquoi choisir Demba Solution */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">{dict.landing.features.title}</h2>
              <p className="text-lg text-foreground-muted max-w-2xl mx-auto">{dict.landing.features.desc}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: dict.landing.features.f1_title, desc: dict.landing.features.f1_desc },
                { icon: Shield, title: dict.landing.features.f2_title, desc: dict.landing.features.f2_desc },
                { icon: MonitorSmartphone, title: dict.landing.features.f3_title, desc: dict.landing.features.f3_desc }
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-2xl bg-surface border border-surface-border hover:shadow-lg transition-all group">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                    <feature.icon className="w-7 h-7 text-primary group-hover:text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-foreground-muted">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap / Nos Produits */}
        <section id="produits" className="py-24 bg-surface">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">{dict.landing.products.title}</h2>
              <p className="text-lg text-foreground-muted max-w-2xl mx-auto">{dict.landing.products.desc}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Produit 1 : SIGGIE */}
              <div className="relative overflow-hidden rounded-2xl bg-background border border-surface-border shadow-sm p-8">
                <div className="absolute top-0 right-0 bg-success text-white text-xs font-bold px-3 py-1 rounded-bl-lg">En ligne</div>
                <Package className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-2">SIGGIE</h3>
                <p className="text-foreground-muted mb-6">Le Système Intégré de Gestion de Groupement d&apos;Intérêt Économique et entreprises assimilées. Gérez vos membres, campagnes agricoles, intrants et trésorerie en un clic et bien plus.</p>
                <Link href="/decouvrir-siggie" className="text-foreground font-semibold hover:underline flex items-center gap-1 mb-2">Découvrir SIGGIE <ArrowRight className="w-4 h-4" /></Link>
                <Link href="#tarifs" className="text-primary font-semibold hover:underline flex items-center gap-1">S&apos;abonner à SIGGIE <ArrowRight className="w-4 h-4" /></Link>
              </div>
            </div>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">{dict.landing.pricing.title}</h2>
              <p className="text-lg text-foreground-muted max-w-2xl mx-auto">{dict.landing.pricing.desc}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Standard */}
              <div className="rounded-3xl border border-surface-border p-8 bg-surface flex flex-col hover:shadow-xl transition-shadow">
                <h3 className="text-2xl font-bold mb-2">Standard</h3>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold">50.000</span>
                  <span className="text-foreground-muted font-medium"> FCFA / an</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Gestion des membres</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Gestion des campagnes</span></li>
                </ul>
                <Link href="/checkout?plan=standard" className="w-full rounded-xl bg-background border-2 border-primary text-primary px-4 py-3 font-bold text-center hover:bg-primary hover:text-white transition-colors">
                  Choisir Standard
                </Link>
              </div>

              {/* Medium */}
              <div className="rounded-3xl border-2 border-primary p-8 bg-primary/5 flex flex-col relative transform md:-translate-y-4 shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wide">Populaire</div>
                <h3 className="text-2xl font-bold mb-2 text-primary">Medium</h3>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold text-primary">75.000</span>
                  <span className="text-foreground-muted font-medium"> FCFA / an</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <span>Tout du plan Standard</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <strong>Gestion complète du matériel</strong></li>
                </ul>
                <Link href="/checkout?plan=medium" className="w-full rounded-xl bg-primary text-white px-4 py-3 font-bold text-center hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25">
                  Choisir Medium
                </Link>
              </div>

              {/* Premium */}
              <div className="rounded-3xl border border-surface-border p-8 bg-surface flex flex-col hover:shadow-xl transition-shadow">
                <h3 className="text-2xl font-bold mb-2">Premium</h3>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold">100.000</span>
                  <span className="text-foreground-muted font-medium"> FCFA / an</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Tout du plan Medium</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <strong>États financiers complets</strong></li>
                </ul>
                <Link href="/checkout?plan=premium" className="w-full rounded-xl bg-background border-2 border-foreground text-foreground px-4 py-3 font-bold text-center hover:bg-foreground hover:text-background transition-colors">
                  Choisir Premium
                </Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* Astuces & Blog */}
        <section id="astuces" className="py-24 bg-surface border-t border-surface-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Astuces de Gestion</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="bg-background p-6 rounded-2xl border border-surface-border hover:shadow-md transition-all cursor-pointer">
                 <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center mb-4"><Smartphone className="w-6 h-6 text-info" /></div>
                 <h4 className="font-bold text-xl mb-2">Digitalisez vos reçus</h4>
               </div>
               <div className="bg-background p-6 rounded-2xl border border-surface-border hover:shadow-md transition-all cursor-pointer">
                 <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4"><TrendingUp className="w-6 h-6 text-success" /></div>
                 <h4 className="font-bold text-xl mb-2">Suivez la rentabilité par machine</h4>
               </div>
               <div className="bg-background p-6 rounded-2xl border border-surface-border hover:shadow-md transition-all cursor-pointer">
                 <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4"><Users className="w-6 h-6 text-warning" /></div>
                 <h4 className="font-bold text-xl mb-2">Impliquez vos membres</h4>
               </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-2xl font-bold font-heading text-background mb-4 block">DEMBA SOLUTION</span>
          <p className="text-background/70 mb-8 max-w-md mx-auto">{dict.landing.footer.desc}</p>
          <div className="flex justify-center gap-6 mb-8">
            <LanguageSelector currentLang={locale} />
          </div>
          <p className="text-background/50 text-sm">© {new Date().getFullYear()} Demba Solution.</p>
        </div>
      </footer>
    </div>
  )
}
