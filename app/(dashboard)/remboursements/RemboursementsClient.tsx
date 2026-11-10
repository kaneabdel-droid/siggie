'use client'

import { useState } from 'react'
import { Search, Wallet, Scale, CreditCard, FileCheck, MoreHorizontal, Coins, CheckCircle2, AlertCircle } from 'lucide-react'
import PaiementModal from './PaiementModal'
import { useUnite } from '@/components/DeviseProvider'
import FactureWhatsAppModal from '@/app/(dashboard)/facturation/FactureWhatsAppModal'
import DownloadPdfButton from '@/app/(dashboard)/facturation/DownloadPdfButton'
import FicheClientModal from '@/components/FicheClientModal'

export default function RemboursementsClient({
  factures,
  comptes,
  dict,
  locale,
  gieName = 'Mon GIE'
}: {
  factures: any[],
  comptes: { id: string; nom: string }[],
  dict: any,
  locale: string,
  gieName?: string
}) {
  const unite = useUnite()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState<'a_recouvrer' | 'surplus' | 'all'>('a_recouvrer')
  const [selectedFactureId, setSelectedFactureId] = useState<string | null>(null)
  const [paiementType, setPaiementType] = useState<'espece' | 'nature' | 'bon' | 'cheque' | 'autre' | null>(null)

  const selectedFacture = factures.find((f) => f.id === selectedFactureId) || null

  const filteredFactures = factures.filter((f) => {
    const reste = Number(f.montant_total || 0) + Number(f.montant_interet || 0) - Number(f.montant_paye || 0)
    if (filterMode === 'a_recouvrer' && f.statut !== 'impayee' && f.statut !== 'partiellement_paye' && reste <= 0) {
      return false
    }
    if (filterMode === 'surplus' && reste >= 0) {
      return false
    }

    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      f.membre?.nom?.toLowerCase().includes(term) ||
      f.membre?.prenom?.toLowerCase().includes(term) ||
      f.membre?.code_membre?.toLowerCase().includes(term) ||
      f.client_nom?.toLowerCase().includes(term) ||
      f.client?.nom?.toLowerCase().includes(term) ||
      f.client?.code_client?.toLowerCase().includes(term) ||
      f.designation?.toLowerCase().includes(term) ||
      f.campagne?.nom?.toLowerCase().includes(term) ||
      f.id.toLowerCase().includes(term)
    )
  })

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Colonne de gauche: Liste des factures */}
        <div className="md:col-span-1 bg-surface border border-surface-border rounded-lg shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-surface-border space-y-3">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-foreground-muted" aria-hidden="true" />
              </div>
              <input
                type="text"
                className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 bg-background text-foreground ring-1 ring-inset ring-surface-border placeholder:text-foreground-muted focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 shadow-sm"
                placeholder={dict.remboursements.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-1 bg-background p-1 rounded-md border border-surface-border text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('a_recouvrer')}
                className={`py-1 px-2 rounded font-medium transition-colors ${filterMode === 'a_recouvrer' ? 'bg-primary text-white shadow-xs' : 'text-foreground-muted hover:text-foreground'
                  }`}
              >
                À recouvrer
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('surplus')}
                className={`py-1 px-2 rounded font-medium transition-colors ${filterMode === 'surplus' ? 'bg-primary text-white shadow-xs' : 'text-foreground-muted hover:text-foreground'
                  }`}
              >
                Surplus
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`py-1 px-2 rounded font-medium transition-colors ${filterMode === 'all' ? 'bg-primary text-white shadow-xs' : 'text-foreground-muted hover:text-foreground'
                  }`}
              >
                Toutes
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredFactures.map((facture) => {
              const isSelected = selectedFacture?.id === facture.id
              const reste = Number(facture.montant_total || 0) + Number(facture.montant_interet || 0) - Number(facture.montant_paye || 0)
              const isMembre = facture.tiers_type !== 'client'
              const nomAffiche = isMembre
                ? `${facture.membre?.prenom || ''} ${facture.membre?.nom || ''}`.trim()
                : facture.client_nom || facture.client?.nom || 'Client externe'

              return (
                <button
                  key={facture.id}
                  onClick={() => setSelectedFactureId(facture.id)}
                  className={`w-full text-left p-3 mb-2 rounded-md transition-colors ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-background border border-transparent'
                    }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">
                        {nomAffiche}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.2 text-[10px] font-medium ${facture.type_document === 'prestation'
                            ? 'bg-secondary/15 text-secondary'
                            : facture.type_document === 'vente_stock'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-primary/10 text-primary'
                          }`}>
                          {facture.type_document === 'prestation' ? 'Prestation' : facture.type_document === 'vente_stock' ? 'Vente stock' : 'Campagne'}
                        </span>
                        {!isMembre && (
                          <span className="text-[10px] text-foreground-muted font-mono">
                            {facture.client?.code_client || 'CLI'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-foreground-muted shrink-0 text-right">
                      {facture.campagne?.nom || ''}
                    </div>
                  </div>
                  <div className="mt-2 text-xs flex items-center justify-between text-foreground-muted border-t border-surface-border/50 pt-1.5">
                    <span>Dû: <strong className="text-foreground">{(Number(facture.montant_total || 0) + Number(facture.montant_interet || 0)).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}{unite}</strong></span>
                    <span>Payé: <strong className="text-success">{Number(facture.montant_paye || 0).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}{unite}</strong></span>
                  </div>
                  <div className={`mt-1 text-sm font-semibold flex items-center justify-between ${reste < 0 ? 'text-primary' : reste === 0 ? 'text-success' : 'text-danger'}`}>
                    <span>{reste < 0 ? dict.remboursements.list.surplus : dict.remboursements.list.reste}</span>
                    <span>{Math.abs(reste).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}{unite}</span>
                  </div>
                </button>
              )
            })}

            {filteredFactures.length === 0 && (
              <div className="p-4 text-center text-sm text-foreground-muted italic">
                {dict.remboursements.list.empty}
              </div>
            )}
          </div>
        </div>

        {/* Colonne de droite: Détails et actions */}
        <div className="md:col-span-2">
          {selectedFacture ? (
            <div className="bg-surface border border-surface-border rounded-lg shadow-sm p-6 h-full">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-foreground break-words">
                      {dict.remboursements.details.title} {selectedFacture.tiers_type === 'client' ? (selectedFacture.client_nom || selectedFacture.client?.nom || 'Client externe') : `${selectedFacture.membre?.prenom || ''} ${selectedFacture.membre?.nom || ''}`}
                    </h3>
                    {selectedFacture.tiers_type === 'client' && (
                      <FicheClientModal
                        client={selectedFacture.client || {
                          id: selectedFacture.client_id || '',
                          nom: selectedFacture.client_nom || 'Client',
                          code_client: selectedFacture.client?.code_client || 'CLI'
                        }}
                        gieName={gieName}
                        dict={dict}
                        locale={locale}
                      />
                    )}
                  </div>
                  <div className="text-xs text-foreground-muted mt-1">
                    {selectedFacture.designation}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FactureWhatsAppModal
                    facture={selectedFacture}
                    gieName={gieName}
                    dict={dict}
                    buttonVariant="button"
                  />
                  <DownloadPdfButton facture={selectedFacture} dict={dict} gieName={gieName} />
                </div>
              </div>

              {(() => {
                const totalDu = Number(selectedFacture.montant_total || 0) + Number(selectedFacture.montant_interet || 0)
                const montantPaye = Number(selectedFacture.montant_paye || 0)
                const reste = totalDu - montantPaye
                const tauxPaye = totalDu > 0 ? Math.min(100, Math.round((montantPaye / totalDu) * 100)) : 100

                const parMode = selectedFacture.remboursements_par_mode || {
                  nature: { montant: 0, quantite: 0, unite: 'kg' },
                  espece: { montant: 0 },
                  bon: { montant: 0 },
                  cheque: { montant: 0 },
                  autre: { montant: 0 },
                  total: montantPaye,
                }

                const paiementsDetails: any[] = selectedFacture.paiements_details || []

                return (
                  <>
                    {/* 3 Cartes KPI Principales : Montant Dû | Montant Remboursé | Reste à Payer */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      {/* 1. Montant Dû */}
                      <div className="bg-background rounded-xl p-4 border border-surface-border shadow-xs">
                        <div className="text-xs font-semibold uppercase tracking-wider text-foreground-muted flex items-center justify-between">
                          <span>Montant Dû</span>
                          <span className="p-1.5 rounded-lg bg-foreground/5 text-foreground-muted">
                            <Coins className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="text-2xl font-black text-foreground mt-2 tracking-tight">
                          {totalDu.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} {unite}
                        </div>
                        {selectedFacture.montant_interet > 0 ? (
                          <div className="text-xs text-foreground-muted mt-1">
                            Principal: {Number(selectedFacture.montant_total).toLocaleString()} + Intérêts: {Number(selectedFacture.montant_interet).toLocaleString()} {unite}
                          </div>
                        ) : (
                          <div className="text-xs text-foreground-muted mt-1">
                            Montant total exigible
                          </div>
                        )}
                      </div>

                      {/* 2. Montant Remboursé */}
                      <div className="bg-background rounded-xl p-4 border border-surface-border shadow-xs">
                        <div className="text-xs font-semibold uppercase tracking-wider text-foreground-muted flex items-center justify-between">
                          <span>Montant Remboursé</span>
                          <span className="p-1.5 rounded-lg bg-success/10 text-success">
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="text-2xl font-black text-success mt-2 tracking-tight">
                          {montantPaye.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} {unite}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 bg-surface-border/50 h-2 rounded-full overflow-hidden">
                            <div className="bg-success h-full transition-all duration-300 rounded-full" style={{ width: `${tauxPaye}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-success shrink-0">{tauxPaye}% payé</span>
                        </div>
                      </div>

                      {/* 3. Reste à Payer / Surplus */}
                      <div className="bg-background rounded-xl p-4 border border-surface-border shadow-xs">
                        <div className="text-xs font-semibold uppercase tracking-wider text-foreground-muted flex items-center justify-between">
                          <span>{reste < 0 ? 'Surplus (Trop-perçu)' : 'Reste à Payer'}</span>
                          <span className={`p-1.5 rounded-lg ${reste < 0 ? 'bg-primary/10 text-primary' : reste === 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                            {reste === 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                          </span>
                        </div>
                        <div className={`text-2xl font-black mt-2 tracking-tight ${reste < 0 ? 'text-primary' : reste === 0 ? 'text-success' : 'text-danger'}`}>
                          {Math.abs(reste).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} {unite}
                        </div>
                        <div className={`text-xs font-medium mt-1 ${reste < 0 ? 'text-primary' : reste === 0 ? 'text-success' : 'text-danger'}`}>
                          {reste < 0 ? 'Crédit en faveur du client/membre' : reste === 0 ? 'Créance entièrement soldée' : 'Montant restant à recouvrer'}
                        </div>
                      </div>
                    </div>

                    {/* Section détaillée : Montant remboursé selon le mode */}
                    <div className="mb-6 p-4 rounded-xl bg-background border border-surface-border shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-surface-border">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <Scale className="h-4 w-4" />
                          </span>
                          <div>
                            <h4 className="font-bold text-foreground text-sm">
                              Montant remboursé selon le mode
                            </h4>
                            <p className="text-[11px] text-foreground-muted">
                              Ventilation des versements enregistrés pour ce dossier
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20">
                          Total réglé : {montantPaye.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} {unite}
                        </span>
                      </div>

                      {/* Grille des 4 modes de remboursement */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                        {/* 1. En Nature */}
                        <div className={`p-3 rounded-lg border ${parMode.nature.montant > 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-surface-border bg-surface/50 opacity-70'}`}>
                          <div className="flex items-center justify-between text-xs text-foreground-muted mb-1">
                            <span className="flex items-center gap-1 font-medium">🌾 En Nature</span>
                          </div>
                          <div className="text-base font-bold text-foreground">
                            {parMode.nature.montant.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-foreground-muted">{unite}</span>
                          </div>
                          {parMode.nature.quantite > 0 ? (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                              {parMode.nature.quantite.toLocaleString()} {parMode.nature.unite || 'kg'} pesé(s)
                            </div>
                          ) : (
                            <div className="text-[11px] text-foreground-muted mt-0.5">
                              Récolte / paddy
                            </div>
                          )}
                        </div>

                        {/* 2. Espèces / Trésorerie */}
                        <div className={`p-3 rounded-lg border ${parMode.espece.montant > 0 ? 'border-primary/30 bg-primary/5' : 'border-surface-border bg-surface/50 opacity-70'}`}>
                          <div className="flex items-center justify-between text-xs text-foreground-muted mb-1">
                            <span className="flex items-center gap-1 font-medium">💵 Espèces</span>
                          </div>
                          <div className="text-base font-bold text-foreground">
                            {parMode.espece.montant.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-foreground-muted">{unite}</span>
                          </div>
                          <div className="text-[11px] text-foreground-muted mt-0.5">
                            Caisse & Mobile Money
                          </div>
                        </div>

                        {/* 3. Par Bon */}
                        <div className={`p-3 rounded-lg border ${parMode.bon.montant > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-surface-border bg-surface/50 opacity-70'}`}>
                          <div className="flex items-center justify-between text-xs text-foreground-muted mb-1">
                            <span className="flex items-center gap-1 font-medium">📝 Par Bon</span>
                          </div>
                          <div className="text-base font-bold text-foreground">
                            {parMode.bon.montant.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-foreground-muted">{unite}</span>
                          </div>
                          <div className="text-[11px] text-foreground-muted mt-0.5">
                            Bon / Traite
                          </div>
                        </div>

                        {/* 4. Chèque / Banque */}
                        <div className={`p-3 rounded-lg border ${parMode.cheque.montant > 0 ? 'border-blue-500/30 bg-blue-500/5' : 'border-surface-border bg-surface/50 opacity-70'}`}>
                          <div className="flex items-center justify-between text-xs text-foreground-muted mb-1">
                            <span className="flex items-center gap-1 font-medium">💳 Chèque / Banque</span>
                          </div>
                          <div className="text-base font-bold text-foreground">
                            {parMode.cheque.montant.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-foreground-muted">{unite}</span>
                          </div>
                          <div className="text-[11px] text-foreground-muted mt-0.5">
                            Chèque / Virement
                          </div>
                        </div>
                      </div>

                      {/* Historique détaillé des versements reçus */}
                      {paiementsDetails.length > 0 ? (
                        <div className="border border-surface-border rounded-lg overflow-hidden">
                          <div className="bg-surface px-3 py-2 text-xs font-semibold text-foreground-muted border-b border-surface-border flex items-center justify-between">
                            <span>Historique des règlements ({paiementsDetails.length})</span>
                          </div>
                          <div className="divide-y divide-surface-border max-h-48 overflow-y-auto">
                            {paiementsDetails.map((p, idx) => (
                              <div key={p.id || idx} className="px-3 py-2 text-xs flex items-center justify-between hover:bg-surface/50 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    p.mode === 'nature' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                                    p.mode === 'bon' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                                    p.mode === 'cheque' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                                    'bg-primary/10 text-primary border border-primary/20'
                                  }`}>
                                    {p.modeLabel}
                                  </span>
                                  <span className="text-foreground-muted font-mono">{p.date || '-'}</span>
                                  <span className="text-foreground truncate max-w-xs">
                                    {p.quantite_nature ? `${Number(p.quantite_nature).toLocaleString()} ${p.unite_nature || 'kg'}${p.produit_nature ? ` de ${p.produit_nature}` : ''}` :
                                     p.reference_piece ? `Réf: ${p.reference_piece}` :
                                     p.compte_nom ? `Compte: ${p.compte_nom}` :
                                     p.motif || 'Règlement'}
                                  </span>
                                </div>
                                <div className="font-bold text-foreground text-right shrink-0">
                                  +{Number(p.montant).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} {unite}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-surface/40 border border-dashed border-surface-border text-center text-xs text-foreground-muted">
                          Aucun versement n&apos;a encore été enregistré pour ce document.
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}

              <div className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-foreground">
                    <span className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Wallet className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-bold text-foreground">Règlements en espèces & mobile money</div>
                      <div className="text-foreground-muted">
                        Les versements d&apos;espèces ou mobile money sont traités directement depuis les comptes de trésorerie (avec affectation automatique en remboursement).
                      </div>
                    </div>
                  </div>
                  <a
                    href="/tresorerie/journaux"
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline whitespace-nowrap text-xs bg-surface px-2.5 py-1.5 rounded-md border border-surface-border shadow-2xs"
                  >
                    Aller en Trésorerie →
                  </a>
                </div>

                <h4 className="font-medium text-foreground">{dict.remboursements.details.record_payment}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => setPaiementType('bon')}
                    className="p-4 rounded-lg border-2 border-dashed border-warning/50 hover:bg-warning/5 hover:border-warning flex flex-col items-center justify-center gap-2 transition-colors text-center"
                  >
                    <FileCheck className="h-7 w-7 text-warning" />
                    <span className="font-semibold text-foreground text-sm">Par Bon</span>
                  </button>
                  <button
                    onClick={() => setPaiementType('nature')}
                    className="p-4 rounded-lg border-2 border-dashed border-primary/50 hover:bg-primary/5 hover:border-primary flex flex-col items-center justify-center gap-2 transition-colors text-center"
                  >
                    <Scale className="h-7 w-7 text-primary" />
                    <span className="font-semibold text-foreground text-sm">{dict.remboursements.details.nature || 'En Nature'}</span>
                  </button>
                  <button
                    onClick={() => setPaiementType('cheque')}
                    className="p-4 rounded-lg border-2 border-dashed border-info/50 hover:bg-info/5 hover:border-info flex flex-col items-center justify-center gap-2 transition-colors text-center"
                  >
                    <CreditCard className="h-7 w-7 text-info" />
                    <span className="font-semibold text-foreground text-sm">Chèque / Banque</span>
                  </button>
                  <button
                    onClick={() => setPaiementType('autre')}
                    className="p-4 rounded-lg border-2 border-dashed border-indigo-500/50 hover:bg-indigo-500/5 hover:border-indigo-500 flex flex-col items-center justify-center gap-2 transition-colors text-center"
                  >
                    <MoreHorizontal className="h-7 w-7 text-indigo-500" />
                    <span className="font-semibold text-foreground text-sm">Autre</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-surface-border rounded-lg bg-surface">
              <span className="text-foreground-muted">{dict.remboursements.details.empty}</span>
            </div>
          )}
        </div>
      </div>

      {paiementType && selectedFacture && (
        <PaiementModal
          facture={selectedFacture}
          type={paiementType}
          onClose={() => {
            setPaiementType(null)
          }}
          dict={dict}
          locale={locale}
          comptes={comptes}
        />
      )}
    </div>
  )
}
