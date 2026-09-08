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

const modulesBase = [
  { icon: LayoutDashboard, label: 'Tableau de bord' },
  { icon: Users, label: 'Membres' },
  { icon: Calendar, label: 'Campagnes agricoles' },
  { icon: Package, label: 'Intrants & Stock' },
  { icon: Truck, label: 'Distribution' },
  { icon: Landmark, label: 'Crédits bancaires' },
  { icon: Receipt, label: 'Facturation' },
  { icon: HandCoins, label: 'Remboursements' },
  { icon: Wallet, label: 'Trésorerie' },
]

const plans = [
  {
    id: 'standard',
    nom: 'Standard',
    prix: '50 000 FCFA / an',
    resume: "L'essentiel pour gérer un GIE : membres, campagnes, stock et trésorerie.",
    inclus: modulesBase,
    color: 'border-surface-border',
  },
  {
    id: 'medium',
    nom: 'Medium',
    prix: '75 000 FCFA / an',
    resume: 'Tout Standard, plus le suivi complet du matériel agricole.',
    inclus: [
      ...modulesBase,
      { icon: Wrench, label: 'Gestion du matériel (inventaire, prestations, consommations, rentabilité, amortissements)' },
    ],
    color: 'border-primary',
    populaire: true,
  },
  {
    id: 'premium',
    nom: 'Premium',
    prix: '100 000 FCFA / an',
    resume: 'Tout Medium, plus les bilans et états financiers complets du GIE.',
    inclus: [
      ...modulesBase,
      { icon: Wrench, label: 'Gestion du matériel (inventaire, prestations, consommations, rentabilité, amortissements)' },
      { icon: FileBarChart, label: 'Bilans & états financiers avancés' },
    ],
    color: 'border-success',
  },
]

export default async function DecouvrirSiggiePage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <div className="bg-background min-h-screen font-sans text-foreground">
      <ClientNavbar dict={dict} currentLang={locale} />

      <main>
        {/* Hero */}
        <section className="py-16 lg:py-24 bg-gradient-to-br from-surface to-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
            <Link href="/" className="text-sm font-medium text-foreground-muted hover:text-primary flex items-center justify-center gap-2 mb-6">
              <ArrowLeft className="w-4 h-4" /> Retour à l&apos;accueil
            </Link>
            <h1 className="text-4xl md:text-6xl font-bold font-heading tracking-tight mb-6">
              Comment fonctionne <span className="text-primary">SIGGIE</span> ?
            </h1>
            <p className="text-lg md:text-xl text-foreground-muted leading-relaxed">
              De la création de votre compte à la gestion quotidienne de votre GIE : ce que vous obtenez,
              comment ça se passe, et ce qui change selon votre forfait.
            </p>
          </div>
        </section>

        {/* Parcours : inscription, connexion, abonnement */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <h2 className="text-3xl font-bold font-heading text-center mb-12">Votre parcours en 3 étapes</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="rounded-2xl border border-surface-border bg-surface p-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">1. Créer un compte</h3>
                <p className="text-foreground-muted mb-4">
                  Choisissez un forfait, renseignez le nom de votre GIE, votre email et un mot de passe.
                  Votre compte est créé immédiatement, avec <strong>7 jours d&apos;essai gratuit</strong> sur
                  le forfait choisi — aucun paiement requis pour démarrer.
                </p>
                <Link href="/signup" className="text-primary font-semibold hover:underline flex items-center gap-1 text-sm">
                  Créer mon compte <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="rounded-2xl border border-surface-border bg-surface p-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <LogIn className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">2. Se connecter</h3>
                <p className="text-foreground-muted mb-4">
                  Retrouvez votre tableau de bord avec votre email et votre mot de passe. Mot de passe
                  oublié ? Un lien de réinitialisation vous est envoyé par email en un clic.
                </p>
                <Link href="/login" className="text-primary font-semibold hover:underline flex items-center gap-1 text-sm">
                  Se connecter <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="rounded-2xl border border-surface-border bg-surface p-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">3. S&apos;abonner</h3>
                <p className="text-foreground-muted mb-4">
                  Avant la fin de l&apos;essai, réglez votre abonnement annuel par Wave, Orange Money, carte
                  bancaire ou virement, directement depuis votre espace &laquo; Mon Abonnement &raquo;.
                  Vous pouvez aussi changer de forfait à tout moment en ne payant que la différence.
                </p>
              </div>
            </div>

            <div className="mt-10 flex items-start gap-3 bg-warning/10 border border-warning/20 text-warning rounded-xl p-4 max-w-2xl mx-auto">
              <Clock className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">
                Sans paiement confirmé avant la fin des 7 jours d&apos;essai, l&apos;accès à votre espace est
                automatiquement suspendu <Lock className="inline w-4 h-4 -mt-1" /> jusqu&apos;au règlement — vos
                données restent intactes, rien n&apos;est perdu.
              </p>
            </div>
          </div>
        </section>

        {/* Fenêtres par niveau d'abonnement */}
        <section className="py-20 bg-surface border-t border-surface-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-heading mb-4">Les modules selon votre forfait</h2>
              <p className="text-lg text-foreground-muted max-w-2xl mx-auto">
                Chaque forfait supérieur inclut tout ce qui précède, plus ses propres modules.
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
                      Populaire
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
                    Choisir {plan.nom}
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
              Démarrer mon essai gratuit <ArrowRight className="w-5 h-5" />
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
