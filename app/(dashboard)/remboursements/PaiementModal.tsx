'use client'

import { useState, useEffect } from 'react'
import { enregistrerRemboursement } from './actions'
import { useUnite } from '@/components/DeviseProvider'

type PaiementModalProps = {
  facture: any
  type: 'espece' | 'nature' | 'bon' | 'cheque' | 'autre'
  onClose: () => void
  dict: any
  locale?: string
  comptes: { id: string; nom: string }[]
}

export default function PaiementModal({ facture, type, onClose, dict, locale, comptes }: PaiementModalProps) {
  const unite = useUnite()
  const [loading, setLoading] = useState(false)
  const [quantiteNature, setQuantiteNature] = useState<string>('')
  const [produitNature, setProduitNature] = useState<string>('')
  const [variete, setVariete] = useState<string>('')
  const [uniteMesure, setUniteMesure] = useState<'kg' | 'sacs' | 'autre'>('kg')
  const [uniteMesureAutre, setUniteMesureAutre] = useState<string>('')
  const initialOrigine = facture.type_document === 'prestation' ? 'materiel' : facture.type_document === 'vente_stock' ? 'achat' : 'exploitation'
  const [origineStock, setOrigineStock] = useState<'exploitation' | 'materiel' | 'achat'>(initialOrigine)
  const [montantSaisi, setMontantSaisi] = useState<string>('')
  const [referencePiece, setReferencePiece] = useState<string>('')
  const [compteId, setCompteId] = useState<string>(comptes[0]?.id ?? '')
  const d = dict?.remboursements_extra?.modal || {}
  const localeCode = locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-US' : 'fr-FR'

  const resteAPayer = Number(facture.montant_total || 0) + Number(facture.montant_interet || 0) - Number(facture.montant_paye || 0)
  const resteArrondi = Math.max(0, Math.round(resteAPayer))
  const prixParDefaut = Number(facture.campagne?.prix_collecte || 150)
  const [prixUnitaire, setPrixUnitaire] = useState<number>(prixParDefaut > 0 ? prixParDefaut : 150)

  const uniteEffective = uniteMesure === 'autre' ? (uniteMesureAutre.trim() || 'unité') : uniteMesure
  const unitePrixLabel = uniteEffective === 'sacs' ? 'sac' : uniteEffective

  // Calculate equivalent in FCFA when typing nature quantity
  const qteNum = parseFloat(quantiteNature)
  const equivalentFcfa = type === 'nature' && Number.isFinite(qteNum) && qteNum > 0 ? qteNum * prixUnitaire : 0

  // Montant effectif saisi (numéraire ou équivalent nature)
  const montantNum = parseFloat(montantSaisi)
  const montantEffectif =
    type === 'nature'
      ? equivalentFcfa
      : Number.isFinite(montantNum) && montantNum > 0
        ? montantNum
        : 0

  const nouveauReste = resteAPayer - montantEffectif

  // Pre-fill default amount when opening modal for a specific facture/type
  useEffect(() => {
    if (type === 'espece' || type === 'cheque' || type === 'bon' || type === 'autre') {
      setMontantSaisi(resteArrondi > 0 ? String(resteArrondi) : '')
    }
    if (type === 'nature') {
      setProduitNature(facture.campagne?.produit_collecte || 'Riz paddy')
      setQuantiteNature('')
    }
  }, [type, facture.id, resteArrondi, facture.campagne?.produit_collecte])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    let montantFcfa = 0
    let qte: number | null = null

    if (type === 'espece' || type === 'cheque' || type === 'bon' || type === 'autre') {
      montantFcfa = parseFloat(montantSaisi)
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
      qte = parseFloat(quantiteNature)
      montantFcfa = qte * prixUnitaire
      if (!produitNature.trim()) {
        alert(d.missing_product_error || "Veuillez préciser la nature du produit reçu.")
        setLoading(false)
        return
      }
    }

    if (!Number.isFinite(montantFcfa) || montantFcfa <= 0) {
      alert(d.invalid_amount_error || "Le montant doit être supérieur à 0")
      setLoading(false)
      return
    }

    const res = await enregistrerRemboursement(
      facture.id,
      facture.membre?.id || null,
      type,
      montantFcfa,
      type === 'nature' ? qte : null,
      type === 'nature' ? produitNature : null,
      (type === 'espece' || type === 'cheque' || ((type === 'bon' || type === 'autre') && compteId)) ? compteId : null,
      (type === 'cheque' || type === 'bon' || type === 'autre') ? referencePiece.trim() : null,
      {
        clientId: facture.client?.id || facture.client_id || null,
        clientNom: facture.client_nom || facture.client?.nom || null,
        origineStock,
        variete,
        uniteNature: type === 'nature' ? uniteEffective : null,
        prixUnitaireNature: type === 'nature' ? prixUnitaire : null,
        typeDocument: facture.type_document || 'campagne',
        campagneId: facture.campagne_id || facture.campagne?.id || null,
      }
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
          type === 'autre' ? "Enregistrer un autre mode de paiement" :
            (d.title_nature || "Enregistrer un paiement en nature (ajout au stock)")

  const renderAmountInputHeader = (label: string) => (
    <div className="flex items-center justify-between gap-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {resteArrondi > 0 && montantSaisi !== String(resteArrondi) && (
        <button
          type="button"
          onClick={() => setMontantSaisi(String(resteArrondi))}
          className="text-xs text-primary hover:underline font-medium"
        >
          Mettre le reste exact ({resteArrondi.toLocaleString(localeCode)}{unite})
        </button>
      )}
    </div>
  )

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
              <span className="font-semibold">{resteAPayer < 0 ? (d.surplus_label || 'Surplus actuel :') : (d.remaining_label || 'Reste à payer :')}</span> {Math.abs(resteAPayer).toLocaleString(localeCode, { maximumFractionDigits: 0 })}{unite}
            </div>

            <form id="paiement-form" onSubmit={handleSubmit} className="space-y-4">
              {type === 'espece' && (
                <div>
                  {renderAmountInputHeader(d.amount_paid || 'Montant versé (FCFA)')}
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    placeholder="Saisissez le montant versé (partiel, exact ou supérieur)"
                    value={montantSaisi}
                    onChange={(e) => setMontantSaisi(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-foreground-muted">
                    Vous pouvez saisir un montant inférieur (paiement partiel) ou supérieur (surplus / ristourne) au restant à payer.
                  </p>
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
                  {renderAmountInputHeader('Montant du chèque / virement (FCFA)')}
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    placeholder="Saisissez le montant (partiel, exact ou supérieur)"
                    value={montantSaisi}
                    onChange={(e) => setMontantSaisi(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-foreground-muted">
                    Vous pouvez saisir un montant inférieur (paiement partiel) ou supérieur (surplus / ristourne) au restant à payer.
                  </p>

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
                  {renderAmountInputHeader('Montant imputé par bon (FCFA)')}
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    placeholder="Saisissez le montant du bon (partiel, exact ou supérieur)"
                    value={montantSaisi}
                    onChange={(e) => setMontantSaisi(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-foreground-muted">
                    Vous pouvez saisir un montant inférieur (paiement partiel) ou supérieur (surplus / ristourne) au restant à payer.
                  </p>

                  <label className="mt-3 block text-sm font-medium text-foreground">N° / Référence du bon *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: BON-LIV-0045, Bon SAED, Quittance..."
                    value={referencePiece}
                    onChange={(e) => setReferencePiece(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />

                  <label className="mt-3 block text-sm font-medium text-foreground">Compte de destination (optionnel)</label>
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

              {type === 'autre' && (
                <div>
                  {renderAmountInputHeader('Montant réglé (FCFA)')}
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    placeholder="Saisissez le montant réglé"
                    value={montantSaisi}
                    onChange={(e) => setMontantSaisi(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />

                  <label className="mt-3 block text-sm font-medium text-foreground">Mode / Référence du paiement</label>
                  <input
                    type="text"
                    placeholder="Ex: Mobile Money, Wave, Orange Money, Virement, Compensation..."
                    value={referencePiece}
                    onChange={(e) => setReferencePiece(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />

                  <label className="mt-3 block text-sm font-medium text-foreground">Compte de destination à créditer</label>
                  <select
                    value={compteId}
                    onChange={(e) => setCompteId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Aucun compte (régularisation sans mouvement de trésorerie)</option>
                    {comptes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-foreground-muted">
                    Sélectionnez le compte de trésorerie (Caisse, Banque, Mobile Money...) qui reçoit les fonds.
                  </p>
                </div>
              )}

              {type === 'nature' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        {d.nature_product || 'Nature du produit reçu'} *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={d.nature_product_placeholder || 'Ex: Riz paddy, Arachide...'}
                        value={produitNature}
                        onChange={(e) => setProduitNature(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Variété (optionnel)
                      </label>
                      <input
                        type="text"
                        list="modal-varietes-list"
                        placeholder="Ex: Sahel 108, BG 90-2..."
                        value={variete}
                        onChange={(e) => setVariete(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                      <datalist id="modal-varietes-list">
                        <option value="Sahel 108" />
                        <option value="BG 90-2" />
                        <option value="IR 1529" />
                        <option value="Nerica" />
                        <option value="Tox 728-1" />
                        <option value="Wita 9" />
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mt-2">
                      Origine du stock *
                    </label>
                    <select
                      value={origineStock}
                      onChange={(e) => setOrigineStock(e.target.value as any)}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="exploitation">Exploitation (Remboursement membre GIE)</option>
                      <option value="materiel">Matériel (Paiement prestation en nature / part récolte)</option>
                      <option value="achat">Achat (Achat pour revente de paddy / approvisionnement)</option>
                    </select>
                    <p className="mt-1 text-xs text-foreground-muted">
                      Ce stock sera imputé et suivi chronologiquement dans le Stock en Nature.
                    </p>
                  </div>

                  {/* Choix de l'unité de mesure */}
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                      Unité de mesure de la quantité *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setUniteMesure('kg')}
                        className={`py-1.5 px-3 rounded-md text-xs font-semibold border transition-all text-center ${
                          uniteMesure === 'kg'
                            ? 'bg-primary text-white border-primary shadow-xs ring-1 ring-primary'
                            : 'bg-background text-foreground border-surface-border hover:bg-surface'
                        }`}
                      >
                        Kilogrammes (kg)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUniteMesure('sacs')}
                        className={`py-1.5 px-3 rounded-md text-xs font-semibold border transition-all text-center ${
                          uniteMesure === 'sacs'
                            ? 'bg-primary text-white border-primary shadow-xs ring-1 ring-primary'
                            : 'bg-background text-foreground border-surface-border hover:bg-surface'
                        }`}
                      >
                        Sacs
                      </button>
                      <button
                        type="button"
                        onClick={() => setUniteMesure('autre')}
                        className={`py-1.5 px-3 rounded-md text-xs font-semibold border transition-all text-center ${
                          uniteMesure === 'autre'
                            ? 'bg-primary text-white border-primary shadow-xs ring-1 ring-primary'
                            : 'bg-background text-foreground border-surface-border hover:bg-surface'
                        }`}
                      >
                        Autre unité...
                      </button>
                    </div>
                    {uniteMesure === 'autre' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          required
                          value={uniteMesureAutre}
                          onChange={(e) => setUniteMesureAutre(e.target.value)}
                          placeholder="Précisez l'unité (ex: Tonnes, Bottes, Bidons, Caisses...)"
                          className="block w-full rounded-md border border-primary bg-background px-3 py-1.5 text-foreground text-xs focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Quantité reçue ({uniteEffective}) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="any"
                        placeholder={uniteMesure === 'sacs' ? 'Ex: 10' : 'Ex: 500'}
                        value={quantiteNature}
                        onChange={(e) => setQuantiteNature(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        Prix unitaire ({unite.trim() || 'FCFA'}/{unitePrixLabel}) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        step="any"
                        value={prixUnitaire}
                        onChange={(e) => setPrixUnitaire(parseFloat(e.target.value) || 0)}
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-md mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-primary font-medium">{d.equivalent_label || 'Équivalent financier déduit (& ajouté au stock) :'}</div>
                      <div className="text-xl font-bold text-primary mt-0.5">{equivalentFcfa.toLocaleString(localeCode, { maximumFractionDigits: 0 })}{unite}</div>
                    </div>
                    {qteNum > 0 && prixUnitaire > 0 && (
                      <div className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-1 rounded">
                        {qteNum} {uniteEffective} × {prixUnitaire.toLocaleString(localeCode)} {unite.trim() || 'FCFA'}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Aperçu en direct du solde après ce paiement */}
              {montantEffectif > 0 && (
                <div
                  className={`p-3 rounded-md text-xs border ${nouveauReste > 0.5
                      ? 'bg-warning/10 border-warning/30 text-foreground'
                      : nouveauReste < -0.5
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-success/10 border-success/30 text-success'
                    }`}
                >
                  {nouveauReste > 0.5 ? (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Paiement partiel — Nouveau reste à payer :</span>
                      <span className="font-bold text-sm text-danger">
                        {Math.round(nouveauReste).toLocaleString(localeCode)}{unite}
                      </span>
                    </div>
                  ) : nouveauReste < -0.5 ? (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Paiement supérieur au dû — Surplus (ristourne) :</span>
                      <span className="font-bold text-sm text-primary">
                        +{Math.round(Math.abs(nouveauReste)).toLocaleString(localeCode)}{unite}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Facture intégralement soldée après ce paiement</span>
                      <span className="font-bold text-sm">0{unite}</span>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
          <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="submit"
              form="paiement-form"
              disabled={
                loading ||
                (type === 'espece' && (montantEffectif <= 0 || !compteId)) ||
                (type === 'cheque' && (montantEffectif <= 0 || !compteId || !referencePiece.trim())) ||
                (type === 'bon' && (montantEffectif <= 0 || !referencePiece.trim())) ||
                (type === 'autre' && montantEffectif <= 0) ||
                (type === 'nature' && (montantEffectif <= 0 || !produitNature.trim()))
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
