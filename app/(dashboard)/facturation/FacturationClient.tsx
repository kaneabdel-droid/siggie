'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, ReceiptText, Filter, RotateCcw, CheckCircle2, Clock, Wallet, Tractor, Package, ExternalLink, Wheat } from 'lucide-react'
import DownloadPdfButton from './DownloadPdfButton'
import FactureWhatsAppModal from './FactureWhatsAppModal'

import GenererFacturesModal from './GenererFacturesModal'
import CalculInteretModal from './CalculInteretModal'
import { useUnite } from '@/components/DeviseProvider'
import FicheClientModal from '@/components/FicheClientModal'

export default function FacturationClient({
  factures = [],
  campagnes = [],
  speculations = [],
  dict,
  locale,
  gieName,
}: {
  factures: any[]
  campagnes: { id: string; nom: string; statut?: string }[]
  speculations?: any[]
  dict: any
  locale: string
  gieName: string
}) {
  const unite = useUnite()
  const defaultCampagneId = useMemo(() => {
    const enCours = campagnes.find((c) => c.statut === 'en_cours')
    return enCours?.id || campagnes[0]?.id || ''
  }, [campagnes])

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCampagneId, setSelectedCampagneId] = useState(defaultCampagneId)
  const [selectedSpecId, setSelectedSpecId] = useState<string>('all')
  const [selectedStatut, setSelectedStatut] = useState<string>('all')
  const [selectedTypeDoc, setSelectedTypeDoc] = useState<'all' | 'campagne' | 'prestation' | 'vente_stock'>('all')

  const availableSpeculations = useMemo(() => {
    const list: { id: string; nom: string; campagne_id?: string }[] = []
    const seen = new Set<string>()

    // Depuis les spéculations chargées du serveur
    speculations.forEach((s) => {
      if (!selectedCampagneId || s.campagne_id === selectedCampagneId) {
        if (!seen.has(s.id)) {
          seen.add(s.id)
          list.push({ id: s.id, nom: s.nom, campagne_id: s.campagne_id })
        }
      }
    })

    // Compléter depuis les factures
    factures.forEach((f: any) => {
      if (selectedCampagneId && f.campagne_id !== selectedCampagneId && f.campagne?.id !== selectedCampagneId) return
      if (f.remboursements_par_speculation) {
        f.remboursements_par_speculation.forEach((sp: any) => {
          if (sp.speculation_id && !seen.has(sp.speculation_id)) {
            seen.add(sp.speculation_id)
            list.push({ id: sp.speculation_id, nom: sp.nom, campagne_id: f.campagne_id || f.campagne?.id })
          }
        })
      }
    })

    return list
  }, [speculations, factures, selectedCampagneId])

  const countsByType = useMemo(() => {
    let campagne = 0
    let prestation = 0
    let vente_stock = 0
    factures.forEach((f) => {
      if (selectedCampagneId && f.campagne_id !== selectedCampagneId && f.campagne?.id !== selectedCampagneId) {
        return
      }
      const t = f.type_document || 'campagne'
      if (t === 'prestation') prestation++
      else if (t === 'vente_stock') vente_stock++
      else campagne++
    })
    return { all: campagne + prestation + vente_stock, campagne, prestation, vente_stock }
  }, [factures, selectedCampagneId])

  const filteredFactures = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return factures.filter((f) => {
      const docType = f.type_document || 'campagne'
      if (selectedTypeDoc !== 'all' && docType !== selectedTypeDoc) {
        return false
      }

      // 1. Recherche texte (Nom, prénom, client, code membre, téléphone, ID, nom campagne, désignation)
      if (term) {
        const nom = (f.membre?.nom || '').toLowerCase()
        const prenom = (f.membre?.prenom || '').toLowerCase()
        const clientNom = (f.client_nom || f.client?.nom || '').toLowerCase()
        const codeMembre = (f.membre?.code_membre || '').toLowerCase()
        const tel = (f.membre?.telephone || f.client_telephone || f.client?.telephone || '').toLowerCase()
        const fid = String(f.id || '').toLowerCase()
        const campNom = (f.campagne?.nom || '').toLowerCase()
        const desig = (f.designation || '').toLowerCase()

        const match =
          nom.includes(term) ||
          prenom.includes(term) ||
          clientNom.includes(term) ||
          codeMembre.includes(term) ||
          tel.includes(term) ||
          fid.includes(term) ||
          campNom.includes(term) ||
          desig.includes(term) ||
          `${prenom} ${nom}`.includes(term)

        if (!match) return false
      }

      // 2. Filtre campagne
      if (selectedCampagneId && f.campagne_id !== selectedCampagneId && f.campagne?.id !== selectedCampagneId) {
        return false
      }

      // 3. Filtre spéculation / culture
      if (selectedSpecId !== 'all') {
        if (docType !== 'campagne') return false
        const sp = f.remboursements_par_speculation?.find((s: any) => s.speculation_id === selectedSpecId)
        if (!sp || (Number(sp.superficie || 0) <= 0 && Number(sp.montant_du || 0) <= 0)) {
          return false
        }
      }

      // 4. Filtre statut
      if (selectedStatut !== 'all') {
        const isCropFiltered = selectedSpecId !== 'all'
        const spDetail = isCropFiltered && docType === 'campagne'
          ? f.remboursements_par_speculation?.find((s: any) => s.speculation_id === selectedSpecId)
          : null

        const currentStatut = spDetail
          ? (spDetail.solde <= 0 ? 'payee' : spDetail.montant_rembourse > 0 ? 'partiellement_paye' : 'impayee')
          : f.statut

        if (selectedStatut === 'impayee' && currentStatut !== 'impayee') return false
        if (selectedStatut === 'payee' && currentStatut !== 'payee') return false
        if (selectedStatut === 'partiellement_paye' && currentStatut !== 'partiellement_paye') return false
      }

      return true
    })
  }, [factures, searchTerm, selectedCampagneId, selectedSpecId, selectedStatut, selectedTypeDoc])

  // KPIs adaptés à la culture sélectionnée ou au cumul
  const stats = useMemo(() => {
    let totalFacture = 0
    let totalPaye = 0
    let countImpayee = 0
    let countPartiel = 0
    let countPayee = 0

    const isCropFiltered = selectedSpecId !== 'all'

    filteredFactures.forEach((f) => {
      const spDetail = isCropFiltered && f.type_document === 'campagne'
        ? f.remboursements_par_speculation?.find((s: any) => s.speculation_id === selectedSpecId)
        : null

      const montantInteret = spDetail ? 0 : Number(f.montant_interet || 0)
      const totalDu = spDetail ? Number(spDetail.montant_du || 0) : (Number(f.montant_total || 0) + montantInteret)
      const paye = spDetail ? Number(spDetail.montant_rembourse || 0) : Number(f.montant_paye || 0)
      const solde = totalDu - paye
      const statutEffective = spDetail
        ? (solde <= 0 ? 'payee' : paye > 0 ? 'partiellement_paye' : 'impayee')
        : f.statut

      totalFacture += totalDu
      totalPaye += paye

      if (statutEffective === 'payee') countPayee++
      else if (statutEffective === 'partiellement_paye') countPartiel++
      else countImpayee++
    })

    const resteARecouvrer = Math.max(0, totalFacture - totalPaye)
    const tauxRecouvrement = totalFacture > 0 ? Math.round((totalPaye / totalFacture) * 100) : 0

    return {
      totalFacture,
      totalPaye,
      resteARecouvrer,
      tauxRecouvrement,
      countImpayee,
      countPartiel,
      countPayee,
      totalCount: filteredFactures.length,
    }
  }, [filteredFactures, selectedSpecId])

  const hasActiveFilters = Boolean(
    searchTerm ||
      selectedCampagneId !== defaultCampagneId ||
      selectedSpecId !== 'all' ||
      selectedStatut !== 'all' ||
      selectedTypeDoc !== 'all'
  )

  const resetFilters = () => {
    setSearchTerm('')
    setSelectedCampagneId(defaultCampagneId)
    setSelectedSpecId('all')
    setSelectedStatut('all')
    setSelectedTypeDoc('all')
  }

  const formatAmount = (val: number) =>
    val.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="sm:flex-auto min-w-0">
          <h2 className="text-2xl font-bold font-heading text-foreground break-words">{dict.facturation.title}</h2>
          <p className="mt-2 text-sm text-foreground-muted break-words">
            {dict.facturation.desc}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 sm:mt-0 sm:flex-none">
          <CalculInteretModal campagnes={campagnes} dict={dict} />
          <GenererFacturesModal dict={dict} campagnes={campagnes} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 overflow-hidden rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-foreground-muted uppercase tracking-wider">Total Facturé</span>
            <span className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
              <ReceiptText className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 truncate text-2xl font-bold text-foreground">
            {formatAmount(stats.totalFacture)} {unite}
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            {stats.totalCount} facture(s) affichée(s)
          </p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-foreground-muted uppercase tracking-wider">Recouvré</span>
            <span className="shrink-0 rounded-lg bg-success/10 p-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 truncate text-2xl font-bold text-success">
            {formatAmount(stats.totalPaye)} {unite}
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            Taux de recouvrement : <span className="font-semibold text-foreground">{stats.tauxRecouvrement}%</span>
          </p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-foreground-muted uppercase tracking-wider">Reste à Recouvrer</span>
            <span className="shrink-0 rounded-lg bg-danger/10 p-2 text-danger">
              <Wallet className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 truncate text-2xl font-bold text-danger">
            {formatAmount(stats.resteARecouvrer)} {unite}
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            Créances membres & clients
          </p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-surface-border bg-surface p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-foreground-muted uppercase tracking-wider">Répartition Statuts</span>
            <span className="shrink-0 rounded-lg bg-secondary/10 p-2 text-secondary">
              <Clock className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
            <span className="inline-flex items-center whitespace-nowrap rounded bg-success/15 px-2 py-0.5 text-success">
              {stats.countPayee} payée(s)
            </span>
            <span className="inline-flex items-center whitespace-nowrap rounded bg-secondary/15 px-2 py-0.5 text-secondary">
              {stats.countPartiel} partiel(s)
            </span>
            <span className="inline-flex items-center whitespace-nowrap rounded bg-danger/15 px-2 py-0.5 text-danger">
              {stats.countImpayee} impayée(s)
            </span>
          </div>
          <p className="mt-2 text-xs text-foreground-muted">
            {filteredFactures.length} sur {factures.length} total
          </p>
        </div>
      </div>

      {/* Onglets de catégories de factures */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-border pb-3">
        <button
          type="button"
          onClick={() => setSelectedTypeDoc('all')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            selectedTypeDoc === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface text-foreground-muted hover:text-foreground border border-surface-border'
          }`}
        >
          <span>Toutes les factures</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${selectedTypeDoc === 'all' ? 'bg-white/20 text-white' : 'bg-background text-foreground'}`}>
            {countsByType.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTypeDoc('campagne')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            selectedTypeDoc === 'campagne'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface text-foreground-muted hover:text-foreground border border-surface-border'
          }`}
        >
          <ReceiptText className="h-3.5 w-3.5" />
          <span>Campagne (Intrants)</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${selectedTypeDoc === 'campagne' ? 'bg-white/20 text-white' : 'bg-background text-foreground'}`}>
            {countsByType.campagne}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTypeDoc('prestation')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            selectedTypeDoc === 'prestation'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface text-foreground-muted hover:text-foreground border border-surface-border'
          }`}
        >
          <Tractor className="h-3.5 w-3.5" />
          <span>Factures Prestations Matériel</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${selectedTypeDoc === 'prestation' ? 'bg-white/20 text-white' : 'bg-background text-foreground'}`}>
            {countsByType.prestation}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTypeDoc('vente_stock')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            selectedTypeDoc === 'vente_stock'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface text-foreground-muted hover:text-foreground border border-surface-border'
          }`}
        >
          <Package className="h-3.5 w-3.5" />
          <span>Factures Ventes de Stock</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${selectedTypeDoc === 'vente_stock' ? 'bg-white/20 text-white' : 'bg-background text-foreground'}`}>
            {countsByType.vente_stock}
          </span>
        </button>
      </div>

      {/* Filtres & Recherche */}
      <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter className="h-4 w-4 text-primary" />
            <span>Filtres de recherche</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser les filtres
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Recherche texte */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-foreground-muted" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full rounded-md border border-surface-border py-2 pl-9 pr-3 bg-background text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-sm"
              placeholder="Membre, client, code, tél, prestation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtre campagne */}
          <div>
            <select
              value={selectedCampagneId}
              onChange={(e) => setSelectedCampagneId(e.target.value)}
              className="block w-full rounded-md border border-surface-border py-2 px-3 bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-sm"
            >
              <option value="">Toutes les campagnes</option>
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}{c.statut === 'en_cours' ? ' (En cours)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre spéculation / culture */}
          <div>
            <select
              value={selectedSpecId}
              onChange={(e) => setSelectedSpecId(e.target.value)}
              className="block w-full rounded-md border border-surface-border py-2 px-3 bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-sm"
            >
              <option value="all">Toutes les cultures (Cumul)</option>
              {availableSpeculations.map((s) => (
                <option key={s.id} value={s.id}>
                  🌾 {s.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre statut */}
          <div>
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="block w-full rounded-md border border-surface-border py-2 px-3 bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="impayee">Impayées / Sur relevé</option>
              <option value="partiellement_paye">Partiellement payées</option>
              <option value="payee">Payées</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            {(() => {
              const hasAnyInteret = filteredFactures.some((f) => Number(f.montant_interet || 0) > 0)
              return (
                <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
                  <table className="min-w-full divide-y divide-surface-border">
                    <thead className="bg-background/50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">
                          Membre / Client
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                          Nature / Campagne
                        </th>
                        {hasAnyInteret && (
                          <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{dict.facturation_extra.interest_col}</th>
                        )}
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{dict.facturation.table.total_due}</th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{dict.facturation.table.paid}</th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{dict.facturation.table.remaining}</th>
                        <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-foreground">Statut / Relevé</th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">{dict.facturation.table.actions}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border bg-surface">
                      {filteredFactures.map((facture) => {
                        const docType = facture.type_document || 'campagne'
                        const isMembre = facture.tiers_type !== 'client'
                        const nomAffiche =
                          facture.membre
                            ? `${facture.membre.prenom || ''} ${facture.membre.nom || ''}`.trim()
                            : facture.client_nom || facture.client?.nom || 'Client externe'
                        const telephoneAffiche = facture.membre?.telephone || facture.client_telephone || facture.client?.telephone || null
                        const idCourt = String(facture.id || '').replace(/^(prestation|vente)-/, '').substring(0, 8)

                        const isCropFiltered = selectedSpecId !== 'all'
                        const spDetail = isCropFiltered && docType === 'campagne'
                          ? facture.remboursements_par_speculation?.find((s: any) => s.speculation_id === selectedSpecId)
                          : null

                        const montantInteret = spDetail ? 0 : Number(facture.montant_interet || 0)
                        const totalDu = spDetail ? Number(spDetail.montant_du || 0) : (Number(facture.montant_total || 0) + montantInteret)
                        const montantPaye = spDetail ? Number(spDetail.montant_rembourse || 0) : Number(facture.montant_paye || 0)
                        const resteAPayer = totalDu - montantPaye
                        const statutAffiche = spDetail
                          ? (resteAPayer <= 0 ? 'payee' : montantPaye > 0 ? 'partiellement_paye' : 'impayee')
                          : facture.statut

                        const factureForActions = isCropFiltered && spDetail
                          ? {
                              ...facture,
                              filterSpeculationId: selectedSpecId,
                              filterSpeculationNom: spDetail.nom,
                              montant_total: spDetail.montant_du,
                              montant_interet: 0,
                              montant_paye: spDetail.montant_rembourse,
                              total_du: spDetail.montant_du,
                              reste: spDetail.solde,
                              designation: `Facture ${spDetail.nom} (${spDetail.superficie} ha) — ${facture.campagne?.nom || 'Campagne'}`,
                            }
                          : facture

                        return (
                          <tr key={facture.id} className="hover:bg-background/50 transition-colors">
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                              <div className="flex items-center gap-3">
                                <div className={`rounded-md p-2 ${
                                  docType === 'prestation'
                                    ? 'bg-secondary/10 text-secondary'
                                    : docType === 'vente_stock'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-primary/10 text-primary'
                                }`}>
                                  {docType === 'prestation' ? (
                                    <Tractor className="h-5 w-5" />
                                  ) : docType === 'vente_stock' ? (
                                    <Package className="h-5 w-5" />
                                  ) : (
                                    <ReceiptText className="h-5 w-5" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">{nomAffiche}</span>
                                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                      isMembre
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-secondary/15 text-secondary'
                                    }`}>
                                      {isMembre ? 'Membre GIE' : 'Client externe'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-foreground-muted flex items-center gap-2 mt-0.5">
                                    <span>N° {idCourt}</span>
                                    {facture.membre?.code_membre && (
                                      <span className="rounded bg-background px-1.5 py-0.5 border border-surface-border font-mono text-[10px]">
                                        {facture.membre.code_membre}
                                      </span>
                                    )}
                                    {!isMembre && (
                                      <FicheClientModal
                                        client={{
                                          id: facture.client_id || facture.client?.id || '',
                                          nom: nomAffiche,
                                          telephone: telephoneAffiche,
                                          code_client: facture.client?.code_client || (facture.client_id ? `CLI-${String(facture.client_id).slice(0, 4).toUpperCase()}` : 'CLI'),
                                        }}
                                        gieName={gieName}
                                        dict={dict}
                                        locale={locale}
                                      />
                                    )}
                                    {telephoneAffiche && (
                                      <span>· {telephoneAffiche}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-left text-sm">
                              {isCropFiltered && spDetail ? (
                                <div>
                                  <div className="font-bold text-primary flex items-center gap-1.5">
                                    <Wheat className="h-4 w-4 shrink-0 text-primary" />
                                    <span>{spDetail.nom} ({Number(spDetail.superficie).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 2 })} ha)</span>
                                  </div>
                                  <div className="text-xs text-foreground-muted flex items-center gap-2 mt-0.5">
                                    <span>{facture.campagne?.nom || 'Campagne'}</span>
                                    {spDetail.casier && <span className="font-mono">· Casier: {spDetail.casier}</span>}
                                    {spDetail.quantite_nature > 0 && (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                        · {Number(spDetail.quantite_nature).toLocaleString()} {spDetail.unite_mesure || 'kg'} pesé(s)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="font-medium text-foreground">
                                    {docType === 'prestation'
                                      ? facture.designation
                                      : docType === 'vente_stock'
                                      ? facture.designation
                                      : facture.campagne?.nom || 'Campagne'}
                                  </div>
                                  <div className="text-xs text-foreground-muted flex items-center gap-2 mt-0.5">
                                    {docType === 'prestation' && <span>Prestation Matériel</span>}
                                    {docType === 'vente_stock' && <span>Vente de Stock</span>}
                                    {docType === 'campagne' && <span>Facture Intrants & Crédits (Cumul)</span>}
                                    {docType === 'campagne' && (facture.campagne_id || facture.campagne?.id) && (
                                      <Link
                                        href={`/campagnes/${facture.campagne_id || facture.campagne?.id}/speculations`}
                                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                                        title="Consulter le suivi par spéculation et l'état récapitulatif"
                                      >
                                        🌾 Suivi spéculations
                                      </Link>
                                    )}
                                    {facture.campagne?.nom && docType !== 'campagne' && (
                                      <span>· {facture.campagne.nom}</span>
                                    )}
                                    {facture.date_emission && (
                                      <span>· {new Date(facture.date_emission).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                            {hasAnyInteret && (
                              <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-foreground-muted">
                                {montantInteret > 0 ? formatAmount(montantInteret) + ' ' + unite : '-'}
                              </td>
                            )}
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-foreground">
                              {formatAmount(totalDu)} {unite}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-success">
                              {docType === 'campagne' ? `${formatAmount(montantPaye)} ${unite}` : '-'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold">
                              {resteAPayer > 0 ? (
                                <span className="text-danger">{formatAmount(resteAPayer)} {unite}</span>
                              ) : resteAPayer < 0 ? (
                                <span className="text-primary" title="Surplus de remboursement (ristourne)">
                                  Surplus : +{formatAmount(Math.abs(resteAPayer))} {unite}
                                </span>
                              ) : (
                                <span className="text-foreground-muted">-</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-center text-sm">
                              {docType === 'campagne' ? (
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                  statutAffiche === 'impayee' ? 'bg-danger/10 text-danger ring-danger/20' : 
                                  statutAffiche === 'payee' ? 'bg-success/10 text-success ring-success/20' :
                                  'bg-secondary/10 text-secondary ring-secondary/20'
                                }`}>
                                  {statutAffiche === 'impayee' ? dict.facturation.table.status_unpaid : 
                                   statutAffiche === 'payee' ? dict.facturation.table.status_paid : dict.facturation.table.status_partial}
                                </span>
                              ) : (
                                <Link
                                  href={isMembre ? '/bilans/releve-membre' : '/bilans/releve-client'}
                                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20 hover:bg-primary/20 transition-colors"
                                  title={isMembre ? 'Intégré au Relevé Membre' : 'Intégré au Relevé Client'}
                                >
                                  <span>{isMembre ? 'Relevé Membre' : 'Relevé Client'}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <div className="flex justify-end items-center gap-1.5">
                                <FactureWhatsAppModal facture={factureForActions} gieName={gieName} dict={dict} />
                                <DownloadPdfButton facture={factureForActions} dict={dict} gieName={gieName} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      
                      {filteredFactures.length === 0 && (
                        <tr>
                          <td colSpan={hasAnyInteret ? 8 : 7} className="px-6 py-8 text-center text-sm text-foreground-muted italic">
                            {hasActiveFilters ? (
                              <div className="flex flex-col items-center justify-center gap-2">
                                <span>Aucune facture ne correspond à vos critères de recherche.</span>
                                <button
                                  onClick={resetFilters}
                                  className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-xs"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Réinitialiser les filtres
                                </button>
                              </div>
                            ) : (
                              dict.facturation.table.empty
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

