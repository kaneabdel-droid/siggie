import Link from 'next/link'
import { Landmark, BookText, ArrowLeftRight, Tags } from 'lucide-react'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function TresorerieLayout({
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
          {dict.tresorerie.title}
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          {dict.tresorerie.desc}
        </p>
      </div>

      <nav className="flex space-x-4 border-b border-surface-border pb-4" aria-label="Tabs">
        <Link
          href="/tresorerie"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <Landmark className="w-4 h-4" />
          {dict.tresorerie.tabs.comptes}
        </Link>
        <Link
          href="/tresorerie/journaux"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <BookText className="w-4 h-4" />
          {dict.tresorerie.tabs.journaux}
        </Link>
        <Link
          href="/tresorerie/rapprochement"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <ArrowLeftRight className="w-4 h-4" />
          {dict.tresorerie.tabs.rapprochement}
        </Link>
        <Link
          href="/tresorerie/imputations"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <Tags className="w-4 h-4" />
          {dict.tresorerie.tabs.imputations}
        </Link>
      </nav>

      {children}
    </div>
  )
}
