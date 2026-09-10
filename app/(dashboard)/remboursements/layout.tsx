import Link from 'next/link'
import { Receipt, Package } from 'lucide-react'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function RemboursementsLayout({
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
          {dict.remboursements.title}
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          {dict.remboursements.desc}
        </p>
      </div>

      <nav className="flex space-x-4 border-b border-surface-border pb-4" aria-label="Tabs">
        <Link
          href="/remboursements"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <Receipt className="w-4 h-4" />
          {dict.remboursements.tabs.factures}
        </Link>
        <Link
          href="/remboursements/stock-nature"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <Package className="w-4 h-4" />
          {dict.remboursements.tabs.stock_nature}
        </Link>
      </nav>

      {children}
    </div>
  )
}
