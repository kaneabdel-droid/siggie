'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import LanguageSelector from '@/components/LanguageSelector'
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

export default function ClientLayout({
  children,
  subscriptionTier,
  gieName,
  dict,
  locale
}: {
  children: React.ReactNode
  subscriptionTier: string
  gieName: string
  dict: any
  locale: string
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const navigation = [
    { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
    { key: 'membres', href: '/membres', icon: Users },
    { key: 'campagnes', href: '/campagnes', icon: Leaf },
    { key: 'intrants', href: '/intrants', icon: Tractor },
    { key: 'distribution', href: '/distribution', icon: PackageOpen },
    { key: 'credits', href: '/credits', icon: Landmark },
    { key: 'facturation', href: '/facturation', icon: ReceiptText },
    { key: 'remboursements', href: '/remboursements', icon: Banknote },
    { key: 'tresorerie', href: '/tresorerie', icon: Landmark },
    { key: 'materiel', href: '/materiel', icon: Tractor },
    { key: 'bilans', href: '/bilans', icon: FileSpreadsheet },
    { key: 'abonnement', href: '/abonnement', icon: Shield },
    { key: 'support', href: '/support', icon: LifeBuoy },
  ]

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
                <span className="sr-only">{dict.header.close_sidebar}</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            
            {/* Sidebar component */}
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[var(--sidebar)] px-6 pb-4">
              <div className="flex h-16 shrink-0 items-center">
                <h1 className="text-2xl font-bold text-primary font-heading">SIGGIE</h1>
              </div>
              <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {filteredNavigation.map((item) => (
                        <li key={item.key}>
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
                            {dict.sidebar[item.key]}
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
        {/* Sidebar component */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[var(--sidebar)] border-r border-surface-border px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-3xl font-bold text-primary font-heading tracking-wide">SIGGIE</h1>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {filteredNavigation.map((item) => (
                    <li key={item.key}>
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
                        {dict.sidebar[item.key]}
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
                  {dict.sidebar.logout}
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-surface-border bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button type="button" className="-m-2.5 p-2.5 text-foreground-muted lg:hidden" onClick={() => setSidebarOpen(true)}>
            <span className="sr-only">{dict.header.open_sidebar}</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-surface-border lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <LanguageSelector currentLang={locale} />
              <ThemeSwitcher />
              {/* Profile dropdown or simple user info could go here */}
              <div className="text-sm font-semibold leading-6 text-foreground">
                {gieName} ({dict.header.admin})
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
