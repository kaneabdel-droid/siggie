'use client'

import { useState, useEffect } from 'react'
import { enregistrerRemboursement } from './actions'
import { useUnite } from '@/components/DeviseProvider'

type PaiementModalProps = {
  facture: any
  type: 'espece' | 'nature' | 'bon' | 'cheque'
  onClose: () => void
  dict: any
  locale?: string
  comptes: { id: string; nom: string }[]
}

export default function PaiementModal({ facture, type, onClose, dict, locale, comptes }: PaiementModalProps) {
  const unite = useUnite()
  const [loading, setLoading] = useState(false)
  const [quantiteNature, setQuantiteNature] = useState<number | ''>('')
  const [produitNature, setProduitNature] = useState<string>('')
  const [montantSaisi, setMontantSaisi] = useState<number | ''>('')
  const [referencePiece, setReferencePiece] = useState<string>('')
  const [compteId, setCompteId] = useState<string>(comptes[0]?.id ?? '')
  const d = dict?.remboursements_extra?.modal || {}
  const localeCode = locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-US' : 'fr-FR'

  const resteAPayer = facture.montant_total + (facture.montant_interet || 0) - (facture.montant_paye || 0)
  const prixCollecte = facture.campagne?.prix_collecte || 0

  // Calculate equivalent in FCFA when typing nature quantity
  const equivalentFcfa = type === 'nature' && quantiteNature ? (quantiteNature as number) * prixCollecte : 0

  // Set default max amount for espece, cheque, bon
  useEffect(() => {
    if (type === 'espece' || type === 'cheque' || type === 'bon') {
      setMontantSaisi(resteAPayer > 0 ? resteAPayer : 0)
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

    if (type === 'espece' || type === 'cheque' || type === 'bon') {
      montantFcfa = Number(montantSaisi)
      if (type === 'cheque' && !referencePiece.trim()) {
        alert("Veuillez renseigner le numéro de chèque ou la référence bancaire.")
        setLoading(false)
        return
      }
      if (type === 'bon' && !referencePiece.trim()) {
        alert("Veuillez renseigner le numéro ou la référence du bon.")
        setLoading(false)
        return
      }
    } else {
      qte = Number(quantiteNature)
      montantFcfa = qte * prixCollecte
      if (!produitNature.trim()) {
        alert(d.missing_product_error || "Veuillez préciser la nature du produit reçu.")
        setLoading(false)
        return
      }
    }

    if (montantFcfa <= 0) {
      alert(d.invalid_amount_error || "Le montant doit être supérieur à 0")
      setLoading(false)
      return
    }

    const res = await enregistrerRemboursement(
      facture.id,
      facture.membre.id,
      type,
      montantFcfa,
      type === 'nature' ? qte : null,
      type === 'nature' ? produitNature : null,
      (type === 'espece' || type === 'cheque' || (type === 'bon' && compteId)) ? compteId : null,
      (type === 'cheque' || type === 'bon') ? referencePiece.trim() : null
    )

    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      onClose()
    }
  }

  const modalTitle = 
    type === 'espece' ? (d.title_cash || "Enregistrer un paiement en espèces") :
    type === 'cheque' ? "Enregistrer un paiement par chèque / banque" :
    type === 'bon' ? "Enregistrer un paiement par bon / compensation" :
    (d.title_nature || "Enregistrer un paiement en nature")

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
          <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
              {modalTitle}
            </h3>

            <div className={`mb-4 p-3 rounded-md text-sm border ${resteAPayer < 0 ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-danger/10 border-danger/20 text-danger'}`}>
              <span className="font-semibold">{resteAPayer < 0 ? (d.surplus_label || 'Surplus :') : (d.remaining_label || 'Reste à payer :')}</span> {Math.abs(resteAPayer).toLocaleString(localeCode, { maximumFractionDigits: 0 })}{unite}
            </div>

            <form id="paiement-form" onSubmit={handleSubmit} className="space-y-4">
              {type === 'espece' && (
                <div>
                  <label className="block text-sm font-medium text-foreground">{d.amount_paid || 'Montant versé (FCFA)'}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={resteAPayer > 0 ? resteAPayer : undefined}
                    value={montantSaisi}
                    onChange={(e) => setMontantSaisi(Number(e.target.value) || '')}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-foreground-muted">{d.amount_paid_note || 'Le montant sera crédité à la Caisse.'}</p>
                  <label className="mt-4 block text-sm font-medium text-foreground">{d.account || 'Compte de caisse à créditer'}</label>
                  <select
                    required
                    value={compteId}
                    onChange={(e) => setCompteId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {comptes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                  {comptes.length === 0 && <p className="mt-1 text-xs text-danger">{d.no_account || 'Aucun compte disponible.'}</p>}
                </div>
              )}

              {type === 'cheque' && (
                <div>
                  <label className="block text-sm font-medium text-foreground">Montant du chèque / virement (FCFA)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={resteAPayer > 0 ? resteAPayer : undefined}
                    value={montantSaisi}
                    onChange={(e) => setMontantSaisi(Number(e.target.value) || '')}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  
                  <label className="mt-3 block text-sm font-medium text-foreground">N° de chèque ou Référence bancaire *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CHQ-9823412 ou VIR-BHS-2026-01"
                    value={referencePiece}
                    onChange={(e) => setReferencePiece(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />

                  <label className="mt-3 block text-sm font-medium text-foreground">Compte bancaire de dépôt *</label>
                  <select
                    required
                    value={compteId}
                    onChange={(e) => setCompteId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {comptes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                  {comptes.length === 0 && <p className="mt-1 text-xs text-danger">Aucun compte bancaire configuré dans la trésorerie.</p>}
                </div>
              )}

              {type === 'bon' && (
                <div>
                  <label className="block text-sm font-medium text-foreground">Montant imputé par bon (FCFA)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={resteAPayer > 0 ? resteAPayer : undefined}
                    value={montantSaisi}
                    onChange={(e) => setMontantSaisi(Number(e.target.value) || '')}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />

                  <label className="mt-3 block text-sm font-medium text-foreground">N° / Référence du bon *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: BON-LIV-0045, Bon SAED, Quittance..."
                    value={referencePiece}
                    onChange={(e) => setReferencePiece(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />

                  <label className="mt-3 block text-sm font-medium text-foreground">Compte de contrepartie (optionnel)</label>
                  <select
                    value={compteId}
                    onChange={(e) => setCompteId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Aucun compte (compensation directe / créance déduite)</option>
                    {comptes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-foreground-muted">Si un compte est sélectionné, une entrée de trésorerie sera générée avec la référence du bon.</p>
                </div>
              )}

              {type === 'nature' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      {d.nature_product || 'Nature du produit reçu'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={d.nature_product_placeholder || 'Ex: Riz paddy, Arachide...'}
                      value={produitNature}
                      onChange={(e) => setProduitNature(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mt-2">
                      {d.weight_label || 'Poids ou quantité récupérée'}
                      <span className="text-foreground-muted font-normal ml-2">
                        ({d.calc_base || 'Base :'} {prixCollecte} {d.per_unit_suffix || 'FCFA/kg'})
                      </span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={quantiteNature}
                      onChange={(e) => setQuantiteNature(Number(e.target.value) || '')}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-md mt-4">
                    <div className="text-sm text-primary font-medium">{d.equivalent_label || 'Équivalent financier déduit :'}</div>
                    <div className="text-xl font-bold text-primary mt-1">{equivalentFcfa.toLocaleString(localeCode, { maximumFractionDigits: 0 })}{unite}</div>
                  </div>
                </>
              )}
            </form>
          </div>
          <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="submit"
              form="paiement-form"
              disabled={
                loading || 
                (type === 'espece' && (!montantSaisi || !compteId)) ||
                (type === 'cheque' && (!montantSaisi || !compteId || !referencePiece.trim())) ||
                (type === 'bon' && (!montantSaisi || !referencePiece.trim())) ||
                (type === 'nature' && (!quantiteNature || !produitNature.trim()))
              }
              className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:ml-3 sm:w-auto disabled:opacity-50"
            >
              {loading ? (d.validating || "Validation...") : (d.validate_submit || "Valider le paiement")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
            >
              {dict?.common?.cancel || "Annuler"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
