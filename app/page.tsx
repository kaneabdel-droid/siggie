import Link from 'next/link'
import { ArrowRight, Package, Smartphone, Zap, Shield, MonitorSmartphone, TrendingUp, X, Users, Store, Wheat, Phone, Mail } from 'lucide-react'
import ClientNavbar from '@/components/ClientNavbar'
import LanguageSelector from '@/components/LanguageSelector'
import ContactProspectForm from '@/components/ContactProspectForm'
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
                <div className="absolute top-0 right-0 bg-success text-white text-xs font-bold px-3 py-1 rounded-bl-lg">{dict.landing.products.online_badge}</div>
                <Package className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-2">SIGGIE</h3>
                <p className="text-foreground-muted mb-6">{dict.landing.products.siggie_desc}</p>
                <Link href="/decouvrir-siggie" className="text-foreground font-semibold hover:underline flex items-center gap-1 mb-2">{dict.landing.products.discover_link} <ArrowRight className="w-4 h-4" /></Link>
                <Link href="/tarifs" className="text-primary font-semibold hover:underline flex items-center gap-1">{dict.landing.products.subscribe_link} <ArrowRight className="w-4 h-4" /></Link>
              </div>

              {/* Produit 2 : D-QUINCA */}
              <div className="relative overflow-hidden rounded-2xl bg-background border border-surface-border shadow-sm p-8">
                <div className="absolute top-0 right-0 bg-success text-white text-xs font-bold px-3 py-1 rounded-bl-lg">{dict.landing.products.online_badge}</div>
                <Store className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-2">D-QUINCA</h3>
                <p className="text-foreground-muted mb-6">{dict.landing.products.dquinca_desc}</p>
                <a href="https://d-quinca.dembasolution.com/" className="text-foreground font-semibold hover:underline flex items-center gap-1 mb-2">{dict.landing.products.discover_link_dquinca} <ArrowRight className="w-4 h-4" /></a>
                <a href="https://d-quinca.dembasolution.com/login" className="text-primary font-semibold hover:underline flex items-center gap-1">{dict.landing.products.subscribe_link_dquinca} <ArrowRight className="w-4 h-4" /></a>
              </div>

              {/* Produit 3 : D-INTRANTS */}
              <div className="relative overflow-hidden rounded-2xl bg-background border border-surface-border shadow-sm p-8">
                <div className="absolute top-0 right-0 bg-success text-white text-xs font-bold px-3 py-1 rounded-bl-lg">{dict.landing.products.online_badge}</div>
                <Package className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-2">D-INTRANTS</h3>
                <p className="text-foreground-muted mb-6">{dict.landing.products.dintrants_desc}</p>
                <a href="https://d-intrants.dembasolution.com/" className="text-foreground font-semibold hover:underline flex items-center gap-1 mb-2">{dict.landing.products.discover_link_dintrants} <ArrowRight className="w-4 h-4" /></a>
                <a href="https://d-intrants.dembasolution.com/tarifs" className="text-primary font-semibold hover:underline flex items-center gap-1">{dict.landing.products.subscribe_link_dintrants} <ArrowRight className="w-4 h-4" /></a>
              </div>

              {/* Produit 4 : D-AGROBUSINESS */}
              <div className="relative overflow-hidden rounded-2xl bg-background border border-surface-border shadow-sm p-8">
                <div className="absolute top-0 right-0 bg-success text-white text-xs font-bold px-3 py-1 rounded-bl-lg">{dict.landing.products.online_badge}</div>
                <Wheat className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-2">D-AGROBUSINESS</h3>
                <p className="text-foreground-muted mb-6">{dict.landing.products.dagrobusiness_desc}</p>
                <a href="https://d-agro.dembasolution.com/decouvrir-dagrobusiness" className="text-foreground font-semibold hover:underline flex items-center gap-1 mb-2">{dict.landing.products.discover_link_dagrobusiness} <ArrowRight className="w-4 h-4" /></a>
                <a href="https://d-agro.dembasolution.com/tarifs" className="text-primary font-semibold hover:underline flex items-center gap-1">{dict.landing.products.subscribe_link_dagrobusiness} <ArrowRight className="w-4 h-4" /></a>
              </div>
            </div>
          </div>
        </section>

        {/* Astuces & Blog */}
        <section id="astuces" className="py-24 bg-surface border-t border-surface-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">{dict.landing.tips.title}</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="bg-background p-6 rounded-2xl border border-surface-border hover:shadow-md transition-all cursor-pointer">
                 <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center mb-4"><Smartphone className="w-6 h-6 text-info" /></div>
                 <h4 className="font-bold text-xl mb-2">{dict.landing.tips.tip1}</h4>
               </div>
               <div className="bg-background p-6 rounded-2xl border border-surface-border hover:shadow-md transition-all cursor-pointer">
                 <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4"><TrendingUp className="w-6 h-6 text-success" /></div>
                 <h4 className="font-bold text-xl mb-2">{dict.landing.tips.tip2}</h4>
               </div>
               <div className="bg-background p-6 rounded-2xl border border-surface-border hover:shadow-md transition-all cursor-pointer">
                 <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4"><Users className="w-6 h-6 text-warning" /></div>
                 <h4 className="font-bold text-xl mb-2">{dict.landing.tips.tip3}</h4>
                 <p className="text-foreground-muted">{dict.landing.tips.tip3_desc}</p>
               </div>
            </div>
          </div>
        </section>

        {/* Nous contacter (prospects) */}
        <section id="contact" className="py-24 bg-background border-t border-surface-border scroll-mt-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">{dict.landing.contact.title}</h2>
              <p className="text-lg text-foreground-muted max-w-2xl mx-auto">{dict.landing.contact.desc}</p>
            </div>
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex items-start gap-4 bg-surface p-6 rounded-2xl border border-surface-border">
                  <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center"><Phone className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="text-sm font-semibold">{dict.landing.contact.phone}</p>
                    <a href="tel:+221708484298" dir="ltr" className="mt-1 block font-medium hover:text-primary transition-colors">+221 70 848 42 98</a>
                  </div>
                </div>
                <div className="flex items-start gap-4 bg-surface p-6 rounded-2xl border border-surface-border">
                  <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center"><Mail className="w-5 h-5 text-primary" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{dict.landing.contact.email}</p>
                    <a href="mailto:support@dembasolution.com" dir="ltr" className="mt-1 block font-medium hover:text-primary transition-colors">support@dembasolution.com</a>
                  </div>
                </div>
              </div>
              <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-surface-border shadow-sm">
                <ContactProspectForm t={dict.landing.contact} />
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
          <Link
            href="/admin"
            className="inline-block mt-3 text-sm text-background/70 underline underline-offset-2 hover:text-background transition-colors"
          >
            Administration
          </Link>
        </div>
      </footer>
    </div>
  )
}
