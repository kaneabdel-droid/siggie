'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Building,
  DollarSign,
  Clock,
  CheckCircle2,
  Wallet,
  Layers,
  Tractor,
  Sprout,
  Search,
  Filter,
  Calendar,
  Layers2
} from 'lucide-react'
import CreditRowActions from './CreditRowActions'
import { getCreditType, getCreditEquipementNom, getCreditPeriodicite, cleanButCredit, isCreditIndependant } from '@/lib/credits-types'

type CreditItem = {
  id: string
  montant_demande: number
  montant_accorde: number
  statut: string
  banque_nom: string | null
  but_credit?: string | null
  taux_interet?: number | null
  duree_credit?: number | null
  type_financement?: string | null
  type_credit?: string | null
  equipement_nom?: string | null
  periodicite_remboursement?: string | null
  nombre_echeances?: number | null
  montant_echeance?: number | null
  campagnes?: { nom: string } | null
  created_at?: string
}

export default function CreditsListClient({
  credits,
  comptes,
  dict,
  locale,
  unite,
  totalDecaisse,
}: {
  credits: CreditItem[]
  comptes: any[]
  dict: any
  locale: string
  unite: string
  totalDecaisse: number
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'campagne' | 'equipement'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'en_attente' | 'valide' | 'rejete'>('all')

  const localeCode = locale === 'fr' ? 'fr-FR' : 'en-US'

  // Enrichissement des crédits avec la distinction métier
  const enrichedCredits = useMemo(() => {
    return credits.map((c) => {
      const type = getCreditType(c)
      const equipementNom = getCreditEquipementNom(c)
      const periodicite = getCreditPeriodicite(c)
      const cleanedReason = cleanButCredit(c.but_credit)
      const isIndep = isCreditIndependant(c)
      return {
        ...c,
        computedType: type,
        computedEquipementNom: equipementNom,
        computedPeriodicite: periodicite,
        computedIsIndependant: isIndep,
        cleanedReason,
      }
    })
  }, [credits])

  // Filtrage
  const filteredCredits = useMemo(() => {
    return enrichedCredits.filter((c) => {
      if (activeTab !== 'all' && c.computedType !== activeTab) return false
      if (statusFilter !== 'all' && c.statut !== statusFilter) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchBank = c.banque_nom?.toLowerCase().includes(q)
        const matchCampagne = c.campagnes?.nom?.toLowerCase().includes(q)
        const matchEquip = c.computedEquipementNom?.toLowerCase().includes(q)
        const matchReason = c.cleanedReason?.toLowerCase().includes(q)
        if (!matchBank && !matchCampagne && !matchEquip && !matchReason) return false
      }

      return true
    })
  }, [enrichedCredits, activeTab, statusFilter, searchQuery])

  // KPIs
  const kpiCampagne = useMemo(() => {
    const list = enrichedCredits.filter((c) => c.computedType === 'campagne')
    const demande = list.reduce((sum, c) => sum + (c.montant_demande || 0), 0)
    const accorde = list.reduce((sum, c) => sum + (c.montant_accorde || 0), 0)
    return { count: list.length, demande, accorde }
  }, [enrichedCredits])

  const kpiEquipement = useMemo(() => {
    const list = enrichedCredits.filter((c) => c.computedType === 'equipement')
    const demande = list.reduce((sum, c) => sum + (c.montant_demande || 0), 0)
    const accorde = list.reduce((sum, c) => sum + (c.montant_accorde || 0), 0)
    return { count: list.length, demande, accorde }
  }, [enrichedCredits])

  const totalDemande = enrichedCredits.reduce((sum, c) => sum + (c.montant_demande || 0), 0)
  const totalAccorde = enrichedCredits.reduce((sum, c) => sum + (c.montant_accorde || 0), 0)
  const creditDisponible = Math.max(0, totalAccorde - totalDecaisse)
  const enAttenteCount = enrichedCredits.filter((c) => c.statut === 'en_attente').length

  return (
    <div className="space-y-6">
      {/* 4 Cartes KPIs ventilées */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 : Trésorerie Campagne (Court terme) */}
        <div className="overflow-hidden rounded-xl bg-surface p-5 shadow-sm border border-surface-border transition-all hover:border-emerald-500/50">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-lg bg-emerald-500/10 p-2.5 shrink-0 text-emerald-600 dark:text-emerald-400">
              <Sprout className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <dt className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                Trésorerie Campagne (Court terme)
              </dt>
              <dd className="mt-2 text-xl font-bold tracking-tight text-foreground">
                {kpiCampagne.accorde.toLocaleString(localeCode, { maximumFractionDigits: 0 })}
                <span className="text-xs font-normal text-foreground-muted ml-1">{unite}</span>
              </dd>
              <div className="mt-1 text-xs text-foreground-muted">
                Demandé : {kpiCampagne.demande.toLocaleString(localeCode, { maximumFractionDigits: 0 })} {unite} • {kpiCampagne.count} dossiers
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2 : Investissement Équipement (Moyen terme) */}
        <div className="overflow-hidden rounded-xl bg-surface p-5 shadow-sm border border-surface-border transition-all hover:border-indigo-500/50">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-lg bg-indigo-500/10 p-2.5 shrink-0 text-indigo-600 dark:text-indigo-400">
              <Tractor className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <dt className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                Équipement (Moyen terme)
              </dt>
              <dd className="mt-2 text-xl font-bold tracking-tight text-foreground">
                {kpiEquipement.accorde.toLocaleString(localeCode, { maximumFractionDigits: 0 })}
                <span className="text-xs font-normal text-foreground-muted ml-1">{unite}</span>
              </dd>
              <div className="mt-1 text-xs text-foreground-muted">
                Demandé : {kpiEquipement.demande.toLocaleString(localeCode, { maximumFractionDigits: 0 })} {unite} • {kpiEquipement.count} matériels
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3 : Crédit global disponible */}
        <div className="overflow-hidden rounded-xl bg-surface p-5 shadow-sm border border-surface-border transition-all">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <dt className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                Crédit Disponible
              </dt>
              <dd className="mt-2 text-xl font-bold tracking-tight text-foreground">
                {creditDisponible.toLocaleString(localeCode, { maximumFractionDigits: 0 })}
                <span className="text-xs font-normal text-foreground-muted ml-1">{unite}</span>
              </dd>
              <div className="mt-1 text-xs text-foreground-muted">
                Décaissé : {totalDecaisse.toLocaleString(localeCode, { maximumFractionDigits: 0 })} {unite}
              </div>
            </div>
          </div>
        </div>

        {/* KPI 4 : En attente d'approbation */}
        <div className="overflow-hidden rounded-xl bg-surface p-5 shadow-sm border border-surface-border transition-all">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-lg bg-warning/10 p-2.5 shrink-0 text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <dt className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                Dossiers en attente
              </dt>
              <dd className="mt-2 text-xl font-bold tracking-tight text-foreground">
                {enAttenteCount}
                <span className="text-xs font-normal text-foreground-muted ml-1">dossiers</span>
              </dd>
              <div className="mt-1 text-xs text-foreground-muted">
                Total accordé : {totalAccorde.toLocaleString(localeCode, { maximumFractionDigits: 0 })} {unite}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'onglets et de filtres */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Onglets Métier */}
        <div className="inline-flex rounded-xl bg-surface border border-surface-border p-1 gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-background/50'
            }`}
          >
            Tous les crédits
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
              {enrichedCredits.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('campagne')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'campagne'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-background/50'
            }`}
          >
            <Sprout className="h-3.5 w-3.5" />
            Crédits Campagne (Trésorerie)
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-[10px]">
              {kpiCampagne.count}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('equipement')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'equipement'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-background/50'
            }`}
          >
            <Tractor className="h-3.5 w-3.5" />
            Crédits Équipement (Moyen terme)
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-[10px]">
              {kpiEquipement.count}
            </span>
          </button>
        </div>

        {/* Filtres recherche & statut */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-foreground-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher banque, matériel..."
              className="w-full rounded-lg bg-surface border border-surface-border pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg bg-surface border border-surface-border px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">Tous statuts</option>
            <option value="valide">Accordé / Validé</option>
            <option value="en_attente">En attente</option>
            <option value="rejete">Rejeté</option>
          </select>
        </div>
      </div>

      {/* Tableau des crédits */}
      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-surface-border text-left text-sm">
          <thead className="bg-background/60 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            <tr>
              <th className="py-3.5 pl-5 pr-3">Nature & Objet</th>
              <th className="px-3 py-3.5">Organisme Prêteur</th>
              <th className="px-3 py-3.5 text-center">Modalité / Échéancier</th>
              <th className="px-3 py-3.5 text-right">{dict.credits.table.demanded}</th>
              <th className="px-3 py-3.5 text-right">{dict.credits.table.granted}</th>
              <th className="px-3 py-3.5 text-center">{dict.credits.table.status}</th>
              <th className="relative py-3.5 pl-3 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filteredCredits.length > 0 ? (
              filteredCredits.map((credit) => {
                const isEquip = credit.computedType === 'equipement'
                const equipNom = credit.computedEquipementNom

                return (
                  <tr key={credit.id} className="hover:bg-background/40 transition-colors">
                    {/* Colonne 1 : Nature & Objet */}
                    <td className="py-4 pl-5 pr-3">
                      <div className="flex items-start gap-2">
                        {isEquip ? (
                          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                            <Tractor className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                            <Sprout className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isEquip
                                  ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
                                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                              }`}
                            >
                              {isEquip ? '🚜 Équipement' : '🌾 Campagne'}
                            </span>
                            <span className="font-semibold text-foreground text-sm">
                              {isEquip ? (equipNom || 'Matériel agricole') : (credit.campagnes?.nom || 'Campagne en cours')}
                            </span>
                            {isEquip && (credit.computedIsIndependant ? (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface text-foreground-muted border border-surface-border" title="Non rattaché à une campagne spécifique (pluriannuel)">
                                Indépendant
                              </span>
                            ) : credit.campagnes?.nom ? (
                              <span className="text-[10px] text-foreground-muted">
                                ({credit.campagnes.nom})
                              </span>
                            ) : null)}
                          </div>

                          {credit.cleanedReason && (
                            <p className="text-xs text-foreground-muted mt-1 max-w-xs line-clamp-1">
                              {credit.cleanedReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Colonne 2 : Banque */}
                    <td className="px-3 py-4 text-xs text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Building className="h-3.5 w-3.5 text-foreground-muted shrink-0" />
                        {credit.banque_nom || (
                          <span className="text-foreground-muted italic">{dict.credits.table.unspecified}</span>
                        )}
                      </div>
                    </td>

                    {/* Colonne 3 : Financement / Échéancier */}
                    <td className="px-3 py-4 text-xs text-center whitespace-nowrap">
                      {isEquip ? (
                        <div className="space-y-0.5">
                          <Link
                            href={`/credits/${credit.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-500/20 transition-colors"
                            title="Consulter l'échéancier et les amortissements"
                          >
                            <Calendar className="h-3 w-3" />
                            {credit.duree_credit ? `${Math.round(credit.duree_credit / 12)} ans (${credit.duree_credit} mois)` : 'Moyen terme'}
                          </Link>
                          <div className="text-[11px] text-foreground-muted capitalize">
                            Annuités {credit.computedPeriodicite}s
                          </div>
                        </div>
                      ) : credit.type_financement === 'par_intrant' ? (
                        <Link
                          href={`/credits/${credit.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          title="Consulter et gérer la ventilation par intrant & service"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          Par intrant
                        </Link>
                      ) : (
                        <Link
                          href={`/credits/${credit.id}`}
                          className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-xs text-foreground-muted border border-surface-border hover:text-foreground transition-colors"
                          title="Enveloppe unique de trésorerie"
                        >
                          Global
                        </Link>
                      )}
                    </td>

                    {/* Colonne 4 : Demandé */}
                    <td className="px-3 py-4 text-xs text-foreground-muted text-right whitespace-nowrap">
                      {credit.montant_demande.toLocaleString(localeCode, { maximumFractionDigits: 0 })}{unite}
                    </td>

                    {/* Colonne 5 : Accordé */}
                    <td className="px-3 py-4 text-xs text-right font-semibold text-foreground whitespace-nowrap">
                      {credit.statut === 'valide' ? (
                        <span className="text-success font-bold">
                          {credit.montant_accorde.toLocaleString(localeCode, { maximumFractionDigits: 0 })}{unite}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Colonne 6 : Statut */}
                    <td className="px-3 py-4 text-xs text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                          credit.statut === 'en_attente'
                            ? 'bg-warning/10 text-warning ring-warning/20'
                            : credit.statut === 'valide'
                            ? 'bg-success/10 text-success ring-success/20'
                            : 'bg-danger/10 text-danger ring-danger/20'
                        }`}
                      >
                        {credit.statut === 'en_attente'
                          ? dict.credits.table.status_pending
                          : credit.statut === 'valide'
                          ? dict.credits.table.status_valid
                          : dict.credits.table.status_rejected}
                      </span>
                    </td>

                    {/* Colonne 7 : Actions */}
                    <td className="py-4 pl-3 pr-5 text-right text-xs font-medium whitespace-nowrap">
                      <CreditRowActions credit={credit} comptes={comptes || []} dict={dict} locale={locale} />
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-foreground-muted">
                  {searchQuery || statusFilter !== 'all' || activeTab !== 'all'
                    ? 'Aucun crédit ne correspond à vos critères de recherche.'
                    : dict.credits.table.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
