import { createClient } from '@/utils/supabase/server'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import ReleveMembreClient from '@/app/(dashboard)/bilans/releve-membre/ReleveMembreClient'
import Link from 'next/link'
import { Users, FileSpreadsheet } from 'lucide-react'

export default async function MembresRelevesPage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()

  const { data: membres } = await supabase
    .from('membres')
    .select('id, prenom, nom, code_membre')
    .order('prenom', { ascending: true })

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="border-b border-surface-border pb-5">
        <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl sm:tracking-tight font-heading">
          Membres du GIE
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Relevés individuels des comptes de campagne, factures, crédits et remboursements des adhérents.
        </p>
      </div>

      {/* Onglets Membres */}
      <div className="border-b border-surface-border">
        <nav className="flex space-x-6" aria-label="Tabs">
          <Link
            href="/membres"
            className="flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium border-transparent text-foreground-muted hover:text-foreground transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Liste des Membres</span>
          </Link>

          <Link
            href="/membres/releves"
            className="flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium border-primary text-primary font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Relevés des Membres</span>
          </Link>
        </nav>
      </div>

      <ReleveMembreClient
        membres={membres || []}
        dict={dict}
        locale={locale}
        gieName={tenant?.gieName || 'Mon GIE'}
      />
    </div>
  )
}
