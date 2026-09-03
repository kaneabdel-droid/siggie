import Link from 'next/link'
import { Landmark, BookText, ArrowLeftRight } from 'lucide-react'

export default function TresorerieLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-5">
        <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl sm:tracking-tight font-heading">
          Trésorerie & Banque
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Gérez vos comptes en banque, votre caisse, et rapprochez vos crédits de campagne.
        </p>
      </div>

      <nav className="flex space-x-4 border-b border-surface-border pb-4" aria-label="Tabs">
        <Link
          href="/tresorerie"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <Landmark className="w-4 h-4" />
          Comptes (Soldes)
        </Link>
        <Link
          href="/tresorerie/journaux"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <BookText className="w-4 h-4" />
          Journaux
        </Link>
        <Link
          href="/tresorerie/rapprochement"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <ArrowLeftRight className="w-4 h-4" />
          Rapprochement
        </Link>
      </nav>

      {children}
    </div>
  )
}
