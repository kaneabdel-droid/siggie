import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutDashboard, User, Users, ClipboardList, Scale, GitCompare, Truck } from 'lucide-react'
import { getTenantContext } from '@/utils/supabase/tenant'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function BilansLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const isPremium = tenant.subscriptionTier === 'premium'
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-5">
        <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl sm:tracking-tight font-heading">
          {dict.sidebar?.bilans || dict.bilans?.title || "Bilan & Suivi budgétaire"}
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Bilans d&apos;exploitation, bilan annuel consolidé et suivi budgétaire de la coopérative.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-surface-border pb-4" aria-label="Tabs">
        <Link
          href="/bilans"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <LayoutDashboard className="w-4 h-4" />
          {dict.bilans.tabs.overview}
          {!isPremium && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">PRO</span>}
        </Link>
        <Link
          href="/bilans/smt"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <Scale className="w-4 h-4" />
          {(dict.bilans.tabs as any).smt || (dict.bilans.tabs as any).bilan_annuel || "Système Minimal de Trésorerie (SMT)"}
          {!isPremium && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">PRO</span>}
        </Link>
        <Link
          href="/bilans/suivi-budgetaire"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <ClipboardList className="w-4 h-4" />
          {dict.bilans.tabs.suivi_budgetaire}
          {!isPremium && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">PRO</span>}
        </Link>
        <Link
          href="/dashboard#comparatif-campagnes"
          className="bg-surface text-foreground-muted hover:text-primary rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <GitCompare className="w-4 h-4 text-primary" />
          Comparatif Campagnes (N vs N-1)
          {!isPremium && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">PRO</span>}
        </Link>
      </nav>

      {children}
    </div>
  )
}
