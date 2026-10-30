'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  X,
  User,
  Phone,
  FileText,
  Receipt,
  Printer,
  Calendar,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Tag,
  Building2,
  MapPin,
  Tractor,
  Scale,
  Wheat,
  Eye,
  Check,
  RotateCcw,
  Paperclip
} from 'lucide-react'
import { getFicheMembre } from '@/app/(dashboard)/bilans/releve-membre/actions'
import DownloadPdfButton from '@/app/(dashboard)/facturation/DownloadPdfButton'
import FactureWhatsAppModal from '@/app/(dashboard)/facturation/FactureWhatsAppModal'
import { useUnite } from '@/components/DeviseProvider'
import JustificatifSoldeModal from '@/components/JustificatifSoldeModal'

type MembreData = {
  id: string
  nom: string
  prenom: string
  code_membre?: string | null
  telephone?: string | null
  village?: string | null
  superficie?: number | null
  solde_initial?: number | null
  statut?: string | null
}

export default function FicheMembreModal({
  membre,
  gieName = 'Mon GIE',
  dict,
  locale = 'fr',
  triggerButton,
}: {
  membre: MembreData
  gieName?: string
  dict?: any
  locale?: string
  triggerButton?: React.ReactNode
}) {
  const unite = useUnite()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'factures' | 'remboursements' | 'prestations' | 'releve'>('factures')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)

  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'
  const displayCode = membre.code_membre || `MEM-${membre.id ? membre.id.slice(0, 4).toUpperCase() : '001'}`

  const fetchDetails = useCallback(async () => {
    if (!membre.id) return
    setLoading(true)
    setError('')
    try {
      const res = await getFicheMembre(membre.id)
      if (res?.error) {
        setError(res.error)
      } else {
        setData(res)
      }
    } catch (err: any) {
      setError(err?.message || "Erreur de chargement des données membre")
    } finally {
      setLoading(false)
    }
  }, [membre.id])

  useEffect(() => {
    if (isOpen) {
      fetchDetails()
    }
  }, [isOpen, fetchDetails])

  const factures = data?.factures || []
  const remboursements = data?.remboursements || []
  const prestations = data?.prestations || []
  const journal = useMemo(() => {
    const list = (data?.journal || []) as any[]
    if (sortOrder === 'desc') {
      return list.slice().reverse()
    }
    return list
  }, [data?.journal, sortOrder])

  const totalFacture = data?.kpi?.totalFacture || 0
  const totalPaye = data?.kpi?.totalPaye || 0
  const soldeActuel = data?.kpi?.soldeActuel || 0
  const tauxRecouvrement = totalFacture > 0 ? Math.min(100, Math.round((totalPaye / totalFacture) * 100)) : 100

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {triggerButton ? (
        <span onClick={() => setIsOpen(true)} className="cursor-pointer inline-flex">
          {triggerButton}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/25 shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
          title="Consulter la fiche membre complète"
        >
          <Tag className="w-3.5 h-3.5 text-primary" />
          <span>{displayCode}</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Top Gradient Stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-primary to-indigo-500 shrink-0" />

            {/* Header: Bien cadré et aligné */}
            <div className="flex items-center justify-between p-5 border-b border-surface-border bg-background/50">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center text-primary shadow-xs shrink-0 font-bold text-xl">
                  {membre.prenom ? membre.prenom[0] : ''}{membre.nom ? membre.nom[0] : ''}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-2xl font-black text-foreground tracking-tight font-heading truncate">
                      {membre.prenom} {membre.nom}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 text-primary px-2.5 py-0.5 text-xs font-mono font-bold border border-primary/30 shadow-2xs">
                      {displayCode}
                    </span>
                    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                      membre.statut === 'actif'
                        ? 'bg-success/10 text-success ring-success/20'
                        : 'bg-foreground-muted/10 text-foreground-muted ring-foreground-muted/20'
                    }`}>
                      {membre.statut === 'actif' ? 'Membre actif' : 'Membre inactif'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-foreground-muted mt-1.5 flex-wrap">
                    {membre.village && (
                      <span className="inline-flex items-center gap-1 bg-surface px-2.5 py-1 rounded-md border border-surface-border text-foreground font-medium">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {membre.village}
                      </span>
                    )}
                    {membre.telephone ? (
                      <span className="inline-flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-md border border-surface-border font-mono text-foreground">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        {membre.telephone}
                      </span>
                    ) : (
                      <span className="italic text-foreground-muted">Sans téléphone</span>
                    )}
                    {membre.superficie && (
                      <span className="inline-flex items-center gap-1 bg-surface px-2.5 py-1 rounded-md border border-surface-border text-foreground-muted font-medium">
                        <Wheat className="h-3.5 w-3.5 text-primary" />
                        {Number(membre.superficie).toLocaleString(dateLocale, { maximumFractionDigits: 2 })} ha
                      </span>
                    )}
                    <span className="text-surface-border">•</span>
                    <span className="inline-flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-md border border-surface-border text-foreground-muted font-medium">
                      <Building2 className="h-3.5 w-3.5 text-foreground-muted" />
                      {gieName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <JustificatifSoldeModal
                  membreId={membre.id}
                  membreNom={`${membre.nom} ${membre.prenom}`}
                  soldeInitial={membre.solde_initial}
                  triggerButton={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface hover:bg-background text-foreground border border-surface-border transition-colors cursor-pointer"
                      title="Importer ou consulter le justificatif du solde initial (PDF, PNG, CSV)"
                    >
                      <Paperclip className="h-4 w-4 text-primary" />
                      <span className="hidden sm:inline">Justificatif Solde Initial</span>
                    </button>
                  }
                />
                <button
                  type="button"
                  onClick={handlePrint}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface hover:bg-background text-foreground border border-surface-border transition-colors cursor-pointer"
                  title="Imprimer la fiche membre"
                >
                  <Printer className="h-4 w-4 text-primary" />
                  <span>Imprimer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl p-2 text-foreground-muted hover:text-foreground hover:bg-surface-border/50 border border-transparent hover:border-surface-border transition-colors cursor-pointer"
                  title="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Financial Summary Badges: 3 Cartes Équilibrées et Cadrées */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-5 bg-background/30 border-b border-surface-border">
              {/* Carte 1 : Total Facturé */}
              <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Total Facturé
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-background text-foreground-muted border border-surface-border">
                    <FileText className="w-3 h-3 text-primary" />
                    {factures.length} campagne{factures.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black font-mono text-foreground tracking-tight">
                  {totalFacture.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} <span className="text-sm font-bold text-foreground-muted font-sans">{unite}</span>
                </div>
                <div className="mt-1 text-[11px] text-foreground-muted">
                  Intrants, labour, prestations et intérêts
                </div>
              </div>

              {/* Carte 2 : Total Remboursé */}
              <div className="rounded-xl border border-success/30 bg-success/5 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-success uppercase tracking-wider">
                    Total Remboursé / Payé
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-success/15 text-success border border-success/30">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    {remboursements.length} paiement{remboursements.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black font-mono text-success tracking-tight">
                  {totalPaye.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} <span className="text-sm font-bold text-success/70 font-sans">{unite}</span>
                </div>
                <div className="mt-1 text-[11px] text-foreground-muted flex items-center justify-between">
                  <span>Numéraire & pesées en nature</span>
                  <span className="font-semibold text-success font-mono">{tauxRecouvrement}% soldé</span>
                </div>
              </div>

              {/* Carte 3 : Solde Dû / Position */}
              <div
                className={`rounded-xl border p-4 shadow-xs relative overflow-hidden flex flex-col justify-between ${
                  soldeActuel > 0
                    ? 'border-danger/30 bg-danger/5'
                    : soldeActuel < 0
                    ? 'border-indigo-500/30 bg-indigo-500/5'
                    : 'border-success/30 bg-success/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      soldeActuel > 0 ? 'text-danger' : soldeActuel < 0 ? 'text-indigo-400' : 'text-success'
                    }`}
                  >
                    {soldeActuel > 0
                      ? 'Reste Dû (À recouvrer)'
                      : soldeActuel < 0
                      ? 'Solde Créditeur (Surplus)'
                      : 'Compte Soldé (À jour)'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      soldeActuel > 0
                        ? 'bg-danger/15 text-danger border border-danger/30'
                        : soldeActuel < 0
                        ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                        : 'bg-success/15 text-success border border-success/30'
                    }`}
                  >
                    {soldeActuel > 0 ? (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        Impayé
                      </>
                    ) : soldeActuel < 0 ? (
                      <>
                        <RotateCcw className="w-3 h-3" />
                        À ristourner
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3" />
                        Règle à jour
                      </>
                    )}
                  </span>
                </div>
                <div
                  className={`mt-2 text-2xl font-black font-mono tracking-tight ${
                    soldeActuel > 0 ? 'text-danger' : soldeActuel < 0 ? 'text-indigo-400' : 'text-success'
                  }`}
                >
                  {Math.abs(soldeActuel).toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{' '}
                  <span className="text-sm font-bold opacity-75 font-sans">{unite}</span>
                </div>
                <div className="mt-1 text-[11px] text-foreground-muted">
                  {soldeActuel > 0
                    ? 'Montant net restant à percevoir'
                    : soldeActuel < 0
                    ? 'Surplus agricole à reverser au membre'
                    : 'Aucune dette en cours sur ce compte'}
                </div>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="px-5 border-b border-surface-border bg-surface flex items-center justify-between">
              <nav className="flex space-x-1 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('factures')}
                  className={`flex items-center gap-2 py-3 px-3 border-b-2 text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'factures'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Factures & Campagnes</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold font-mono ${
                    activeTab === 'factures' ? 'bg-primary/20 text-primary' : 'bg-surface-border/50 text-foreground-muted'
                  }`}>
                    {factures.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('remboursements')}
                  className={`flex items-center gap-2 py-3 px-3 border-b-2 text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'remboursements'
                      ? 'border-success text-success'
                      : 'border-transparent text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Remboursements & Pesées</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold font-mono ${
                    activeTab === 'remboursements' ? 'bg-success/20 text-success' : 'bg-surface-border/50 text-foreground-muted'
                  }`}>
                    {remboursements.length}
                  </span>
                </button>

                {prestations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('prestations')}
                    className={`flex items-center gap-2 py-3 px-3 border-b-2 text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === 'prestations'
                        ? 'border-amber-500 text-amber-500'
                        : 'border-transparent text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <Tractor className="w-4 h-4" />
                    <span>Prestations</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold font-mono ${
                      activeTab === 'prestations' ? 'bg-amber-500/20 text-amber-500' : 'bg-surface-border/50 text-foreground-muted'
                    }`}>
                      {prestations.length}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('releve')}
                  className={`flex items-center gap-2 py-3 px-3 border-b-2 text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'releve'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Grand Livre (Relevé)</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold font-mono ${
                    activeTab === 'releve' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-surface-border/50 text-foreground-muted'
                  }`}>
                    {journal.length}
                  </span>
                </button>
              </nav>

              {activeTab === 'releve' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-background hover:bg-surface text-foreground-muted hover:text-foreground border border-surface-border transition-colors cursor-pointer"
                  >
                    <span>{sortOrder === 'asc' ? 'Chronologique ↑' : 'Anti-chrono ↓'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Body: Scrollable Content */}
            <div className="p-5 overflow-y-auto flex-1 min-h-[300px]">
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!loading && !error && (
                <>
                  {/* TAB 1: Factures */}
                  {activeTab === 'factures' && (
                    <div className="space-y-3">
                      {factures.length === 0 ? (
                        <div className="text-center py-12 text-foreground-muted border border-dashed border-surface-border rounded-xl">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Aucune facture enregistrée pour ce membre.</p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-surface-border shadow-xs">
                          <table className="min-w-full divide-y divide-surface-border">
                            <thead className="bg-background/60 text-xs font-semibold text-foreground-muted uppercase">
                              <tr>
                                <th className="px-4 py-3 text-left">Campagne</th>
                                <th className="px-4 py-3 text-left">Date Émission</th>
                                <th className="px-4 py-3 text-right">Principal</th>
                                <th className="px-4 py-3 text-right">Intérêts</th>
                                <th className="px-4 py-3 text-right">Total Facturé</th>
                                <th className="px-4 py-3 text-right">Déjà Payé</th>
                                <th className="px-4 py-3 text-right">Reste Dû</th>
                                <th className="px-4 py-3 text-center">Statut</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border bg-surface text-sm">
                              {factures.map((f: any) => {
                                const camp = Array.isArray(f.campagnes) ? f.campagnes[0] : f.campagnes
                                const principal = Number(f.montant_total || 0)
                                const interet = Number(f.montant_interet || 0)
                                const total = principal + interet
                                const paye = Number(f.montant_paye || 0)
                                const reste = Math.max(0, total - paye)
                                return (
                                  <tr key={f.id} className="hover:bg-background/40 transition-colors">
                                    <td className="px-4 py-3.5 font-medium text-foreground">
                                      {camp?.nom || 'Campagne'}
                                    </td>
                                    <td className="px-4 py-3.5 text-foreground-muted text-xs font-mono">
                                      {f.date_emission ? new Date(f.date_emission).toLocaleDateString(dateLocale) : '-'}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-mono text-foreground-muted">
                                      {principal.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-mono text-foreground-muted text-xs">
                                      {interet > 0 ? `+${interet.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}` : '-'}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground">
                                      {total.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-mono text-success font-semibold">
                                      {paye.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-mono font-bold">
                                      <span className={reste > 0 ? 'text-danger' : 'text-success'}>
                                        {reste.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-center">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                        f.statut === 'payee'
                                          ? 'bg-success/10 text-success'
                                          : f.statut === 'partiellement_payee' || f.statut === 'partiellement_paye'
                                          ? 'bg-warning/10 text-warning'
                                          : 'bg-danger/10 text-danger'
                                      }`}>
                                        {f.statut === 'payee'
                                          ? 'Soldée'
                                          : f.statut === 'partiellement_payee' || f.statut === 'partiellement_paye'
                                          ? 'Partielle'
                                          : 'Impayée'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <DownloadPdfButton
                                          facture={{
                                            ...f,
                                            montant_total: total,
                                            montant_paye: paye,
                                            client_nom: `${membre.prenom} ${membre.nom}`,
                                            client_telephone: membre.telephone,
                                          }}
                                          gieName={gieName}
                                          dict={dict}
                                        />
                                        <FactureWhatsAppModal
                                          facture={{
                                            ...f,
                                            montant_total: total,
                                            montant_paye: paye,
                                            client_nom: `${membre.prenom} ${membre.nom}`,
                                            client_telephone: membre.telephone,
                                          }}
                                          gieName={gieName}
                                          dict={dict}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: Remboursements */}
                  {activeTab === 'remboursements' && (
                    <div className="space-y-3">
                      {remboursements.length === 0 ? (
                        <div className="text-center py-12 text-foreground-muted border border-dashed border-surface-border rounded-xl">
                          <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Aucun remboursement enregistré pour ce membre.</p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-surface-border shadow-xs">
                          <table className="min-w-full divide-y divide-surface-border">
                            <thead className="bg-background/60 text-xs font-semibold text-foreground-muted uppercase">
                              <tr>
                                <th className="px-4 py-3 text-left">Date Paiement</th>
                                <th className="px-4 py-3 text-left">Mode / Nature</th>
                                <th className="px-4 py-3 text-left">Compte / Référence</th>
                                <th className="px-4 py-3 text-right">Pesée (kg)</th>
                                <th className="px-4 py-3 text-right">Montant Encaissé</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border bg-surface text-sm">
                              {remboursements.map((r: any) => {
                                const compte = Array.isArray(r.comptes) ? r.comptes[0] : r.comptes
                                const isNature = r.type_remboursement === 'nature'
                                return (
                                  <tr key={r.id} className="hover:bg-background/40 transition-colors">
                                    <td className="px-4 py-3.5 text-foreground-muted text-xs font-mono">
                                      {r.date_paiement ? new Date(r.date_paiement).toLocaleDateString(dateLocale) : '-'}
                                    </td>
                                    <td className="px-4 py-3.5">
                                      <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                                          isNature
                                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                            : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                        }`}>
                                          {isNature ? <Scale className="w-3.5 h-3.5" /> : <Receipt className="w-3.5 h-3.5" />}
                                          {isNature ? 'Pesée en nature' : (r.type_remboursement || 'Espèces')}
                                        </span>
                                        {r.produit_nature && (
                                          <span className="text-xs text-foreground-muted">
                                            ({r.produit_nature})
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-foreground-muted text-xs">
                                      {compte?.nom ? `Compte : ${compte.nom}` : r.reference_piece ? `Réf: ${r.reference_piece}` : '-'}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-foreground">
                                      {r.quantite_nature ? `${Number(r.quantite_nature).toLocaleString(dateLocale)} kg` : '-'}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-mono font-bold text-success text-base">
                                      {Number(r.montant_fcfa || 0).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: Prestations */}
                  {activeTab === 'prestations' && (
                    <div className="space-y-3">
                      {prestations.length === 0 ? (
                        <div className="text-center py-12 text-foreground-muted border border-dashed border-surface-border rounded-xl">
                          <Tractor className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Aucune prestation de matériel pour ce membre.</p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-surface-border shadow-xs">
                          <table className="min-w-full divide-y divide-surface-border">
                            <thead className="bg-background/60 text-xs font-semibold text-foreground-muted uppercase">
                              <tr>
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-left">Matériel & Type</th>
                                <th className="px-4 py-3 text-left">Campagne</th>
                                <th className="px-4 py-3 text-right">Superficie / Heures</th>
                                <th className="px-4 py-3 text-right">Montant Facturé</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border bg-surface text-sm">
                              {prestations.map((p: any) => (
                                <tr key={p.id} className="hover:bg-background/40 transition-colors">
                                  <td className="px-4 py-3.5 text-foreground-muted text-xs font-mono">
                                    {p.date_prestation ? new Date(p.date_prestation).toLocaleDateString(dateLocale) : '-'}
                                  </td>
                                  <td className="px-4 py-3.5 font-medium text-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Tractor className="w-4 h-4 text-primary" />
                                      <span>{p.type_prestation}</span>
                                      {p.materiel?.nom && (
                                        <span className="text-xs text-foreground-muted">({p.materiel.nom})</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-foreground-muted text-xs">
                                    {p.campagne?.nom || '-'}
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-mono text-foreground-muted">
                                    {p.quantite ? `${p.quantite} ha / h` : '-'}
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground">
                                    {Number(p.montant_facture || 0).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: Grand Livre (Relevé de Compte) */}
                  {activeTab === 'releve' && (
                    <div id="fiche-membre-print-area" className="space-y-4">
                      {/* En-tête imprimable */}
                      <div className="hidden print:block p-4 border border-surface-border rounded-lg mb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h1 className="text-xl font-black text-foreground font-heading">{gieName}</h1>
                            <p className="text-sm font-semibold text-primary">Relevé de Compte Individuel — Membre</p>
                          </div>
                          <div className="text-right text-xs text-foreground-muted font-mono">
                            Date: {new Date().toLocaleDateString(dateLocale)}
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-surface-border grid grid-cols-2 text-xs">
                          <div>
                            <strong>Membre:</strong> {membre.prenom} {membre.nom} ({displayCode})
                          </div>
                          <div>
                            <strong>Village:</strong> {membre.village || '-'} | <strong>Tél:</strong> {membre.telephone || '-'}
                          </div>
                        </div>
                      </div>

                      {journal.length === 0 ? (
                        <div className="text-center py-12 text-foreground-muted border border-dashed border-surface-border rounded-xl">
                          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Aucun mouvement comptable enregistré.</p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-surface-border shadow-xs">
                          <table className="min-w-full divide-y divide-surface-border">
                            <thead className="bg-background/60 text-xs font-semibold text-foreground-muted uppercase">
                              <tr>
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-left">Opération / Libellé</th>
                                <th className="px-4 py-3 text-right text-foreground">Débit (Facturé)</th>
                                <th className="px-4 py-3 text-right text-success">Crédit (Remboursé)</th>
                                <th className="px-4 py-3 text-right">Solde Dû</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border bg-surface text-sm">
                              {journal.map((item: any) => {
                                const isDebit = item.debit > 0
                                const isCredit = item.credit > 0
                                return (
                                  <tr key={item.id} className="hover:bg-background/40 transition-colors">
                                    <td className="px-4 py-3 text-foreground-muted text-xs font-mono whitespace-nowrap">
                                      {item.date ? new Date(item.date).toLocaleDateString(dateLocale) : '-'}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-foreground">
                                      <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                                          item.type === 'remboursement'
                                            ? 'bg-success/15 text-success'
                                            : item.type === 'facture'
                                            ? 'bg-primary/15 text-primary'
                                            : item.type === 'prestation'
                                            ? 'bg-amber-500/15 text-amber-500'
                                            : item.type === 'solde_initial'
                                            ? 'bg-surface-border text-foreground-muted'
                                            : 'bg-indigo-500/15 text-indigo-400'
                                        }`}>
                                          {item.type === 'remboursement' ? 'Paiement' : item.type === 'facture' ? 'Facture' : item.type === 'prestation' ? 'Prestation' : 'Report'}
                                        </span>
                                        <span className="text-xs sm:text-sm">{item.libelle}</span>
                                        {item.type === 'solde_initial' && (
                                          <JustificatifSoldeModal
                                            membreId={membre.id}
                                            membreNom={`${membre.nom} ${membre.prenom}`}
                                            soldeInitial={membre.solde_initial}
                                            triggerButton={
                                              <span className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer ml-1.5 font-sans font-normal">
                                                <Paperclip className="w-3 h-3" />
                                                <span>Justificatif</span>
                                              </span>
                                            }
                                          />
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                                      {isDebit ? `${Number(item.debit).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} ${unite}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-success whitespace-nowrap">
                                      {isCredit ? `${Number(item.credit).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} ${unite}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                                      <span className={item.soldeLigne > 0 ? 'text-danger' : item.soldeLigne < 0 ? 'text-indigo-400' : 'text-success'}>
                                        {Number(item.soldeLigne || 0).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot className="bg-background/80 border-t-2 border-surface-border font-bold text-sm">
                              <tr>
                                <td colSpan={2} className="px-4 py-3.5 text-right uppercase text-xs tracking-wider text-foreground-muted">
                                  Totaux du Compte
                                </td>
                                <td className="px-4 py-3.5 text-right font-mono text-foreground">
                                  {totalFacture.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                </td>
                                <td className="px-4 py-3.5 text-right font-mono text-success">
                                  {totalPaye.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                </td>
                                <td className="px-4 py-3.5 text-right font-mono text-base">
                                  <span className={soldeActuel > 0 ? 'text-danger' : soldeActuel < 0 ? 'text-indigo-400' : 'text-success'}>
                                    {soldeActuel.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                  </span>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer: Action bar & summary */}
            <div className="p-4 border-t border-surface-border bg-background/50 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 text-foreground-muted">
                <span>Fiche membre SIGGIE •</span>
                <span>{factures.length} campagnes, {remboursements.length} paiements</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-background text-foreground border border-surface-border transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
