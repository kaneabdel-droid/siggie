import { useState } from 'react'
import Link from 'next/link'
import { Check, X, Trash2, Banknote, Undo2, Layers, Tractor } from 'lucide-react'
import { updateCreditStatus, deleteCredit, addDecaissementCredit, addRemboursementCredit } from './actions'
import { useUnite } from '@/components/DeviseProvider'
import { getCreditType, getCreditEquipementNom, getCreditPeriodicite, calculerEcheanceEstimee } from '@/lib/credits-types'

type Credit = {
  id: string
  montant_demande: number
  montant_accorde: number
  statut: string
  banque_nom: string | null
  but_credit?: string | null
  taux_interet?: number | null
  duree_credit?: number | null
  type_financement?: string | null
  type_credit?: string | null
  equipement_nom?: string | null
  periodicite_remboursement?: string | null
  nombre_echeances?: number | null
  montant_echeance?: number | null
}

export default function CreditRowActions({ credit, comptes, dict, locale }: { credit: Credit, comptes?: any[], dict: any, locale?: string }) {
  const unite = useUnite()
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDecaissementOpen, setIsDecaissementOpen] = useState(false)
  const [isRemboursementOpen, setIsRemboursementOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const d = dict.credits_extra
  const localeCode = locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-US' : 'fr-FR'

  const isTypeEquipement = getCreditType(credit) === 'equipement'
  const equipementNom = getCreditEquipementNom(credit)

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
      <div className="flex justify-end items-center gap-2">
        {isTypeEquipement ? (
          <Link
            href={`/credits/${credit.id}`}
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 p-1 rounded hover:bg-indigo-500/10 transition-colors"
            title={`Consulter le crédit équipement (${equipementNom || 'Matériel'}) & échéancier`}
          >
            <Tractor className="h-5 w-5" />
          </Link>
        ) : (
          <Link
            href={`/credits/${credit.id}`}
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 p-1 rounded hover:bg-emerald-500/10 transition-colors"
            title="Consulter et ventiler par intrant & service (Banque Agricole / CNCAS)"
          >
            <Layers className="h-5 w-5" />
          </Link>
        )}
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
                          <option value="par_intrant">Décliné par intrant ou service (Banque Agricole / CNCAS)</option>
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
