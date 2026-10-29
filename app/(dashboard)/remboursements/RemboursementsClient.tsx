'use client'

import { useState } from 'react'
import { Search, Wallet, Scale, CreditCard, FileCheck, MoreHorizontal } from 'lucide-react'
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
                  <div className={`mt-2 text-sm font-semibold ${reste < 0 ? 'text-primary' : reste === 0 ? 'text-success' : 'text-danger'}`}>
                    {reste < 0 ? dict.remboursements.list.surplus : dict.remboursements.list.reste}
                    {Math.abs(reste).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}{unite}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-background rounded-md p-4 border border-surface-border">
                  <div className="text-sm text-foreground-muted">{dict.remboursements.details.total_due}</div>
                  <div className="text-xl font-bold text-foreground">{(selectedFacture.montant_total + (selectedFacture.montant_interet || 0)).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}{unite}</div>
                </div>
                <div className="bg-background rounded-md p-4 border border-surface-border">
                  {(() => {
                    const r = selectedFacture.montant_total + (selectedFacture.montant_interet || 0) - (selectedFacture.montant_paye || 0);
                    return r < 0 ? (
                      <>
                        <div className="text-sm text-foreground-muted">{dict.remboursements.details.surplus}</div>
                        <div className="text-xl font-bold text-primary">
                          {Math.abs(r).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}{unite}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-foreground-muted">{dict.remboursements.details.remaining}</div>
                        <div className="text-xl font-bold text-danger">
                          {r.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}{unite}
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-foreground">{dict.remboursements.details.record_payment}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <button
                    onClick={() => setPaiementType('espece')}
                    className="p-4 rounded-lg border-2 border-dashed border-secondary/50 hover:bg-secondary/5 hover:border-secondary flex flex-col items-center justify-center gap-2 transition-colors text-center"
                  >
                    <Wallet className="h-7 w-7 text-secondary" />
                    <span className="font-semibold text-foreground text-sm">{dict.remboursements.details.cash || 'Espèces'}</span>
                  </button>
                  <button
                    onClick={() => setPaiementType('cheque')}
                    className="p-4 rounded-lg border-2 border-dashed border-info/50 hover:bg-info/5 hover:border-info flex flex-col items-center justify-center gap-2 transition-colors text-center"
                  >
                    <CreditCard className="h-7 w-7 text-info" />
                    <span className="font-semibold text-foreground text-sm">Chèque / Banque</span>
                  </button>
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
