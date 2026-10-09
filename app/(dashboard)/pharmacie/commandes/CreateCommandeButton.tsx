'use client'

import { useState } from 'react'
import { Truck, X } from 'lucide-react'
import { createCommande } from './actions'

type Fournisseur = { id: string, nom: string }
type Medicament = { id: string, nom: string }

export default function CreateCommandeButton({ fournisseurs, medicaments }: { fournisseurs: Fournisseur[], medicaments: Medicament[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await createCommande(formData)

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
        <Truck className="w-5 h-5" />
        Passer Commande
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md border border-surface-border overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-surface-border">
              <h3 className="text-xl font-bold text-foreground">Nouvelle Commande</h3>
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
                <label className="block text-sm font-medium text-foreground mb-1">Fournisseur / Laboratoire *</label>
                <select name="fournisseur_id" required className="w-full border border-surface-border rounded-lg px-3 py-2 bg-background focus:border-primary focus:ring-1 focus:ring-primary">
                  <option value="">Sélectionner un labo...</option>
                  {fournisseurs.map(f => (
                    <option key={f.id} value={f.id}>{f.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Médicament à commander *</label>
                <select name="medicament_id" required className="w-full border border-surface-border rounded-lg px-3 py-2 bg-background focus:border-primary focus:ring-1 focus:ring-primary">
                  <option value="">Sélectionner un produit...</option>
                  {medicaments.map(m => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Quantité *</label>
                <input required type="number" step="1" min="1" name="quantite" className="w-full border border-surface-border rounded-lg px-3 py-2 bg-background focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-foreground-muted hover:text-foreground font-medium">
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50">
                  {isSubmitting ? 'Envoi...' : 'Envoyer la commande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
