'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function ClientMaterielLayout({
  children,
  dict
}: {
  children: React.ReactNode
  dict: any
}) {
  const pathname = usePathname()

  const tabs = [
    { name: dict.tabs.inventaire, href: '/materiel/inventaire' },
    { name: dict.tabs.prestations, href: '/materiel/prestations' },
    { name: dict.tabs.consommations, href: '/materiel/consommations' },
    { name: dict.tabs.rentabilite, href: '/materiel/rentabilite' },
    { name: dict.tabs.amortissements, href: '/materiel/amortissements' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl sm:tracking-tight font-heading">
          {dict.title}
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          {dict.desc}
        </p>
      </div>

      <div className="mb-6">
        <div className="sm:hidden">
          <label htmlFor="tabs" className="sr-only">
            Sélectionner un onglet
          </label>
          <select
            id="tabs"
            name="tabs"
            className="block w-full rounded-md border-surface-border bg-surface py-2 pl-3 pr-10 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
            defaultValue={tabs.find((tab) => pathname.includes(tab.href))?.name || tabs[0].name}
            onChange={(e) => {
              const tab = tabs.find((t) => t.name === e.target.value)
              if (tab) window.location.href = tab.href
            }}
          >
            {tabs.map((tab) => (
              <option key={tab.name}>{tab.name}</option>
            ))}
          </select>
        </div>
        <div className="hidden sm:block">
          <div className="border-b border-surface-border">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => {
                const isActive = pathname.includes(tab.href)
                return (
                  <Link
                    key={tab.name}
                    href={tab.href}
                    className={classNames(
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-foreground-muted hover:border-surface-border hover:text-foreground',
                      'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {tab.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {children}
    </div>
  )
}
