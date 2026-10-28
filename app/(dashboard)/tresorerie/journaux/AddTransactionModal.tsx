'use client'

import { useState } from 'react'
import { Plus, ArrowRightLeft, Calendar, User, Truck, Building2, UserCheck, AlertCircle } from 'lucide-react'
import { addTransaction } from '../actions'

type Campagne = { id: string; nom: string; statut: string }
type Compte = { id: string; nom: string; type_compte?: string }
type ClientItem = { id: string; nom: string; telephone?: string | null }
type MembreItem = { id: string; nom: string; prenom?: string | null; code_membre?: string | null }
type MaterielItem = { id: string; nom: string; code_materiel?: string | null }

export default function AddTransactionModal({
  compteId,
  comptes = [],
  imputations = [],
  campagnes = [],
  clients = [],
  membres = [],
  materiels = [],
  onSuccess,
  dict,
}: {
  compteId: string
  comptes?: Compte[]
  imputations?: any[]
  campagnes: Campagne[]
  clients?: ClientItem[]
  membres?: MembreItem[]
  materiels?: MaterielItem[]
  onSuccess: () => void
  dict: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dateTransaction, setDateTransaction] = useState(new Date().toISOString().split('T')[0])
  const [typeTransaction, setTypeTransaction] = useState<'entree' | 'sortie'>('sortie')
  const [tiersType, setTiersType] = useState<'client' | 'fournisseur' | 'membre' | 'compte_transfert' | 'autre'>('autre')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedMembreId, setSelectedMembreId] = useState('')
  const [selectedDestinationCompteId, setSelectedDestinationCompteId] = useState('')
  const [customTiersNom, setCustomTiersNom] = useState('')
  const [selectedMaterielId, setSelectedMaterielId] = useState('')

  const t = dict?.tresorerie_pages?.journaux?.form || {}
  const campagneEnCours = campagnes.find((c) => c.statut === 'en_cours')
  const otherComptes = comptes.filter((c) => c.id !== compteId)

  function resetForm() {
    setDateTransaction(new Date().toISOString().split('T')[0])
    setTypeTransaction('sortie')
    setTiersType('autre')
    setSelectedClientId('')
    setSelectedMembreId('')
    setSelectedDestinationCompteId(otherComptes[0]?.id || '')
    setCustomTiersNom('')
    setSelectedMaterielId('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const montant = Number(formData.get('montant'))
    const motif = (formData.get('motif') as string) || ''
    const type_piece = (formData.get('type_piece') as string) || undefined
    const reference_piece = (formData.get('reference_piece') as string)?.trim() || undefined
    const campagne_id = (formData.get('campagne_id') as string) || undefined

    // Resolve tiers name
    let tiersNom = ''
    if (tiersType === 'client') {
      const c = clients.find((item) => item.id === selectedClientId)
      tiersNom = c ? c.nom : customTiersNom
    } else if (tiersType === 'membre') {
      const m = membres.find((item) => item.id === selectedMembreId)
      tiersNom = m ? `${m.prenom || ''} ${m.nom}`.trim() : customTiersNom
    } else if (tiersType === 'compte_transfert') {
      const dest = comptes.find((c) => c.id === selectedDestinationCompteId)
      tiersNom = dest ? dest.nom : 'Autre compte'
    } else {
      tiersNom = customTiersNom.trim()
    }

    // Resolve materiel
    let matNom: string | undefined = undefined
    if (selectedMaterielId) {
      const mat = materiels.find((m) => m.id === selectedMaterielId)
      if (mat) matNom = mat.nom
    }

    const res = await addTransaction({
      compte_id: compteId,
      type_transaction: typeTransaction,
      montant,
      motif,
      date_transaction: dateTransaction,
      type_piece: tiersType === 'compte_transfert' ? 'virement_interne' : type_piece,
      reference_piece,
      campagne_id,
      tiers_type: tiersType,
      tiers_nom: tiersNom,
      compte_destination_id: tiersType === 'compte_transfert' ? selectedDestinationCompteId : undefined,
      materiel_id: selectedMaterielId || undefined,
      materiel_nom: matNom,
    })

    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsOpen(false)
      resetForm()
      onSuccess()
    }
  }

  return (
    <>
      <button
        onClick={() => {
          resetForm()
          setIsOpen(true)
        }}
        className="inline-flex items-center gap-x-2 rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-secondary/90 transition-colors"
      >
        <Plus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
        {dict?.tresorerie_pages?.journaux?.add_operation || "Nouvelle opération"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-surface-border bg-background/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground font-heading">
                {t.title || "Ajouter une opération de trésorerie"}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-foreground-muted hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form id="add-tx-form" onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Date de transaction (date du jour par défaut) */}
              <div>
                <label htmlFor="date_transaction" className="block text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Date de l'opération *</span>
                </label>
                <input
                  type="date"
                  name="date_transaction"
                  id="date_transaction"
                  required
                  value={dateTransaction}
                  onChange={(e) => setDateTransaction(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                />
              </div>

              {/* Type d'opération */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="type_transaction" className="block text-sm font-medium text-foreground">
                    Sens du flux *
                  </label>
                  <select
                    name="type_transaction"
                    id="type_transaction"
                    required
                    value={typeTransaction}
                    onChange={(e) => setTypeTransaction(e.target.value as any)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm font-medium"
                  >
                    <option value="sortie">Sortie (Décaissement)</option>
                    <option value="entree">Entrée (Encaissement)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="montant" className="block text-sm font-medium text-foreground">
                    Montant (FCFA) *
                  </label>
                  <input
                    type="number"
                    name="montant"
                    id="montant"
                    required
                    min={1}
                    placeholder="Ex: 50000"
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm font-mono font-bold"
                  />
                </div>
              </div>

              {/* Tiers à la place d'imputation */}
              <div className="border border-surface-border rounded-xl p-3.5 bg-background/30 space-y-3">
                <label className="block text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" />
                  <span>Tiers & Contrepartie *</span>
                </label>

                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">
                    Catégorie du tiers :
                  </label>
                  <select
                    value={tiersType}
                    onChange={(e) => setTiersType(e.target.value as any)}
                    className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  >
                    <option value="client">Client (Acheteur de stock ou prestation)</option>
                    <option value="fournisseur">Fournisseur (Intrants, carburant, pièces...)</option>
                    <option value="membre">Membre du GIE</option>
                    <option value="compte_transfert">Virement entre caisses / comptes (Transfert équilibré)</option>
                    <option value="autre">Autre tiers / Bénéficiaire externe</option>
                  </select>
                </div>

                {/* Dynamic selector based on tiersType */}
                {tiersType === 'client' && (
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      Sélectionner le client :
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="">-- Choisir un client --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom} {c.telephone ? `(${c.telephone})` : ''}</option>
                      ))}
                    </select>
                    {(!selectedClientId || clients.length === 0) && (
                      <input
                        type="text"
                        placeholder="Ou saisissez le nom du client..."
                        value={customTiersNom}
                        onChange={(e) => setCustomTiersNom(e.target.value)}
                        className="mt-2 block w-full rounded-md border border-surface-border bg-background px-3 py-1.5 text-xs text-foreground"
                      />
                    )}
                  </div>
                )}

                {tiersType === 'membre' && (
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      Sélectionner le membre :
                    </label>
                    <select
                      value={selectedMembreId}
                      onChange={(e) => setSelectedMembreId(e.target.value)}
                      className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="">-- Choisir un membre --</option>
                      {membres.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.prenom} {m.nom} {m.code_membre ? `[${m.code_membre}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {tiersType === 'fournisseur' && (
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      Nom du fournisseur :
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Station Total, Fournisseur Engrais Sénégal, SODAGRI..."
                      value={customTiersNom}
                      onChange={(e) => setCustomTiersNom(e.target.value)}
                      className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>
                )}

                {tiersType === 'compte_transfert' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-foreground-muted">
                      {typeTransaction === 'entree'
                        ? "Compte d'origine (Débité) :"
                        : "Compte de destination (Crédité) :"}
                    </label>
                    <select
                      required
                      value={selectedDestinationCompteId}
                      onChange={(e) => setSelectedDestinationCompteId(e.target.value)}
                      className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="">
                        {typeTransaction === 'entree'
                          ? "-- Choisir le compte source débité --"
                          : "-- Choisir le compte destination crédité --"}
                      </option>
                      {otherComptes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom} ({c.type_compte || 'Compte'})
                        </option>
                      ))}
                    </select>
                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-xs text-primary flex items-start gap-2">
                      <ArrowRightLeft className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Virement équilibré automatique :</strong>{' '}
                        {typeTransaction === 'entree'
                          ? "Une écriture d'entrée sera créditée sur ce compte et une écriture de sortie équivalente sera débitée sur le compte sélectionné."
                          : "Une écriture de sortie sera débitée sur ce compte et une écriture d'entrée équivalente sera créditée sur le compte de destination."}
                      </span>
                    </div>
                  </div>
                )}

                {tiersType === 'autre' && (
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      Nom / Désignation du tiers :
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Chauffeur, Prestataire moisson, SAED..."
                      value={customTiersNom}
                      onChange={(e) => setCustomTiersNom(e.target.value)}
                      className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Répartition / Affectation Matériel */}
              <div>
                <label htmlFor="materiel_id" className="block text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-foreground-muted" />
                  <span>Affectation Matériel (Optionnel)</span>
                </label>
                <select
                  id="materiel_id"
                  value={selectedMaterielId}
                  onChange={(e) => setSelectedMaterielId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                >
                  <option value="">-- Aucun matériel spécifique --</option>
                  {materiels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom} {m.code_materiel ? `(${m.code_materiel})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-foreground-muted">
                  Permet le suivi de la répartition des dépenses et recettes par matériel.
                </p>
              </div>

              {/* Campagne */}
              <div>
                <label htmlFor="campagne_id" className="block text-sm font-medium text-foreground">
                  Campagne rattachée (Optionnel)
                </label>
                <select
                  name="campagne_id"
                  id="campagne_id"
                  defaultValue={campagneEnCours?.id || ''}
                  className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                >
                  <option value="">Aucune campagne particulière</option>
                  {campagnes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom} {c.statut === 'en_cours' ? '(En cours)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Motif */}
              <div>
                <label htmlFor="motif" className="block text-sm font-medium text-foreground">
                  Motif / Libellé de l'opération *
                </label>
                <input
                  type="text"
                  name="motif"
                  id="motif"
                  required
                  placeholder="Ex: Achat carburant 50L, Paiement chauffeur, Réparation pneu..."
                  className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                />
              </div>

              {/* Type de pièce et Référence / N° de pièce */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="type_piece" className="block text-sm font-medium text-foreground">
                    Type de pièce justificative
                  </label>
                  <select
                    name="type_piece"
                    id="type_piece"
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  >
                    <option value="">Aucune pièce spécifique</option>
                    <option value="bon">Bon</option>
                    <option value="facture_fournisseur">Facture fournisseur</option>
                    <option value="recu">Reçu / Quittance</option>
                    <option value="retrait_espece">Retrait d'espèces</option>
                    <option value="versement">Versement bancaire</option>
                    <option value="cheque">Chèque</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="reference_piece" className="block text-sm font-medium text-foreground">
                    Référence / N° de pièce ou chèque
                  </label>
                  <input
                    type="text"
                    name="reference_piece"
                    id="reference_piece"
                    placeholder="Ex: FAC-2026-001, CHQ-445892..."
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm font-mono"
                  />
                </div>
              </div>
            </form>

            <div className="bg-background/50 px-5 py-4 border-t border-surface-border sm:flex sm:flex-row-reverse sm:gap-3">
              <button
                type="submit"
                form="add-tx-form"
                disabled={loading}
                className="inline-flex w-full justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:w-auto disabled:opacity-50"
              >
                {loading ? "Enregistrement..." : "Enregistrer l'opération"}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="mt-2 sm:mt-0 inline-flex w-full justify-center rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm border border-surface-border hover:bg-background sm:w-auto"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
