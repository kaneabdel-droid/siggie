import Link from 'next/link'
import { Package, Wheat } from 'lucide-react'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function IntrantsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-5">
        <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl sm:tracking-tight font-heading">
          {dict.sidebar?.intrants || "Intrants-Produits & Stocks"}
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Gestion des approvisionnements d&apos;intrants et des stocks de produits agricoles collectés en remboursement nature.
        </p>
      </div>

      <nav className="flex space-x-4 border-b border-surface-border pb-4" aria-label="Tabs">
        <Link
          href="/intrants"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <Package className="w-4 h-4 text-primary" />
          <span>Stocks d&apos;Intrants</span>
        </Link>
        <Link
          href="/intrants/stock-nature"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <Wheat className="w-4 h-4 text-emerald-600" />
          <span>Stock en Nature (Récoltes)</span>
        </Link>
      </nav>

      {children}
    </div>
  )
}

