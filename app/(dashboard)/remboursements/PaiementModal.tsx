'use client'

import { useState, useEffect } from 'react'
import { enregistrerRemboursement } from './actions'

type PaiementModalProps = {
  facture: any
  type: 'espece' | 'nature'
  onClose: () => void
}

export default function PaiementModal({ facture, type, onClose }: PaiementModalProps) {
  const [loading, setLoading] = useState(false)
  const [quantiteNature, setQuantiteNature] = useState<number | ''>('')
  const [produitNature, setProduitNature] = useState<string>('')
  const [montantSaisi, setMontantSaisi] = useState<number | ''>('')
  
  const resteAPayer = facture.montant_total - (facture.montant_paye || 0)
  const prixCollecte = facture.campagne?.prix_collecte || 0

  // Calculate equivalent in FCFA when typing nature quantity
  const equivalentFcfa = type === 'nature' && quantiteNature ? (quantiteNature as number) * prixCollecte : 0

  // Set default max amount for espece
  useEffect(() => {
    if (type === 'espece') {
      setMontantSaisi(resteAPayer)
    }
    if (type === 'nature') {
      setProduitNature(facture.campagne?.produit_collecte || '')
    }
  }, [type, resteAPayer, facture])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    let montantFcfa = 0
    let qte = null

    if (type === 'espece') {
      montantFcfa = Number(montantSaisi)
    } else {
      qte = Number(quantiteNature)
      montantFcfa = qte * prixCollecte
      if (!produitNature.trim()) {
        alert("Veuillez préciser la nature du produit reçu (ex: Riz paddy, Tomate, Arachide...).")
        setLoading(false)
        return
      }
    }

    if (montantFcfa <= 0) {
      alert("Le montant doit être supérieur à 0")
      setLoading(false)
      return
    }

    const res = await enregistrerRemboursement(
      facture.id,
      facture.membre.id,
      type,
      montantFcfa,
      qte,
      type === 'nature' ? produitNature : undefined
    )

    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
          <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
              Enregistrer un paiement {type === 'espece' ? 'en numéraire' : 'en nature'}
            </h3>
            
            <div className={`mb-4 p-3 rounded-md text-sm border ${resteAPayer < 0 ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-danger/10 border-danger/20 text-danger'}`}>
              <span className="font-semibold">{resteAPayer < 0 ? 'Surplus de remboursement :' : 'Reste à payer :'}</span> {Math.abs(resteAPayer).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
            </div>

            <form id="paiement-form" onSubmit={handleSubmit} className="space-y-4">
              {type === 'espece' ? (
                <div>
                  <label className="block text-sm font-medium text-foreground">Montant versé (FCFA)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={resteAPayer}
                    value={montantSaisi}
                    onChange={(e) => setMontantSaisi(Number(e.target.value) || '')}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-foreground-muted">Le montant sera crédité à la Trésorerie.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Nature du produit reçu
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Riz paddy, Tomate, Arachide..."
                      value={produitNature}
                      onChange={(e) => setProduitNature(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mt-2">
                      Poids ou quantité récupérée 
                      <span className="text-foreground-muted font-normal ml-2">
                        (Base de calcul : {prixCollecte} FCFA/unité)
                      </span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={quantiteNature}
                      onChange={(e) => setQuantiteNature(Number(e.target.value) || '')}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-md mt-4">
                    <div className="text-sm text-primary font-medium">Équivalent financier déduit de la facture :</div>
                    <div className="text-xl font-bold text-primary mt-1">{equivalentFcfa.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA</div>
                  </div>
                </>
              )}
            </form>
          </div>
          <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="submit"
              form="paiement-form"
              disabled={loading || (type === 'espece' && !montantSaisi) || (type === 'nature' && (!quantiteNature || !produitNature.trim()))}
              className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:ml-3 sm:w-auto disabled:opacity-50"
            >
              {loading ? 'Validation...' : 'Valider le paiement'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
