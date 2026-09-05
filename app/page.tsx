'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Package, Smartphone, Zap, Shield, MonitorSmartphone, TrendingUp, X, Users, Menu } from 'lucide-react'
import { useState } from 'react'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="bg-background min-h-screen font-sans text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl font-bold font-heading text-primary">DEMBA SOLUTION</span>
            </div>
            <nav className="hidden md:flex gap-6">
              <a href="#produits" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors">Produits</a>
              <a href="#tarifs" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors">Tarifs</a>
              <a href="#astuces" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors">Astuces</a>
            </nav>
            <div className="flex gap-2 sm:gap-4 items-center">
              <Link href="/login" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors hidden sm:block">Connexion</Link>
              <Link href="#tarifs" className="rounded-full bg-primary px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all">
                S'abonner
              </Link>
              <button 
                className="md:hidden p-2 text-foreground-muted"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-surface-border bg-background/95 backdrop-blur-md px-4 py-4 space-y-4">
            <a href="#produits" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary">Produits</a>
            <a href="#tarifs" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary">Tarifs</a>
            <a href="#astuces" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary">Astuces</a>
            <hr className="border-surface-border" />
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary">Connexion</Link>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32 bg-gradient-to-br from-surface to-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-7xl font-bold font-heading tracking-tight text-foreground mb-6">
                Simplifiez la gestion de votre <span className="text-primary">Entreprise</span>
              </h1>
              <p className="mt-4 text-xl md:text-2xl text-foreground-muted mb-10 leading-relaxed">
                Demba Solution offre des solutions informatiques modernes et intuitives pour automatiser vos processus, suivre vos finances et booster votre productivité.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#tarifs" className="rounded-full bg-primary px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-semibold text-white shadow-lg hover:bg-primary-hover hover:scale-105 transition-all flex items-center justify-center gap-2">
                  Voir nos offres <ArrowRight className="w-5 h-5" />
                </a>
                <Link href="/login" className="rounded-full bg-surface border border-surface-border px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-semibold text-foreground hover:bg-black/5 transition-all flex items-center justify-center gap-2">
                  Espace Client
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
              <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">L'excellence au service de votre activité</h2>
              <p className="text-lg text-foreground-muted max-w-2xl mx-auto">Des outils pensés pour les réalités locales et les standards internationaux.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "Rapide & Efficace", desc: "Des interfaces fluides qui vous font gagner un temps précieux chaque jour." },
                { icon: Shield, title: "Sécurité Maximale", desc: "Vos données sont cryptées, sauvegardées et accessibles uniquement par vous." },
                { icon: MonitorSmartphone, title: "100% Responsive", desc: "Gérez votre activité depuis votre bureau ou sur le terrain avec votre smartphone." }
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
              <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Nos Solutions Web</h2>
              <p className="text-lg text-foreground-muted max-w-2xl mx-auto">Découvrez notre écosystème d'applications conçues pour simplifier votre quotidien.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Produit 1 : SIGGIE */}
              <div className="relative overflow-hidden rounded-2xl bg-background border border-surface-border shadow-sm p-8">
                <div className="absolute top-0 right-0 bg-success text-white text-xs font-bold px-3 py-1 rounded-bl-lg">En ligne (Août 2026)</div>
                <Package className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-2">SIGGIE</h3>
                <p className="text-foreground-muted mb-6">Le Système Intégré de Gestion de Groupement d'Intérêt Économique. Gérez vos membres, campagnes agricoles, intrants et trésorerie en un clic.</p>
                <Link href="#tarifs" className="text-primary font-semibold hover:underline flex items-center gap-1">S'abonner à SIGGIE <ArrowRight className="w-4 h-4" /></Link>
              </div>

              {/* Produit 2 : Bientôt */}
              <div className="relative overflow-hidden rounded-2xl bg-background border border-surface-border border-dashed shadow-sm p-8 opacity-80">
                <div className="absolute top-0 right-0 bg-warning text-white text-xs font-bold px-3 py-1 rounded-bl-lg">En développement (Oct 2026)</div>
                <TrendingUp className="w-10 h-10 text-foreground-muted mb-4" />
                <h3 className="text-2xl font-bold mb-2 text-foreground-muted">États Financiers Pro</h3>
                <p className="text-foreground-muted mb-6">Module avancé de génération automatique de bilans, comptes de résultat et ratios financiers pour les PME.</p>
                <span className="text-foreground-muted font-semibold flex items-center gap-1 cursor-not-allowed">Bientôt disponible</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Des tarifs adaptés à votre croissance</h2>
              <p className="text-lg text-foreground-muted max-w-2xl mx-auto">Choisissez le plan qui correspond aux besoins de votre entreprise. Paiement annuel sécurisé via Wave, Orange Money, Visa ou Virement.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Standard */}
              <div className="rounded-3xl border border-surface-border p-8 bg-surface flex flex-col hover:shadow-xl transition-shadow">
                <h3 className="text-2xl font-bold mb-2">Standard</h3>
                <p className="text-foreground-muted mb-6">L'essentiel pour bien démarrer votre digitalisation.</p>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold">50.000</span>
                  <span className="text-foreground-muted font-medium"> FCFA / an</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Gestion des membres</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Gestion des campagnes</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Facturation de base</span></li>
                  <li className="flex items-center gap-3 text-foreground-muted opacity-50"><X className="w-5 h-5" /> <span>Gestion du matériel & stocks</span></li>
                  <li className="flex items-center gap-3 text-foreground-muted opacity-50"><X className="w-5 h-5" /> <span>États financiers avancés</span></li>
                </ul>
                <Link href="/checkout?plan=standard" className="w-full rounded-xl bg-background border-2 border-primary text-primary px-4 py-3 font-bold text-center hover:bg-primary hover:text-white transition-colors">
                  Choisir Standard
                </Link>
              </div>

              {/* Medium */}
              <div className="rounded-3xl border-2 border-primary p-8 bg-primary/5 flex flex-col relative transform md:-translate-y-4 shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wide">Populaire</div>
                <h3 className="text-2xl font-bold mb-2 text-primary">Medium</h3>
                <p className="text-foreground-muted mb-6">Pour les entreprises en pleine expansion.</p>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold text-primary">75.000</span>
                  <span className="text-foreground-muted font-medium"> FCFA / an</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <span>Tout du plan Standard</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <strong>Gestion complète du matériel</strong></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <span>Suivi des consommations</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> <span>Amortissements & Rentabilité</span></li>
                  <li className="flex items-center gap-3 text-foreground-muted opacity-50"><X className="w-5 h-5" /> <span>États financiers avancés</span></li>
                </ul>
                <Link href="/checkout?plan=medium" className="w-full rounded-xl bg-primary text-white px-4 py-3 font-bold text-center hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25">
                  Choisir Medium
                </Link>
              </div>

              {/* Premium */}
              <div className="rounded-3xl border border-surface-border p-8 bg-surface flex flex-col hover:shadow-xl transition-shadow">
                <h3 className="text-2xl font-bold mb-2">Premium</h3>
                <p className="text-foreground-muted mb-6">La solution intégrale sans aucun compromis.</p>
                <div className="mb-8">
                  <span className="text-4xl font-extrabold">100.000</span>
                  <span className="text-foreground-muted font-medium"> FCFA / an</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Tout du plan Medium</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <strong>États financiers complets</strong></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Exports comptables avancés</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success" /> <span>Support prioritaire 24/7</span></li>
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
              <p className="text-lg text-foreground-muted max-w-2xl mx-auto">Boostez vos performances avec nos conseils d'experts.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="bg-background p-6 rounded-2xl border border-surface-border hover:shadow-md transition-all cursor-pointer">
                 <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center mb-4"><Smartphone className="w-6 h-6 text-info" /></div>
                 <h4 className="font-bold text-xl mb-2">Digitalisez vos reçus</h4>
                 <p className="text-foreground-muted text-sm leading-relaxed">Fini les papiers volants ! Prenez en photo vos factures et liez-les directement à vos décaissements dans SIGGIE.</p>
               </div>
               <div className="bg-background p-6 rounded-2xl border border-surface-border hover:shadow-md transition-all cursor-pointer">
                 <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4"><TrendingUp className="w-6 h-6 text-success" /></div>
                 <h4 className="font-bold text-xl mb-2">Suivez la rentabilité par machine</h4>
                 <p className="text-foreground-muted text-sm leading-relaxed">Le plan Medium vous permet d'associer les consommations de carburant à chaque prestation pour un calcul de ROI précis.</p>
               </div>
               <div className="bg-background p-6 rounded-2xl border border-surface-border hover:shadow-md transition-all cursor-pointer">
                 <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4"><Users className="w-6 h-6 text-warning" /></div>
                 <h4 className="font-bold text-xl mb-2">Impliquez vos membres</h4>
                 <p className="text-foreground-muted text-sm leading-relaxed">Partagez des bilans clairs générés en un clic avec vos membres pour renforcer la confiance et la transparence au sein du GIE.</p>
               </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-2xl font-bold font-heading text-background mb-4 block">DEMBA SOLUTION</span>
          <p className="text-background/70 mb-8 max-w-md mx-auto">Propulsez la gestion de votre organisation vers l'avenir avec nos solutions logicielles intuitives et performantes.</p>
          <div className="flex justify-center gap-6 mb-8">
            <a href="#" className="text-background/70 hover:text-white transition-colors">Conditions Générales</a>
            <a href="#" className="text-background/70 hover:text-white transition-colors">Politique de Confidentialité</a>
            <a href="#" className="text-background/70 hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-background/50 text-sm">© {new Date().getFullYear()} Demba Solution. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
