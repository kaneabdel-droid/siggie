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
  ExternalLink,
  Plus
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [journal, setJournal] = useState<any[]>([])
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
        setJournal(res.journal || [])
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

  // Split into Factures and Remboursements
  const factures = useMemo(() => {
    return journal
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
  }, [journal, client])

  const remboursements = useMemo(() => {
    return journal.filter((m) => m.type === 'paiement' || m.type === 'remboursement')
  }, [journal])

  const totalFacture = useMemo(() => {
    return factures.reduce((acc, f) => acc + (f.total || 0), 0)
  }, [factures])

  const totalPaye = useMemo(() => {
    return remboursements.reduce((acc, r) => acc + (Number(r.montant) || 0), 0)
  }, [remboursements])

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
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 shadow-xs cursor-pointer"
          title="Voir la fiche complète du client"
        >
          <Tag className="w-3 h-3 text-primary" />
          <span>{displayCode}</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-surface-border bg-background/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-foreground font-heading">{client.nom}</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-0.5 text-xs font-mono font-semibold border border-primary/30">
                      {displayCode}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-secondary/10 text-secondary px-2 py-0.5 text-xs font-medium border border-secondary/20">
                      Client externe
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-foreground-muted mt-1">
                    {client.telephone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-foreground-muted" />
                        {client.telephone}
                      </span>
                    ) : (
                      <span>Aucun téléphone renseigné</span>
                    )}
                    <span>•</span>
                    <span>{gieName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 text-foreground-muted hover:text-foreground hover:bg-background/80 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Financial Summary Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-background/30 border-b border-surface-border">
              <div className="rounded-xl border border-surface-border bg-surface p-3.5">
                <div className="text-xs font-medium text-foreground-muted flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-foreground-muted" />
                  <span>Total Facturé ({factures.length} fact.)</span>
                </div>
                <div className="mt-1 text-lg font-bold text-foreground font-mono">
                  {totalFacture.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                </div>
              </div>

              <div className="rounded-xl border border-surface-border bg-surface p-3.5">
                <div className="text-xs font-medium text-foreground-muted flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-success" />
                  <span>Total Encaissé / Payé</span>
                </div>
                <div className="mt-1 text-lg font-bold text-success font-mono">
                  {totalPaye.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                </div>
              </div>

              <div className={`rounded-xl border p-3.5 ${
                soldeActuel > 0
                  ? 'border-danger/30 bg-danger/5 text-danger'
                  : soldeActuel < 0
                  ? 'border-primary/30 bg-primary/5 text-primary'
                  : 'border-success/30 bg-success/5 text-success'
              }`}>
                <div className="text-xs font-medium flex items-center gap-1.5">
                  {soldeActuel > 0 ? (
                    <TrendingDown className="w-3.5 h-3.5 text-danger" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  )}
                  <span>{soldeActuel > 0 ? 'Reste Dû (À recouvrer)' : soldeActuel < 0 ? 'Solde Créditeur' : 'Solde Régularisé'}</span>
                </div>
                <div className="mt-1 text-lg font-bold font-mono">
                  {Math.abs(soldeActuel).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                </div>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center justify-between px-5 pt-3 border-b border-surface-border bg-surface">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('factures')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'factures'
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Factures ({factures.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('remboursements')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'remboursements'
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Remboursements & Paiements ({remboursements.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('releve')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'releve'
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Relevé de Compte</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 pb-2">
                <AddPaiementClientModal clientId={client.id} onSuccess={fetchClientDetails} dict={dict} />
                <PrintSectionButton sectionId={`fiche-client-releve-${client.id}`} label="Imprimer relevé" />
              </div>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading && (
                <div className="py-12 text-center text-foreground-muted animate-pulse">
                  Chargement des données du client...
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger flex items-center gap-2">
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
                        <div className="text-center py-12 text-foreground-muted bg-background/40 rounded-xl border border-surface-border">
                          Aucune facture enregistrée pour ce client.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface shadow-xs">
                          <table className="min-w-full divide-y divide-surface-border text-left">
                            <thead className="bg-background/80 text-xs text-foreground-muted font-semibold uppercase">
                              <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Désignation</th>
                                <th className="px-4 py-3 text-right">Quantité</th>
                                <th className="px-4 py-3 text-right">Montant</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border text-sm">
                              {factures.map((f, idx) => (
                                <tr key={f.id || idx} className="hover:bg-background/40 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap text-foreground font-mono text-xs">
                                    {new Date(f.date).toLocaleDateString(dateLocale)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                      f.docType === 'prestation'
                                        ? 'bg-secondary/15 text-secondary border border-secondary/20'
                                        : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                    }`}>
                                      {f.docType === 'prestation' ? 'Prestation' : 'Vente stock'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-foreground font-medium">
                                    {f.designation}
                                  </td>
                                  <td className="px-4 py-3 text-right text-foreground-muted whitespace-nowrap font-mono">
                                    {f.quantite ? `${Number(f.quantite).toLocaleString(dateLocale)} ${f.unite || ''}` : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-foreground whitespace-nowrap font-mono">
                                    {Number(f.total).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                  </td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">
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
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: REMBOURSEMENTS & PAIEMENTS */}
                  {activeTab === 'remboursements' && (
                    <div className="space-y-4">
                      {remboursements.length === 0 ? (
                        <div className="text-center py-12 text-foreground-muted bg-background/40 rounded-xl border border-surface-border">
                          Aucun remboursement ou paiement enregistré pour ce client.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface shadow-xs">
                          <table className="min-w-full divide-y divide-surface-border text-left">
                            <thead className="bg-background/80 text-xs text-foreground-muted font-semibold uppercase">
                              <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Mode</th>
                                <th className="px-4 py-3">Détails / Motif</th>
                                <th className="px-4 py-3 text-right">Montant Réglé</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border text-sm">
                              {remboursements.map((r, idx) => (
                                <tr key={r.id || idx} className="hover:bg-background/40 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap text-foreground font-mono text-xs">
                                    {new Date(r.date).toLocaleDateString(dateLocale)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className="inline-flex items-center rounded-full bg-success/10 text-success px-2 py-0.5 text-xs font-medium border border-success/20">
                                      Paiement reçu
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-foreground">
                                    {r.designation}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-success whitespace-nowrap font-mono">
                                    +{Number(r.montant).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: RELEVE DE COMPTE CHRONOLOGIQUE */}
                  {activeTab === 'releve' && (
                    <div className="space-y-4" id={`fiche-client-releve-${client.id}`}>
                      <div className="hidden print:block p-4 border-b border-surface-border">
                        <h2 className="text-xl font-bold">{gieName}</h2>
                        <h3 className="text-base font-semibold">Relevé de Compte Client - {client.nom} ({displayCode})</h3>
                        <p className="text-xs text-foreground-muted">Édité le {new Date().toLocaleDateString(dateLocale)}</p>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface shadow-xs">
                        <table className="min-w-full divide-y divide-surface-border text-left">
                          <thead className="bg-background/80 text-xs text-foreground-muted font-semibold uppercase">
                            <tr>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Opération</th>
                              <th className="px-4 py-3 text-right">Débit (Facture)</th>
                              <th className="px-4 py-3 text-right">Crédit (Paiement)</th>
                              <th className="px-4 py-3 text-right">Solde Dû</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border text-sm">
                            {journal.map((m, idx) => {
                              const isDebit = m.type === 'vente' || m.type === 'prestation'
                              return (
                                <tr key={m.id || idx} className="hover:bg-background/40 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap text-foreground font-mono text-xs">
                                    {new Date(m.date).toLocaleDateString(dateLocale)}
                                  </td>
                                  <td className="px-4 py-3 text-foreground">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                        isDebit
                                          ? 'bg-danger/10 text-danger border border-danger/20'
                                          : 'bg-success/10 text-success border border-success/20'
                                      }`}>
                                        {isDebit ? 'Facture' : 'Remboursement'}
                                      </span>
                                      <span className="font-medium text-xs">{m.designation}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-danger font-semibold whitespace-nowrap">
                                    {isDebit ? `${Number(m.montant).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} ${unite}` : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-success font-semibold whitespace-nowrap">
                                    {!isDebit ? `${Number(m.montant).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} ${unite}` : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-foreground bg-background/40 whitespace-nowrap">
                                    {Number(m.solde).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                                  </td>
                                </tr>
                              )
                            })}
                            {journal.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-sm text-foreground-muted italic">
                                  Aucun mouvement enregistré pour ce client.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-surface-border bg-background/50">
              <span className="text-xs text-foreground-muted">
                Fiche client dynamique SIGGIE • {factures.length} factures, {remboursements.length} paiements
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium bg-surface hover:bg-background border border-surface-border text-foreground transition-colors"
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
