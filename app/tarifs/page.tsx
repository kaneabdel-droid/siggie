import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import LanguageSelector from '@/components/LanguageSelector'
import { getDictionary, getLocale } from '@/dictionaries'

export const metadata = {
  title: 'Tarifs — SIGGIE',
}

export default async function TarifsSiggiePage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <div className="bg-background min-h-screen font-sans text-foreground">
      <main>
        <section className="py-16 lg:py-20 bg-gradient-to-br from-surface to-background relative">
          <div className="absolute top-4 right-4">
            <LanguageSelector currentLang={locale} />
          </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
            <Link href="/" className="text-sm font-medium text-foreground-muted hover:text-primary flex items-center justify-center gap-2 mb-6">
              <ArrowLeft className="w-4 h-4" /> Retour à l&apos;accueil
            </Link>
            <h1 className="text-4xl md:text-6xl font-bold font-heading tracking-tight mb-6">
              <span className="text-primary">SIGGIE</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground-muted leading-relaxed">{dict.landing.pricing.desc}</p>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Standard */}
              <div className="rounded-3xl border border-surface-border p-8 bg-surface flex flex-col hover:shadow-xl transition-shadow">
                <h3 className="text-2xl font-bold mb-2">Standard</h3>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold">50.000</span>
                  <span className="text-foreground-muted font-medium"> {dict.landing.pricing.per_year}</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>{dict.landing.pricing.feature_membres}</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>{dict.landing.pricing.feature_campagnes}</span></li>
                </ul>
                <Link href="/checkout?plan=standard" className="w-full rounded-xl bg-background border-2 border-primary text-primary px-4 py-3 font-bold text-center hover:bg-primary hover:text-white transition-colors">
                  {dict.landing.pricing.choose_standard}
                </Link>
              </div>

              {/* Medium */}
              <div className="rounded-3xl border-2 border-primary p-8 bg-primary/5 flex flex-col relative transform md:-translate-y-4 shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wide">{dict.landing.pricing.popular_badge}</div>
                <h3 className="text-2xl font-bold mb-2 text-primary">Medium</h3>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold text-primary">75.000</span>
                  <span className="text-foreground-muted font-medium"> {dict.landing.pricing.per_year}</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <span>{dict.landing.pricing.feature_all_standard}</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <strong>{dict.landing.pricing.feature_materiel}</strong></li>
                </ul>
                <Link href="/checkout?plan=medium" className="w-full rounded-xl bg-primary text-white px-4 py-3 font-bold text-center hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25">
                  {dict.landing.pricing.choose_medium}
                </Link>
              </div>

              {/* Premium */}
              <div className="rounded-3xl border border-surface-border p-8 bg-surface flex flex-col hover:shadow-xl transition-shadow">
                <h3 className="text-2xl font-bold mb-2">Premium</h3>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold">100.000</span>
                  <span className="text-foreground-muted font-medium"> {dict.landing.pricing.per_year}</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>{dict.landing.pricing.feature_all_medium}</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <strong>{dict.landing.pricing.feature_etats}</strong></li>
                </ul>
                <Link href="/checkout?plan=premium" className="w-full rounded-xl bg-background border-2 border-foreground text-foreground px-4 py-3 font-bold text-center hover:bg-foreground hover:text-background transition-colors">
                  {dict.landing.pricing.choose_premium}
                </Link>
              </div>
            </div>
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
