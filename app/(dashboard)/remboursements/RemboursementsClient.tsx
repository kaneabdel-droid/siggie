'use client'

import { useState } from 'react'
import { Search, Wallet, Scale } from 'lucide-react'
import PaiementModal from './PaiementModal'

export default function RemboursementsClient({ factures, dict, locale }: { factures: any[], dict: any, locale: string }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFacture, setSelectedFacture] = useState<any>(null)
  const [paiementType, setPaiementType] = useState<'espece' | 'nature' | null>(null)

  const filteredFactures = factures.filter(f => 
    f.membre?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.membre?.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Colonne de gauche: Liste des factures impayées */}
        <div className="md:col-span-1 bg-surface border border-surface-border rounded-lg shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-surface-border">
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
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {filteredFactures.map((facture) => {
              const isSelected = selectedFacture?.id === facture.id
              const reste = facture.montant_total - (facture.montant_paye || 0)
              
              return (
                <button
                  key={facture.id}
                  onClick={() => setSelectedFacture(facture)}
                  className={`w-full text-left p-3 mb-2 rounded-md transition-colors ${
                    isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-background border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-foreground">
                      {facture.membre?.prenom} {facture.membre?.nom}
                    </div>
                    <div className="text-xs text-foreground-muted">
                      {facture.campagne?.nom}
                    </div>
                  </div>
                  <div className={`mt-2 text-sm font-semibold ${reste < 0 ? 'text-primary' : 'text-danger'}`}>
                    {reste < 0 ? dict.remboursements.list.surplus : dict.remboursements.list.reste}
                    {Math.abs(reste).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} FCFA
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
              <h3 className="text-xl font-bold text-foreground mb-6">
                {dict.remboursements.details.title} {selectedFacture.membre?.prenom} {selectedFacture.membre?.nom}
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-background rounded-md p-4 border border-surface-border">
                  <div className="text-sm text-foreground-muted">{dict.remboursements.details.total_due}</div>
                  <div className="text-xl font-bold text-foreground">{selectedFacture.montant_total.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} FCFA</div>
                </div>
                <div className="bg-background rounded-md p-4 border border-surface-border">
                  {(() => {
                    const r = selectedFacture.montant_total - (selectedFacture.montant_paye || 0);
                    return r < 0 ? (
                      <>
                        <div className="text-sm text-foreground-muted">{dict.remboursements.details.surplus}</div>
                        <div className="text-xl font-bold text-primary">
                          {Math.abs(r).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} FCFA
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-foreground-muted">{dict.remboursements.details.remaining}</div>
                        <div className="text-xl font-bold text-danger">
                          {r.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} FCFA
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-foreground">{dict.remboursements.details.record_payment}</h4>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setPaiementType('espece')}
                    className="flex-1 p-4 rounded-lg border-2 border-dashed border-secondary/50 hover:bg-secondary/5 hover:border-secondary flex flex-col items-center justify-center gap-2 transition-colors"
                  >
                    <Wallet className="h-8 w-8 text-secondary" />
                    <span className="font-semibold text-foreground">{dict.remboursements.details.cash}</span>
                  </button>
                  <button 
                    onClick={() => setPaiementType('nature')}
                    className="flex-1 p-4 rounded-lg border-2 border-dashed border-primary/50 hover:bg-primary/5 hover:border-primary flex flex-col items-center justify-center gap-2 transition-colors"
                  >
                    <Scale className="h-8 w-8 text-primary" />
                    <span className="font-semibold text-foreground">{dict.remboursements.details.nature}</span>
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
            setSelectedFacture(null) // Reset selection to force refresh
          }}
          dict={dict}
          locale={locale}
        />
      )}
    </div>
  )
}
