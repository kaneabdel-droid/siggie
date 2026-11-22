import { getDonneesCompletCampagneSpeculations } from './actions'
import { getTenantContext } from '@/utils/supabase/tenant'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Wheat, PieChart, FileText, Settings, CheckSquare } from 'lucide-react'
import SpeculationsClient from './SpeculationsClient'
import { uniteMontant } from '@/lib/currency'

export const dynamic = 'force-dynamic'

export default async function CampagneSpeculationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [data, tenant] = await Promise.all([
    getDonneesCompletCampagneSpeculations(id),
    getTenantContext(),
  ])

  if (!data || 'error' in data || !data.campagne) {
    notFound()
  }

  const unite = uniteMontant(tenant?.devise)
  const isPremium = tenant?.subscriptionTier === 'premium'

  return (
    <div className="space-y-6">
      {/* Navigation supérieure */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-foreground-muted mb-1.5">
            <Link
              href="/campagnes"
              className="hover:text-primary transition flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Campagnes</span>
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold truncate max-w-[200px]">
              {data.campagne.nom}
            </span>
            <span>/</span>
            <span className="text-primary font-bold">Suivi par Spéculation</span>
          </div>

          <h1 className="text-2xl font-black font-heading text-foreground flex items-center gap-2.5">
            <Wheat className="w-6 h-6 text-primary" />
            <span>Suivi Multi-Spéculations — {data.campagne.nom}</span>
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Pilotage par culture (Oignon, Tomate, etc.) : membres impliqués, superficie emblavée, crédit bancaire, facturation, collecte (poids & prix) et récapitulatif par membre.
          </p>
        </div>

        {/* Liens rapides vers les autres volets de la campagne */}
        <div className="flex items-center gap-2 print:hidden">
          <Link
            href={`/campagnes/${id}/config`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-border bg-surface hover:bg-background text-foreground text-xs font-semibold shadow-xs transition"
            title="Paramétrage & Inscriptions des membres"
          >
            <Settings className="w-3.5 h-3.5 text-foreground-muted" />
            <span className="hidden sm:inline">Config</span>
          </Link>
          <Link
            href={`/superficies?campagne_id=${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-border bg-surface hover:bg-background text-foreground text-xs font-semibold shadow-xs transition"
            title="Validation surfaces (Tour de casier)"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Tour de casier</span>
          </Link>
          <Link
            href={`/campagnes/${id}/repartition`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-border bg-surface hover:bg-background text-foreground text-xs font-semibold shadow-xs transition"
            title="Répartition des intrants"
          >
            <PieChart className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Répartition</span>
          </Link>
          <Link
            href={`/campagnes/${id}/bilan`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-bold shadow-xs transition"
            title="Bilan consolidé de campagne"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Bilan Campagne</span>
          </Link>
        </div>
      </div>

      {/* Interface interactive */}
      <SpeculationsClient
        campagneId={id}
        campagneNom={data.campagne.nom}
        unite={unite}
        speculations={data.speculations}
        syntheses={data.syntheses}
        recapitulatifMembres={data.recapitulatifMembres}
        creditBancaireCampagne={data.creditBancaireCampagne}
      />
    </div>
  )
}

