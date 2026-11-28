'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Plus, X } from 'lucide-react'
import { addConsommation } from '../actions'
import { CampagneBudgetSelect, type ContexteBudgetMateriel } from '../BudgetCampagneChamps'

export default function AddConsommationModal({ materiels, budget, dict }: { materiels: any[], budget: ContexteBudgetMateriel, dict: any }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [lastSavedMsg, setLastSavedMsg] = useState<string | null>(null)
  const t = dict.materiel_pages.consommations.form

  function handleClose() {
    setIsOpen(false)
    setSavedCount(0)
    setLastSavedMsg(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setLastSavedMsg(null)
    const form = e.currentTarget
    const formData = new FormData(form)

    const materiel_id = formData.get('materiel_id') as string
    const type_consommation = formData.get('type_consommation') as string
    const fournisseur = formData.get('fournisseur') as string
    const reference_piece = ((formData.get('reference_piece') as string) || '').trim() || null
    const quantite = Number(formData.get('quantite') || 0)
    const montant_total = Number(formData.get('montant_total') || 0)
    const date_consommation = formData.get('date_consommation') as string
    const campagne_id = (formData.get('campagne_id') as string) || null

    const res = await addConsommation(
      materiel_id,
      type_consommation,
      fournisseur,
      quantite,
      montant_total,
      date_consommation,
      campagne_id,
      reference_piece
    )

    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setSavedCount((prev) => prev + 1)
      setLastSavedMsg(`Dépense « ${type_consommation} » enregistrée avec succès.`)
      // Réinitialiser les champs de ligne tout en conservant matériel, campagne et date pour enchaîner les saisies
      const fieldsToClear = ['type_consommation', 'reference_piece', 'fournisseur', 'quantite', 'montant_total']
      for (const name of fieldsToClear) {
        const el = form.elements.namedItem(name) as HTMLInputElement | null
        if (el) el.value = ''
      }
      const typeInput = form.elements.namedItem('type_consommation') as HTMLInputElement | null
      typeInput?.focus()
      router.refresh()
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setSavedCount(0)
          setLastSavedMsg(null)
          setIsOpen(true)
        }}
        className="inline-flex items-center gap-x-2 rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-danger/90"
      >
        <Plus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
        {dict.materiel_pages.consommations.add_btn}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto whitespace-normal text-start">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 className="text-lg font-semibold leading-6 text-foreground">
                    {t.add_title}
                  </h3>
                  <button
                    type="button"
                    onClick={handleClose}
                    title="Fermer"
                    className="rounded-md p-1 text-foreground-muted hover:bg-background hover:text-foreground transition-colors"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                {lastSavedMsg && (
                  <div className="mb-4 flex items-start gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-xs text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold">{lastSavedMsg}</p>
                      <p className="mt-0.5 text-success/90">
                        {savedCount} saisie(s) enregistrée(s). Vous pouvez continuer ou cliquer sur <strong>Fermer</strong>.
                      </p>
                    </div>
                  </div>
                )}

                <form ref={formRef} id="add-consommation-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="materiel_id" className="block text-sm font-medium text-foreground">{t.equipment_label}</label>
                    <select
                      name="materiel_id"
                      id="materiel_id"
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="">{t.select_machine}</option>
                      {materiels.map(mat => (
                        <option key={mat.id} value={mat.id}>{mat.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="type_consommation" className="block text-sm font-medium text-foreground">
                      {t.type_label} / Rubrique Budget
                    </label>
                    <input
                      type="text"
                      name="type_consommation"
                      id="type_consommation"
                      list="types-consommation-suggestions"
                      placeholder="Ex: Carburant, Huile, Réparation, Pièce..."
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                    <datalist id="types-consommation-suggestions">
                      {budget?.typesDepense?.map((td, idx) => (
                        <option key={`budget-${idx}`} value={td.type}>{td.materiel ? `${td.materiel} - ${td.type}` : td.type}</option>
                      ))}
                      <option value="Carburant">{t.type_fuel}</option>
                      <option value="Huile">{t.type_oil}</option>
                      <option value="Piece">{t.type_part}</option>
                      <option value="Reparation">{t.type_repair}</option>
                      <option value="Entretien">Entretien courant</option>
                      <option value="Autre">{t.type_other}</option>
                    </datalist>
                    <p className="mt-1 text-xs text-foreground-muted">
                      Sélectionnez une rubrique du budget ou saisissez librement un poste d&apos;imputation.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="reference_piece" className="block text-sm font-medium text-foreground">
                        Référence pièce
                      </label>
                      <input
                        type="text"
                        name="reference_piece"
                        id="reference_piece"
                        placeholder="Ex: FAC-2026-014, BON-08..."
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="fournisseur" className="block text-sm font-medium text-foreground">{t.supplier_label}</label>
                      <input
                        type="text"
                        name="fournisseur"
                        id="fournisseur"
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="quantite" className="block text-sm font-medium text-foreground">{t.quantity_label}</label>
                      <input
                        type="number"
                        name="quantite"
                        id="quantite"
                        min="0"
                        step="any"
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="montant_total" className="block text-sm font-medium text-foreground">{t.amount_label}</label>
                      <input
                        type="number"
                        name="montant_total"
                        id="montant_total"
                        min="0"
                        required
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                  </div>
                  <CampagneBudgetSelect budget={budget} dict={dict} />
                  <div>
                    <label htmlFor="date_consommation" className="block text-sm font-medium text-foreground">{t.date_label}</label>
                    <input
                      type="date"
                      name="date_consommation"
                      id="date_consommation"
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                <button
                  type="submit"
                  form="add-consommation-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-danger/90 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.adding : dict.common.add}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
