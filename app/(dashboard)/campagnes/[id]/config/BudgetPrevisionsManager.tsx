'use client'

import { useState, useTransition, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Edit3, X, Check, Trash2, Folder, CornerDownRight, PlusCircle } from 'lucide-react'
import { 
  addRubrique, 
  renameRubriqueGroupe, 
  deleteRubriqueGroupe, 
  updatePoste, 
  deletePoste, 
  setBudgetPrevision 
} from './actions'
import { useUnite } from '@/components/DeviseProvider'

type Rubrique = {
  id: string
  libelle: string
  compte: string
  nature: string
}

function RubriqueList({
  campagneId,
  categorie,
  nature,
  rubriques,
  previsions,
  title,
  emptyLabel,
  amountPlaceholder,
  onSelectRubrique,
  onRefresh,
}: {
  campagneId: string
  categorie: 'exploitation' | 'materiel'
  nature: string
  rubriques: Rubrique[]
  previsions: Record<string, number>
  title: string
  emptyLabel: string
  amountPlaceholder: string
  onSelectRubrique: (libelle: string) => void
  onRefresh: () => void
}) {
  const unite = useUnite()
  const [isPending, startTransition] = useTransition()
  
  // Édition montant prévision
  const [editingPrevisionId, setEditingPrevisionId] = useState<string | null>(null)
  const [editPrevisionValue, setEditPrevisionValue] = useState('')

  // Renommage rubrique (groupe de postes)
  const [renamingRubrique, setRenamingRubrique] = useState<string | null>(null)
  const [newRubriqueName, setNewRubriqueName] = useState('')

  // Renommage poste individuel
  const [editingPosteId, setEditingPosteId] = useState<string | null>(null)
  const [newPosteName, setNewPosteName] = useState('')

  // Total budgété pour cette nature (recette ou dépense)
  const totalBudgetNature = useMemo(() => {
    return rubriques.reduce((sum, r) => sum + (previsions[r.id] || 0), 0)
  }, [rubriques, previsions])

  // Regroupement par Rubrique (libelle)
  const rubriquesGroupes = useMemo(() => {
    const groups: { libelle: string; postes: Rubrique[] }[] = []
    const map = new Map<string, Rubrique[]>()
    for (const r of rubriques) {
      if (!map.has(r.libelle)) {
        const arr: Rubrique[] = []
        map.set(r.libelle, arr)
        groups.push({ libelle: r.libelle, postes: arr })
      }
      map.get(r.libelle)!.push(r)
    }
    return groups
  }, [rubriques])

  const handlePrevisionSave = (imputationId: string) => {
    const montant = parseFloat(editPrevisionValue)
    if (isNaN(montant)) return

    startTransition(async () => {
      const res = await setBudgetPrevision(campagneId, imputationId, montant)
      if (res?.error) {
        alert(res.error)
      } else {
        setEditingPrevisionId(null)
      }
    })
  }

  const handleRenameRubrique = (oldLibelle: string) => {
    const trimmed = newRubriqueName.trim()
    if (!trimmed || trimmed === oldLibelle) {
      setRenamingRubrique(null)
      return
    }

    startTransition(async () => {
      const res = await renameRubriqueGroupe(oldLibelle, trimmed, categorie, nature, campagneId)
      if (res?.error) {
        alert(res.error)
      } else {
        setRenamingRubrique(null)
        onRefresh()
      }
    })
  }

  const handleDeleteRubrique = (libelle: string, count: number) => {
    if (!window.confirm(`Supprimer la rubrique "${libelle}" ainsi que ses ${count} sous-rubrique(s) / poste(s) ?`)) {
      return
    }

    startTransition(async () => {
      const res = await deleteRubriqueGroupe(libelle, categorie, nature, campagneId)
      if (res?.error) {
        alert(res.error)
      } else {
        onRefresh()
      }
    })
  }

  const handleRenamePoste = (imputationId: string) => {
    const trimmed = newPosteName.trim()
    if (!trimmed) {
      setEditingPosteId(null)
      return
    }

    startTransition(async () => {
      const res = await updatePoste(imputationId, trimmed, campagneId)
      if (res?.error) {
        alert(res.error)
      } else {
        setEditingPosteId(null)
        onRefresh()
      }
    })
  }

  const handleDeletePoste = (p: Rubrique) => {
    if (!window.confirm(`Supprimer le poste "${p.compte}" de la rubrique "${p.libelle}" ?`)) {
      return
    }

    startTransition(async () => {
      const res = await deletePoste(p.id, campagneId)
      if (res?.error) {
        alert(res.error)
      } else {
        onRefresh()
      }
    })
  }

  const total = rubriques.reduce((sum, r) => sum + (previsions[r.id] || 0), 0)

  return (
    <div>
      <h5 className="px-4 pt-3 sm:px-5 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        {title}
      </h5>

      {rubriquesGroupes.length > 0 ? (
        <div className="divide-y divide-surface-border">
          {rubriquesGroupes.map((group) => {
            const subtotal = group.postes.reduce((s, p) => s + (previsions[p.id] || 0), 0)
            const groupPct = totalBudgetNature > 0 ? ((subtotal / totalBudgetNature) * 100).toFixed(1) : '0'
            const isRenaming = renamingRubrique === group.libelle

            return (
              <div key={group.libelle} className="bg-surface">
                {/* En-tête de la Rubrique */}
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 sm:px-5 bg-background/50 border-b border-surface-border/50">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Folder className="h-4 w-4 text-primary shrink-0" />
                    {isRenaming ? (
                      <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                        <input
                          type="text"
                          value={newRubriqueName}
                          onChange={(e) => setNewRubriqueName(e.target.value)}
                          className="w-full rounded-md border-0 py-1 px-2 text-xs font-semibold text-foreground bg-surface shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-primary"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameRubrique(group.libelle)
                            if (e.key === 'Escape') setRenamingRubrique(null)
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameRubrique(group.libelle)}
                          disabled={isPending}
                          className="text-success hover:text-success/80 p-1"
                          title="Valider le renommage"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingRubrique(null)}
                          disabled={isPending}
                          className="text-foreground-muted hover:text-foreground p-1"
                          title="Annuler"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground truncate">
                          {group.libelle}
                        </span>
                        <span className="text-[11px] text-foreground-muted bg-surface px-1.5 py-0.5 rounded border border-surface-border shrink-0">
                          {group.postes.length} {group.postes.length > 1 ? 'postes' : 'poste'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-foreground">
                      {subtotal.toLocaleString('fr-FR')}{unite}
                    </span>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20" title="% dans cette section">
                      {groupPct}%
                    </span>

                    {!isRenaming && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectRubrique(group.libelle)}
                          className="p-1 rounded text-primary hover:bg-primary/10 transition-colors"
                          title={`Ajouter un poste à "${group.libelle}"`}
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingRubrique(group.libelle)
                            setNewRubriqueName(group.libelle)
                          }}
                          className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-surface transition-colors"
                          title="Renommer la rubrique"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRubrique(group.libelle, group.postes.length)}
                          className="p-1 rounded text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Supprimer la rubrique et ses postes"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Liste des postes / sous-rubriques */}
                <ul role="list" className="divide-y divide-surface-border/40">
                  {group.postes.map((p) => {
                    const isEditingPoste = editingPosteId === p.id
                    const isEditingPrevision = editingPrevisionId === p.id
                    const pMontant = previsions[p.id] || 0
                    const pPct = totalBudgetNature > 0 ? ((pMontant / totalBudgetNature) * 100).toFixed(1) : '0'

                    return (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 px-4 py-2 sm:px-6 hover:bg-background/40 transition-colors pl-8 sm:pl-10"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <CornerDownRight className="h-3.5 w-3.5 text-foreground-muted/60 shrink-0" />
                          {isEditingPoste ? (
                            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                              <input
                                type="text"
                                value={newPosteName}
                                onChange={(e) => setNewPosteName(e.target.value)}
                                className="w-full rounded-md border-0 py-0.5 px-2 text-xs text-foreground bg-background shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-primary"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenamePoste(p.id)
                                  if (e.key === 'Escape') setEditingPosteId(null)
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleRenamePoste(p.id)}
                                disabled={isPending}
                                className="text-success hover:text-success/80 p-0.5"
                                title="Enregistrer le nom du poste"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPosteId(null)}
                                disabled={isPending}
                                className="text-foreground-muted hover:text-foreground p-0.5"
                                title="Annuler"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group/poste min-w-0">
                              <span className="text-xs text-foreground font-medium truncate">{p.compte}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPosteId(p.id)
                                  setNewPosteName(p.compte)
                                }}
                                className="opacity-0 group-hover/poste:opacity-100 text-foreground-muted hover:text-foreground p-0.5 transition-opacity"
                                title="Modifier le nom du poste"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Montant prévision, Pourcentage & Suppression du poste */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-foreground-muted bg-background px-1.5 py-0.5 rounded border border-surface-border shrink-0" title="Part dans cette section">
                            {pPct}%
                          </span>

                          {isEditingPrevision ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={editPrevisionValue}
                                onChange={(e) => setEditPrevisionValue(e.target.value)}
                                placeholder={amountPlaceholder}
                                className="w-24 rounded-md border-0 py-0.5 px-2 text-xs text-foreground bg-background shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-primary"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePrevisionSave(p.id)
                                  if (e.key === 'Escape') setEditingPrevisionId(null)
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handlePrevisionSave(p.id)}
                                disabled={isPending}
                                className="text-success hover:text-success/80 p-0.5"
                                title="Valider"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPrevisionId(null)}
                                disabled={isPending}
                                className="text-foreground-muted hover:text-foreground p-0.5"
                                title="Annuler"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPrevisionId(p.id)
                                setEditPrevisionValue(String(previsions[p.id] || 0))
                              }}
                              disabled={isPending}
                              className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary hover:bg-secondary/20 transition-colors disabled:opacity-50"
                              title="Cliquer pour modifier le montant prévu"
                            >
                              {(previsions[p.id] || 0).toLocaleString('fr-FR')}{unite}
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeletePoste(p)}
                            disabled={isPending}
                            className="p-1 rounded text-foreground-muted/60 hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Supprimer ce poste"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="px-4 py-4 text-center text-sm text-foreground-muted">
          {emptyLabel}
        </div>
      )}

      <div className="border-t border-surface-border px-4 py-2 sm:px-5 flex items-center justify-between bg-surface">
        <span className="text-xs font-medium text-foreground-muted">{title} (Total)</span>
        <span className="text-sm font-semibold text-foreground">{total.toLocaleString('fr-FR')}{unite}</span>
      </div>
    </div>
  )
}

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
  const unite = useUnite()
  const t = dict.campagnes_detail.config.budget
  const tConso = dict.materiel_pages?.consommations?.form || {}
  const [isPending, startTransition] = useTransition()
  const [libelle, setLibelle] = useState('')
  const [compte, setCompte] = useState('')
  const [nature, setNature] = useState('depense')
  const isMateriel = categorie === 'materiel'
  const compteInputRef = useRef<HTMLInputElement>(null)

  // Liste des rubriques existantes sous cette catégorie et nature pour autocomplétion
  const existingRubriques = useMemo(() => {
    const set = new Set<string>()
    for (const r of rubriques) {
      if (r.nature === nature && r.libelle) {
        set.add(r.libelle)
      }
    }
    return Array.from(set)
  }, [rubriques, nature])

  const handleAdd = () => {
    if (!libelle.trim() || !compte.trim()) return

    startTransition(async () => {
      const res = await addRubrique(categorie, nature, libelle, compte, campagneId)
      if (res?.error) {
        alert(res.error)
      } else {
        // CONSERVER la rubrique (libelle) active pour enchaîner les postes sans ressaisir
        setCompte('')
        onRubriqueAdded()
        setTimeout(() => {
          compteInputRef.current?.focus()
        }, 50)
      }
    })
  }

  const recettes = rubriques.filter((r) => r.nature === 'recette')
  const depenses = rubriques.filter((r) => r.nature === 'depense')
  const totalRecettes = recettes.reduce((sum, r) => sum + (previsions[r.id] || 0), 0)
  const totalDepenses = depenses.reduce((sum, r) => sum + (previsions[r.id] || 0), 0)
  const solde = totalRecettes - totalDepenses

  return (
    <div className="bg-background/50 border border-surface-border rounded-lg overflow-hidden flex flex-col justify-between">
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          {libelle.trim() && (
            <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <span>Rubrique active : <strong>{libelle}</strong></span>
              <button
                type="button"
                onClick={() => {
                  setLibelle('')
                  setCompte('')
                }}
                className="text-foreground-muted hover:text-foreground ml-1"
                title="Changer de rubrique"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Formulaire d'ajout rapide en chaîne */}
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
            <>
              <input
                type="text"
                list={`suggestions-${categorie}-${nature}`}
                placeholder={t.add_rubrique_placeholder_libelle || 'Rubrique (ex: Engrais, Semences...)'}
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
                disabled={isPending}
                className="mt-2 sm:mt-0 block w-full sm:w-auto sm:flex-1 rounded-md border-0 py-1.5 px-3 text-foreground bg-surface shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
              />
              <datalist id={`suggestions-${categorie}-${nature}`}>
                {existingRubriques.map((rub) => (
                  <option key={rub} value={rub} />
                ))}
              </datalist>
            </>
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
                <option key={type} value={type}>
                  {TYPE_CONSOMMATION_LABEL_KEY[type] ? tConso[TYPE_CONSOMMATION_LABEL_KEY[type]] : type}
                </option>
              ))}
            </select>
          ) : (
            <input
              ref={compteInputRef}
              type="text"
              placeholder={isMateriel ? (t.add_rubrique_placeholder_type_prestation || 'Type de prestation') : (t.add_rubrique_placeholder_compte || 'Sous-rubrique / Poste (ex: Urée, DAP...)')}
              value={compte}
              onChange={(e) => setCompte(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              disabled={isPending}
              className="mt-2 sm:mt-0 block w-full sm:w-auto sm:flex-1 rounded-md border-0 py-1.5 px-3 text-foreground bg-surface shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
            />
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || !libelle.trim() || !compte.trim()}
            className="mt-2 sm:mt-0 inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
            title="Ajouter ce poste à la rubrique"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="ml-1 sm:hidden">Ajouter</span>
          </button>
        </div>
      </div>

      <div className="border-t border-surface-border bg-surface divide-y divide-surface-border">
        <RubriqueList
          campagneId={campagneId}
          categorie={categorie}
          nature="recette"
          rubriques={recettes}
          previsions={previsions}
          title={t.recettes_title}
          emptyLabel={t.empty}
          amountPlaceholder={t.amount_placeholder}
          onSelectRubrique={(rLibelle) => {
            setLibelle(rLibelle)
            setNature('recette')
            setTimeout(() => compteInputRef.current?.focus(), 50)
          }}
          onRefresh={onRubriqueAdded}
        />
        <RubriqueList
          campagneId={campagneId}
          categorie={categorie}
          nature="depense"
          rubriques={depenses}
          previsions={previsions}
          title={t.depenses_title}
          emptyLabel={t.empty}
          amountPlaceholder={t.amount_placeholder}
          onSelectRubrique={(rLibelle) => {
            setLibelle(rLibelle)
            setNature('depense')
            setTimeout(() => compteInputRef.current?.focus(), 50)
          }}
          onRefresh={onRubriqueAdded}
        />
      </div>

      <div className="border-t border-surface-border px-4 py-3 sm:px-5 flex items-center justify-between bg-surface">
        <span className="text-sm font-medium text-foreground">{t.solde}</span>
        <span className={`text-sm font-semibold ${solde >= 0 ? 'text-success' : 'text-danger'}`}>
          {solde.toLocaleString('fr-FR')}{unite}
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
  const unite = useUnite()
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
            {grandTotal.toLocaleString('fr-FR')}{unite}
          </span>
        </div>
      </div>
    </div>
  )
}
