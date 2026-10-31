'use client'

import { useState } from 'react'
import {
  Edit,
  Trash2,
  Calendar,
  User,
  Truck,
  Building2,
  ArrowRightLeft,
} from 'lucide-react'
import { updateTransaction, deleteTransaction } from '../actions'

type Campagne = { id: string; nom: string; statut: string }
type Compte = { id: string; nom: string; type_compte?: string }
type ClientItem = { id: string; nom: string; telephone?: string | null }
type MembreItem = { id: string; nom: string; prenom?: string | null; code_membre?: string | null }
type MaterielItem = { id: string; nom: string; type_materiel?: string | null; code_materiel?: string | null }

type Transaction = {
  id: string
  compte_id?: string
  type_transaction: string
  montant: number
  motif: string
  motif_affiche?: string
  tiers_nom?: string | null
  tiers_affiche?: string | null
  materiel_nom?: string | null
  materiel_id?: string | null
  type_piece: string | null
  reference_piece?: string | null
  imputation_id?: string | null
  campagne_id?: string | null
  date_transaction?: string | null
  date_effective?: string | null
  created_at?: string | null
}

export default function TransactionRowActions({
  transaction,
  comptes = [],
  imputations = [],
  campagnes = [],
  clients = [],
  membres = [],
  materiels = [],
  isCaisseMateriel,
  onSuccess,
  dict,
}: {
  transaction: Transaction
  comptes?: Compte[]
  imputations?: any[]
  campagnes?: Campagne[]
  clients?: ClientItem[]
  membres?: MembreItem[]
  materiels?: MaterielItem[]
  isCaisseMateriel?: boolean
  onSuccess: () => void
  dict: any
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Edit form states (tous les champs du formulaire de saisie)
  const [selectedCompteId, setSelectedCompteId] = useState('')
  const [dateTransaction, setDateTransaction] = useState('')
  const [typeTransaction, setTypeTransaction] = useState<'entree' | 'sortie'>('sortie')
  const [montant, setMontant] = useState('')
  const [tiersType, setTiersType] = useState<'client' | 'fournisseur' | 'membre' | 'compte_transfert' | 'autre'>('autre')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedMembreId, setSelectedMembreId] = useState('')
  const [selectedDestinationCompteId, setSelectedDestinationCompteId] = useState('')
  const [customTiersNom, setCustomTiersNom] = useState('')
  const [selectedMaterielId, setSelectedMaterielId] = useState('')
  const [campagneId, setCampagneId] = useState('')
  const [motif, setMotif] = useState('')
  const [typePiece, setTypePiece] = useState('')
  const [referencePiece, setReferencePiece] = useState('')

  // Remboursement states
  const [isRemboursement, setIsRemboursement] = useState(false)
  const [modeRemboursement, setModeRemboursement] = useState<'total' | 'partiel'>('total')
  const [montantRemboursement, setMontantRemboursement] = useState('')

  const t = dict?.tresorerie_pages?.journaux || {}
  const otherComptes = comptes.filter((c) => c.id !== selectedCompteId)
  const currentCompte = comptes.find((c) => c.id === selectedCompteId)
  const isCaisseMat = Boolean(
    isCaisseMateriel ||
    (currentCompte?.nom || '').toLowerCase().includes('matériel') ||
    (currentCompte?.nom || '').toLowerCase().includes('materiel')
  )

  function openEditModal() {
    const effCompteId = transaction.compte_id || (comptes[0]?.id ?? '')
    setSelectedCompteId(effCompteId)
    setDateTransaction(
      transaction.date_transaction ||
      transaction.date_effective ||
      transaction.created_at?.slice(0, 10) ||
      new Date().toISOString().slice(0, 10)
    )
    setTypeTransaction((transaction.type_transaction as 'entree' | 'sortie') || 'sortie')
    setMontant(String(transaction.montant || ''))

    const cleanMotif = (transaction.motif_affiche || transaction.motif || '')
      .replace(/\[REF:.*?\]/g, '')
      .replace(/\[TIERS:.*?\]/g, '')
      .replace(/\[MATERIEL:.*?\]/g, '')
      .replace(/\[REMBOURSEMENT:.*?\]/g, '')
      .replace(/\[CREDIT_MEMBRE:.*?\]/g, '')
      .trim()
    setMotif(cleanMotif)

    setTypePiece(transaction.type_piece || '')
    setReferencePiece(transaction.reference_piece || '')
    setCampagneId(transaction.campagne_id || '')

    // Resolve materiel
    const foundMat = materiels.find(
      (m) => m.id === transaction.materiel_id || m.nom === transaction.materiel_nom
    )
    setSelectedMaterielId(foundMat ? foundMat.id : '')

    // Resolve tiers
    const rawTiers = (
      transaction.tiers_nom ||
      (transaction.tiers_affiche && transaction.tiers_affiche !== '-' ? transaction.tiers_affiche : '') ||
      ''
    ).trim()

    if (transaction.type_piece === 'virement_interne') {
      setTiersType('compte_transfert')
      const otherC = comptes.find((c) => c.nom.toLowerCase() === rawTiers.toLowerCase() && c.id !== effCompteId)
      setSelectedDestinationCompteId(otherC ? otherC.id : (comptes.filter((c) => c.id !== effCompteId)[0]?.id || ''))
      setCustomTiersNom('')
      setSelectedClientId('')
      setSelectedMembreId('')
    } else {
      const matchingMembre = membres.find(
        (m) =>
          (m.prenom && `${m.prenom} ${m.nom}`.trim().toLowerCase() === rawTiers.toLowerCase()) ||
          m.nom.toLowerCase() === rawTiers.toLowerCase()
      )
      const matchingClient = clients.find(
        (c) => c.nom.toLowerCase() === rawTiers.toLowerCase()
      )

      if (matchingMembre) {
        setTiersType('membre')
        setSelectedMembreId(matchingMembre.id)
        setSelectedClientId('')
        setCustomTiersNom('')
      } else if (matchingClient) {
        setTiersType('client')
        setSelectedClientId(matchingClient.id)
        setSelectedMembreId('')
        setCustomTiersNom('')
      } else if (rawTiers) {
        setTiersType('fournisseur')
        setCustomTiersNom(rawTiers)
        setSelectedClientId('')
        setSelectedMembreId('')
      } else {
        setTiersType('autre')
        setCustomTiersNom('')
        setSelectedClientId('')
        setSelectedMembreId('')
      }
    }

    // Remboursement
    const matchRemb = String(transaction.motif || '').match(/\[REMBOURSEMENT:(.*?)\]/)
    if (matchRemb) {
      setIsRemboursement(true)
      const val = Number(matchRemb[1])
      if (val >= Number(transaction.montant || 0)) {
        setModeRemboursement('total')
        setMontantRemboursement(String(val))
      } else {
        setModeRemboursement('partiel')
        setMontantRemboursement(String(val))
      }
    } else {
      setIsRemboursement(false)
      setModeRemboursement('total')
      setMontantRemboursement('')
    }

    setIsEditOpen(true)
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const numericMontant = Number(montant)
    if (!numericMontant || numericMontant <= 0) {
      alert("Veuillez saisir un montant valide supérieur à 0.")
      setLoading(false)
      return
    }

    const isRemb = tiersType === 'membre' && typeTransaction === 'entree' ? isRemboursement : false
    const numRemb = modeRemboursement === 'partiel'
      ? Number(montantRemboursement || 0)
      : numericMontant

    if (isRemb) {
      if (!selectedMembreId) {
        alert("Veuillez sélectionner un membre pour enregistrer le remboursement.")
        setLoading(false)
        return
      }
      if (modeRemboursement === 'partiel') {
        if (numRemb <= 0 || numRemb > numericMontant) {
          alert(`Le montant du remboursement partiel doit être compris entre 1 et ${numericMontant.toLocaleString()} FCFA.`)
          setLoading(false)
          return
        }
      }
    }

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

    const res = await updateTransaction(transaction.id, {
      compte_id: selectedCompteId || transaction.compte_id,
      type_transaction: typeTransaction,
      montant: numericMontant,
      motif,
      date_transaction: dateTransaction,
      type_piece: tiersType === 'compte_transfert' ? 'virement_interne' : (typePiece || undefined),
      reference_piece: referencePiece || undefined,
      campagne_id: campagneId || undefined,
      tiers_type: tiersType,
      tiers_nom: tiersNom,
      tiers_id: tiersType === 'membre' ? (selectedMembreId || undefined) : (tiersType === 'client' ? (selectedClientId || undefined) : undefined),
      compte_destination_id: tiersType === 'compte_transfert' ? selectedDestinationCompteId : undefined,
      materiel_id: selectedMaterielId || undefined,
      materiel_nom: matNom,
      is_remboursement: isRemb,
      mode_remboursement: modeRemboursement,
      montant_remboursement: isRemb ? numRemb : 0,
    })

    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsEditOpen(false)
      onSuccess()
    }
  }

  async function handleDelete() {
    setLoading(true)
    const res = await deleteTransaction(transaction.id)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsDeleteOpen(false)
      onSuccess()
    }
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <button
          onClick={openEditModal}
          className="text-secondary hover:text-secondary/80 p-1"
          title={t.edit_tooltip || "Modifier l'opération"}
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={() => setIsDeleteOpen(true)}
          className="text-danger hover:text-danger/80 p-1"
          title={t.delete_tooltip || "Supprimer"}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Edit Modal (avec tous les champs du formulaire de saisie) */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-surface-border bg-background/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground font-heading">
                {t.edit_title || "Modifier l'opération de trésorerie"}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-foreground-muted hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form
              id={`edit-tx-form-${transaction.id}`}
              onSubmit={handleEdit}
              className="p-5 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              {/* Choix du compte / caisse si plusieurs comptes */}
              {comptes.length > 1 && (
                <div>
                  <label
                    htmlFor={`modal_compte_id_${transaction.id}`}
                    className="block text-sm font-medium text-foreground flex items-center gap-1.5"
                  >
                    <Building2 className="w-4 h-4 text-primary" />
                    <span>Compte / Caisse *</span>
                  </label>
                  <select
                    id={`modal_compte_id_${transaction.id}`}
                    value={selectedCompteId}
                    onChange={(e) => {
                      setSelectedCompteId(e.target.value)
                      const others = comptes.filter((c) => c.id !== e.target.value)
                      if (selectedDestinationCompteId === e.target.value) {
                        setSelectedDestinationCompteId(others[0]?.id || '')
                      }
                    }}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm font-semibold"
                  >
                    {comptes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} ({c.type_compte || 'Compte'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date de transaction */}
              <div>
                <label
                  htmlFor={`date_transaction_${transaction.id}`}
                  className="block text-sm font-medium text-foreground flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Date de l'opération *</span>
                </label>
                <input
                  type="date"
                  name="date_transaction"
                  id={`date_transaction_${transaction.id}`}
                  required
                  value={dateTransaction}
                  onChange={(e) => setDateTransaction(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm font-mono"
                />
              </div>

              {/* Type d'opération et Montant */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`type_transaction_${transaction.id}`}
                    className="block text-sm font-medium text-foreground"
                  >
                    Sens du flux *
                  </label>
                  <select
                    name="type_transaction"
                    id={`type_transaction_${transaction.id}`}
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
                  <label
                    htmlFor={`montant_${transaction.id}`}
                    className="block text-sm font-medium text-foreground"
                  >
                    Montant (FCFA) *
                  </label>
                  <input
                    type="number"
                    name="montant"
                    id={`montant_${transaction.id}`}
                    required
                    min={1}
                    placeholder="Ex: 50000"
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm font-mono font-bold"
                  />
                </div>
              </div>

              {/* Tiers & Contrepartie */}
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

                {/* Sélecteurs dynamiques selon tiersType */}
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
                        <option key={c.id} value={c.id}>
                          {c.nom} {c.telephone ? `(${c.telephone})` : ''}
                        </option>
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
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground-muted mb-1">
                        Sélectionner le membre * :
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

                    {/* Bloc interactif pour Versement d'un membre : Remboursement vs Crédit compte membre */}
                    {typeTransaction === 'entree' && (
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-3">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isRemboursement}
                            onChange={(e) => {
                              setIsRemboursement(e.target.checked)
                              if (e.target.checked && modeRemboursement === 'total' && montant) {
                                setMontantRemboursement(montant)
                              }
                            }}
                            className="mt-0.5 h-4 w-4 rounded border-surface-border text-primary focus:ring-primary"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-foreground">
                              Ce versement constitue-t-il un remboursement de campagne / crédit ?
                            </span>
                            <p className="text-foreground-muted mt-0.5">
                              Si coché, une écriture de remboursement sera enregistrée et rattachée à la dette de campagne du membre.
                            </p>
                          </div>
                        </label>

                        {isRemboursement && (
                          <div className="pt-2 border-t border-primary/20 space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-foreground block">
                                Affectation du remboursement :
                              </label>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <label className="flex items-center gap-2 text-xs bg-background p-2.5 rounded-lg border border-surface-border cursor-pointer flex-1">
                                  <input
                                    type="radio"
                                    name={`edit_mode_remboursement_${transaction.id}`}
                                    checked={modeRemboursement === 'total'}
                                    onChange={() => {
                                      setModeRemboursement('total')
                                      setMontantRemboursement(montant)
                                    }}
                                    className="text-primary focus:ring-primary"
                                  />
                                  <div>
                                    <span className="font-semibold text-foreground">Remboursement total</span>
                                    <span className="block text-[11px] text-foreground-muted">
                                      {montant ? `Tout le montant (${Number(montant).toLocaleString()} FCFA)` : 'La totalité du versement'}
                                    </span>
                                  </div>
                                </label>

                                <label className="flex items-center gap-2 text-xs bg-background p-2.5 rounded-lg border border-surface-border cursor-pointer flex-1">
                                  <input
                                    type="radio"
                                    name={`edit_mode_remboursement_${transaction.id}`}
                                    checked={modeRemboursement === 'partiel'}
                                    onChange={() => setModeRemboursement('partiel')}
                                    className="text-primary focus:ring-primary"
                                  />
                                  <div>
                                    <span className="font-semibold text-foreground">Remboursement partiel</span>
                                    <span className="block text-[11px] text-foreground-muted">
                                      Le reste créditera le compte membre
                                    </span>
                                  </div>
                                </label>
                              </div>
                            </div>

                            {modeRemboursement === 'partiel' && (
                              <div className="space-y-2 bg-background/80 p-3 rounded-lg border border-surface-border">
                                <label
                                  htmlFor={`edit_montant_remb_${transaction.id}`}
                                  className="block text-xs font-semibold text-foreground"
                                >
                                  Montant à mettre en remboursement (FCFA) *
                                </label>
                                <input
                                  type="number"
                                  id={`edit_montant_remb_${transaction.id}`}
                                  min={1}
                                  max={Number(montant) || undefined}
                                  value={montantRemboursement}
                                  onChange={(e) => setMontantRemboursement(e.target.value)}
                                  placeholder="Ex: 30000"
                                  className="w-full rounded-md border border-surface-border bg-background px-3 py-1.5 text-xs font-mono font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                {(() => {
                                  const mTotal = Number(montant) || 0
                                  const mRemb = Number(montantRemboursement) || 0
                                  const reliquat = mTotal - mRemb
                                  return (
                                    <div className="text-[11px] space-y-1 pt-1 border-t border-surface-border/50">
                                      <div className="flex justify-between text-primary font-medium">
                                        <span>Remboursement déduit de la dette :</span>
                                        <span>{mRemb.toLocaleString()} FCFA</span>
                                      </div>
                                      <div
                                        className={`flex justify-between font-semibold ${
                                          reliquat >= 0 ? 'text-emerald-600' : 'text-danger'
                                        }`}
                                      >
                                        <span>Reliquat au crédit du compte membre :</span>
                                        <span>
                                          {reliquat >= 0
                                            ? `${reliquat.toLocaleString()} FCFA`
                                            : 'Erreur: dépasse le versement !'}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            )}

                            {modeRemboursement === 'total' && (
                              <p className="text-[11px] text-primary bg-primary/10 p-2 rounded-md">
                                ✓ L'intégralité du versement de{' '}
                                <strong>{montant ? Number(montant).toLocaleString() : 0} FCFA</strong> sera déduite
                                de la créance de campagne du membre.
                              </p>
                            )}
                          </div>
                        )}

                        {!isRemboursement && (
                          <p className="text-[11px] text-foreground-muted bg-background/50 p-2 rounded-md">
                            ℹ️ Versement sans remboursement : l'intégralité de la somme (
                            {montant ? `${Number(montant).toLocaleString()} FCFA` : 'versée'}) sera portée au crédit du
                            compte du membre (avance / apport / épargne).
                          </p>
                        )}
                      </div>
                    )}
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
              <div
                className={`rounded-xl border p-3.5 space-y-2 ${
                  isCaisseMat
                    ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                    : 'border-surface-border bg-background/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`materiel_id_${transaction.id}`}
                    className="block text-sm font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <Truck className="w-4 h-4 text-primary" />
                    <span>Affectation Matériel {isCaisseMat ? '(Recommandé pour la Caisse Matériel)' : '(Optionnel)'}</span>
                  </label>
                  {isCaisseMat && (
                    <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Caisse Matériel
                    </span>
                  )}
                </div>

                <select
                  id={`materiel_id_${transaction.id}`}
                  value={selectedMaterielId}
                  onChange={(e) => setSelectedMaterielId(e.target.value)}
                  className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm font-medium"
                >
                  <option value="">-- Aucun matériel spécifique --</option>
                  {materiels.map((m) => (
                    <option key={m.id} value={m.id}>
                      🚜 {m.nom} {m.type_materiel ? `(${m.type_materiel})` : ''}
                    </option>
                  ))}
                </select>

                {materiels.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    Aucun matériel enregistré pour le moment. Vous pouvez enregistrer vos engins dans le menu{' '}
                    <strong>Matériel → Inventaire</strong>.
                  </p>
                ) : (
                  <p className="text-xs text-foreground-muted">
                    Affecte cette recette ou dépense à un engin pour le calcul de la rentabilité et le suivi de la
                    répartition dans le journal.
                  </p>
                )}
              </div>

              {/* Campagne */}
              <div>
                <label
                  htmlFor={`campagne_id_${transaction.id}`}
                  className="block text-sm font-medium text-foreground"
                >
                  Campagne rattachée (Optionnel)
                </label>
                <select
                  name="campagne_id"
                  id={`campagne_id_${transaction.id}`}
                  value={campagneId}
                  onChange={(e) => setCampagneId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                >
                  <option value="">Aucune campagne particulière</option>
                  {campagnes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} {c.statut === 'en_cours' ? '(En cours)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Motif */}
              <div>
                <label
                  htmlFor={`motif_${transaction.id}`}
                  className="block text-sm font-medium text-foreground"
                >
                  Motif / Libellé de l'opération *
                </label>
                <input
                  type="text"
                  name="motif"
                  id={`motif_${transaction.id}`}
                  required
                  placeholder="Ex: Achat carburant 50L, Paiement chauffeur, Réparation pneu..."
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                />
              </div>

              {/* Type de pièce et Référence / N° de pièce */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`type_piece_${transaction.id}`}
                    className="block text-sm font-medium text-foreground"
                  >
                    Type de pièce justificative
                  </label>
                  <select
                    name="type_piece"
                    id={`type_piece_${transaction.id}`}
                    value={typePiece}
                    onChange={(e) => setTypePiece(e.target.value)}
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
                  <label
                    htmlFor={`reference_piece_${transaction.id}`}
                    className="block text-sm font-medium text-foreground"
                  >
                    Référence / N° de pièce ou chèque
                  </label>
                  <input
                    type="text"
                    name="reference_piece"
                    id={`reference_piece_${transaction.id}`}
                    placeholder="Ex: FAC-2026-001, CHQ-445892..."
                    value={referencePiece}
                    onChange={(e) => setReferencePiece(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm font-mono"
                  />
                </div>
              </div>
            </form>

            <div className="bg-background/50 px-5 py-4 border-t border-surface-border sm:flex sm:flex-row-reverse sm:gap-3">
              <button
                type="submit"
                form={`edit-tx-form-${transaction.id}`}
                disabled={loading}
                className="inline-flex w-full justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:w-auto disabled:opacity-50"
              >
                {loading ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="mt-2 sm:mt-0 inline-flex w-full justify-center rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm border border-surface-border hover:bg-background sm:w-auto"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-surface-border bg-background/50">
              <h3 className="text-lg font-bold text-foreground font-heading">
                {t.delete_title || "Supprimer l'opération"}
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-foreground">
                Êtes-vous sûr de vouloir supprimer l'opération suivante ?
              </p>
              <div className="rounded-lg bg-background border border-surface-border p-3 text-xs space-y-1">
                <div className="font-semibold text-foreground">
                  {transaction.motif_affiche || transaction.motif}
                </div>
                <div className="text-foreground-muted">
                  Montant : <strong>{Number(transaction.montant || 0).toLocaleString()} FCFA</strong>
                  {transaction.tiers_affiche && transaction.tiers_affiche !== '-' && (
                    <span> • Tiers : {transaction.tiers_affiche}</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-danger font-medium">
                Cette action est irréversible.
              </p>
            </div>
            <div className="bg-background/50 px-5 py-4 border-t border-surface-border sm:flex sm:flex-row-reverse sm:gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="inline-flex w-full justify-center rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-danger/80 sm:w-auto disabled:opacity-50"
              >
                {loading ? "Suppression..." : "Supprimer définitivement"}
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
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
