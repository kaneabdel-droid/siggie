'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { submitVente } from '../pos/actions' // Not needed here, just a typo in thought
import { addStock } from './actions'

export default function CreateStockButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await addStock(formData)

    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else {
      setIsOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm"
      >
        <Plus className="w-5 h-5" />
        Ajouter Stock
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md border border-surface-border overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-surface-border">
              <h3 className="text-xl font-bold text-foreground">Entrée en Stock</h3>
              <button onClick={() => setIsOpen(false)} className="text-foreground-muted hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-danger/10 text-danger p-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nom du Médicament *</label>
                <input required type="text" name="nom" className="w-full border border-surface-border rounded-lg px-3 py-2 bg-background focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Ex: Paracétamol 500mg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Code-barres (Optionnel)</label>
                <input type="text" name="code_barres" className="w-full border border-surface-border rounded-lg px-3 py-2 bg-background focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Scanner ici..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Quantité *</label>
                  <input required type="number" step="1" min="1" name="quantite" className="w-full border border-surface-border rounded-lg px-3 py-2 bg-background focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Prix de Vente (FCFA) *</label>
                  <input required type="number" step="50" min="0" name="prix_vente" className="w-full border border-surface-border rounded-lg px-3 py-2 bg-background focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date de Péremption *</label>
                  <input required type="date" name="date_peremption" className="w-full border border-surface-border rounded-lg px-3 py-2 bg-background focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">N° de Lot (Optionnel)</label>
                  <input type="text" name="lot" className="w-full border border-surface-border rounded-lg px-3 py-2 bg-background focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-foreground-muted hover:text-foreground font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50">
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
