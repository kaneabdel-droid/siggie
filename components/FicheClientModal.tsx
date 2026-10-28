'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  X,
  User,
  Phone,
  FileText,
  Receipt,
  CreditCard,
  Printer,
  Calendar,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Tag,
  Building2,
  ArrowDownUp,
  DollarSign
} from 'lucide-react'
import { getReleveClient } from '@/app/(dashboard)/bilans/releve-client/actions'
import DownloadPdfButton from '@/app/(dashboard)/facturation/DownloadPdfButton'
import FactureWhatsAppModal from '@/app/(dashboard)/facturation/FactureWhatsAppModal'
import PrintSectionButton from '@/components/PrintSectionButton'
import AddPaiementClientModal from '@/app/(dashboard)/bilans/releve-client/AddPaiementClientModal'
import { useUnite } from '@/components/DeviseProvider'

type ClientData = {
  id: string
  nom: string
  telephone?: string | null
  code_client?: string | null
}

export default function FicheClientModal({
  client,
  gieName = 'Mon GIE',
  dict,
  locale = 'fr',
  triggerButton,
}: {
  client: ClientData
  gieName?: string
  dict?: any
  locale?: string
  triggerButton?: React.ReactNode
}) {
  const unite = useUnite()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'factures' | 'remboursements' | 'releve'>('factures')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc') // 'asc' = chronologique (naturel pour le relevé)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rawJournal, setRawJournal] = useState<any[]>([])
  const [soldeActuel, setSoldeActuel] = useState(0)

  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'
  const displayCode = client.code_client || `CLI-${client.id ? client.id.slice(0, 4).toUpperCase() : '001'}`

  const fetchClientDetails = useCallback(async () => {
    if (!client.id) return
    setLoading(true)
    setError('')
    try {
      const res = await getReleveClient(client.id)
      if (res?.error) {
        setError(res.error)
      } else {
        // En base getReleveClient retourne journal.reverse() (anti-chronologique)
        // On conserve la liste chronologique de base pour le calcul du solde progressif
        const items = (res.journal || []).slice().reverse()
        setRawJournal(items)
        setSoldeActuel(res.soldeActuel || 0)
      }
    } catch (err: any) {
      setError(err?.message || "Erreur de chargement des données client")
    } finally {
      setLoading(false)
    }
  }, [client.id])

  useEffect(() => {
    if (isOpen) {
      fetchClientDetails()
    }
  }, [isOpen, fetchClientDetails])

  // Journal avec solde progressif calculé chronologiquement
  const sortedJournal = useMemo(() => {
    // 1. Trier chronologiquement (date croissante) pour accumuler le solde de façon exacte
    const chrono = rawJournal.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    let cumul = 0
    const withRunningBalance = chrono.map((m) => {
      const isDebit = m.type === 'vente' || m.type === 'prestation'
      cumul += isDebit ? Number(m.montant || 0) : -Number(m.montant || 0)
      return {
        ...m,
        soldeLigne: cumul,
      }
    })

    if (sortOrder === 'desc') {
      return withRunningBalance.reverse()
    }
    return withRunningBalance
  }, [rawJournal, sortOrder])

  // Split into Factures and Remboursements
  const factures = useMemo(() => {
    return rawJournal
      .filter((m) => m.type === 'vente' || m.type === 'prestation')
      .map((f) => {
        const docType = f.type === 'prestation' ? 'prestation' : 'vente_stock'
        const raw = f.raw || {}
        const total = Number(f.montant || 0)
        return {
          ...f,
          docType,
          total,
          rawDoc: {
            ...raw,
            id: f.id,
            type_document: docType,
            montant_total: total,
            montant_paye: raw.montant_paye || 0,
            date_emission: f.date,
            client_nom: client.nom,
            client_telephone: client.telephone,
            designation: f.designation,
          },
        }
      })
  }, [rawJournal, client])

  const remboursements = useMemo(() => {
    return rawJournal.filter((m) => m.type === 'paiement' || m.type === 'remboursement')
  }, [rawJournal])

  const totalFacture = useMemo(() => {
    return factures.reduce((acc, f) => acc + (f.total || 0), 0)
  }, [factures])

  const totalPaye = useMemo(() => {
    return remboursements.reduce((acc, r) => acc + (Number(r.montant) || 0), 0)
  }, [remboursements])

  const tauxRecouvrement = totalFacture > 0 ? Math.min(100, Math.round((totalPaye / totalFacture) * 100)) : 100

  return (
    <>
      {triggerButton ? (
        <span onClick={() => setIsOpen(true)} className="cursor-pointer">
          {triggerButton}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/25 shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
          title="Consulter la fiche client complète"
        >
          <Tag className="w-3.5 h-3.5 text-primary" />
          <span>{displayCode}</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Top Gradient Stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 shrink-0" />

            {/* Header: Bien cadré et aligné */}
            <div className="flex items-center justify-between p-5 border-b border-surface-border bg-background/50">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center text-primary shadow-xs shrink-0">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-2xl font-black text-foreground tracking-tight font-heading truncate">
                      {client.nom}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 text-primary px-2.5 py-0.5 text-xs font-mono font-bold border border-primary/30 shadow-2xs">
                      {displayCode}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-secondary/15 text-secondary px-2.5 py-0.5 text-xs font-semibold border border-secondary/25">
                      Client externe
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-foreground-muted mt-1.5 flex-wrap">
                    {client.telephone ? (
                      <span className="inline-flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-md border border-surface-border font-mono text-foreground">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        {client.telephone}
                      </span>
                    ) : (
                      <span className="italic text-foreground-muted">Sans contact direct</span>
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
                    {factures.length} facture{factures.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black font-mono text-foreground tracking-tight">
                  {totalFacture.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} <span className="text-sm font-bold text-foreground-muted font-sans">{unite}</span>
                </div>
                <div className="mt-1 text-[11px] text-foreground-muted">
                  Prestations de machines et ventes de stock
                </div>
              </div>

              {/* Carte 2 : Total Encaissé */}
              <div className="rounded-xl border border-success/30 bg-success/5 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-success uppercase tracking-wider">
                    Total Encaissé / Payé
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-success/15 text-success border border-success/30">
                    <CreditCard className="w-3 h-3 text-success" />
                    {remboursements.length} règlement{remboursements.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black font-mono text-success tracking-tight">
                  {totalPaye.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} <span className="text-sm font-bold text-success/80 font-sans">{unite}</span>
                </div>
                <div className="mt-1 text-[11px] text-foreground-muted flex items-center justify-between">
                  <span>Paiements en espèces, chèques ou nature</span>
                  <span className="font-semibold text-success">{tauxRecouvrement}% réglé</span>
                </div>
              </div>

              {/* Carte 3 : Reste Dû / Solde */}
              <div className={`rounded-xl border p-4 shadow-xs relative overflow-hidden flex flex-col justify-between ${
                soldeActuel > 0
                  ? 'border-danger/35 bg-danger/5 text-danger'
                  : soldeActuel < 0
                  ? 'border-primary/35 bg-primary/5 text-primary'
                  : 'border-success/35 bg-success/5 text-success'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {soldeActuel > 0 ? 'Reste Dû (À recouvrer)' : soldeActuel < 0 ? 'Solde Créditeur' : 'Solde Régularisé'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    soldeActuel > 0
                      ? 'bg-danger/15 text-danger border-danger/30'
                      : soldeActuel < 0
                      ? 'bg-primary/15 text-primary border-primary/30'
                      : 'bg-success/15 text-success border-success/30'
                  }`}>
                    {soldeActuel > 0 ? (
                      <>
                        <TrendingDown className="w-3 h-3" />
                        À recouvrer
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        À jour
                      </>
                    )}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black font-mono tracking-tight">
                  {Math.abs(soldeActuel).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} <span className="text-sm font-bold opacity-80 font-sans">{unite}</span>
                </div>
                <div className="mt-1 text-[11px] opacity-80">
                  {soldeActuel > 0
                    ? 'Montant net restant à percevoir'
                    : soldeActuel < 0
                    ? 'Avance versée par le client'
                    : 'Toutes les factures sont soldées'}
                </div>
              </div>
            </div>

            {/* Navigation & Toolbar : Parfaitement aligné */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-3 border-b border-surface-border bg-surface">
              {/* Segmented Control Tabs */}
              <div className="inline-flex p-1 rounded-xl bg-background border border-surface-border gap-1 shadow-inner self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('factures')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'factures'
                      ? 'bg-surface text-primary shadow-xs border border-surface-border'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Factures ({factures.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('remboursements')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'remboursements'
                      ? 'bg-surface text-primary shadow-xs border border-surface-border'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Paiements ({remboursements.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('releve')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'releve'
                      ? 'bg-surface text-primary shadow-xs border border-surface-border'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Relevé de Compte</span>
                </button>
              </div>

              {/* Actions Toolbar */}
              <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                {activeTab === 'releve' && (
                  <button
                    type="button"
                    onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-background hover:bg-surface border border-surface-border text-foreground transition-all cursor-pointer"
                    title={sortOrder === 'asc' ? 'Actuellement : chronologique (plus ancien en haut)' : 'Actuellement : anti-chronologique (plus récent en haut)'}
                  >
                    <ArrowDownUp className="w-3.5 h-3.5 text-primary" />
                    <span>{sortOrder === 'asc' ? 'Chrono (Ancien ➔ Récent)' : 'Récents en premier'}</span>
                  </button>
                )}
                <AddPaiementClientModal clientId={client.id} onSuccess={fetchClientDetails} dict={dict} />
                <PrintSectionButton sectionId={`fiche-client-releve-${client.id}`} label="Imprimer relevé" />
              </div>
            </div>

            {/* Tab Body Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading && (
                <div className="py-16 text-center text-foreground-muted flex flex-col items-center justify-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="text-sm font-medium">Chargement des données du client...</span>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!loading && !error && (
                <>
                  {/* TAB 1: FACTURES */}
                  {activeTab === 'factures' && (
                    <div className="space-y-4">
                      {factures.length === 0 ? (
                        <div className="text-center py-12 text-foreground-muted bg-background/30 rounded-xl border border-surface-border p-6">
                          <Receipt className="w-8 h-8 mx-auto text-foreground-muted/50 mb-2" />
                          <p className="text-sm">Aucune facture enregistrée pour ce client.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface shadow-xs">
                          <table className="min-w-full divide-y divide-surface-border text-left">
                            <thead className="bg-background/80 text-xs text-foreground-muted font-semibold uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-3.5 w-32">Date</th>
                                <th className="px-4 py-3.5 w-36">Nature</th>
                                <th className="px-4 py-3.5">Désignation</th>
                                <th className="px-4 py-3.5 text-right w-32">Quantité</th>
                                <th className="px-4 py-3.5 text-right w-40">Montant</th>
                                <th className="px-4 py-3.5 text-right w-32">Documents</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border text-sm">
                              {factures.map((f, idx) => (
                                <tr key={f.id || idx} className="hover:bg-background/40 transition-colors">
                                  <td className="px-4 py-3.5 whitespace-nowrap text-foreground font-mono text-xs">
                                    {new Date(f.date).toLocaleDateString(dateLocale)}
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                                      f.docType === 'prestation'
                                        ? 'bg-secondary/15 text-secondary border border-secondary/25'
                                        : 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/25'
                                    }`}>
                                      {f.docType === 'prestation' ? 'Prestation matériel' : 'Vente de stock'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-foreground font-medium">
                                    {f.designation}
                                  </td>
                                  <td className="px-4 py-3.5 text-right text-foreground-muted whitespace-nowrap font-mono text-xs">
                                    {f.quantite ? `${Number(f.quantite).toLocaleString(dateLocale)} ${f.unite || ''}` : '-'}
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-bold text-foreground whitespace-nowrap font-mono">
                                    {Number(f.total).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                  </td>
                                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {f.rawDoc && (
                                        <>
                                          <FactureWhatsAppModal facture={f.rawDoc} gieName={gieName} dict={dict} />
                                          <DownloadPdfButton facture={f.rawDoc} dict={dict} gieName={gieName} />
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-background/60 border-t-2 border-surface-border text-xs font-bold font-mono">
                              <tr>
                                <td colSpan={4} className="px-4 py-3 text-right uppercase text-foreground-muted">
                                  Total Facturé :
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-foreground">
                                  {totalFacture.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: REMBOURSEMENTS & PAIEMENTS */}
                  {activeTab === 'remboursements' && (
                    <div className="space-y-4">
                      {remboursements.length === 0 ? (
                        <div className="text-center py-12 text-foreground-muted bg-background/30 rounded-xl border border-surface-border p-6">
                          <CreditCard className="w-8 h-8 mx-auto text-foreground-muted/50 mb-2" />
                          <p className="text-sm">Aucun règlement ou paiement enregistré pour ce client.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface shadow-xs">
                          <table className="min-w-full divide-y divide-surface-border text-left">
                            <thead className="bg-background/80 text-xs text-foreground-muted font-semibold uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-3.5 w-32">Date</th>
                                <th className="px-4 py-3.5 w-36">Statut</th>
                                <th className="px-4 py-3.5">Détails & Référence</th>
                                <th className="px-4 py-3.5 text-right w-44">Montant Réglé</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border text-sm">
                              {remboursements.map((r, idx) => (
                                <tr key={r.id || idx} className="hover:bg-background/40 transition-colors">
                                  <td className="px-4 py-3.5 whitespace-nowrap text-foreground font-mono text-xs">
                                    {new Date(r.date).toLocaleDateString(dateLocale)}
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 rounded-md bg-success/15 text-success px-2.5 py-0.5 text-xs font-semibold border border-success/30">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Paiement reçu
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-foreground font-medium">
                                    {r.designation}
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-black text-success whitespace-nowrap font-mono text-sm">
                                    +{Number(r.montant).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-background/60 border-t-2 border-surface-border text-xs font-bold font-mono">
                              <tr>
                                <td colSpan={3} className="px-4 py-3 text-right uppercase text-foreground-muted">
                                  Total Encaissé :
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-success">
                                  +{totalPaye.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: RELEVE DE COMPTE CHRONOLOGIQUE PARFAITEMENT CADRÉ */}
                  {activeTab === 'releve' && (
                    <div className="space-y-4" id={`fiche-client-releve-${client.id}`}>
                      {/* Entête imprimée dédiée */}
                      <div className="hidden print:block p-5 border-b-2 border-surface-border mb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className="text-2xl font-black text-foreground">{gieName}</h2>
                            <h3 className="text-lg font-bold text-primary mt-1">
                              Relevé de Compte Client • {client.nom} ({displayCode})
                            </h3>
                            {client.telephone && <p className="text-xs text-foreground-muted">Tél : {client.telephone}</p>}
                          </div>
                          <div className="text-right text-xs text-foreground-muted">
                            <p>Date d&apos;édition : {new Date().toLocaleDateString(dateLocale)}</p>
                            <p className="font-bold text-foreground mt-1 text-sm font-mono">
                              Solde restant dû : {Math.abs(soldeActuel).toLocaleString(dateLocale)} {unite}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Tableau Relevé avec alignement comptable rigoureux */}
                      <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface shadow-xs">
                        <table className="min-w-full divide-y divide-surface-border text-left">
                          <thead className="bg-background/90 text-xs text-foreground-muted font-semibold uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3.5 w-32 text-left">Date</th>
                              <th className="px-4 py-3.5">Opération & Libellé</th>
                              <th className="px-4 py-3.5 text-right w-40">Débit (Facture)</th>
                              <th className="px-4 py-3.5 text-right w-40">Crédit (Paiement)</th>
                              <th className="px-4 py-3.5 text-right w-44 bg-background/50 border-l border-surface-border">
                                Solde Dû
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border text-sm">
                            {sortedJournal.map((m, idx) => {
                              const isDebit = m.type === 'vente' || m.type === 'prestation'
                              return (
                                <tr key={m.id || idx} className="hover:bg-background/40 transition-colors">
                                  {/* Date */}
                                  <td className="px-4 py-3.5 whitespace-nowrap text-foreground font-mono text-xs">
                                    {new Date(m.date).toLocaleDateString(dateLocale)}
                                  </td>
                                  {/* Opération & Libellé */}
                                  <td className="px-4 py-3.5 text-foreground">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                                        isDebit
                                          ? 'bg-danger/10 text-danger border border-danger/25'
                                          : 'bg-success/10 text-success border border-success/25'
                                      }`}>
                                        {isDebit ? 'Facture' : 'Règlement'}
                                      </span>
                                      <span className="font-medium text-xs text-foreground">
                                        {m.designation}
                                      </span>
                                    </div>
                                  </td>
                                  {/* Débit (Facturé) */}
                                  <td className="px-4 py-3.5 text-right font-mono font-bold text-danger whitespace-nowrap">
                                    {isDebit ? `${Number(m.montant).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} ${unite}` : '—'}
                                  </td>
                                  {/* Crédit (Encaissé) */}
                                  <td className="px-4 py-3.5 text-right font-mono font-bold text-success whitespace-nowrap">
                                    {!isDebit ? `+${Number(m.montant).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} ${unite}` : '—'}
                                  </td>
                                  {/* Solde Progressif */}
                                  <td className="px-4 py-3.5 text-right font-mono font-black text-foreground bg-background/30 border-l border-surface-border whitespace-nowrap">
                                    {Number(m.soldeLigne ?? m.solde).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                  </td>
                                </tr>
                              )
                            })}
                            {sortedJournal.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-sm text-foreground-muted italic">
                                  Aucun mouvement ou opération enregistré pour ce client.
                                </td>
                              </tr>
                            )}
                          </tbody>
                          {/* Totaux généraux en pied de tableau */}
                          <tfoot className="bg-background/80 border-t-2 border-surface-border text-xs font-mono font-bold">
                            <tr>
                              <td colSpan={2} className="px-4 py-3.5 uppercase text-foreground-muted text-right">
                                Total Mouvements :
                              </td>
                              <td className="px-4 py-3.5 text-right text-sm text-danger">
                                {totalFacture.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                              </td>
                              <td className="px-4 py-3.5 text-right text-sm text-success">
                                +{totalPaye.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                              </td>
                              <td className={`px-4 py-3.5 text-right text-base border-l border-surface-border ${
                                soldeActuel > 0 ? 'text-danger' : 'text-success'
                              }`}>
                                {Math.abs(soldeActuel).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-surface-border bg-background/50 text-xs">
              <span className="text-foreground-muted flex items-center gap-2">
                <span>Fiche client dynamique SIGGIE</span>
                <span>•</span>
                <span className="font-semibold text-foreground">{factures.length} factures</span>
                <span>•</span>
                <span className="font-semibold text-success">{remboursements.length} paiements</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-5 py-2 text-sm font-semibold bg-surface hover:bg-background border border-surface-border text-foreground transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
