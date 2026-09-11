'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react'
import { addCampagneIntrant, removeCampagneIntrant, updateCampagneIntrant } from './actions'
import { isForfaitaireType } from '@/lib/intrants/types'

type Intrant = {
  id: string
  nom: string
  type_intrant: string
  prix_unitaire: number
}

type CampagneIntrant = {
  id: string
  intrant_id: string
  prix_facturation: number
  intrants: {
    nom: string
    type_intrant: string
  }
}

export default function CampagneIntrantsManager({
  campagneId,
  intrants,
  campagneIntrants,
  dict
}: {
  campagneId: string
  intrants: Intrant[]
  campagneIntrants: CampagneIntrant[]
  dict: any
}) {
  const t = dict.campagnes_detail.config
  const [isPending, startTransition] = useTransition()
  const [selectedIntrant, setSelectedIntrant] = useState('')
  const [prixFacturation, setPrixFacturation] = useState('')

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrix, setEditPrix] = useState('')

  const availableIntrants = intrants.filter(
    i => !campagneIntrants.some(ci => ci.intrant_id === i.id)
  )

  const selectedIsForfaitaire = isForfaitaireType(
    availableIntrants.find(i => i.id === selectedIntrant)?.type_intrant
  )

  const handleSelectIntrant = (id: string) => {
    setSelectedIntrant(id)
    const intrant = availableIntrants.find(i => i.id === id)
    // Pour un intrant forfaitaire (ex: Refacturation), le montant saisi lors de la
    // distribution correspond directement au montant facturé : le prix doit rester 1.
    if (isForfaitaireType(intrant?.type_intrant)) {
      setPrixFacturation('1')
    } else {
      setPrixFacturation('')
    }
  }

  const handleAdd = () => {
    if (!selectedIntrant || !prixFacturation) return

    startTransition(async () => {
      const res = await addCampagneIntrant(campagneId, selectedIntrant, parseFloat(prixFacturation))
      if (res?.error) {
        alert(res.error)
      } else {
        setSelectedIntrant('')
        setPrixFacturation('')
      }
    })
  }

  const handleRemove = (id: string) => {
    if (!confirm(t.remove_confirm)) return

    startTransition(async () => {
      const res = await removeCampagneIntrant(id, campagneId)
      if (res?.error) {
        alert(res.error)
      }
    })
  }

  const handleEditStart = (ci: CampagneIntrant) => {
    setEditingId(ci.id)
    setEditPrix(ci.prix_facturation.toString())
  }

  const handleEditSave = (id: string) => {
    const prix = parseFloat(editPrix)
    if (isNaN(prix)) return

    startTransition(async () => {
      const res = await updateCampagneIntrant(id, campagneId, prix)
      if (res?.error) {
        alert(res.error)
      } else {
        setEditingId(null)
      }
    })
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditPrix('')
  }

  return (
    <div className="bg-surface border border-surface-border rounded-lg shadow-sm overflow-hidden mb-8">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-base font-semibold leading-6 text-foreground">{t.intrants_title}</h3>
        <div className="mt-2 max-w-xl text-sm text-foreground-muted">
          <p>{t.intrants_desc}</p>
        </div>

        <div className="mt-5 sm:flex sm:items-center gap-3">
          <div className="w-full sm:max-w-xs">
            <select
              value={selectedIntrant}
              onChange={(e) => handleSelectIntrant(e.target.value)}
              disabled={isPending}
              className="block w-full rounded-md border-0 py-1.5 text-foreground bg-background shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            >
              <option value="">{t.select_intrant}</option>
              {availableIntrants.map(i => (
                <option key={i.id} value={i.id}>{i.nom} ({i.type_intrant}) - {t.purchase_price}: {i.prix_unitaire} FCFA</option>
              ))}
            </select>
          </div>
          <div className="mt-3 sm:mt-0 w-full sm:max-w-xs">
            <input
              type="number"
              placeholder={t.billing_price_placeholder}
              value={prixFacturation}
              onChange={(e) => setPrixFacturation(e.target.value)}
              disabled={isPending || selectedIsForfaitaire}
              title={selectedIsForfaitaire ? t.forfaitaire_price_locked : undefined}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-3 text-foreground bg-background shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 disabled:opacity-60"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || !selectedIntrant || !prixFacturation}
            className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:mt-0 sm:w-auto disabled:opacity-50 transition-colors"
          >
            <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            {dict.common.add}
          </button>
        </div>
      </div>

      <div className="border-t border-surface-border">
        {campagneIntrants.length > 0 ? (
          <ul role="list" className="divide-y divide-surface-border">
            {campagneIntrants.map((ci) => (
              <li key={ci.id} className="flex items-center justify-between px-4 py-4 sm:px-6 hover:bg-background/50 transition-colors">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">{ci.intrants?.nom}</span>
                  <span className="text-sm text-foreground-muted truncate">{ci.intrants?.type_intrant}</span>
                </div>
                
                <div className="flex items-center gap-4 shrink-0">
                  {editingId === ci.id ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={editPrix}
                        onChange={(e) => setEditPrix(e.target.value)}
                        className="w-24 rounded-md border-0 py-1 px-2 text-sm text-foreground bg-background shadow-sm ring-1 ring-inset ring-surface-border focus:ring-2 focus:ring-inset focus:ring-primary"
                        autoFocus
                      />
                      <button onClick={() => handleEditSave(ci.id)} disabled={isPending} className="text-success hover:text-success/80">
                        <Check className="h-5 w-5" />
                      </button>
                      <button onClick={handleEditCancel} disabled={isPending} className="text-foreground-muted hover:text-foreground">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-0.5 text-sm font-medium text-secondary">
                        {ci.prix_facturation.toLocaleString('fr-FR')} FCFA
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditStart(ci)}
                          disabled={isPending}
                          className="text-foreground-muted hover:text-primary transition-colors disabled:opacity-50"
                          title={t.edit_price_title}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(ci.id)}
                          disabled={isPending}
                          className="text-foreground-muted hover:text-danger transition-colors disabled:opacity-50"
                          title={t.remove_title}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-foreground-muted bg-background/50">
            {t.intrants_empty}
          </div>
        )}
      </div>
    </div>
  )
}
