'use client'

import { useState } from 'react'
import { Plus, Search, ReceiptText, Printer } from 'lucide-react'
import DownloadPdfButton from './DownloadPdfButton'

import GenererFacturesModal from './GenererFacturesModal'

export default function FacturationClient({ factures }: { factures: any[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredFactures = factures.filter(f => 
    f.membre?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.membre?.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold font-heading text-foreground">Facturation</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Générez, consultez et imprimez les factures de la campagne pour chaque membre.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 flex gap-3 sm:flex-none">
          <GenererFacturesModal />
        </div>
      </div>

      <div className="mt-8 flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-foreground-muted" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-2 pl-10 pr-3 bg-surface text-foreground ring-1 ring-inset ring-surface-border placeholder:text-foreground-muted focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 shadow-sm"
            placeholder="Rechercher une facture (Nom du membre, NÂ°)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">NÂ° / Membre</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">Campagne</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">Total Dû</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">Montant Payé</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">Reste à  Payer</th>
                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-foreground">Statut</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {filteredFactures.map((facture) => {
                    const resteAPayer = facture.montant_total - (facture.montant_paye || 0)
                    
                    return (
                      <tr key={facture.id} className="hover:bg-background/50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                          <div className="flex items-center gap-3">
                            <div className="rounded-md bg-primary/10 p-2">
                              <ReceiptText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{facture.membre?.prenom} {facture.membre?.nom}</div>
                              <div className="text-xs text-foreground-muted">{facture.id.substring(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-foreground-muted">
                          {facture.campagne?.nom}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-foreground">
                          {facture.montant_total?.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-success">
                          {facture.montant_paye?.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-danger">
                          {resteAPayer > 0 ? resteAPayer.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA' : '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-center text-sm">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            facture.statut === 'impayee' ? 'bg-danger/10 text-danger ring-danger/20' : 
                            facture.statut === 'payee' ? 'bg-success/10 text-success ring-success/20' :
                            'bg-secondary/10 text-secondary ring-secondary/20'
                          }`}>
                            {facture.statut === 'impayee' ? 'Impayée' : 
                             facture.statut === 'payee' ? 'Payée' : 'Partiel'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex justify-end gap-2">
                            <DownloadPdfButton facture={facture} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  
                  {filteredFactures.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
                        Aucune facture trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
