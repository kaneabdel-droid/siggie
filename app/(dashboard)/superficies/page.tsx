import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Calendar, CheckSquare } from 'lucide-react'
import ValidationTable, { CampagneMembreValidation } from './ValidationTable'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Promise<{
    campagne_id?: string
  }>
}

import { getTenantContext } from '@/utils/supabase/tenant'

export default async function SuperficiesValidationPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenant = await getTenantContext()
  const gieName = tenant?.gieName || 'GIE'
  const subscriptionTier = tenant?.subscriptionTier || 'standard'

  if (subscriptionTier !== 'premium') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">
            Validation des superficies — Tour de casier
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Contrôle contradictoire sur le terrain des surfaces réellement emblavées par membre.
          </p>
        </div>

        <div className="bg-surface rounded-2xl border border-primary/20 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5 shadow-sm">
            <CheckSquare className="h-8 w-8" />
          </div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
            Module Réservé Premium
          </span>
          <h3 className="text-2xl font-bold font-heading text-foreground">
            Débloquez le Tour de Casier avec SIGGIE Premium
          </h3>
          <p className="mt-3 text-sm text-foreground-muted leading-relaxed">
            Le contrôle des surfaces emblavées par le Chef d&apos;exploitation (tour de casier, gestion des parcelles/casiers, réconciliation des déclarations, calcul automatique des écarts et édition du Procès-Verbal officiel) est exclusivement inclus dans la formule <strong>Premium</strong>.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/abonnement"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary-hover transition"
            >
              Passer à la formule Premium
            </Link>
            <Link
              href="/campagnes"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-surface border border-surface-border text-foreground font-medium text-sm hover:bg-background transition"
            >
              Retour aux campagnes
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Fetch campaigns
  const { data: campagnes } = await supabase
    .from('campagnes')
    .select('id, nom, statut, saison, annee, date_debut, date_fin')
    .order('created_at', { ascending: false })

  if (!campagnes || campagnes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">
            Validation des superficies — Tour de casier
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Contrôle contradictoire sur le terrain des surfaces réellement emblavées par membre.
          </p>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border p-8 text-center">
          <p className="text-foreground-muted">Aucune campagne n&apos;est actuellement créée.</p>
          <Link
            href="/campagnes"
            className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm"
          >
            Créer une campagne
          </Link>
        </div>
      </div>
    )
  }

  const params = await searchParams
  const selectedCampagneId = params?.campagne_id || campagnes[0]?.id
  const currentCampagne = campagnes.find((c) => c.id === selectedCampagneId) || campagnes[0]

  // Fetch members for this campaign
  const { data: recordsData, error: recError } = await supabase
    .from('campagne_membres')
    .select(`
      campagne_id,
      membre_id,
      superficie,
      superficie_validee,
      casier,
      statut_validation,
      date_controle,
      controleur,
      observations,
      valide_at,
      membres (
        id,
        nom,
        prenom,
        telephone,
        village,
        code_membre
      )
    `)
    .eq('campagne_id', currentCampagne.id)
    .order('casier', { ascending: true, nullsFirst: false })

  if (recError) {
    console.error('Erreur chargement validation tour casier:', recError)
  }

  const formattedRecords: CampagneMembreValidation[] = (recordsData || []).map((r: any) => ({
    campagne_id: r.campagne_id,
    membre_id: r.membre_id,
    superficie: Number(r.superficie || 0),
    superficie_validee: r.superficie_validee !== null ? Number(r.superficie_validee) : null,
    casier: r.casier,
    statut_validation: r.statut_validation || 'en_attente',
    date_controle: r.date_controle,
    controleur: r.controleur,
    observations: r.observations,
    valide_at: r.valide_at,
    membre: Array.isArray(r.membres) ? r.membres[0] : r.membres,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <CheckSquare className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold font-heading text-foreground">
                Validation des superficies (Tour de casier)
              </h2>
              <p className="mt-0.5 text-sm text-foreground-muted">
                Contrôle par le Chef d&apos;exploitation des surfaces emblavées et affectation des casiers/parcelles.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign switcher */}
      <div className="flex flex-wrap items-center gap-2 bg-surface p-2 rounded-xl border border-surface-border">
        <span className="text-xs font-semibold uppercase text-foreground-muted px-3">Campagne :</span>
        {campagnes.map((c) => {
          const isSelected = c.id === currentCampagne.id
          return (
            <Link
              key={c.id}
              href={`/superficies?campagne_id=${c.id}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground hover:bg-background'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 opacity-70" />
              <span>{c.nom}</span>
              {c.statut === 'en_cours' && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              )}
            </Link>
          )
        })}
      </div>

      {/* Validation Table and KPIs */}
      <ValidationTable
        campagne={currentCampagne}
        records={formattedRecords}
        gieName={gieName}
      />
    </div>
  )
}
