'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Wheat,
  Plus,
  Users,
  PieChart,
  Banknote,
  Scale,
  Receipt,
  RotateCcw,
  Percent,
  Edit2,
  Trash2,
  Printer,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Layers,
  ArrowRight,
} from 'lucide-react'
import {
  CampagneSpeculation,
  SyntheseSpeculation,
  RecapitulatifMembre,
} from '@/lib/speculations'
import {
  addSpeculation,
  updateSpeculation,
  deleteSpeculation,
  affecterMembreSpeculation,
  supprimerAffectationMembreSpeculation,
} from './actions'
import DownloadPdfButton from '@/app/(dashboard)/facturation/DownloadPdfButton'
import FactureWhatsAppModal from '@/app/(dashboard)/facturation/FactureWhatsAppModal'

type Props = {
  campagneId: string
  campagneNom: string
  gieName?: string
  unite: string
  speculations: CampagneSpeculation[]
  syntheses: SyntheseSpeculation[]
  recapitulatifMembres: RecapitulatifMembre[]
  creditBancaireCampagne: number
}

export default function SpeculationsClient({
  campagneId,
  campagneNom,
  gieName = 'Mon GIE',
  unite,
  speculations,
  syntheses,
  recapitulatifMembres,
  creditBancaireCampagne,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'synthese' | 'membres' | 'config' | 'affectations'>('synthese')
  const [modalOpen, setModalOpen] = useState(false)
  const [editSpec, setEditSpec] = useState<CampagneSpeculation | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterSpec, setFilterSpec] = useState<string>('all')
  const [searchMember, setSearchMember] = useState<string>('')
  const [membresList, setMembresList] = useState<RecapitulatifMembre[]>(recapitulatifMembres)

  useEffect(() => {
    setMembresList(recapitulatifMembres)
  }, [recapitulatifMembres])

  const isDefaultMode = speculations.length === 1 && speculations[0].id.startsWith('spec-default-')

  // Affectation rapide
  const [editingCell, setEditingCell] = useState<{ membreId: string; specId: string } | null>(null)
  const [tempSuperficie, setTempSuperficie] = useState<string>('')
  const [tempCredit, setTempCredit] = useState<string>('')

  // Totaux globaux
  const totalMembresUniques = membresList.length
  const totalSuperficie = membresList.reduce((acc, m) => acc + m.superficieTotale, 0)
  const totalCreditAlloue = syntheses.reduce((acc, s) => acc + s.creditAlloue, 0)
  const totalFacturation = syntheses.reduce((acc, s) => acc + s.facturationTotale, 0)
  const totalPoidsCollecte = syntheses.reduce((acc, s) => acc + s.poidsCollecteKg, 0)
  const totalValeurCollecte = syntheses.reduce((acc, s) => acc + s.valeurCollecte, 0)
  const totalRemboursements = syntheses.reduce((acc, s) => acc + s.remboursementsTotaux, 0)
  const totalSoldeRestant = Math.max(0, totalFacturation - totalRemboursements)
  const tauxGlobalRecouvrement = totalFacturation > 0
    ? Math.min(100, Math.round((totalRemboursements / totalFacturation) * 100))
    : 100

  // Filtrage membres
  const filteredMembres = membresList.filter((m) => {
    const matchSearch =
      searchMember.trim() === '' ||
      `${m.nom} ${m.prenom} ${m.codeMembre} ${m.village || ''}`.toLowerCase().includes(searchMember.toLowerCase())

    const matchSpec =
      filterSpec === 'all' ||
      m.speculations.some((s) => s.speculationId === filterSpec && s.superficie > 0)

    return matchSearch && matchSpec
  })

  const isFiltered = filterSpec !== 'all'
  const selectedSpecObj = isFiltered ? speculations.find((s) => s.id === filterSpec) : null

  // Calcul des données affichées pour chaque membre en isolant la culture sélectionnée
  const membresAffiches = filteredMembres.map((m) => {
    const specDetail = isFiltered
      ? m.speculations.find((s) => s.speculationId === filterSpec)
      : null

    const rowSpecs = isFiltered
      ? specDetail && specDetail.superficie > 0
        ? [specDetail]
        : []
      : m.speculations.filter((s) => s.superficie > 0)

    const rowSurface = isFiltered
      ? (specDetail ? specDetail.superficie : 0)
      : m.superficieTotale

    const rowCredit = isFiltered
      ? (specDetail ? specDetail.creditAttribue : 0)
      : m.creditTotal

    // Facturation de cette spéculation pour ce membre
    const ratio = m.superficieTotale > 0 ? rowSurface / m.superficieTotale : 0
    const rowFacturation = isFiltered
      ? (specDetail?.facturation ?? Math.round(m.facturationTotale * ratio))
      : m.facturationTotale

    // Collecte spécifique à la culture
    const rowCollecteQte = isFiltered
      ? (specDetail ? specDetail.collecteQte : 0)
      : m.collecteQteTotale

    const rowCollecteVal = isFiltered
      ? (specDetail ? specDetail.collecteVal : 0)
      : m.collecteValeurTotale

    // Remboursements spécifiques à cette culture
    const cashRembGlobal = Math.max(0, m.remboursementsTotaux - m.collecteValeurTotale)
    const rowRemboursements = isFiltered
      ? (specDetail?.remboursements ?? (rowCollecteVal + Math.round(cashRembGlobal * ratio)))
      : m.remboursementsTotaux

    const rowSoldeNet = isFiltered
      ? (specDetail?.solde ?? (rowFacturation - rowRemboursements))
      : (rowFacturation - rowRemboursements)
    let rowStatutSolde: 'solde' | 'excedent' | 'reliquat' = 'solde'
    if (rowSoldeNet > 0) rowStatutSolde = 'reliquat'
    else if (rowSoldeNet < 0) rowStatutSolde = 'excedent'

    return {
      ...m,
      rowSpecs,
      rowSurface,
      rowCredit,
      rowFacturation,
      rowCollecteQte,
      rowCollecteVal,
      rowRemboursements,
      rowSoldeNet,
      rowStatutSolde,
    }
  })

  const totalFilteredSurface = membresAffiches.reduce((acc, m) => acc + m.rowSurface, 0)
  const totalFilteredCredit = membresAffiches.reduce((acc, m) => acc + m.rowCredit, 0)
  const totalFilteredFacturation = membresAffiches.reduce((acc, m) => acc + m.rowFacturation, 0)
  const totalFilteredCollecteQte = membresAffiches.reduce((acc, m) => acc + m.rowCollecteQte, 0)
  const totalFilteredCollecteVal = membresAffiches.reduce((acc, m) => acc + m.rowCollecteVal, 0)
  const totalFilteredRemboursements = membresAffiches.reduce((acc, m) => acc + m.rowRemboursements, 0)
  const totalFilteredSolde = totalFilteredFacturation - totalFilteredRemboursements

  // Gestion formulaire Spéculation (Ajout / Modif)
  async function handleSpeculationSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    let res: any
    if (editSpec) {
      res = await updateSpeculation(editSpec.id, campagneId, formData)
    } else {
      res = await addSpeculation(campagneId, formData)
    }

    setLoading(false)
    if (res?.error) {
      alert(`Erreur : ${res.error}`)
    } else {
      setModalOpen(false)
      setEditSpec(null)
      router.refresh()
    }
  }

  async function handleDeleteSpec(id: string, nom: string) {
    if (!confirm(`Supprimer la spéculation "${nom}" et ses affectations de parcelles ?`)) return
    setLoading(true)
    const res = await deleteSpeculation(id, campagneId)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      router.refresh()
    }
  }

  // Sauvegarde affectation membre
  async function handleSaveCell(membreId: string, specId: string) {
    const sup = parseFloat(tempSuperficie)
    const cred = parseFloat(tempCredit)
    if (isNaN(sup) || sup < 0) {
      alert("Superficie invalide.")
      return
    }

    // Mise à jour optimiste immédiate dans l'interface
    setMembresList((prev) =>
      prev.map((m) => {
        if (m.membreId !== membreId) return m

        const updatedSpecs = m.speculations.map((s) => {
          if (s.speculationId === specId) {
            return {
              ...s,
              superficie: sup,
              creditAttribue: isNaN(cred) ? 0 : cred,
            }
          }
          return s
        })

        // Si la spéculation n'était pas encore présente dans m.speculations
        if (!updatedSpecs.some((s) => s.speculationId === specId)) {
          const specObj = speculations.find((s) => s.id === specId)
          updatedSpecs.push({
            speculationId: specId,
            nom: specObj?.nom || '',
            superficie: sup,
            superficieValidee: sup,
            creditAttribue: isNaN(cred) ? 0 : cred,
            facturation: 0,
            collecteQte: 0,
            collecteVal: 0,
            remboursements: 0,
            solde: 0,
          })
        }

        const totalHa = updatedSpecs.reduce((acc, s) => acc + (Number(s.superficie) || 0), 0)
        const totalCred = updatedSpecs.reduce((acc, s) => acc + (Number(s.creditAttribue) || 0), 0)

        return {
          ...m,
          speculations: updatedSpecs,
          superficieTotale: Math.round(totalHa * 100) / 100,
          creditTotal: totalCred,
        }
      })
    )

    setEditingCell(null)
    setLoading(true)

    const res = await affecterMembreSpeculation(
      campagneId,
      membreId,
      specId,
      sup,
      isNaN(cred) ? 0 : cred
    )

    setLoading(false)
    if (res?.error) {
      alert(`Erreur : ${res.error}`)
      setMembresList(recapitulatifMembres)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Bandeau d'information si la campagne est en culture unique standard */}
      {isDefaultMode && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary shrink-0">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">
                Culture principale ({speculations[0]?.nom || 'Principale'})
              </p>
              <p className="text-foreground-muted mt-0.5">
                Cette campagne utilise actuellement une culture principale unique. Vous pouvez ajouter d&apos;autres spéculations (Oignon, Tomate, Riz...) pour ventiler les parcelles membre par membre et suivre automatiquement tous les indicateurs séparément.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditSpec(null)
              setModalOpen(true)
            }}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shrink-0 shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une culture</span>
          </button>
        </div>
      )}

      {/* Barre d'onglets de navigation interne */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-3 print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('synthese')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'synthese'
                ? 'bg-primary text-white shadow-sm'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Synthèse par Spéculation</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
              {syntheses.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('membres')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'membres'
                ? 'bg-primary text-white shadow-sm'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Récapitulatif par Membre</span>
            <span className="px-1.5 py-0.5 rounded-full bg-surface-border text-foreground text-[10px] font-bold">
              {recapitulatifMembres.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('affectations')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'affectations'
                ? 'bg-primary text-white shadow-sm'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Affectation des Parcelles</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'config'
                ? 'bg-primary text-white shadow-sm'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface'
            }`}
          >
            <Wheat className="w-4 h-4" />
            <span>Configuration des Cultures</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-border bg-surface hover:bg-background text-foreground text-xs font-semibold shadow-xs transition"
          >
            <Printer className="w-4 h-4 text-foreground-muted" />
            <span>Imprimer / PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditSpec(null)
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Spéculation</span>
          </button>
        </div>
      </div>

      {/* ── KPI GLOBALS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface border border-surface-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Cultures Suivies
          </span>
          <span className="text-xl font-black text-foreground mt-0.5 block">
            {syntheses.length}
          </span>
          <span className="text-[11px] text-foreground-muted truncate block">
            {syntheses.map((s) => s.speculation.nom).join(', ') || 'Aucune'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-surface-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Membres Actifs
          </span>
          <span className="text-xl font-black text-foreground mt-0.5 block">
            {totalMembresUniques}
          </span>
          <span className="text-[11px] text-foreground-muted block">producteurs inscrits</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-surface-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Superficie Totale
          </span>
          <span className="text-xl font-black text-primary mt-0.5 block">
            {totalSuperficie.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha
          </span>
          <span className="text-[11px] text-foreground-muted block">sur toutes spéculations</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-surface-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Crédit Campagne
          </span>
          <span className="text-xl font-black text-foreground mt-0.5 block truncate">
            {totalCreditAlloue > 0
              ? totalCreditAlloue.toLocaleString('fr-FR')
              : creditBancaireCampagne.toLocaleString('fr-FR')}{' '}
            <span className="text-xs font-normal">{unite}</span>
          </span>
          <span className="text-[11px] text-foreground-muted block">affectation bancaire</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-surface-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Collecte Récolte
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
            {totalPoidsCollecte.toLocaleString('fr-FR')} kg
          </span>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block truncate">
            Val: {totalValeurCollecte.toLocaleString('fr-FR')} {unite}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-surface-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Remboursements
          </span>
          <span className="text-xl font-black text-foreground mt-0.5 block truncate">
            {totalRemboursements.toLocaleString('fr-FR')}{' '}
            <span className="text-xs font-normal">{unite}</span>
          </span>
          <span className="text-[11px] text-foreground-muted block truncate">
            Facturé : {totalFacturation.toLocaleString('fr-FR')} {unite}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-surface-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
            Taux Recouvrement
          </span>
          <span
            className={`text-xl font-black mt-0.5 block ${
              tauxGlobalRecouvrement >= 90
                ? 'text-emerald-600 dark:text-emerald-400'
                : tauxGlobalRecouvrement >= 50
                ? 'text-amber-500'
                : 'text-rose-500'
            }`}
          >
            {tauxGlobalRecouvrement}%
          </span>
          <span className="text-[11px] text-foreground-muted block truncate">
            Reste: {totalSoldeRestant.toLocaleString('fr-FR')} {unite}
          </span>
        </div>
      </div>

      {/* ── ONGLET 1 : SYNTHÈSE PAR SPÉCULATION ── */}
      {activeTab === 'synthese' && (
        <div className="space-y-6">
          {/* Cartes Spéculations Détaillées */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {syntheses.map((syn) => {
              const spec = syn.speculation
              return (
                <div
                  key={spec.id}
                  className="rounded-3xl bg-surface border border-surface-border p-5 shadow-sm space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                          <Wheat className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-heading font-black text-base text-foreground">
                            {spec.nom}
                          </h3>
                          {spec.variete && (
                            <span className="text-[11px] text-foreground-muted font-medium">
                              Variété : {spec.variete}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
                        {spec.statut}
                      </span>
                    </div>

                    <p className="text-xs text-foreground-muted">
                      Produit de collecte : <strong>{spec.produit_collecte || spec.nom}</strong>
                    </p>
                  </div>

                  {/* Grille Métriques clés de la spéculation */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-surface-border">
                    <div className="p-2.5 rounded-xl bg-background/50 border border-surface-border/60">
                      <span className="text-[10px] text-foreground-muted block">Membres engagés</span>
                      <span className="font-bold text-foreground text-sm">
                        {syn.membresCount} producteurs
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-background/50 border border-surface-border/60">
                      <span className="text-[10px] text-foreground-muted block">Superficie emblavée</span>
                      <span className="font-bold text-primary text-sm">
                        {syn.superficieTotale.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-background/50 border border-surface-border/60">
                      <span className="text-[10px] text-foreground-muted block">Prix de collecte convenu</span>
                      <span className="font-bold text-foreground text-sm">
                        {syn.prixCollecte.toLocaleString('fr-FR')} {unite}/{spec.unite_mesure}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-background/50 border border-surface-border/60">
                      <span className="text-[10px] text-foreground-muted block">Crédit alloué</span>
                      <span className="font-bold text-foreground text-sm truncate block">
                        {syn.creditAlloue.toLocaleString('fr-FR')} {unite}
                      </span>
                    </div>
                  </div>

                  {/* Collecte & Recouvrement */}
                  <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        Collecte Récoltée
                      </span>
                      <span className="font-black text-emerald-950 dark:text-emerald-100">
                        {syn.poidsCollecteKg.toLocaleString('fr-FR')} {spec.unite_mesure}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400">
                      <span>Valeur totale récolte :</span>
                      <span className="font-semibold">
                        {syn.valeurCollecte.toLocaleString('fr-FR')} {unite}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-emerald-500/20">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-foreground-muted">Taux Recouvrement :</span>
                        <span className="font-bold text-foreground">
                          {syn.tauxRecouvrement}% ({syn.remboursementsTotaux.toLocaleString('fr-FR')} /{' '}
                          {syn.facturationTotale.toLocaleString('fr-FR')} {unite})
                        </span>
                      </div>
                      <div className="w-full bg-surface-border h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, syn.tauxRecouvrement)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditSpec(spec)
                        setModalOpen(true)
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-surface-border text-foreground-muted hover:text-foreground text-xs font-semibold hover:bg-background transition"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterSpec(spec.id)
                        setActiveTab('membres')
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition flex items-center gap-1"
                    >
                      <span>Voir producteurs</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Tableau Récapitulatif Comparatif des Spéculations */}
          <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden shadow-xs">
            <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface/50">
              <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                <span>Tableau Comparatif & Indicateurs par Spéculation</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-surface-border text-xs">
                <thead className="bg-background/60 font-semibold text-foreground-muted uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 text-left">Spéculation</th>
                    <th className="py-3 px-4 text-left">Variété</th>
                    <th className="py-3 px-4 text-center">Membres</th>
                    <th className="py-3 px-4 text-right">Superficie (ha)</th>
                    <th className="py-3 px-4 text-right">Crédit Alloué</th>
                    <th className="py-3 px-4 text-right">Facturation Totale</th>
                    <th className="py-3 px-4 text-right">Poids Collecte</th>
                    <th className="py-3 px-4 text-right">Prix Unitaire</th>
                    <th className="py-3 px-4 text-right">Valeur Collecte</th>
                    <th className="py-3 px-4 text-right">Remboursements</th>
                    <th className="py-3 px-4 text-center">Recouvrement</th>
                    <th className="py-3 px-4 text-right">Solde Restant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-foreground">
                  {syntheses.map((syn) => {
                    const spec = syn.speculation
                    return (
                      <tr key={spec.id} className="hover:bg-background/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">
                          {spec.nom}
                        </td>
                        <td className="py-3 px-4 text-foreground-muted">
                          {spec.variete || '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">
                          {syn.membresCount}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-primary">
                          {syn.superficieTotale.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha
                        </td>
                        <td className="py-3 px-4 text-right">
                          {syn.creditAlloue.toLocaleString('fr-FR')} {unite}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {syn.facturationTotale.toLocaleString('fr-FR')} {unite}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {syn.poidsCollecteKg.toLocaleString('fr-FR')} {spec.unite_mesure}
                        </td>
                        <td className="py-3 px-4 text-right text-foreground-muted">
                          {syn.prixCollecte.toLocaleString('fr-FR')} {unite}/{spec.unite_mesure}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 dark:text-emerald-300">
                          {syn.valeurCollecte.toLocaleString('fr-FR')} {unite}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {syn.remboursementsTotaux.toLocaleString('fr-FR')} {unite}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              syn.tauxRecouvrement >= 90
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : syn.tauxRecouvrement >= 50
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {syn.tauxRecouvrement}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          {syn.soldeRestant > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">
                              {syn.soldeRestant.toLocaleString('fr-FR')} {unite}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">Soldé</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-background/80 font-bold border-t-2 border-surface-border text-foreground">
                  <tr>
                    <td className="py-3 px-4 uppercase" colSpan={2}>
                      Total Campagne
                    </td>
                    <td className="py-3 px-4 text-center">{totalMembresUniques}</td>
                    <td className="py-3 px-4 text-right text-primary font-black">
                      {totalSuperficie.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha
                    </td>
                    <td className="py-3 px-4 text-right">
                      {totalCreditAlloue.toLocaleString('fr-FR')} {unite}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {totalFacturation.toLocaleString('fr-FR')} {unite}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-black">
                      {totalPoidsCollecte.toLocaleString('fr-FR')} kg
                    </td>
                    <td className="py-3 px-4 text-right text-foreground-muted">—</td>
                    <td className="py-3 px-4 text-right text-emerald-700 dark:text-emerald-300 font-bold">
                      {totalValeurCollecte.toLocaleString('fr-FR')} {unite}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {totalRemboursements.toLocaleString('fr-FR')} {unite}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-black">
                        {tauxGlobalRecouvrement}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black">
                      {totalSoldeRestant.toLocaleString('fr-FR')} {unite}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ONGLET 2 : RÉCAPITULATIF PAR MEMBRE (MULTI-SPÉCULATIONS) ── */}
      {activeTab === 'membres' && (
        <div className="space-y-4">
          {/* Filtres de recherche */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-surface-border print:hidden">
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder="Rechercher un membre (nom, code, village)..."
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-surface-border text-foreground text-xs focus:outline-hidden focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-foreground-muted font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filtrer culture :
              </span>
              <select
                value={filterSpec}
                onChange={(e) => setFilterSpec(e.target.value)}
                className="px-3 py-2 rounded-xl bg-background border border-surface-border text-foreground text-xs focus:outline-hidden focus:border-primary"
              >
                <option value="all">Toutes les spéculations</option>
                {speculations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grand Tableau Récapitulatif par Membre */}
          <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden shadow-xs">
            <div className="p-4 border-b border-surface-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface/50">
              <div>
                <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 flex-wrap">
                  <span>État Récapitulatif Individuel par Membre — Campagne {campagneNom}</span>
                  {selectedSpecObj && (
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                      Culture : {selectedSpecObj.nom}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-foreground-muted mt-0.5">
                  {isFiltered
                    ? `Affichage exclusif des données de la culture "${selectedSpecObj?.nom}" (surface, facturation, récolte et solde au prorata de cette culture).`
                    : 'Ventilation consolidée des superficies, crédits, facturations, collectes et remboursements par producteur.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  {membresAffiches.length} membres
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-border bg-background hover:bg-surface text-foreground text-xs font-semibold shadow-xs transition print:hidden"
                  title="Imprimer cet état récapitulatif"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-surface-border text-xs">
                <thead className="bg-background/60 font-semibold text-foreground-muted uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3 text-left">Code</th>
                    <th className="py-3 px-4 text-left">Membre / Producteur</th>
                    <th className="py-3 px-4 text-left">Village</th>
                    <th className="py-3 px-4 text-left">
                      {isFiltered ? `Culture (${selectedSpecObj?.nom})` : 'Détail Spéculations (ha)'}
                    </th>
                    <th className="py-3 px-3 text-right">
                      {isFiltered ? `Surface ${selectedSpecObj?.nom}` : 'Surface Totale'}
                    </th>
                    <th className="py-3 px-3 text-right">Crédit Affecté</th>
                    <th className="py-3 px-3 text-right">Facturation</th>
                    <th className="py-3 px-4 text-right">Collecte Récolte</th>
                    <th className="py-3 px-3 text-right">Remboursements</th>
                    <th className="py-3 px-3 text-right">Solde Net</th>
                    <th className="py-3 px-3 text-center">Situation</th>
                    <th className="py-3 px-3 text-right print:hidden">Facture / WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-foreground">
                  {membresAffiches.map((m) => (
                    <tr key={m.membreId} className="hover:bg-background/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-foreground-muted text-[11px]">
                        {m.codeMembre || '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        {m.nom} {m.prenom}
                        {m.telephone && (
                          <span className="block text-[10px] text-foreground-muted font-normal">
                            {m.telephone}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-foreground-muted">
                        {m.village || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {m.rowSpecs.map((s) => (
                            <span
                              key={s.speculationId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-surface-border text-[11px] font-medium"
                            >
                              <span className="font-bold text-foreground">{s.nom} :</span>
                              <span className="text-primary font-semibold">{s.superficie} ha</span>
                              {s.collecteQte > 0 && (
                                <span className="text-emerald-600 font-bold text-[10px]">
                                  ({s.collecteQte.toLocaleString('fr-FR')} kg)
                                </span>
                              )}
                            </span>
                          ))}
                          {m.rowSpecs.length === 0 && (
                            <span className="text-foreground-muted italic text-[11px]">Non affecté</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-primary">
                        {m.rowSurface.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha
                      </td>
                      <td className="py-3 px-3 text-right text-foreground-muted">
                        {m.rowCredit > 0 ? `${m.rowCredit.toLocaleString('fr-FR')} ${unite}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold">
                        {m.rowFacturation.toLocaleString('fr-FR')} {unite}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {m.rowCollecteQte > 0 ? (
                          <>
                            <span>{m.rowCollecteQte.toLocaleString('fr-FR')} kg</span>
                            <span className="block text-[10px] text-foreground-muted font-normal">
                              {m.rowCollecteVal.toLocaleString('fr-FR')} {unite}
                            </span>
                          </>
                        ) : (
                          <span className="text-foreground-muted font-normal">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-foreground">
                        {m.rowRemboursements.toLocaleString('fr-FR')} {unite}
                      </td>
                      <td className="py-3 px-3 text-right font-black">
                        {m.rowSoldeNet > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            +{m.rowSoldeNet.toLocaleString('fr-FR')} {unite}
                          </span>
                        ) : m.rowSoldeNet < 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {m.rowSoldeNet.toLocaleString('fr-FR')} {unite}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">0 {unite}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {m.rowStatutSolde === 'solde' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Soldé
                          </span>
                        )}
                        {m.rowStatutSolde === 'reliquat' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                            <AlertCircle className="w-3 h-3" /> Reste dû
                          </span>
                        )}
                        {m.rowStatutSolde === 'excedent' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                            Excédent
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap print:hidden">
                        <div className="flex items-center justify-end gap-1">
                          <DownloadPdfButton
                            facture={{
                              id: `facture-${campagneId}-${m.membreId}`,
                              membre_id: m.membreId,
                              campagne_id: campagneId,
                              membre: {
                                id: m.membreId,
                                nom: m.nom,
                                prenom: m.prenom,
                                code_membre: m.codeMembre,
                                telephone: m.telephone,
                                village: m.village,
                              },
                              campagne: {
                                id: campagneId,
                                nom: campagneNom,
                                prix_collecte: selectedSpecObj?.prix_collecte || speculations[0]?.prix_collecte || 0,
                                produit_collecte: selectedSpecObj?.produit_collecte || speculations[0]?.produit_collecte || 'Produit',
                              },
                              montant_total: m.facturationTotale,
                              montant_paye: m.remboursementsTotaux,
                              statut: m.soldeNet <= 0 ? 'payee' : (m.remboursementsTotaux > 0 ? 'partiellement_paye' : 'impayee'),
                            }}
                            dict={{}}
                            gieName={gieName}
                          />
                          <FactureWhatsAppModal
                            facture={{
                              id: `facture-${campagneId}-${m.membreId}`,
                              membre_id: m.membreId,
                              campagne_id: campagneId,
                              membre: {
                                id: m.membreId,
                                nom: m.nom,
                                prenom: m.prenom,
                                code_membre: m.codeMembre,
                                telephone: m.telephone,
                                village: m.village,
                              },
                              campagne: {
                                id: campagneId,
                                nom: campagneNom,
                                prix_collecte: selectedSpecObj?.prix_collecte || speculations[0]?.prix_collecte || 0,
                                produit_collecte: selectedSpecObj?.produit_collecte || speculations[0]?.produit_collecte || 'Produit',
                              },
                              montant_total: m.facturationTotale,
                              montant_paye: m.remboursementsTotaux,
                              statut: m.soldeNet <= 0 ? 'payee' : (m.remboursementsTotaux > 0 ? 'partiellement_paye' : 'impayee'),
                            }}
                            gieName={gieName}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-background/80 font-bold border-t-2 border-surface-border text-foreground">
                  <tr>
                    <td className="py-3 px-3 uppercase text-[10px]" colSpan={3}>
                      Total {isFiltered ? `(${selectedSpecObj?.nom})` : 'Campagne'} ({membresAffiches.length} membres)
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-foreground-muted">
                      {isFiltered ? selectedSpecObj?.nom : `${speculations.length} spéculations`}
                    </td>
                    <td className="py-3 px-3 text-right text-primary font-black">
                      {totalFilteredSurface.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha
                    </td>
                    <td className="py-3 px-3 text-right text-foreground-muted">
                      {totalFilteredCredit > 0 ? `${totalFilteredCredit.toLocaleString('fr-FR')} ${unite}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">
                      {totalFilteredFacturation.toLocaleString('fr-FR')} {unite}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {totalFilteredCollecteQte > 0 ? (
                        <>
                          <span>{totalFilteredCollecteQte.toLocaleString('fr-FR')} kg</span>
                          <span className="block text-[10px] text-foreground-muted font-normal">
                            {totalFilteredCollecteVal.toLocaleString('fr-FR')} {unite}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">
                      {totalFilteredRemboursements.toLocaleString('fr-FR')} {unite}
                    </td>
                    <td className="py-3 px-3 text-right font-black">
                      {totalFilteredSolde > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          +{totalFilteredSolde.toLocaleString('fr-FR')} {unite}
                        </span>
                      ) : totalFilteredSolde < 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {totalFilteredSolde.toLocaleString('fr-FR')} {unite}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">0 {unite}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-black text-[10px]">
                        {totalFilteredFacturation > 0
                          ? Math.min(100, Math.round((totalFilteredRemboursements / totalFilteredFacturation) * 100))
                          : 100}%
                      </span>
                    </td>
                    <td className="py-3 px-3 print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ONGLET 3 : CONFIGURATION DES CULTURES ── */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-surface border border-surface-border flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm text-foreground">
                Spéculations Agricoles de la Campagne
              </h3>
              <p className="text-xs text-foreground-muted">
                Définissez les différentes productions cultivées (Oignon, Tomate, Riz...) avec leurs prix et conditions de collecte.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditSpec(null)
                setModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une culture</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {speculations.map((spec) => (
              <div
                key={spec.id}
                className="p-5 rounded-2xl bg-surface border border-surface-border shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wheat className="w-5 h-5 text-primary" />
                    <h4 className="font-bold text-base text-foreground">{spec.nom}</h4>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {spec.statut}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-foreground-muted">
                  <div className="flex justify-between">
                    <span>Variété :</span>
                    <strong className="text-foreground">{spec.variete || 'Non spécifiée'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Produit collecté :</span>
                    <strong className="text-foreground">{spec.produit_collecte || spec.nom}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Prix de collecte :</span>
                    <strong className="text-foreground font-black">
                      {spec.prix_collecte.toLocaleString('fr-FR')} {unite}/{spec.unite_mesure}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Poids standard sac/cagette :</span>
                    <strong className="text-foreground">{spec.poids_standard} kg</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Crédit alloué global :</span>
                    <strong className="text-foreground">
                      {spec.credit_alloue.toLocaleString('fr-FR')} {unite}
                    </strong>
                  </div>
                  {spec.rendement_prevu_tonne_ha > 0 && (
                    <div className="flex justify-between">
                      <span>Rendement cible :</span>
                      <strong className="text-foreground">{spec.rendement_prevu_tonne_ha} t/ha</strong>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditSpec(spec)
                      setModalOpen(true)
                    }}
                    className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background transition"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!spec.id.startsWith('spec-default-') && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSpec(spec.id, spec.nom)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ONGLET 4 : AFFECTATION DES PARCELLES (MATRICE MEMBRE X SPÉCULATION) ── */}
      {activeTab === 'affectations' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-surface border border-surface-border">
            <h3 className="font-heading font-bold text-sm text-foreground">
              Matrice de répartition des parcelles par spéculation
            </h3>
            <p className="text-xs text-foreground-muted mt-0.5">
              Saisissez directement la superficie (ha) emblavée par chaque membre pour chaque culture. Cliquez sur une case pour modifier.
            </p>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-surface-border text-xs">
                <thead className="bg-background/60 font-semibold text-foreground-muted uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 text-left">Membre</th>
                    {speculations.map((s) => (
                      <th key={s.id} className="py-3 px-3 text-center">
                        {s.nom} (ha)
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right">Total Superficie (ha)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-foreground">
                  {membresList.map((m) => (
                    <tr key={m.membreId} className="hover:bg-background/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground">
                        {m.nom} {m.prenom}
                        <span className="text-[10px] font-mono text-foreground-muted block">
                          {m.codeMembre}
                        </span>
                      </td>

                      {speculations.map((spec) => {
                        const cur = m.speculations.find((s) => s.speculationId === spec.id)
                        const isEditing =
                          editingCell?.membreId === m.membreId && editingCell?.specId === spec.id

                        if (isEditing) {
                          return (
                            <td key={spec.id} className="p-2 text-center bg-primary/5">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={tempSuperficie}
                                  onChange={(e) => setTempSuperficie(e.target.value)}
                                  className="w-16 px-2 py-1 text-center rounded bg-background border border-primary text-xs font-bold"
                                  placeholder="ha"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveCell(m.membreId, spec.id)}
                                  disabled={loading}
                                  className="px-2 py-1 rounded bg-primary text-white font-bold text-[10px]"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCell(null)}
                                  className="px-1.5 py-1 rounded bg-surface border border-surface-border text-[10px]"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          )
                        }

                        return (
                          <td
                            key={spec.id}
                            onClick={() => {
                              setEditingCell({ membreId: m.membreId, specId: spec.id })
                              setTempSuperficie(cur ? String(cur.superficie) : '0')
                              setTempCredit(cur ? String(cur.creditAttribue) : '0')
                            }}
                            className="py-3 px-3 text-center cursor-pointer hover:bg-primary/10 transition-colors"
                            title="Cliquer pour modifier"
                          >
                            {cur && cur.superficie > 0 ? (
                              <span className="font-bold text-foreground px-2 py-0.5 rounded bg-background border border-surface-border">
                                {cur.superficie} ha
                              </span>
                            ) : (
                              <span className="text-foreground-muted/40 font-light">—</span>
                            )}
                          </td>
                        )
                      })}

                      <td className="py-3 px-4 text-right font-black text-primary text-sm">
                        {m.superficieTotale.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AJOUT / MODIFICATION SPÉCULATION ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-surface border border-surface-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                <Wheat className="w-5 h-5 text-primary" />
                <span>{editSpec ? 'Modifier la Spéculation' : 'Nouvelle Spéculation'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-foreground-muted hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSpeculationSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Nom de la culture *
                  </label>
                  <input
                    type="text"
                    name="nom"
                    required
                    defaultValue={editSpec?.nom || ''}
                    placeholder="Ex: Oignon, Tomate, Riz"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-surface-border text-foreground font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Variété
                  </label>
                  <input
                    type="text"
                    name="variete"
                    defaultValue={editSpec?.variete || ''}
                    placeholder="Ex: Violet de Galmi, Mongal"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-surface-border text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Produit collecté lors du remboursement en nature *
                </label>
                <input
                  type="text"
                  name="produit_collecte"
                  defaultValue={editSpec?.produit_collecte || ''}
                  placeholder="Ex: Oignon séché en sacs, Tomate fraîche"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-surface-border text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Prix de collecte ({unite}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="prix_collecte"
                    required
                    defaultValue={editSpec?.prix_collecte || 300}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-surface-border text-foreground font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Unité de mesure
                  </label>
                  <select
                    name="unite_mesure"
                    defaultValue={editSpec?.unite_mesure || 'kg'}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-surface-border text-foreground"
                  >
                    <option value="kg">Kilogramme (kg)</option>
                    <option value="sac">Sac standard</option>
                    <option value="cagette">Cagette</option>
                    <option value="tonne">Tonne</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Poids standard sac (kg)
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="poids_standard"
                    defaultValue={editSpec?.poids_standard || 50}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-surface-border text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Enveloppe Crédit allouée ({unite})
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="credit_alloue"
                    defaultValue={editSpec?.credit_alloue || 0}
                    placeholder="Montant du prêt pour cette culture"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-surface-border text-foreground"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Rendement cible (tonnes/ha)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="rendement_prevu_tonne_ha"
                    defaultValue={editSpec?.rendement_prevu_tonne_ha || 0}
                    placeholder="Ex: 25 t/ha"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-surface-border text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-surface-border text-foreground text-xs font-semibold hover:bg-background transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : editSpec ? 'Enregistrer les modifications' : 'Créer la spéculation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

