import Link from 'next/link'
import { Users, Truck, FileSpreadsheet, FileText } from 'lucide-react'
import { getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import { redirect } from 'next/navigation'

export default async function TiersODLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getTenantContext()
  if (!tenant) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-5">
        <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl sm:tracking-tight font-heading">
          Tiers & OD
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Gestion des comptes et relevés des clients et fournisseurs, et journal des opérations diverses (OD).
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-surface-border pb-4" aria-label="Tabs">
        <Link
          href="/tiers-od/clients"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <Users className="w-4 h-4 text-primary" />
          <span>Comptes Clients</span>
        </Link>
        <Link
          href="/tiers-od/releve-client"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          <span>Relevés Clients</span>
        </Link>
        <Link
          href="/tiers-od/fournisseurs"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <Truck className="w-4 h-4 text-amber-500" />
          <span>Comptes Fournisseurs</span>
        </Link>
        <Link
          href="/tiers-od/releve-fournisseur"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-500" />
          <span>Relevés Fournisseurs</span>
        </Link>
        <Link
          href="/tiers-od/journal-od"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>Journal OD (Frais généraux & Produits)</span>
        </Link>
      </nav>

      {children}
    </div>
  )
}
