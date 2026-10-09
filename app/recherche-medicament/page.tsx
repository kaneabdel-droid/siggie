import Link from 'next/link'
import { Activity } from 'lucide-react'
import RechercheClient from './RechercheClient'

export const metadata = {
  title: 'Recherche Médicaments | D-PHARMA',
}

export default function RechercheMedicamentPage() {
  return (
    <div className="bg-background min-h-screen font-sans text-foreground">
      {/* Navbar simplifiée pour l'interface publique */}
      <nav className="bg-surface border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <Activity className="w-8 h-8 text-primary animate-pulse-slow" />
              <span className="text-2xl font-bold font-heading text-primary tracking-wide">D-PHARMA</span>
            </div>
            <div className="flex items-center">
              <Link href="/" className="text-foreground-muted hover:text-foreground font-medium transition-colors">
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero / Contenu principal */}
      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <RechercheClient />
      </main>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-2xl font-bold font-heading text-background mb-4 block">D-PHARMA</span>
          <p className="text-background/70 mb-4 max-w-md mx-auto">
            Trouvez rapidement vos médicaments dans les pharmacies partenaires.
          </p>
          <p className="text-background/50 text-sm">© {new Date().getFullYear()} Demba Solution.</p>
        </div>
      </footer>
    </div>
  )
}
