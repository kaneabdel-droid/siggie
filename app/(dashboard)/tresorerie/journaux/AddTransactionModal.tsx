'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addTransaction } from '../actions'

export default function AddTransactionModal({ 
  compteId, 
  onSuccess 
}: { 
  compteId: string, 
  onSuccess: () => void 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const type_transaction = formData.get('type_transaction') as string
    const montant = Number(formData.get('montant'))
    const motif = formData.get('motif') as string
    const type_piece = formData.get('type_piece') as string

    const res = await addTransaction({
      compte_id: compteId,
      type_transaction,
      montant,
      motif,
      type_piece
    })
    
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsOpen(false)
      onSuccess()
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-x-2 rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/90"
      >
        <Plus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
        Saisir une opération
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  Saisir une nouvelle opération
                </h3>
                <form id="add-tx-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="type_transaction" className="block text-sm font-medium text-foreground">Type d'opération</label>
                    <select
                      name="type_transaction"
                      id="type_transaction"
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="entree">Entrée d'argent (+)</option>
                      <option value="sortie">Sortie d'argent (-)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="type_piece" className="block text-sm font-medium text-foreground">Type de pièce (Optionnel)</label>
                    <select
                      name="type_piece"
                      id="type_piece"
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="">-- Aucun --</option>
                      <option value="facture_fournisseur">Paiement Facture Fournisseur</option>
                      <option value="retrait_espece">Retrait en espèces</option>
                      <option value="versement">Versement</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="montant" className="block text-sm font-medium text-foreground">Montant (FCFA)</label>
                    <input
                      type="number"
                      name="montant"
                      id="montant"
                      required
                      min={1}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="motif" className="block text-sm font-medium text-foreground">Motif (Description)</label>
                    <input
                      type="text"
                      name="motif"
                      id="motif"
                      required
                      placeholder="Ex: Achat Urée Fournisseur X"
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form="add-tx-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
