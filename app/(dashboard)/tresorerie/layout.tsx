import Link from 'next/link'
import { Landmark, BookText, ArrowLeftRight, Tags } from 'lucide-react'
import { getTenantContext } from '@/utils/supabase/tenant'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function TresorerieLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  // Les rubriques budgétaires (imputations) sont réservées au forfait Premium :
  // l'onglet n'est proposé que si le GIE y a accès (la page elle-même
  // redirige en plus les accès directs par URL, comme pour /bilans).
  const tenant = await getTenantContext()
  const isPremium = tenant?.subscriptionTier === 'premium'

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

      <nav className="flex flex-wrap gap-2 border-b border-surface-border pb-4" aria-label="Tabs">
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
        {isPremium && (
          <Link
            href="/tresorerie/imputations"
            className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
          >
            <Tags className="w-4 h-4" />
            {dict.tresorerie.tabs.imputations}
          </Link>
        )}
      </nav>

      {children}
    </div>
  )
}
