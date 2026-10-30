'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addFournisseur } from './actions'

export default function AddFournisseurModal({
  onCreated,
  dict,
}: {
  onCreated: (fournisseur: any) => void
  dict: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [adresse, setAdresse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const t = dict?.bilans_pages?.releve_fournisseur || {}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim()) {
      setError("Le nom du fournisseur est obligatoire.")
      return
    }

    setLoading(true)
    setError('')

    const res = await addFournisseur(nom, telephone, adresse)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else if (res?.fournisseur) {
      onCreated(res.fournisseur)
      setIsOpen(false)
      setNom('')
      setTelephone('')
      setAdresse('')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>{t.add_fournisseur || "Nouveau Fournisseur"}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl bg-surface border border-surface-border p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
            <h3 className="text-lg font-bold text-foreground">
              {t.new_fournisseur_form?.title || "Créer un nouveau fournisseur"}
            </h3>
            <p className="mt-1 text-xs text-foreground-muted">
              Ajoutez un fournisseur d&apos;intrants, d&apos;équipements ou de services pour suivre ses factures et règlements.
            </p>

            {error && (
              <div className="mt-3 p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nom du fournisseur / Entreprise *
                </label>
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: SENCHIM, Sahel Agro, Total Énergie..."
                  className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Téléphone (Optionnel)
                </label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Ex: 77 123 45 67"
                  className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Adresse / Localité (Optionnel)
                </label>
                <input
                  type="text"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="Ex: Dakar, Saint-Louis, Richard-Toll..."
                  className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="rounded-md border border-surface-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-background transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {loading ? "Création..." : "Enregistrer le fournisseur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
