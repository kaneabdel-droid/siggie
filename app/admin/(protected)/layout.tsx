import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Building2, Wallet, Settings, LogOut, LayoutGrid } from 'lucide-react'
import { getSharedAdminUser } from '@/utils/supabase/admin-identity'
import { isAdminEmail } from '@/lib/admin/auth'

// Défense en profondeur : le middleware bloque déjà /admin aux non-admins, mais on
// re-vérifie ici comme (dashboard)/layout.tsx re-vérifie déjà l'auth malgré le middleware.
// Vérification faite via l'identité admin partagée (SSO inter-produits), pas le
// client "produit" habituel — cf. utils/supabase/admin-identity.ts. getSharedAdminUser
// est mémoïsé par requête, donc partagé sans coût avec les actions appelées depuis
// cette même navigation/revalidation.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSharedAdminUser()

  if (!isAdminEmail(user?.email)) {
    redirect('/admin/login')
  }

  const navItems = [
    { href: '/admin', label: 'Accueil', icon: LayoutGrid },
    { href: '/admin/siggie', label: 'Tableau de bord SIGGIE', icon: LayoutDashboard },
    { href: '/admin/gies', label: 'GIE', icon: Building2 },
    { href: '/admin/paiements', label: 'Paiements', icon: Wallet },
    { href: '/admin/config', label: 'Configuration', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-surface flex">
      <aside className="w-64 shrink-0 bg-background border-r border-surface-border flex flex-col">
        <div className="p-6 border-b border-surface-border">
          <p className="font-bold font-heading text-lg">Demba Admin</p>
          <p className="text-xs text-foreground-muted mt-1">{user?.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-surface transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-surface-border">
          <a href="/admin/logout" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground-muted hover:bg-surface transition-colors">
            <LogOut className="w-4 h-4" />
            Déconnexion
          </a>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
