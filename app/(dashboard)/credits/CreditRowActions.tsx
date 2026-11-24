'use client'

import { useState, useMemo } from 'react'
import {
  Check,
  X,
  Trash2,
  Banknote,
  Undo2,
  Edit2,
  Sprout,
  Tractor,
} from 'lucide-react'
import {
  updateCreditStatus,
  deleteCredit,
  addDecaissementCredit,
  addRemboursementCredit,
  updateCredit,
} from './actions'
import { useUnite } from '@/components/DeviseProvider'
import {
  getCreditType,
  getCreditEquipementNom,
  getCreditPeriodicite,
  getCreditMaterielId,
  getCreditDateAcquisition,
  getCreditSpeculationId,
  getCreditSpeculationNom,
  cleanButCredit,
  isCreditIndependant,
  calculerEcheanceEstimee,
  type PeriodiciteRemboursement,
} from '@/lib/credits-types'

type Credit = {
  id: string
  montant_demande: number
  montant_accorde: number
  statut: string
  banque_nom: string | null
  campagne_id?: string | null
  campagnes?: { id?: string; nom: string } | null
  but_credit?: string | null
  taux_interet?: number | null
  duree_credit?: number | null
  type_financement?: string | null
  type_credit?: string | null
  equipement_nom?: string | null
  materiel_id?: string | null
  date_acquisition?: string | null
  date_demande?: string | null
  periodicite_remboursement?: string | null
  nombre_echeances?: number | null
  montant_echeance?: number | null
  speculation_id?: string | null
  speculation_nom?: string | null
}

export default function CreditRowActions({
  credit,
  comptes,
  campagnes = [],
  materiels = [],
  speculations = [],
  dict,
  locale,
}: {
  credit: Credit
  comptes?: any[]
  campagnes?: Array<{ id: string; nom: string }>
  materiels?: Array<{ id: string; nom: string; date_acquisition?: string | null; valeur_acquisition?: number | null }>
  speculations?: Array<{ id: string; campagne_id: string; nom: string }>
  dict: any
  locale?: string
}) {
  const unite = useUnite()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDecaissementOpen, setIsDecaissementOpen] = useState(false)
  const [isRemboursementOpen, setIsRemboursementOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const d = dict.credits_extra
  const localeCode = locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-US' : 'fr-FR'

  const isTypeEquipement = getCreditType(credit) === 'equipement'
  const equipementNom = getCreditEquipementNom(credit)

  // États pour le formulaire de modification
  const [editTypeCredit, setEditTypeCredit] = useState<'campagne' | 'equipement'>('campagne')
  const [editCampagneId, setEditCampagneId] = useState<string>('')
  const [editSpecId, setEditSpecId] = useState<string>('')
  const [editSpecNom, setEditSpecNom] = useState<string>('')
  const [editBanqueNom, setEditBanqueNom] = useState<string>('')
  const [editMontantDemande, setEditMontantDemande] = useState<number>(0)
  const [editMontantAccorde, setEditMontantAccorde] = useState<number | ''>('')
  const [editTauxInteret, setEditTauxInteret] = useState<number>(7.5)
  const [editDureeMois, setDureeMois] = useState<number>(12)
  const [editTypeFinancement, setEditTypeFinancement] = useState<string>('global')
  const [editPeriodicite, setEditPeriodicite] = useState<PeriodiciteRemboursement>('annuelle')
  const [editMaterielId, setEditMaterielId] = useState<string>('')
  const [editEquipementNom, setEditEquipementNom] = useState<string>('')
  const [editDateDemande, setEditDateDemande] = useState<string>('')
  const [editMotif, setEditMotif] = useState<string>('')
  const [editIsIndependant, setEditIsIndependant] = useState<boolean>(false)

  function handleOpenEdit() {
    const type = getCreditType(credit)
    setEditTypeCredit(type)
    setEditCampagneId(credit.campagne_id || (credit.campagnes as any)?.id || '')
    setEditSpecId(getCreditSpeculationId(credit) || '')
    setEditSpecNom(getCreditSpeculationNom(credit) || '')
    setEditBanqueNom(credit.banque_nom || '')
    setEditMontantDemande(Number(credit.montant_demande) || 0)
    setEditMontantAccorde(credit.montant_accorde !== null && credit.montant_accorde !== undefined ? Number(credit.montant_accorde) : '')
    setEditTauxInteret(credit.taux_interet ?? 7.5)
    setDureeMois(credit.duree_credit || (type === 'equipement' ? 36 : 12))
    setEditTypeFinancement(credit.type_financement || 'global')
    setEditPeriodicite(getCreditPeriodicite(credit))
    setEditMaterielId(getCreditMaterielId(credit) || '')
    setEditEquipementNom(getCreditEquipementNom(credit) || '')
    const dDate = credit.date_demande ? credit.date_demande.slice(0, 10) : getCreditDateAcquisition(credit)?.slice(0, 10) || ''
    setEditDateDemande(dDate)
    setEditMotif(cleanButCredit(credit.but_credit))
    setEditIsIndependant(isCreditIndependant(credit))
    setIsEditOpen(true)
  }

  const availableEditSpecs = useMemo(() => {
    if (!editCampagneId || editCampagneId === 'independant') return []
    return (speculations || []).filter((s) => s.campagne_id === editCampagneId)
  }, [speculations, editCampagneId])

  function handleSelectEditMateriel(matId: string) {
    setEditMaterielId(matId)
    if (!matId) return
    const mat = (materiels || []).find((m) => m.id === matId)
    if (mat) {
      setEditEquipementNom(mat.nom)
      if (mat.date_acquisition) {
        setEditDateDemande(mat.date_acquisition.slice(0, 10))
      }
      if (mat.valeur_acquisition && mat.valeur_acquisition > 0 && editMontantDemande === 0) {
        setEditMontantDemande(Number(mat.valeur_acquisition))
      }
    }
  }

  const editSimulation = useMemo(() => {
    if (editTypeCredit !== 'equipement') return null
    return calculerEcheanceEstimee(editMontantDemande, editTauxInteret, editDureeMois, editPeriodicite)
  }, [editTypeCredit, editMontantDemande, editTauxInteret, editDureeMois, editPeriodicite])

  async function handleUpdateCredit(formData: FormData) {
    setLoading(true)
    formData.append('credit_id', credit.id)
    formData.set('type_credit', editTypeCredit)
    if (editTypeCredit === 'equipement') {
      formData.set('equipement_nom', editEquipementNom)
      formData.set('materiel_id', editMaterielId)
      formData.set('periodicite_remboursement', editPeriodicite)
      if (editIsIndependant) {
        formData.set('campagne_id', 'independant')
      }
    } else {
      formData.set('speculation_id', editSpecId)
      formData.set('speculation_nom', editSpecNom)
    }
    const res = await updateCredit(formData)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsEditOpen(false)
    }
  }

  async function handleApprove(formData: FormData) {
    setLoading(true)
    const montant = parseFloat(formData.get('montant_accorde') as string)
    const taux = parseFloat(formData.get('taux_interet') as string) || 0
    const duree = parseInt(formData.get('duree_credit') as string, 10) || (isTypeEquipement ? 36 : 12)
    const typeFinancement = (formData.get('type_financement') as string) || 'global'

    let extra: any = undefined
    if (isTypeEquipement) {
      const periodicite = (formData.get('periodicite_remboursement') as string) || getCreditPeriodicite(credit)
      const sim = calculerEcheanceEstimee(montant, taux, duree, periodicite as any)
      extra = {
        type_credit: 'equipement',
        equipement_nom: equipementNom,
        periodicite_remboursement: periodicite,
        nombre_echeances: sim.nombreEcheances,
        montant_echeance: sim.montantEcheance,
      }
    }

    const res = await updateCreditStatus(credit.id, 'valide', montant, taux, duree, typeFinancement, extra)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsApproveOpen(false)
    }
  }

  async function handleReject() {
    if (!confirm(d.reject_confirm)) return
    setLoading(true)
    const res = await updateCreditStatus(credit.id, 'rejete')
    setLoading(false)
    if (res?.error) alert(res.error)
  }

  async function handleDelete() {
    setLoading(true)
    const res = await deleteCredit(credit.id)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsDeleteOpen(false)
    }
  }

  async function handleDecaissement(formData: FormData) {
    setLoading(true)
    formData.append('credit_id', credit.id)
    const res = await addDecaissementCredit(formData)
    setLoading(false)
    if (res?.error) alert(res.error)
    else setIsDecaissementOpen(false)
  }

  async function handleRemboursement(formData: FormData) {
    setLoading(true)
    formData.append('credit_id', credit.id)
    const res = await addRemboursementCredit(formData)
    setLoading(false)
    if (res?.error) alert(res.error)
    else setIsRemboursementOpen(false)
  }

  return (
    <>
      <div className="flex justify-end items-center gap-1.5">
        {/* Commande Modifier les paramètres du crédit */}
        <button
          type="button"
          onClick={handleOpenEdit}
          className="text-primary hover:text-primary-hover p-1.5 rounded-md hover:bg-primary/10 transition-colors"
          title="Modifier les paramètres du crédit (erreur d'écriture, montant, banque, etc.)"
        >
          <Edit2 className="h-4 w-4" />
        </button>

        {credit.statut === 'en_attente' && (
          <>
            <button onClick={() => setIsApproveOpen(true)} className="text-success hover:text-success/80 p-1" title={d.approve_tooltip}>
              <Check className="h-5 w-5" />
            </button>
            <button onClick={handleReject} className="text-danger hover:text-danger/80 p-1" title={d.reject_tooltip}>
              <X className="h-5 w-5" />
            </button>
          </>
        )}
        {credit.statut === 'valide' && (
          <>
            <button onClick={() => setIsDecaissementOpen(true)} className="text-primary hover:text-primary/80 p-1" title={d.decaissement_tooltip}>
              <Banknote className="h-5 w-5" />
            </button>
            <button onClick={() => setIsRemboursementOpen(true)} className="text-warning hover:text-warning/80 p-1" title={d.remboursement_tooltip}>
              <Undo2 className="h-5 w-5" />
            </button>
          </>
        )}
        <button onClick={() => setIsDeleteOpen(true)} className="text-foreground-muted hover:text-danger p-1" title={d.delete_tooltip}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Edit Credit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity" onClick={() => setIsEditOpen(false)} />

            <div className="relative transform overflow-hidden rounded-xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-surface-border">
              <div className="bg-surface px-5 pb-5 pt-6 sm:p-6 sm:pb-5">
                <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
                  <div>
                    <h3 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
                      <Edit2 className="h-5 w-5 text-primary" />
                      Modifier les Paramètres du Crédit
                    </h3>
                    <p className="text-xs text-foreground-muted">
                      Corrigez une erreur de saisie, un changement de montant, d&apos;organisme prêteur ou de conditions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="rounded-lg p-1 text-foreground-muted hover:text-foreground hover:bg-background transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form action={handleUpdateCredit} id={`edit-credit-form-${credit.id}`} className="space-y-4">
                  {/* Sélecteur de type de crédit : Campagne vs Équipement */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Nature du crédit
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditTypeCredit('campagne')
                          if (editDureeMois > 24) setDureeMois(12)
                        }}
                        className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${editTypeCredit === 'campagne'
                            ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500 text-foreground'
                            : 'border-surface-border bg-background/50 hover:bg-background text-foreground-muted'
                          }`}
                      >
                        <div className={`p-2 rounded-lg ${editTypeCredit === 'campagne' ? 'bg-emerald-500 text-white' : 'bg-surface text-foreground-muted'}`}>
                          <Sprout className="h-5 w-5 shrink-0" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">Crédit de Campagne</div>
                          <div className="text-xs text-foreground-muted">Trésorerie / Court terme (≤ 12 mois)</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditTypeCredit('equipement')
                          if (editDureeMois <= 12) setDureeMois(36)
                        }}
                        className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${editTypeCredit === 'equipement'
                            ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500 text-foreground'
                            : 'border-surface-border bg-background/50 hover:bg-background text-foreground-muted'
                          }`}
                      >
                        <div className={`p-2 rounded-lg ${editTypeCredit === 'equipement' ? 'bg-indigo-500 text-white' : 'bg-surface text-foreground-muted'}`}>
                          <Tractor className="h-5 w-5 shrink-0" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">Crédit d&apos;Équipement</div>
                          <div className="text-xs text-foreground-muted">Investissement / Moyen terme (&gt; 12 mois)</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Organisme Prêteur (Banque) et Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Organisme Prêteur (Banque) *
                      </label>
                      <input
                        type="text"
                        name="banque_nom"
                        value={editBanqueNom}
                        onChange={(e) => setEditBanqueNom(e.target.value)}
                        required
                        placeholder="Ex: La Banque Agricole (LBA), CNCAS, CMS..."
                        className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        {editTypeCredit === 'equipement' ? "Date de démarrage / acquisition" : "Date de la demande"}
                      </label>
                      <input
                        type="date"
                        name="date_demande"
                        value={editDateDemande}
                        onChange={(e) => setEditDateDemande(e.target.value)}
                        className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  {/* Branchement selon le type */}
                  {editTypeCredit === 'campagne' ? (
                    <div className="space-y-3 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            Campagne agricole rattachée *
                          </label>
                          <select
                            name="campagne_id"
                            value={editCampagneId}
                            onChange={(e) => {
                              setEditCampagneId(e.target.value)
                              setEditSpecId('')
                              setEditSpecNom('')
                            }}
                            required
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                          >
                            <option value="">Sélectionner une campagne...</option>
                            {campagnes.map((c) => (
                              <option key={c.id} value={c.id}>{c.nom}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            Spéculation financée (optionnel)
                          </label>
                          <select
                            value={editSpecId}
                            onChange={(e) => {
                              const sId = e.target.value
                              setEditSpecId(sId)
                              const matched = availableEditSpecs.find((s) => s.id === sId)
                              setEditSpecNom(matched ? matched.nom : '')
                            }}
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                          >
                            <option value="">Toutes les spéculations (Global)</option>
                            {availableEditSpecs.map((s) => (
                              <option key={s.id} value={s.id}>🌾 {s.nom}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          Mode de financement
                        </label>
                        <select
                          name="type_financement"
                          value={editTypeFinancement}
                          onChange={(e) => setEditTypeFinancement(e.target.value)}
                          className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                        >
                          <option value="global">Financement Global (Enveloppe unique de trésorerie)</option>
                          <option value="par_intrant">Décliné par intrant ou service (Banque Agricole)</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            Matériel du parc (si déjà enregistré)
                          </label>
                          <select
                            value={editMaterielId}
                            onChange={(e) => handleSelectEditMateriel(e.target.value)}
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                          >
                            <option value="">Sélectionner un matériel existant...</option>
                            {materiels.map((m) => (
                              <option key={m.id} value={m.id}>{m.nom}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            Nom de l&apos;équipement financé *
                          </label>
                          <input
                            type="text"
                            value={editEquipementNom}
                            onChange={(e) => setEditEquipementNom(e.target.value)}
                            required={editTypeCredit === 'equipement'}
                            placeholder="Ex: Tracteur Massey 75CV, Moissonneuse..."
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            Rattachement à une campagne
                          </label>
                          <select
                            name="campagne_id"
                            value={editIsIndependant ? 'independant' : editCampagneId}
                            onChange={(e) => {
                              if (e.target.value === 'independant') {
                                setEditIsIndependant(true)
                                setEditCampagneId('')
                              } else {
                                setEditIsIndependant(false)
                                setEditCampagneId(e.target.value)
                              }
                            }}
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                          >
                            <option value="independant">(Toutes campagnes / Indépendant - Moyen terme)</option>
                            {campagnes.map((c) => (
                              <option key={c.id} value={c.id}>{c.nom}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            Périodicité de remboursement
                          </label>
                          <select
                            value={editPeriodicite}
                            onChange={(e) => setEditPeriodicite(e.target.value as any)}
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                          >
                            <option value="annuelle">Annuelle (1 fois par an après récolte)</option>
                            <option value="semestrielle">Semestrielle (2 fois par an)</option>
                            <option value="trimestrielle">Trimestrielle (4 fois par an)</option>
                            <option value="mensuelle">Mensuelle (12 fois par an)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Montants, Taux, Durée */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Montant demandé ({unite}) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        name="montant_demande"
                        value={editMontantDemande || ''}
                        onChange={(e) => setEditMontantDemande(parseFloat(e.target.value) || 0)}
                        required
                        className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Montant accordé ({unite})
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        name="montant_accorde"
                        value={editMontantAccorde}
                        onChange={(e) => setEditMontantAccorde(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                        placeholder="Si validé..."
                        className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Taux d&apos;intérêt (%)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        name="taux_interet"
                        value={editTauxInteret}
                        onChange={(e) => setEditTauxInteret(parseFloat(e.target.value) || 0)}
                        className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Durée (mois) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        name="duree_credit"
                        value={editDureeMois}
                        onChange={(e) => setDureeMois(parseInt(e.target.value, 10) || 12)}
                        required
                        className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  {/* Simulation pour équipement */}
                  {editTypeCredit === 'equipement' && editSimulation && (
                    <div className="p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-indigo-700 dark:text-indigo-300">Simulation Échéance :</span>{' '}
                        <span>{editSimulation.nombreEcheances} échéance(s) de <strong>{editSimulation.montantEcheance.toLocaleString(localeCode, { maximumFractionDigits: 0 })} {unite}</strong></span>
                      </div>
                      <div className="text-foreground-muted">
                        Total remb. : <strong>{editSimulation.totalRemboursement.toLocaleString(localeCode, { maximumFractionDigits: 0 })} {unite}</strong>
                      </div>
                    </div>
                  )}

                  {/* Motif / Objet du crédit */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Objet / Motif du crédit (facultatif)
                    </label>
                    <textarea
                      name="but_credit"
                      value={editMotif}
                      onChange={(e) => setEditMotif(e.target.value)}
                      rows={2}
                      placeholder="Précisions sur la demande, conditions particulières, référence contrat..."
                      className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                    />
                  </div>
                </form>
              </div>

              <div className="bg-background/50 px-5 py-3.5 sm:flex sm:flex-row-reverse sm:px-6 gap-2 border-t border-surface-border">
                <button
                  type="submit"
                  form={`edit-credit-form-${credit.id}`}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.saving : "Enregistrer les modifications"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict.common.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decaissement Modal */}
      {isDecaissementOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsDecaissementOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {d.modal.decaissement_title}
                </h3>
                <form action={handleDecaissement} id={`decaissement-form-${credit.id}`} className="space-y-4">
                  <p className="text-sm text-foreground-muted mb-4">
                    {d.modal.credit_granted_label} <strong className="text-foreground">{credit.montant_accorde?.toLocaleString(localeCode, { maximumFractionDigits: 0 })}{unite}</strong>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.operation_type}</label>
                    <select name="type_piece" required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="facture_fournisseur">{d.modal.op_supplier}</option>
                      <option value="retrait_espece">{d.modal.op_withdrawal}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.source_account}</label>
                    <select name="compte_id" required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="">{d.modal.select_account}</option>
                      {comptes?.filter(c => c.type_compte === 'banque').map(c => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.amount}</label>
                    <input type="number" step="any" name="montant" required max={credit.montant_accorde} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.reason_ref}</label>
                    <input type="text" name="motif" required placeholder={d.modal.reason_ref_placeholder} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`decaissement-form-${credit.id}`}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.saving : d.modal.decaissement_submit}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDecaissementOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict.common.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remboursement Modal */}
      {isRemboursementOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsRemboursementOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {d.modal.remboursement_title}
                </h3>
                <form action={handleRemboursement} id={`remboursement-form-${credit.id}`} className="space-y-4">
                  <p className="text-sm text-foreground-muted mb-4">
                    {d.modal.credit_granted_label} <strong className="text-foreground">{credit.montant_accorde?.toLocaleString(localeCode, { maximumFractionDigits: 0 })}{unite}</strong>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.remboursement_account}</label>
                    <select name="compte_id" required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="">{d.modal.select_account}</option>
                      {comptes?.filter(c => c.type_compte === 'banque').map(c => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.amount}</label>
                    <input type="number" step="any" name="montant" required max={credit.montant_accorde} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.reason_ref}</label>
                    <input type="text" name="motif" required placeholder={d.modal.remboursement_reason_placeholder} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`remboursement-form-${credit.id}`}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-warning px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-warning/80 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.saving : d.modal.remboursement_submit}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRemboursementOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict.common.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {isApproveOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsApproveOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {d.modal.approve_title_prefix} ({credit.banque_nom || d.modal.bank_unspecified})
                </h3>
                <form action={handleApprove} id={`approve-form-${credit.id}`} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-foreground-muted">
                      {d.modal.amount_requested_label} <strong className="text-foreground">{credit.montant_demande.toLocaleString(localeCode, { maximumFractionDigits: 0 })}{unite}</strong>
                    </p>
                    {isTypeEquipement ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
                        🚜 Équipement ({equipementNom || 'Moyen terme'})
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                        🌾 Campagne (Trésorerie)
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.amount_granted}</label>
                    <input type="number" step="any" name="montant_accorde" defaultValue={credit.montant_demande} required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm font-semibold" />
                    <p className="text-xs text-foreground-muted mt-1">{d.modal.amount_granted_note}</p>
                  </div>

                  {isTypeEquipement ? (
                    <div className="space-y-3 p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">Périodicité de remboursement</label>
                        <select
                          name="periodicite_remboursement"
                          defaultValue={getCreditPeriodicite(credit)}
                          className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-xs"
                        >
                          <option value="annuelle">Annuelle (1 fois par an après récolte)</option>
                          <option value="semestrielle">Semestrielle (2 fois par an)</option>
                          <option value="trimestrielle">Trimestrielle (4 fois par an)</option>
                          <option value="mensuelle">Mensuelle (12 fois par an)</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">{d.modal.interest_rate}</label>
                          <input type="number" step="any" min="0" name="taux_interet" defaultValue={credit.taux_interet || 7.5} className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-xs" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">{d.modal.credit_duration} (mois)</label>
                          <input type="number" step="1" min="6" name="duree_credit" defaultValue={credit.duree_credit || 36} className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-xs" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground">Mode de financement</label>
                        <select name="type_financement" defaultValue={credit.type_financement || 'global'} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm">
                          <option value="global">Financement Global (Enveloppe unique)</option>
                          <option value="par_intrant">Décliné par intrant ou service (Banque Agricole)</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground">{d.modal.interest_rate}</label>
                          <input type="number" step="any" min="0" name="taux_interet" defaultValue={credit.taux_interet || 7.5} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground">{d.modal.credit_duration} (mois)</label>
                          <input type="number" step="1" min="0" name="duree_credit" defaultValue={credit.duree_credit || 12} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </>
                  )}
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`approve-form-${credit.id}`}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-success px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-success/80 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.saving : d.modal.approve_submit}
                </button>
                <button
                  type="button"
                  onClick={() => setIsApproveOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict.common.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsDeleteOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {d.modal.delete_title}
                </h3>
                <p className="text-sm text-foreground-muted">
                  {d.modal.delete_confirm}
                  <br/><br/>
                  <span className="text-danger">{dict.common.irreversible_warning}</span>
                </p>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-danger/80 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.deleting : dict.common.delete}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict.common.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
