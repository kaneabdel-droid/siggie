'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { getJournal } from '../actions'
import AddTransactionModal from './AddTransactionModal'
import TransactionRowActions from './TransactionRowActions'
import PrintSectionButton from '@/components/PrintSectionButton'
import {
  Truck,
  ArrowLeftRight,
  User,
  Filter,
  RotateCcw,
  FileText,
  Search,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  Layers,
  Wallet,
  Landmark,
} from 'lucide-react'
import { useUnite } from '@/components/DeviseProvider'

type Campagne = { id: string; nom: string; statut: string }

export default function JournalClient({
  comptes,
  imputations,
  campagnes,
  clients = [],
  membres = [],
  materiels = [],
  initialCompteId,
  dict,
  locale,
  gieName,
}: {
  comptes: any[]
  imputations: any[]
  campagnes: Campagne[]
  clients?: any[]
  membres?: any[]
  materiels?: any[]
  initialCompteId?: string
  dict: any
  locale: string
  gieName: string
}) {
  const unite = useUnite()
  const searchParams = useSearchParams()
  const urlCompteId = searchParams.get('compteId')
  const defaultCompte = initialCompteId || urlCompteId || (comptes.length > 0 ? comptes[0].id : 'all')
  const [selectedCompte, setSelectedCompte] = useState(defaultCompte)
  const [journal, setJournal] = useState<any[]>([])
  const [soldeInitial, setSoldeInitial] = useState(0)
  const [dateSoldeInitial, setDateSoldeInitial] = useState('')
  const [repartitionMateriel, setRepartitionMateriel] = useState<any[]>([])
  const [selectedMaterielFilter, setSelectedMaterielFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filtres de recherche multi-critères
  const [searchTerm, setSearchTerm] = useState('')
  const [fluxFilter, setFluxFilter] = useState<'all' | 'entree' | 'sortie'>('all')
  const [pieceFilter, setPieceFilter] = useState<string>('all')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  useEffect(() => {
    if (urlCompteId && urlCompteId !== selectedCompte && (urlCompteId === 'all' || comptes.some(c => c.id === urlCompteId))) {
      setSelectedCompte(urlCompteId)
    }
  }, [urlCompteId, comptes, selectedCompte])

  const t = dict?.tresorerie_pages?.journaux || {}
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    const clean = dateStr.slice(0, 10)
    if (clean.length === 10 && clean.includes('-')) {
      const [y, m, d] = clean.split('-')
      return locale === 'fr' ? `${d}/${m}/${y}` : `${y}-${m}-${d}`
    }
    return new Date(dateStr).toLocaleDateString(dateLocale)
  }

  const fetchJournal = useCallback(async () => {
    if (!selectedCompte) return
    setLoading(true)
    const res = await getJournal(selectedCompte)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setError('')
      setJournal(res.journal || [])
      setSoldeInitial(res.soldeInitial || 0)
      setDateSoldeInitial(res.dateSoldeInitial || '')
      setRepartitionMateriel(res.repartitionMateriel || [])
    }
  }, [selectedCompte])

  useEffect(() => {
    fetchJournal()
  }, [fetchJournal])

  const currentCompte = comptes.find((c) => c.id === selectedCompte)
  const isAllJournaux = selectedCompte === 'all'
  const isCaisseMateriel = (currentCompte?.nom || '').toLowerCase().includes('matériel') ||
    (currentCompte?.nom || '').toLowerCase().includes('materiel') ||
    repartitionMateriel.length > 0

  // Types de pièces uniques présents dans le journal actuel
  const availablePieceTypes = useMemo(() => {
    const set = new Set<string>()
    journal.forEach((l) => {
      if (l.type_piece) set.add(l.type_piece)
    })
    return Array.from(set).sort()
  }, [journal])

  // Filtrage combiné : recherche mot-clé, sens du flux, type de pièce, matériel, date
  const filteredJournal = useMemo(() => {
    return journal.filter((ligne) => {
      // 1. Filtre matériel
      if (selectedMaterielFilter !== 'all' && ligne.materiel_nom !== selectedMaterielFilter) {
        return false
      }

      // 2. Filtre par sens de flux
      if (fluxFilter === 'entree' && !ligne.entree) return false
      if (fluxFilter === 'sortie' && !ligne.sortie) return false

      // 3. Filtre par type de pièce
      if (pieceFilter !== 'all' && ligne.type_piece !== pieceFilter) {
        return false
      }

      // 4. Filtre par plage de dates
      const txDate = ligne.date_effective || (ligne.created_at ? ligne.created_at.slice(0, 10) : '')
      if (dateDebut && txDate && txDate < dateDebut) return false
      if (dateFin && txDate && txDate > dateFin) return false

      // 5. Recherche textuelle insensible à la casse
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const motif = String(ligne.motif_affiche || ligne.motif || '').toLowerCase()
        const tiers = String(ligne.tiers_affiche || '').toLowerCase()
        const ref = String(ligne.reference_piece || '').toLowerCase()
        const mat = String(ligne.materiel_nom || '').toLowerCase()
        const cpNom = String(ligne.compte_nom || '').toLowerCase()
        const piece = String(ligne.type_piece || '').toLowerCase()
        const montantStr = String(ligne.montant || '')
        const entreeStr = ligne.entree ? String(ligne.entree) : ''
        const sortieStr = ligne.sortie ? String(ligne.sortie) : ''

        const matches =
          motif.includes(term) ||
          tiers.includes(term) ||
          ref.includes(term) ||
          mat.includes(term) ||
          cpNom.includes(term) ||
          piece.includes(term) ||
          montantStr.includes(term) ||
          entreeStr.includes(term) ||
          sortieStr.includes(term)

        if (!matches) return false
      }

      return true
    })
  }, [journal, selectedMaterielFilter, fluxFilter, pieceFilter, dateDebut, dateFin, searchTerm])

  // Statistiques dynamiques sur les lignes filtrées
  const stats = useMemo(() => {
    let totalEntrees = 0
    let totalSorties = 0

    filteredJournal.forEach((ligne) => {
      if (ligne.entree) totalEntrees += Number(ligne.entree)
      if (ligne.sortie) totalSorties += Number(ligne.sortie)
    })

    const fluxNet = totalEntrees - totalSorties

    return {
      count: filteredJournal.length,
      totalEntrees,
      totalSorties,
      fluxNet,
    }
  }, [filteredJournal])

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    fluxFilter !== 'all' ||
    pieceFilter !== 'all' ||
    dateDebut ||
    dateFin ||
    selectedMaterielFilter !== 'all'
  )

  const handleResetFilters = () => {
    setSearchTerm('')
    setFluxFilter('all')
    setPieceFilter('all')
    setDateDebut('')
    setDateFin('')
    setSelectedMaterielFilter('all')
  }

  const formatAmount = (val: number) =>
    val.toLocaleString(dateLocale, { maximumFractionDigits: 0 })

  const getPieceLabel = (piece?: string | null) => {
    if (!piece) return null
    switch (piece) {
      case 'bon': return 'Bon'
      case 'facture_fournisseur': return 'Facture'
      case 'recu': return 'Reçu'
      case 'cheque': return 'Chèque'
      case 'versement': return 'Versement'
      case 'retrait_espece': return 'Espèces'
      case 'virement_interne': return 'Virement équilibré'
      case 'remboursement_credit': return 'Remb. crédit'
      case 'od': return 'OD'
      default: return piece
    }
  }

  // Compte effectif pour AddTransactionModal (si 'all', prendre le 1er compte)
  const effectiveModalCompteId = isAllJournaux ? (comptes[0]?.id || '') : selectedCompte

  return (
    <div className="space-y-6">
      {/* Sélecteur de compte & Boutons d'action */}
      <div className="sm:flex sm:items-end sm:justify-between sm:gap-4">
        <div className="max-w-md w-full">
          <label htmlFor="compte" className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span>{t.select_account || "Sélectionner un journal ou compte"}</span>
          </label>
          <select
            id="compte"
            value={selectedCompte}
            onChange={(e) => {
              setSelectedCompte(e.target.value)
              setSelectedMaterielFilter('all')
            }}
            className="block w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-foreground shadow-xs focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary sm:text-sm font-semibold"
          >
            <option value="all">📊 Tous les journaux (Tous les comptes consolidés)</option>
            <optgroup label="Journaux par compte">
              {comptes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} ({c.type_compte})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="mt-4 sm:mt-0 sm:flex-none flex items-center gap-2 flex-wrap">
          <PrintSectionButton sectionId="journal-print" label={dict?.common?.print || "Imprimer le journal"} />
          {effectiveModalCompteId && (
            <AddTransactionModal
              compteId={effectiveModalCompteId}
              comptes={comptes}
              imputations={imputations}
              campagnes={campagnes}
              clients={clients}
              membres={membres}
              materiels={materiels}
              isCaisseMateriel={isCaisseMateriel}
              onSuccess={fetchJournal}
              dict={dict}
            />
          )}
        </div>
      </div>

      {/* Barre de Recherche et Filtres Dynamiques */}
      <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Recherche Textuelle */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-foreground-muted" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par libellé, tiers, référence (CHQ, Bon, Facture...), matériel, montant..."
              className="w-full rounded-lg border border-surface-border bg-background py-2 pl-9 pr-9 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-foreground-muted hover:text-foreground"
                title="Effacer la recherche"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filtres secondaires */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtre Sens de flux */}
            <select
              value={fluxFilter}
              onChange={(e) => setFluxFilter(e.target.value as any)}
              className="rounded-lg border border-surface-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="all">Tous les flux</option>
              <option value="entree">Entrées (+) uniquement</option>
              <option value="sortie">Sorties (-) uniquement</option>
            </select>

            {/* Filtre Type de pièce */}
            <select
              value={pieceFilter}
              onChange={(e) => setPieceFilter(e.target.value)}
              className="rounded-lg border border-surface-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="all">Toutes pièces</option>
              <option value="bon">Bon</option>
              <option value="facture_fournisseur">Facture</option>
              <option value="recu">Reçu</option>
              <option value="cheque">Chèque</option>
              <option value="virement_interne">Virement équilibré</option>
              <option value="retrait_espece">Espèces</option>
              <option value="versement">Versement</option>
              <option value="remboursement_credit">Remb. crédit</option>
              {availablePieceTypes
                .filter((p) => !['bon', 'facture_fournisseur', 'recu', 'cheque', 'virement_interne', 'retrait_espece', 'versement', 'remboursement_credit'].includes(p))
                .map((p) => (
                  <option key={p} value={p}>
                    {getPieceLabel(p)}
                  </option>
                ))}
            </select>

            {/* Plage de dates */}
            <div className="flex items-center gap-1 bg-background border border-surface-border rounded-lg px-2 py-1 shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-foreground-muted shrink-0" />
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                title="Date de début"
                className="bg-transparent text-xs text-foreground focus:outline-hidden w-28"
              />
              <span className="text-foreground-muted text-xs">à</span>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                title="Date de fin"
                className="bg-transparent text-xs text-foreground focus:outline-hidden w-28"
              />
            </div>

            {/* Bouton Réinitialiser */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-background px-2.5 py-2 text-xs font-semibold text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors shadow-2xs"
                title="Réinitialiser tous les filtres"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        {/* Synthèse des flux filtrés */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-border/60 text-xs">
          <div className="flex items-center gap-2 text-foreground-muted">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span>
              <strong>{stats.count}</strong> écriture{stats.count > 1 ? 's' : ''} trouvée{stats.count > 1 ? 's' : ''}
              {hasActiveFilters && ' (filtré)'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-mono font-medium">
            <span className="text-success">
              Entrées : +{formatAmount(stats.totalEntrees)} {unite}
            </span>
            <span className="text-danger">
              Sorties : -{formatAmount(stats.totalSorties)} {unite}
            </span>
            <span className="text-foreground font-bold">
              Flux Net :{' '}
              <span className={stats.fluxNet >= 0 ? 'text-success' : 'text-danger'}>
                {stats.fluxNet >= 0 ? '+' : ''}{formatAmount(stats.fluxNet)} {unite}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Répartition par matériel pour Caisse Matériel ou transactions matérielles */}
      {isCaisseMateriel && repartitionMateriel.length > 0 && (
        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-secondary" />
              <h4 className="text-sm font-bold text-foreground font-heading">
                Répartition des flux par Matériel
              </h4>
            </div>
            {selectedMaterielFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedMaterielFilter('all')}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Afficher tout le matériel</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {repartitionMateriel.map((m) => {
              const isFiltered = selectedMaterielFilter === m.nom
              return (
                <button
                  type="button"
                  key={m.nom}
                  onClick={() => setSelectedMaterielFilter(isFiltered ? 'all' : m.nom)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isFiltered
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'border-surface-border bg-background/50 hover:bg-background'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="truncate">{m.nom}</span>
                    <span className={`font-mono ${m.net >= 0 ? 'text-success' : 'text-danger'}`}>
                      {m.net >= 0 ? '+' : ''}{formatAmount(m.net)} {unite}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-foreground-muted">
                    <span className="text-success font-medium">+{formatAmount(m.entrees)} {unite}</span>
                    <span className="text-danger font-medium">-{formatAmount(m.sorties)} {unite}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {loading && (
        <div className="p-8 text-center text-sm text-foreground-muted animate-pulse bg-surface border border-surface-border rounded-xl">
          {t.loading || "Chargement du journal..."}
        </div>
      )}

      {error && (
        <div className="p-4 bg-danger/10 text-danger rounded-xl border border-danger/20 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface shadow-xs" id="journal-print">
          <div className="hidden print:block px-6 pt-4">
            <h2 className="text-xl font-bold text-foreground">{gieName}</h2>
            <p className="text-sm text-foreground-muted">
              {t.title || "Journal de trésorerie"} — {isAllJournaux ? 'Tous les comptes consolidés' : (currentCompte?.nom || '')}
            </p>
            <div className="mt-2 text-xs flex gap-6 text-foreground-muted">
              <span>Date d&apos;impression : {new Date().toLocaleDateString(dateLocale)}</span>
              <span>Entrées filtrées : +{formatAmount(stats.totalEntrees)} {unite}</span>
              <span>Sorties filtrées : -{formatAmount(stats.totalSorties)} {unite}</span>
              <span><strong>Flux Net : {formatAmount(stats.fluxNet)} {unite}</strong></span>
            </div>
          </div>

          <table className="min-w-full divide-y divide-surface-border text-sm">
            <thead className="bg-background">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                  Date
                </th>
                {isAllJournaux && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                    Compte
                  </th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                  Motif / Opération
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                  Tiers / Contrepartie
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">
                  {t.headers?.in || "Entrée"}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">
                  {t.headers?.out || "Sortie"}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">
                  {t.headers?.balance || "Solde"}
                </th>
                <th scope="col" className="relative px-6 py-3 print:hidden">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-surface-border bg-surface">
              {filteredJournal.map((ligne, idx) => {
                const isVirement = ligne.type_piece === 'virement_interne'
                return (
                  <tr key={ligne.id || idx} className="hover:bg-surface-hover transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-foreground font-mono">
                      {formatDate(ligne.date_effective || ligne.created_at)}
                    </td>

                    {isAllJournaux && (
                      <td className="whitespace-nowrap px-6 py-4 text-xs">
                        <span className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground border border-surface-border shadow-2xs">
                          {ligne.compte_nom?.toLowerCase().includes('caisse') ? (
                            <Wallet className="h-3 w-3 text-amber-600" />
                          ) : (
                            <Landmark className="h-3 w-3 text-primary" />
                          )}
                          <span>{ligne.compte_nom || 'Compte'}</span>
                        </span>
                      </td>
                    )}

                    <td className="px-6 py-4 text-xs text-foreground">
                      <div className="font-semibold text-foreground">{ligne.motif_affiche || ligne.motif}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {ligne.reference_piece && (
                          <span className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground border border-surface-border shadow-2xs">
                            <FileText className="w-2.5 h-2.5 text-primary" />
                            <span>Réf: {ligne.reference_piece}</span>
                          </span>
                        )}
                        {ligne.type_piece && (
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            isVirement ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface text-foreground-muted border border-surface-border'
                          }`}>
                            {getPieceLabel(ligne.type_piece)}
                          </span>
                        )}
                        {ligne.materiel_nom && (
                          <span className="inline-flex items-center gap-1 rounded bg-secondary/15 px-1.5 py-0.5 text-[10px] font-medium text-secondary border border-secondary/20">
                            <Truck className="w-2.5 h-2.5" />
                            <span>{ligne.materiel_nom}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-background text-foreground border border-surface-border">
                        <User className="w-3 h-3 text-primary" />
                        <span>{ligne.tiers_affiche || '-'}</span>
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-xs text-right text-success font-bold font-mono">
                      {ligne.entree ? `+${formatAmount(ligne.entree)}` : ''}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-xs text-right text-danger font-bold font-mono">
                      {ligne.sortie ? `-${formatAmount(ligne.sortie)}` : ''}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-xs text-right text-foreground font-bold bg-background/50 font-mono">
                      {formatAmount(ligne.solde)} {unite}
                    </td>

                    <td className="relative whitespace-nowrap px-6 py-4 text-right text-xs font-medium print:hidden">
                      <TransactionRowActions
                        transaction={ligne}
                        comptes={comptes}
                        imputations={imputations}
                        campagnes={campagnes}
                        clients={clients}
                        membres={membres}
                        materiels={materiels}
                        isCaisseMateriel={isCaisseMateriel}
                        onSuccess={fetchJournal}
                        dict={dict}
                      />
                    </td>
                  </tr>
                )
              })}

              {filteredJournal.length === 0 && (
                <tr>
                  <td colSpan={isAllJournaux ? 8 : 7} className="px-6 py-12 text-center text-foreground-muted italic text-xs">
                    {hasActiveFilters
                      ? "Aucune opération ne correspond à vos critères de recherche ou filtres."
                      : "Aucune transaction enregistrée dans ce journal."}
                  </td>
                </tr>
              )}

              {/* Ligne du solde initial */}
              <tr className="bg-background/80 font-medium">
                <td colSpan={isAllJournaux ? 6 : 5} className="px-6 py-3 text-xs text-foreground text-right italic">
                  {t.initial_balance || "Solde initial"} {dateSoldeInitial ? `(au ${dateSoldeInitial})` : ''}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-xs text-right text-foreground font-bold font-mono">
                  {formatAmount(Number(soldeInitial))} {unite}
                </td>
                <td className="print:hidden"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
