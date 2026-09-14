import Link from 'next/link'
import { Building2, Wrench, ArrowUpRight, Clock } from 'lucide-react'

// Chaque produit DembaSolution a son propre projet Supabase et son propre espace
// /admin — pas de portail unifié (une seule connexion, une seule session) pour
// l'instant, cf. plan D-QUINCA §0. Cette page est l'accueil de Demba Admin : un
// point d'entrée unique qui renvoie vers l'espace admin de chaque produit ; passer
// à un produit externe demande de s'y connecter avec ses propres identifiants
// admin (même email possible, session distincte).
const produits = [
  {
    nom: 'SIGGIE',
    description: 'Gestion des GIE agricoles — membres, campagnes, intrants, trésorerie.',
    href: '/admin/siggie',
    externe: false,
    icon: Building2,
    statut: 'en_ligne' as const,
  },
  {
    nom: 'D-QUINCA',
    description: 'Gestion de quincailleries — stock, ventes, trésorerie multi-magasins.',
    href: 'https://d-quinca.dembasolution.com/admin',
    externe: true,
    icon: Wrench,
    statut: 'en_ligne' as const,
  },
]

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold font-heading mb-2">Demba Admin</h1>
      <p className="text-sm text-foreground-muted mb-6">
        Chaque produit a son propre espace d&apos;administration et son propre projet Supabase.
        Un compte admin distinct est nécessaire pour chacun (même email possible).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {produits.map(({ nom, description, href, externe, icon: Icon, statut }) => (
          <Link
            key={nom}
            href={href}
            target={externe ? '_blank' : undefined}
            rel={externe ? 'noopener noreferrer' : undefined}
            className="group bg-background rounded-xl p-5 border border-surface-border hover:border-primary transition-colors flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <Icon className="w-6 h-6 text-primary" />
              <ArrowUpRight className="w-4 h-4 text-foreground-muted group-hover:text-primary transition-colors" />
            </div>
            <div>
              <p className="font-semibold font-heading">{nom}</p>
              <p className="text-sm text-foreground-muted mt-1">{description}</p>
            </div>
            <span className="text-xs font-medium text-success">
              {statut === 'en_ligne' ? 'En ligne' : 'Bientôt disponible'}
            </span>
          </Link>
        ))}

        <div className="rounded-xl p-5 border border-dashed border-surface-border flex flex-col items-center justify-center text-center gap-2 text-foreground-muted">
          <Clock className="w-5 h-5" />
          <p className="text-sm">Les prochains produits DembaSolution apparaîtront ici à leur lancement.</p>
        </div>
      </div>
    </div>
  )
}
