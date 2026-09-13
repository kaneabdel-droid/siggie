'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, X, Check } from 'lucide-react'
import { addRubrique, setBudgetPrevision } from './actions'

type Rubrique = {
  id: string
  libelle: string
  compte: string
  nature: string
}

function RubriqueList({
  campagneId,
  rubriques,
  previsions,
  title,
  emptyLabel,
  amountPlaceholder,
}: {
  campagneId: string
  rubriques: Rubrique[]
  previsions: Record<string, number>
  title: string
  emptyLabel: string
  amountPlaceholder: string
}) {
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleEditStart = (r: Rubrique) => {
    setEditingId(r.id)
    setEditValue(String(previsions[r.id] || 0))
  }

  const handleEditSave = (imputationId: string) => {
    const montant = parseFloat(editValue)
    if (isNaN(montant)) return

    startTransition(async () => {
      const res = await setBudgetPrevision(campagneId, imputationId, montant)
      if (res?.error) {
        alert(res.error)
      } else {
        setEditingId(null)
      }
    })
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditValue('')
  }

  const total = rubriques.reduce((sum, r) => sum + (previsions[r.id] || 0), 0)

  return (
    <div>
      <h5 className="px-4 pt-3 sm:px-5 text-xs font-semibold uppercase tracking-wider text-foreground-muted">{title}</h5>
      {rubriques.length > 0 ? (
        <ul role="list" className="divide-y divide-surface-border">
          {rubriques.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5 hover:bg-background/50 transition-colors">
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground truncate block">{r.libelle}</span>
                <span className="text-xs text-foreground-muted truncate block">{r.compte}</span>
              </div>

              {editingId === r.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder={amountPlaceholder}
                    className="w-28 rounded-md border-0 py-1 px-2 text-sm text-foreground bg-background shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-inset focus:ring-primary"
                    autoFocus
                  />
                  <button onClick={() => handleEditSave(r.id)} disabled={isPending} className="text-success hover:text-success/80">
                    <Check className="h-5 w-5" />
                  </button>
                  <button onClick={handleEditCancel} disabled={isPending} className="text-foreground-muted hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleEditStart(r)}
                  disabled={isPending}
                  className="shrink-0 inline-flex items-center gap-2 rounded-full bg-secondary/10 px-2.5 py-0.5 text-sm font-medium text-secondary hover:bg-secondary/20 transition-colors disabled:opacity-50"
                >
                  {(previsions[r.id] || 0).toLocaleString('fr-FR')} FCFA
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-4 py-4 text-center text-sm text-foreground-muted">
          {emptyLabel}
        </div>
      )}
      <div className="border-t border-surface-border px-4 py-2 sm:px-5 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground-muted">{title}</span>
        <span className="text-sm font-semibold text-foreground">{total.toLocaleString('fr-FR')} FCFA</span>
      </div>
    </div>
  )
}

// Types de consommation matériel, alignés sur les valeurs stockées par
// materiel_consommations (voir AddConsommationModal.tsx) : la sous-rubrique
// d'une dépense Matériel doit reprendre exactement ces valeurs pour que le
// suivi budgétaire puisse rapprocher prévision et réalisation.
const TYPES_CONSOMMATION = ['Carburant', 'Huile', 'Piece', 'Reparation', 'Autre'] as const
const TYPE_CONSOMMATION_LABEL_KEY: Record<string, string> = {
  Carburant: 'type_fuel',
  Huile: 'type_oil',
  Piece: 'type_part',
  Reparation: 'type_repair',
  Autre: 'type_other',
}

function RubriqueSection({
  campagneId,
  categorie,
  title,
  rubriques,
  previsions,
  materiels,
  dict,
  onRubriqueAdded,
}: {
  campagneId: string
  categorie: 'exploitation' | 'materiel'
  title: string
  rubriques: Rubrique[]
  previsions: Record<string, number>
  materiels: { id: string; nom: string }[]
  dict: any
  onRubriqueAdded: () => void
}) {
  const t = dict.campagnes_detail.config.budget
  const tConso = dict.materiel_pages.consommations.form
  const [isPending, startTransition] = useTransition()
  const [libelle, setLibelle] = useState('')
  const [compte, setCompte] = useState('')
  const [nature, setNature] = useState('depense')
  const isMateriel = categorie === 'materiel'

  const handleAdd = () => {
    if (!libelle.trim() || !compte.trim()) return

    startTransition(async () => {
      const res = await addRubrique(categorie, nature, libelle, compte)
      if (res?.error) {
        alert(res.error)
      } else {
        setLibelle('')
        setCompte('')
        onRubriqueAdded()
      }
    })
  }

  const recettes = rubriques.filter((r) => r.nature === 'recette')
  const depenses = rubriques.filter((r) => r.nature === 'depense')
  const totalRecettes = recettes.reduce((sum, r) => sum + (previsions[r.id] || 0), 0)
  const totalDepenses = depenses.reduce((sum, r) => sum + (previsions[r.id] || 0), 0)
  const solde = totalRecettes - totalDepenses

  return (
    <div className="bg-background/50 border border-surface-border rounded-lg overflow-hidden">
      <div className="px-4 py-4 sm:px-5">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>

        <div className="mt-3 sm:flex sm:flex-wrap sm:items-center gap-2">
          <select
            value={nature}
            onChange={(e) => setNature(e.target.value)}
            disabled={isPending}
            className="block w-full sm:w-auto rounded-md border-0 py-1.5 px-3 text-foreground bg-surface shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          >
            <option value="depense">{t.nature_depense}</option>
            <option value="recette">{t.nature_recette}</option>
          </select>
          {isMateriel ? (
            <select
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              disabled={isPending}
              className="mt-2 sm:mt-0 block w-full sm:w-auto sm:flex-1 rounded-md border-0 py-1.5 px-3 text-foreground bg-surface shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
            >
              <option value="">{t.select_equipement}</option>
              {materiels.map((m) => (
                <option key={m.id} value={m.nom}>{m.nom}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder={t.add_rubrique_placeholder_libelle}
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              disabled={isPending}
              className="mt-2 sm:mt-0 block w-full sm:w-auto sm:flex-1 rounded-md border-0 py-1.5 px-3 text-foreground bg-surface shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
            />
          )}
          {isMateriel && nature === 'depense' ? (
            <select
              value={compte}
              onChange={(e) => setCompte(e.target.value)}
              disabled={isPending}
              className="mt-2 sm:mt-0 block w-full sm:w-auto sm:flex-1 rounded-md border-0 py-1.5 px-3 text-foreground bg-surface shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
            >
              <option value="">{t.select_type}</option>
              {TYPES_CONSOMMATION.map((type) => (
                <option key={type} value={type}>{TYPE_CONSOMMATION_LABEL_KEY[type]
                  ? tConso[TYPE_CONSOMMATION_LABEL_KEY[type]]
                  : type}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder={isMateriel ? t.add_rubrique_placeholder_type_prestation : t.add_rubrique_placeholder_compte}
              value={compte}
              onChange={(e) => setCompte(e.target.value)}
              disabled={isPending}
              className="mt-2 sm:mt-0 block w-full sm:w-auto sm:flex-1 rounded-md border-0 py-1.5 px-3 text-foreground bg-surface shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
            />
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || !libelle.trim() || !compte.trim()}
            className="mt-2 sm:mt-0 inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="border-t border-surface-border bg-surface divide-y divide-surface-border">
        <RubriqueList
          campagneId={campagneId}
          rubriques={recettes}
          previsions={previsions}
          title={t.recettes_title}
          emptyLabel={t.empty}
          amountPlaceholder={t.amount_placeholder}
        />
        <RubriqueList
          campagneId={campagneId}
          rubriques={depenses}
          previsions={previsions}
          title={t.depenses_title}
          emptyLabel={t.empty}
          amountPlaceholder={t.amount_placeholder}
        />
      </div>

      <div className="border-t border-surface-border px-4 py-3 sm:px-5 flex items-center justify-between bg-surface">
        <span className="text-sm font-medium text-foreground">{t.solde}</span>
        <span className={`text-sm font-semibold ${solde >= 0 ? 'text-success' : 'text-danger'}`}>
          {solde.toLocaleString('fr-FR')} FCFA
        </span>
      </div>
    </div>
  )
}

export default function BudgetPrevisionsManager({
  campagneId,
  rubriquesExploitation,
  rubriquesMateriel,
  previsions,
  materiels,
  dict,
}: {
  campagneId: string
  rubriquesExploitation: Rubrique[]
  rubriquesMateriel: Rubrique[]
  previsions: Record<string, number>
  materiels: { id: string; nom: string }[]
  dict: any
}) {
  const t = dict.campagnes_detail.config.budget
  const router = useRouter()

  const soldeOf = (rubriques: Rubrique[]) => {
    const recettes = rubriques.filter((r) => r.nature === 'recette').reduce((sum, r) => sum + (previsions[r.id] || 0), 0)
    const depenses = rubriques.filter((r) => r.nature === 'depense').reduce((sum, r) => sum + (previsions[r.id] || 0), 0)
    return recettes - depenses
  }

  const grandTotal = soldeOf(rubriquesExploitation) + soldeOf(rubriquesMateriel)

  return (
    <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden mb-8">
      <div className="px-4 py-5 sm:p-6 border-b border-surface-border">
        <h3 className="text-base font-semibold leading-6 text-foreground">{t.title}</h3>
        <div className="mt-2 max-w-xl text-sm text-foreground-muted">
          <p>{t.desc}</p>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RubriqueSection
            campagneId={campagneId}
            categorie="exploitation"
            title={t.exploitation_title}
            rubriques={rubriquesExploitation}
            previsions={previsions}
            materiels={[]}
            dict={dict}
            onRubriqueAdded={() => router.refresh()}
          />
          <RubriqueSection
            campagneId={campagneId}
            categorie="materiel"
            title={t.materiel_title}
            rubriques={rubriquesMateriel}
            previsions={previsions}
            materiels={materiels}
            dict={dict}
            onRubriqueAdded={() => router.refresh()}
          />
        </div>

        <div className="mt-6 flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">{t.grand_total}</span>
          <span className={`text-base font-bold ${grandTotal >= 0 ? 'text-success' : 'text-danger'}`}>
            {grandTotal.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
      </div>
    </div>
  )
}
