'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { 
  LayoutDashboard, 
  Users, 
  Leaf, 
  Landmark, 
  Tractor,
  Banknote,
  ReceiptText,
  FileSpreadsheet,
  Menu,
  X,
  LogOut,
  PackageOpen,
  LifeBuoy,
  Shield
} from 'lucide-react'

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Membres', href: '/membres', icon: Users },
  { name: 'Campagnes', href: '/campagnes', icon: Leaf },
  { name: 'Intrants & Stock', href: '/intrants', icon: Tractor },
  { name: 'Distribution', href: '/distribution', icon: PackageOpen },
  { name: 'Crédits Bancaires', href: '/credits', icon: Landmark },
  { name: 'Facturation', href: '/facturation', icon: ReceiptText },
  { name: 'Remboursements', href: '/remboursements', icon: Banknote },
  { name: 'Trésorerie', href: '/tresorerie', icon: Landmark },
  { name: 'Matériel', href: '/materiel', icon: Tractor },
  { name: 'Bilans & Relevés', href: '/bilans', icon: FileSpreadsheet },
  { name: 'Abonnement', href: '/abonnement', icon: Shield },
  { name: 'Aide & Support', href: '/support', icon: LifeBuoy },
]

export default function ClientLayout({
  children,
  subscriptionTier,
  gieName
}: {
  children: React.ReactNode
  subscriptionTier: string
  gieName: string
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const filteredNavigation = navigation.filter(item => {
    if (subscriptionTier === 'standard') {
      if (item.href === '/materiel' || item.href === '/bilans') return false
    }
    if (subscriptionTier === 'medium') {
      if (item.href === '/bilans') return false
    }
    return true
  })

  return (
    <div>
      {/* Mobile sidebar */}
      <div className={`relative z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-background/80" onClick={() => setSidebarOpen(false)} />
        
        <div className="fixed inset-0 flex">
          <div className="relative mr-16 flex w-full max-w-xs flex-1">
            <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
              <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                <span className="sr-only">Fermer la barre latérale</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            
            {/* Sidebar component, swap this element with another sidebar if you like */}
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[var(--sidebar)] px-6 pb-4">
              <div className="flex h-16 shrink-0 items-center">
                <h1 className="text-2xl font-bold text-primary font-heading">SIGGIE</h1>
              </div>
              <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {filteredNavigation.map((item) => (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`
                              group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                              ${pathname === item.href 
                                ? 'bg-primary text-white' 
                                : 'text-foreground-muted hover:text-foreground hover:bg-black/5'
                              }
                            `}
                          >
                            <item.icon
                              className={`h-6 w-6 shrink-0 ${pathname === item.href ? 'text-white' : 'text-foreground-muted group-hover:text-foreground'}`}
                              aria-hidden="true"
                            />
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[var(--sidebar)] border-r border-surface-border px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-3xl font-bold text-primary font-heading tracking-wide">SIGGIE</h1>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {filteredNavigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors
                          ${pathname === item.href 
                            ? 'bg-primary text-white' 
                            : 'text-foreground-muted hover:text-foreground hover:bg-black/5'
                          }
                        `}
                      >
                        <item.icon
                          className={`h-6 w-6 shrink-0 ${pathname === item.href ? 'text-white' : 'text-foreground-muted group-hover:text-foreground'}`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              
              <li className="mt-auto">
                <a
                  href="/logout"
                  className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-foreground-muted hover:bg-black/5 hover:text-danger transition-colors"
                >
                  <LogOut className="h-6 w-6 shrink-0 text-foreground-muted group-hover:text-danger" aria-hidden="true" />
                  Déconnexion
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-surface-border bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button type="button" className="-m-2.5 p-2.5 text-foreground-muted lg:hidden" onClick={() => setSidebarOpen(true)}>
            <span className="sr-only">Ouvrir la barre latérale</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-surface-border lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <ThemeSwitcher />
              {/* Profile dropdown or simple user info could go here */}
              <div className="text-sm font-semibold leading-6 text-foreground">
                {gieName} (Admin)
              </div>
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
