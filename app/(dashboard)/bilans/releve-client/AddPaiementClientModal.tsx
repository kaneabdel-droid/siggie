'use client'

import { useState, useEffect } from 'react'
import { Plus, Wallet, CreditCard, FileCheck, Scale, MoreHorizontal } from 'lucide-react'
import { addPaiementClient, getContextePaiementClient } from './actions'
import { useUnite } from '@/components/DeviseProvider'

type ModePaiementClient = 'espece' | 'cheque' | 'bon' | 'nature' | 'autre'

type CompteRef = {
  id: string
  nom: string
  type_compte?: string | null
}

type CampagneRef = {
  id: string
  nom: string
  statut?: string | null
  produit_collecte?: string | null
  prix_collecte?: number | null
}

export default function AddPaiementClientModal({
  clientId,
  onSuccess,
  dict,
}: {
  clientId: string
  onSuccess: () => void
  dict: any
}) {
  const unite = useUnite()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ModePaiementClient>('espece')

  const [comptes, setComptes] = useState<CompteRef[]>([])
  const [campagnes, setCampagnes] = useState<CampagneRef[]>([])
  const [compteId, setCompteId] = useState<string>('')
  const [campagneId, setCampagneId] = useState<string>('')

  const [montant, setMontant] = useState<string>('')
  const [datePaiement, setDatePaiement] = useState<string>(new Date().toISOString().slice(0, 10))
  const [referencePiece, setReferencePiece] = useState<string>('')
  const [motif, setMotif] = useState<string>('')

  // Champs spécifiques au paiement en nature (ajout au stock)
  const [produitNature, setProduitNature] = useState<string>('Riz paddy')
  const [variete, setVariete] = useState<string>('')
  const [uniteMesure, setUniteMesure] = useState<'kg' | 'sacs' | 'autre'>('kg')
  const [uniteMesureAutre, setUniteMesureAutre] = useState<string>('')
  const [origineStock, setOrigineStock] = useState<'materiel' | 'achat' | 'exploitation'>('materiel')
  const [quantiteNature, setQuantiteNature] = useState<string>('')
  const [prixUnitaire, setPrixUnitaire] = useState<number>(150)

  const t = dict?.bilans_pages?.releve_client || {
    add_payment: 'Enregistrer un paiement',
    payment_form: {
      title: 'Enregistrer un paiement client',
      amount: 'Montant',
      date: 'Date du paiement',
      motif: 'Observations / Motif',
      motif_placeholder: 'Précisions éventuelles...',
      submit: 'Enregistrer le paiement',
    },
  }

  useEffect(() => {
    if (!isOpen) return
    let active = true
    getContextePaiementClient().then((res) => {
      if (!active) return
      const cpts = res.comptes || []
      const camps = res.campagnes || []
      setComptes(cpts)
      setCampagnes(camps)
      if (cpts.length > 0 && !compteId) {
        setCompteId(cpts[0].id)
      }
      if (camps.length > 0 && !campagneId) {
        const enCours = camps.find((c: any) => c.statut === 'en_cours') || camps[0]
        setCampagneId(enCours.id)
        if (enCours.produit_collecte) setProduitNature(enCours.produit_collecte)
        if (enCours.prix_collecte && Number(enCours.prix_collecte) > 0) {
          setPrixUnitaire(Number(enCours.prix_collecte))
        }
      }
    })
    return () => {
      active = false
    }
  }, [isOpen])

  function handleCampagneChange(newCampId: string) {
    setCampagneId(newCampId)
    const found = campagnes.find((c) => c.id === newCampId)
    if (found) {
      if (found.produit_collecte) setProduitNature(found.produit_collecte)
      if (found.prix_collecte && Number(found.prix_collecte) > 0) {
        setPrixUnitaire(Number(found.prix_collecte))
      }
    }
  }

  const uniteEffective = uniteMesure === 'autre' ? (uniteMesureAutre.trim() || 'unité') : uniteMesure
  const unitePrixLabel = uniteEffective === 'sacs' ? 'sac' : uniteEffective

  const qteNum = parseFloat(quantiteNature)
  const equivalentFcfa =
    mode === 'nature' && Number.isFinite(qteNum) && qteNum > 0 ? Math.round(qteNum * prixUnitaire) : 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if ((mode === 'espece' || mode === 'cheque') && !compteId) {
      alert(
        mode === 'cheque'
          ? 'Veuillez sélectionner le compte bancaire de destination.'
          : 'Veuillez sélectionner le compte de trésorerie de destination.'
      )
      return
    }
    if (mode === 'cheque' && !referencePiece.trim()) {
      alert('Veuillez renseigner le numéro de chèque ou la référence bancaire.')
      return
    }
    if (mode === 'bon' && !referencePiece.trim()) {
      alert('Veuillez renseigner le numéro ou la référence du bon.')
      return
    }
    if (mode === 'nature') {
      if (!produitNature.trim()) {
        alert('Veuillez préciser la nature du produit reçu.')
        return
      }
      if (!Number.isFinite(qteNum) || qteNum <= 0) {
        alert('Veuillez saisir une quantité en nature valide (kg).')
        return
      }
    }

    const montantFinal = mode === 'nature' ? equivalentFcfa : Number(montant)
    if (!Number.isFinite(montantFinal) || montantFinal <= 0) {
      alert('Le montant doit être supérieur à 0.')
      return
    }

    setLoading(true)
    const res = await addPaiementClient({
      client_id: clientId,
      montant: montantFinal,
      date_paiement: datePaiement,
      motif,
      mode_paiement: mode,
      compte_id:
        mode === 'espece' || mode === 'cheque' || ((mode === 'bon' || mode === 'autre') && compteId)
          ? compteId
          : null,
      reference_piece:
        mode === 'cheque' || mode === 'bon' || mode === 'autre' ? referencePiece.trim() : null,
      quantite_nature: mode === 'nature' ? qteNum : null,
      produit_nature: mode === 'nature' ? produitNature.trim() : null,
      unite_nature: mode === 'nature' ? uniteEffective : null,
      prix_unitaire_nature: mode === 'nature' ? prixUnitaire : null,
      variete: mode === 'nature' && variete.trim() ? variete.trim() : null,
      origine_stock: mode === 'nature' ? origineStock : undefined,
      campagne_id: mode === 'nature' ? campagneId || null : null,
    })

    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsOpen(false)
      setMontant('')
      setQuantiteNature('')
      setReferencePiece('')
      setMotif('')
      onSuccess()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={!clientId}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        {t.add_payment}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative transform overflow-hidden rounded-xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-1">
                  {t.payment_form?.title || 'Enregistrer un paiement client'}
                </h3>
                <p className="text-xs text-foreground-muted mb-4">
                  Sélectionnez le mode de règlement du client externe (espèces, chèque, bon, en nature avec entrée en stock, ou autre).
                </p>

                <form id="add-paiement-client-form" onSubmit={handleSubmit} className="space-y-4">
                  {/* Sélecteur des 5 modes de paiement */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Mode de paiement *
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMode('espece')}
                        className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                          mode === 'espece'
                            ? 'border-secondary bg-secondary/10 text-secondary font-bold ring-1 ring-secondary'
                            : 'border-surface-border bg-background/50 hover:bg-background text-foreground-muted'
                        }`}
                      >
                        <Wallet className="h-4 w-4" />
                        <span className="text-[11px]">Espèces</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode('cheque')}
                        className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                          mode === 'cheque'
                            ? 'border-info bg-info/10 text-info font-bold ring-1 ring-info'
                            : 'border-surface-border bg-background/50 hover:bg-background text-foreground-muted'
                        }`}
                      >
                        <CreditCard className="h-4 w-4" />
                        <span className="text-[11px]">Chèque</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode('bon')}
                        className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                          mode === 'bon'
                            ? 'border-warning bg-warning/10 text-warning font-bold ring-1 ring-warning'
                            : 'border-surface-border bg-background/50 hover:bg-background text-foreground-muted'
                        }`}
                      >
                        <FileCheck className="h-4 w-4" />
                        <span className="text-[11px]">Bon</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode('nature')}
                        className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                          mode === 'nature'
                            ? 'border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary'
                            : 'border-surface-border bg-background/50 hover:bg-background text-foreground-muted'
                        }`}
                      >
                        <Scale className="h-4 w-4" />
                        <span className="text-[11px]">Nature</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode('autre')}
                        className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                          mode === 'autre'
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 font-bold ring-1 ring-indigo-500'
                            : 'border-surface-border bg-background/50 hover:bg-background text-foreground-muted'
                        }`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="text-[11px]">Autre</span>
                      </button>
                    </div>
                  </div>

                  {/* Champs selon le mode choisi */}
                  {mode === 'nature' ? (
                    <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
                      {campagnes.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Campagne de rattachement du stock *
                          </label>
                          <select
                            value={campagneId}
                            onChange={(e) => handleCampagneChange(e.target.value)}
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                          >
                            {campagnes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nom} {c.produit_collecte ? `(${c.produit_collecte})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Nature du produit reçu *
                          </label>
                          <input
                            type="text"
                            required
                            value={produitNature}
                            onChange={(e) => setProduitNature(e.target.value)}
                            placeholder="Ex: Riz paddy, Arachide..."
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Variété (optionnel)
                          </label>
                          <input
                            type="text"
                            list="client-modal-varietes-list"
                            value={variete}
                            onChange={(e) => setVariete(e.target.value)}
                            placeholder="Ex: Sahel 108, BG 90-2..."
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                          />
                          <datalist id="client-modal-varietes-list">
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
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Origine du stock *
                        </label>
                        <select
                          value={origineStock}
                          onChange={(e) => setOrigineStock(e.target.value as any)}
                          className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                        >
                          <option value="materiel">Matériel (Règlement prestation en nature / part récolte)</option>
                          <option value="achat">Achat / Vente (Retour ou compensation de stock)</option>
                          <option value="exploitation">Exploitation</option>
                        </select>
                      </div>

                      {/* Choix de l'unité de mesure */}
                      <div>
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Quantité reçue ({uniteEffective}) *
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            required
                            value={quantiteNature}
                            onChange={(e) => setQuantiteNature(e.target.value)}
                            placeholder={uniteMesure === 'sacs' ? 'Ex: 10' : 'Ex: 500'}
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Prix unitaire ({unite.trim() || 'FCFA'}/{unitePrixLabel}) *
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="1"
                            required
                            value={prixUnitaire}
                            onChange={(e) => setPrixUnitaire(parseFloat(e.target.value) || 0)}
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-medium text-primary">
                            Équivalent financier déduit (& ajouté au stock) :
                          </div>
                          <div className="text-base font-bold text-primary mt-0.5">
                            {equivalentFcfa.toLocaleString('fr-FR')}{unite}
                          </div>
                        </div>
                        {qteNum > 0 && prixUnitaire > 0 && (
                          <div className="text-xs font-mono text-primary/80 bg-primary/10 px-2 py-1 rounded">
                            {qteNum} {uniteEffective} × {prixUnitaire.toLocaleString('fr-FR')} {unite.trim() || 'FCFA'}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground">
                          {t.payment_form?.amount || 'Montant'} ({unite.trim() || 'FCFA'}) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          name="montant"
                          required
                          min={0.01}
                          value={montant}
                          onChange={(e) => setMontant(e.target.value)}
                          placeholder="Ex: 50000"
                          className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm font-semibold"
                        />
                      </div>

                      {(mode === 'cheque' || mode === 'bon' || mode === 'autre') && (
                        <div>
                          <label className="block text-sm font-medium text-foreground">
                            {mode === 'cheque'
                              ? 'N° de chèque ou Référence bancaire *'
                              : mode === 'bon'
                              ? 'N° / Référence du bon *'
                              : 'Précision du mode / Référence (Mobile Money, Wave, Virement...)'}
                          </label>
                          <input
                            type="text"
                            required={mode === 'cheque' || mode === 'bon'}
                            value={referencePiece}
                            onChange={(e) => setReferencePiece(e.target.value)}
                            placeholder={
                              mode === 'cheque'
                                ? 'Ex: CHQ-9823412'
                                : mode === 'bon'
                                ? 'Ex: BON-LIV-0045'
                                : 'Ex: Wave, Orange Money, Virement...'
                            }
                            className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-foreground">
                          {mode === 'cheque'
                            ? 'Compte bancaire de destination *'
                            : mode === 'espece'
                            ? 'Compte de trésorerie de destination *'
                            : 'Compte de trésorerie de destination'}
                        </label>
                        <select
                          required={mode === 'espece' || mode === 'cheque'}
                          value={compteId}
                          onChange={(e) => setCompteId(e.target.value)}
                          className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                        >
                          {(mode === 'bon' || mode === 'autre') && (
                            <option value="">— Aucun compte (compensation directe) —</option>
                          )}
                          {comptes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nom}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-[11px] text-foreground-muted">
                          Le compte sélectionné sera automatiquement crédité dans la trésorerie du GIE.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        {t.payment_form?.date || 'Date du paiement'} *
                      </label>
                      <input
                        type="date"
                        name="date_paiement"
                        value={datePaiement}
                        onChange={(e) => setDatePaiement(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">
                        {t.payment_form?.motif || 'Motif / Observation'}
                      </label>
                      <input
                        type="text"
                        name="motif"
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        placeholder={t.payment_form?.motif_placeholder || 'Optionnel...'}
                        className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-surface-border">
                <button
                  type="submit"
                  form="add-paiement-client-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict?.common?.saving || 'Enregistrement...' : t.payment_form?.submit || 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict?.common?.cancel || 'Annuler'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
