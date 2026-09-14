import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Lock } from 'lucide-react'
import MembreToggle from './MembreToggle'
import SuperficieCampagneInput from './SuperficieCampagneInput'
import CampagneIntrantsManager from './CampagneIntrantsManager'
import BudgetPrevisionsManager from './BudgetPrevisionsManager'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function CampagneConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.campagnes_detail.config

  const { data: campagne } = await supabase
    .from('campagnes')
    .select('*')
    .eq('id', id)
    .single()

  if (!campagne) {
    notFound()
  }

  // Ces requêtes ne dépendent ni les unes des autres ni du contenu de
  // `campagne` (seulement de `id`, déjà connu) : elles partent en parallèle
  // plutôt qu'en série pour ne pas cumuler leurs latences réseau.
  const [
    { data: membres },
    { data: enrolledData },
    { data: intrants },
    { data: campagneIntrants },
    tenant,
  ] = await Promise.all([
    // Membres actifs du GIE (les inactifs ne peuvent pas être inscrits à une campagne)
    supabase.from('membres').select('*').eq('statut', 'actif').order('prenom', { ascending: true }),
    supabase.from('campagne_membres').select('membre_id, superficie').eq('campagne_id', id),
    supabase.from('intrants').select('*').order('nom', { ascending: true }),
    supabase.from('campagne_intrants').select('id, intrant_id, prix_facturation, intrants(nom, type_intrant)').eq('campagne_id', id),
    // Détermine le forfait du GIE pour n'afficher la prévision budgétaire
    // (feature Premium) que si l'abonnement le permet.
    getTenantContext(),
  ])

  const enrolledIds = new Set(enrolledData?.map(e => e.membre_id) || [])
  const superficieParMembre = new Map((enrolledData || []).map((e) => [e.membre_id, e.superficie || 0]))

  const totalInscrits = enrolledIds.size
  const totalMembres = membres?.length || 0

  const isPremium = tenant?.subscriptionTier === 'premium'

  let rubriquesExploitation: { id: string; libelle: string; compte: string; nature: string }[] = []
  let rubriquesMateriel: { id: string; libelle: string; compte: string; nature: string }[] = []
  let previsions: Record<string, number> = {}
  let materielsDuGie: { id: string; nom: string }[] = []

  if (isPremium) {
    // Pour le budget Matériel, la rubrique est l'équipement lui-même (la
    // sous-rubrique est son type de prestation/consommation) : la réalisation
    // est ensuite tirée de materiel_prestations / materiel_consommations
    // plutôt que des imputations de trésorerie (voir suivi-budgetaire/actions.ts).
    const [{ data: imputations }, { data: budgetPrevisions }, { data: materielsData }] = await Promise.all([
      supabase.from('imputations').select('*').order('libelle'),
      supabase.from('budget_previsions').select('imputation_id, montant_prevu').eq('campagne_id', id),
      supabase.from('materiels').select('id, nom').order('nom'),
    ])

    rubriquesExploitation = (imputations || []).filter((imp) => imp.categorie === 'exploitation')
    rubriquesMateriel = (imputations || []).filter((imp) => imp.categorie === 'materiel')

    const previsionsMap = new Map((budgetPrevisions || []).map((p) => [p.imputation_id, Number(p.montant_prevu) || 0]))
    previsions = Object.fromEntries(previsionsMap)
    materielsDuGie = materielsData || []
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/campagnes" className="text-sm font-medium text-primary hover:text-primary-hover flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          {dict.campagnes_detail.back}
        </Link>
      </div>

      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto min-w-0">
          <h2 className="text-2xl font-bold font-heading text-foreground break-words">
            {t.title} {campagne.nom}
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            {t.desc}
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center gap-4">
        <div className="rounded-md bg-secondary/20 p-3 shrink-0">
          <Users className="h-6 w-6 text-secondary" aria-hidden="true" />
        </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">{t.enrollment_rate}</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground truncate">
            {totalInscrits} / {totalMembres} {t.members_unit}
          </dd>
        </div>
      </div>

      <div className="mt-8">
        <CampagneIntrantsManager
          campagneId={id}
          intrants={intrants || []}
          campagneIntrants={(campagneIntrants as any) || []}
          dict={dict}
        />
      </div>

      <div className="mt-8">
        {isPremium ? (
          <BudgetPrevisionsManager
            campagneId={id}
            rubriquesExploitation={rubriquesExploitation}
            rubriquesMateriel={rubriquesMateriel}
            previsions={previsions}
            materiels={materielsDuGie}
            dict={dict}
          />
        ) : (
          <div className="mb-8 flex items-start gap-3 rounded-lg border border-surface-border bg-background/50 px-4 py-4 sm:px-6">
            <Lock className="h-5 w-5 text-foreground-muted shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm text-foreground-muted break-words">{t.budget.premium_required}</p>
              <Link href="/abonnement" className="mt-1 inline-block text-sm font-medium text-primary hover:text-primary-hover">
                {t.budget.premium_upgrade_link}
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flow-root">
        <div className="sm:flex sm:items-center mb-4">
          <div className="sm:flex-auto">
            <h3 className="text-base font-semibold leading-6 text-foreground">{t.enrolled_title}</h3>
          </div>
        </div>
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">{t.headers.member}</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">{t.headers.code}</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">{t.headers.village}</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{t.headers.superficie}</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{t.headers.enrolled}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {membres && membres.length > 0 ? (
                    membres.map((membre) => {
                      const isEnrolled = enrolledIds.has(membre.id)
                      return (
                        <tr key={membre.id} className="hover:bg-background/50 transition-colors">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">
                            {membre.prenom} {membre.nom}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                            {membre.code_membre}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                            {membre.village}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                            {isEnrolled ? (
                              <SuperficieCampagneInput
                                campagneId={id}
                                membreId={membre.id}
                                initialValue={superficieParMembre.get(membre.id) || 0}
                              />
                            ) : (
                              <span className="text-foreground-muted">{membre.superficie || 0}</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                            <MembreToggle
                              campagneId={id}
                              membreId={membre.id}
                              isEnrolledInitial={isEnrolled}
                            />
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        {t.empty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
