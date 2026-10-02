'use client'

import { useState } from 'react'
import { Sprout, Trash2 } from 'lucide-react'
import { deleteProduitMateriel, saveProduitMateriel } from '../actions'
import type { ProduitMateriel } from './PrestationFields'

const champ =
  'block w-full rounded-md border border-surface-border bg-background px-2 py-1.5 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm'

/** Référentiel des produits pointés : unité par défaut et obligation de préciser la variété. */
export default function ProduitsMaterielModal({ produits, dict }: { produits: ProduitMateriel[]; dict: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const t = dict.materiel_pages.prestations.products

  async function enregistrer(e: React.FormEvent<HTMLFormElement>, cle: string) {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(cle)
    const res = await saveProduitMateriel(new FormData(form))
    setBusy(null)
    if (res?.error) alert(res.error)
    else if (cle === 'nouveau') form.reset()
  }

  async function supprimer(id: string) {
    if (!confirm(t.delete_confirm)) return
    setBusy(id)
    const res = await deleteProduitMateriel(id)
    setBusy(null)
    if (res?.error) alert(res.error)
  }

  function ligne(p: ProduitMateriel | null) {
    const cle = p?.id ?? 'nouveau'
    return (
      <form key={cle} onSubmit={(e) => enregistrer(e, cle)} className="grid grid-cols-[1fr_5.5rem] gap-2 sm:grid-cols-[1fr_6rem_auto_auto] sm:items-center">
        {p && <input type="hidden" name="id" value={p.id} />}
        <input name="nom" required defaultValue={p?.nom ?? ''} placeholder={t.name_placeholder} aria-label={t.name} className={champ} />
        <input name="unite" required defaultValue={p?.unite ?? 'sac'} aria-label={t.unit} className={champ} />
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="variete_obligatoire" defaultChecked={p?.variete_obligatoire ?? false} className="rounded text-primary focus:ring-primary" />
          {t.variety_required}
        </label>
        <div className="flex items-center justify-end gap-2">
          <button
            type="submit"
            disabled={busy === cle}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {p ? dict.common.save : dict.common.add}
          </button>
          {p && (
            <button type="button" onClick={() => supprimer(p.id)} disabled={busy === p.id} title={dict.common.delete} className="p-1 text-danger hover:text-danger/80 disabled:opacity-50">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </form>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-x-2 rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background"
      >
        <Sprout className="-ml-0.5 h-5 w-5" aria-hidden="true" />
        {dict.materiel_pages.prestations.products_btn}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-start shadow-xl transition-all w-full sm:my-8 sm:max-w-2xl border border-surface-border">
              <div className="space-y-4 bg-surface px-4 pb-4 pt-5 sm:p-6">
                <div>
                  <h3 className="text-lg font-semibold leading-6 text-foreground">{t.title}</h3>
                  <p className="mt-1 text-sm text-foreground-muted">{t.desc}</p>
                </div>
                <div className="space-y-3">
                  {produits.length === 0 && <p className="text-sm italic text-foreground-muted">{t.empty}</p>}
                  {produits.map((p) => ligne(p))}
                  <div className="border-t border-surface-border pt-3">{ligne(null)}</div>
                </div>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:w-auto"
                >
                  {dict.common.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
