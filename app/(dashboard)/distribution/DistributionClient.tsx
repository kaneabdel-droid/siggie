'use client'

import { useState, useMemo } from 'react'
import { Users, BarChart3, Search, Filter, X, RotateCcw, Calendar, Package, Layers } from 'lucide-react'
import CreateDistributionModal from './CreateDistributionModal'
import DistributionRowActions from './DistributionRowActions'

interface DistributionClientProps {
  distributions: any[]
  campagnes: any[]
  campagneMembres: any[]
  intrants: any[]
  campagneIntrants: any[]
  dejaDistribue: Record<string, number>
  dict: any
  locale: string
}

export default function DistributionClient({
  distributions = [],
  campagnes = [],
  campagneMembres = [],
  intrants = [],
  campagneIntrants = [],
  dejaDistribue = {},
  dict,
  locale,
}: DistributionClientProps) {
  // Campagne par défaut : en cours
  const defaultCampagneId = useMemo(() => {
    const enCours = campagnes.find((c) => c.statut === 'en_cours')
    return enCours?.id || campagnes[0]?.id || ''
  }, [campagnes])

  // Filtres
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCampagneId, setSelectedCampagneId] = useState(defaultCampagneId)
  const [selectedTypeIntrant, setSelectedTypeIntrant] = useState('')
  const [selectedIntrantId, setSelectedIntrantId] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  // Types d'intrants uniques disponibles
  const typesIntrantsDisponibles = useMemo(() => {
    const types = new Set<string>()
    intrants.forEach((i) => {
      if (i.type_intrant) types.add(i.type_intrant)
    })
    return Array.from(types).sort()
  }, [intrants])

  // Intrants filtrables par type sélectionné
  const intrantsFiltres = useMemo(() => {
    if (!selectedTypeIntrant) return intrants
    return intrants.filter((i) => i.type_intrant === selectedTypeIntrant)
  }, [intrants, selectedTypeIntrant])

  // Filtrage principal des distributions
  const filteredDistributions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return distributions.filter((dist) => {
      // 1. Filtre par recherche textuelle (Nom membre, prénom, matricule, téléphone, nom produit, type)
      if (term) {
        const nomMembre = (dist.membres?.nom || '').toLowerCase()
        const prenomMembre = (dist.membres?.prenom || '').toLowerCase()
        const codeMembre = (dist.membres?.code_membre || '').toLowerCase()
        const telMembre = (dist.membres?.telephone || '').toLowerCase()
        const nomIntrant = (dist.intrants?.nom || '').toLowerCase()
        const typeIntrant = (dist.intrants?.type_intrant || '').toLowerCase()
        const nomCampagne = (dist.campagnes?.nom || '').toLowerCase()

        const match =
          nomMembre.includes(term) ||
          prenomMembre.includes(term) ||
          codeMembre.includes(term) ||
          telMembre.includes(term) ||
          nomIntrant.includes(term) ||
          typeIntrant.includes(term) ||
          nomCampagne.includes(term) ||
          `${prenomMembre} ${nomMembre}`.includes(term)

        if (!match) return false
      }

      // 2. Filtre par Campagne
      if (selectedCampagneId && dist.campagne_id !== selectedCampagneId) {
        return false
      }

      // 3. Filtre par Type d'intrant
      if (selectedTypeIntrant && dist.intrants?.type_intrant !== selectedTypeIntrant) {
        return false
      }

      // 4. Filtre par Intrant spécifique
      if (selectedIntrantId && dist.intrant_id !== selectedIntrantId) {
        return false
      }

      // 5. Filtre par Date de distribution
      const dateDist = (dist.date_distribution || dist.created_at || '').substring(0, 10)
      if (dateDebut && dateDist < dateDebut) return false
      if (dateFin && dateDist > dateFin) return false

      return true
    })
  }, [distributions, searchTerm, selectedCampagneId, selectedTypeIntrant, selectedIntrantId, dateDebut, dateFin])

  // Calcul dynamique des KPIs filtrés
  const kpisFiltres = useMemo(() => {
    const membresSet = new Set<string>()
    let totalQuantite = 0

    filteredDistributions.forEach((d) => {
      if (d.membre_id) membresSet.add(d.membre_id)
      totalQuantite += Number(d.quantite) || 0
    })

    return {
      nombreMembres: membresSet.size,
      nombreOperations: filteredDistributions.length,
      totalQuantite,
    }
  }, [filteredDistributions])

  const hasActiveFilters =
    Boolean(searchTerm) ||
    Boolean(selectedCampagneId) ||
    Boolean(selectedTypeIntrant) ||
    Boolean(selectedIntrantId) ||
    Boolean(dateDebut) ||
    Boolean(dateFin)

  const reinitialiserFiltres = () => {
    setSearchTerm('')
    setSelectedCampagneId('')
    setSelectedTypeIntrant('')
    setSelectedIntrantId('')
    setDateDebut('')
    setDateFin('')
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec titre et bouton de création */}
      <div className="sm:flex sm:items-center sm:justify-between gap-4">
        <div className="sm:flex-auto min-w-0">
          <h2 className="text-2xl font-bold font-heading text-foreground break-words">
            {dict.distribution?.title || 'Distribution aux Membres'}
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {dict.distribution?.desc || 'Remettez des intrants aux membres inscrits dans les campagnes.'}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:flex-none">
          <CreateDistributionModal
            campagnes={campagnes || []}
            campagneMembres={campagneMembres}
            intrants={intrants || []}
            campagneIntrants={campagneIntrants || []}
            dejaDistribue={dejaDistribue}
            dict={dict}
          />
        </div>
      </div>

      {/* Cartes KPI dynamiques (s'adaptent en temps réel aux filtres) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface px-4 py-4 shadow-xs sm:p-5 border border-surface-border flex items-center gap-4">
          <div className="rounded-xl bg-secondary/20 p-3 shrink-0">
            <Users className="h-6 w-6 text-secondary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              {dict.distribution?.kpis?.members || 'Membres Bénéficiaires'}
            </dt>
            <dd className="mt-1 text-2xl font-black text-foreground truncate">
              {kpisFiltres.nombreMembres}
            </dd>
            {hasActiveFilters && (
              <span className="text-[11px] text-foreground-muted">sur la sélection filtrée</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-surface px-4 py-4 shadow-xs sm:p-5 border border-surface-border flex items-center gap-4">
          <div className="rounded-xl bg-success/20 p-3 shrink-0">
            <BarChart3 className="h-6 w-6 text-success" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              {dict.distribution?.kpis?.operations || 'Opérations Réalisées'}
            </dt>
            <dd className="mt-1 text-2xl font-black text-foreground truncate">
              {kpisFiltres.nombreOperations}
            </dd>
            {hasActiveFilters && (
              <span className="text-[11px] text-foreground-muted">sur {distributions.length} au total</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-surface px-4 py-4 shadow-xs sm:p-5 border border-surface-border flex items-center gap-4">
          <div className="rounded-xl bg-primary/20 p-3 shrink-0">
            <Package className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              {dict.distribution?.kpis?.total || 'Quantité Distribuée'}
            </dt>
            <dd className="mt-1 text-2xl font-black text-primary truncate">
              {kpisFiltres.totalQuantite.toLocaleString('fr-FR')} <span className="text-sm font-semibold">{dict.distribution?.kpis?.units || 'unités'}</span>
            </dd>
            {hasActiveFilters && (
              <span className="text-[11px] text-foreground-muted">quantités cumulées</span>
            )}
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres complets */}
      <div className="bg-surface rounded-2xl border border-surface-border p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Champ de recherche texte */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-foreground-muted" />
            </div>
            <input
              type="text"
              className="block w-full rounded-xl border border-surface-border bg-background py-2 pl-9 pr-9 text-xs sm:text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              placeholder="Rechercher par membre (nom, prénom, matricule, tél), intrant ou campagne..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-foreground-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtres déroulants */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            {/* Filtre Campagne */}
            <div className="w-full sm:w-44">
              <select
                value={selectedCampagneId}
                onChange={(e) => setSelectedCampagneId(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-background py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Toutes les campagnes</option>
                {campagnes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre Type d'intrant */}
            <div className="w-full sm:w-40">
              <select
                value={selectedTypeIntrant}
                onChange={(e) => {
                  setSelectedTypeIntrant(e.target.value)
                  setSelectedIntrantId('') // reset intrant spécifique si on change de type
                }}
                className="w-full rounded-xl border border-surface-border bg-background py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 capitalize"
              >
                <option value="">Tous les types</option>
                {typesIntrantsDisponibles.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre Intrant spécifique */}
            <div className="w-full sm:w-44">
              <select
                value={selectedIntrantId}
                onChange={(e) => setSelectedIntrantId(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-background py-2 px-3 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Tous les intrants</option>
                {intrantsFiltres.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Ligne des filtres de dates et réinitialisation */}
        <div className="pt-2 border-t border-surface-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-foreground-muted">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Période :
            </span>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="rounded-lg border border-surface-border bg-background py-1 px-2 text-xs text-foreground focus:outline-hidden"
              title="Date début"
            />
            <span>au</span>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="rounded-lg border border-surface-border bg-background py-1 px-2 text-xs text-foreground focus:outline-hidden"
              title="Date fin"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="font-medium">
              {filteredDistributions.length} résultat{filteredDistributions.length > 1 ? 's' : ''} trouvé{filteredDistributions.length > 1 ? 's' : ''}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={reinitialiserFiltres}
                className="inline-flex items-center gap-1.5 font-bold text-primary hover:text-primary-hover hover:underline transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser les filtres</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tableau des distributions */}
      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden overflow-x-auto shadow-xs ring-1 ring-surface-border sm:rounded-2xl bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-bold text-foreground uppercase tracking-wider sm:pl-6">
                      {dict.distribution?.table?.date || 'Date'}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                      {dict.distribution?.table?.beneficiary || 'Bénéficiaire'}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                      {dict.distribution?.table?.product || 'Produit Remis'}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-xs font-bold text-foreground uppercase tracking-wider">
                      {dict.distribution?.table?.quantity || 'Quantité'}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                      {dict.distribution?.table?.season || 'Campagne'}
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-xs font-bold text-foreground uppercase tracking-wider">
                      {dict.distribution?.table?.actions || 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {filteredDistributions.length > 0 ? (
                    filteredDistributions.map((dist) => {
                      const nomMembre = dist.membres ? `${dist.membres.prenom} ${dist.membres.nom}` : dict.distribution?.table?.unknown_member || 'Membre inconnu'
                      const dateAffichee = new Date(dist.date_distribution || dist.created_at).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')

                      return (
                        <tr key={dist.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="whitespace-nowrap py-3.5 pl-4 pr-3 text-xs text-foreground-muted sm:pl-6 font-medium">
                            {dateAffichee}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-xs text-foreground">
                            <div className="font-semibold">{nomMembre}</div>
                            <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted mt-0.5">
                              {dist.membres?.code_membre && (
                                <span className="font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                  {dist.membres.code_membre}
                                </span>
                              )}
                              {dist.membres?.telephone && (
                                <span>• {dist.membres.telephone}</span>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-xs text-foreground">
                            <span className="font-medium">{dist.intrants?.nom || dict.distribution?.table?.deleted_product || 'Produit supprimé'}</span>
                            {dist.intrants?.type_intrant && (
                              <span className="ml-2 inline-flex items-center capitalize rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-surface-border text-foreground-muted">
                                {dist.intrants.type_intrant}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-xs text-right font-bold text-primary text-sm">
                            {Number(dist.quantite).toLocaleString('fr-FR')}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-xs text-foreground-muted">
                            <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[11px] font-medium">
                              {dist.campagnes?.nom || '-'}
                            </span>
                          </td>
                          <td className="relative whitespace-nowrap py-3.5 pl-3 pr-4 text-right text-xs font-medium sm:pr-6">
                            <DistributionRowActions
                              id={dist.id}
                              intrantNom={dist.intrants?.nom || 'produit'}
                              quantite={dist.quantite}
                              dict={dict}
                            />
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-foreground-muted">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Package className="w-8 h-8 mx-auto text-foreground-muted/60" />
                          <p className="font-semibold text-foreground">
                            {hasActiveFilters
                              ? 'Aucune distribution ne correspond aux filtres appliqués.'
                              : dict.distribution?.table?.empty || 'Aucune distribution enregistrée.'}
                          </p>
                          {hasActiveFilters && (
                            <button
                              type="button"
                              onClick={reinitialiserFiltres}
                              className="text-primary font-bold hover:underline"
                            >
                              Réinitialiser les filtres
                            </button>
                          )}
                        </div>
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
