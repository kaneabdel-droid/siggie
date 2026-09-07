'use client'

import { useState } from 'react'
import { Trash2, ChevronDown } from 'lucide-react'
import { updateMaterielEtat, deleteMateriel } from './actions'
import EditMaterielModal from './EditMaterielModal'

export default function MaterielClient({ materiels, dict }: { materiels: any[], dict: any }) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  async function handleEtatChange(id: string, newEtat: string) {
    setUpdatingId(id)
    const res = await updateMaterielEtat(id, newEtat)
    setUpdatingId(null)
    if (res?.error) {
      alert(res.error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(dict.confirm_delete)) return
    setUpdatingId(id)
    const res = await deleteMateriel(id)
    if (res?.error) {
      alert(res.error)
      setUpdatingId(null)
    }
  }

  const getEtatBadge = (etat: string) => {
    switch (etat) {
      case 'bon':
        return <span className="inline-flex items-center rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success ring-1 ring-inset ring-success/20">{dict.status_good}</span>
      case 'reparation':
        return <span className="inline-flex items-center rounded-md bg-warning/10 px-2 py-1 text-xs font-medium text-warning ring-1 ring-inset ring-warning/20">{dict.status_repair}</span>
      case 'en_panne':
        return <span className="inline-flex items-center rounded-md bg-danger/10 px-2 py-1 text-xs font-medium text-danger ring-1 ring-inset ring-danger/20">{dict.status_broken}</span>
      default:
        return <span className="inline-flex items-center rounded-md bg-surface-border px-2 py-1 text-xs font-medium text-foreground-muted">{etat}</span>
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
      <table className="min-w-full divide-y divide-surface-border">
        <thead className="bg-background">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{dict.name}</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{dict.supplier}</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{dict.value}</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-foreground-muted uppercase tracking-wider">{dict.lifespan}</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{dict.acq_date}</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{dict.status}</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider sticky right-0 bg-background shadow-[-4px_0_10px_rgba(0,0,0,0.05)] z-10">{dict.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border bg-surface">
          {materiels.map((mat) => (
            <tr key={mat.id} className="hover:bg-surface-hover transition-colors">
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                {mat.nom}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground-muted">
                {mat.fournisseur || '-'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-right font-medium">
                {mat.valeur_acquisition ? mat.valeur_acquisition.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '-'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-center text-foreground-muted">
                {mat.duree_vie_economique ? `${mat.duree_vie_economique} ${dict.years}` : '-'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground-muted">
                {mat.date_acquisition ? new Date(mat.date_acquisition).toLocaleDateString('fr-FR') : '-'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm">
                {getEtatBadge(mat.etat)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-right sticky right-0 bg-surface shadow-[-4px_0_10px_rgba(0,0,0,0.05)] z-10">
                <div className="relative flex justify-end">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === mat.id ? null : mat.id)}
                    className="flex items-center gap-1 bg-surface-hover text-foreground border border-surface-border px-3 py-1.5 rounded-md font-medium text-sm shadow-sm hover:bg-surface-border transition-colors"
                  >
                    {dict.actions}
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  
                  {openMenuId === mat.id && (
                    <div className="absolute right-0 top-full mt-1 w-40 rounded-md shadow-lg bg-surface ring-1 ring-black ring-opacity-5 z-20 py-1">
                      <EditMaterielModal materiel={mat} asMenuItem />
                      <button
                        onClick={() => {
                          setOpenMenuId(null)
                          handleDelete(mat.id)
                        }}
                        disabled={updatingId === mat.id}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-surface-hover text-left disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 text-danger/80" aria-hidden="true" />
                        <span>{dict.action_delete}</span>
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {materiels.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
                {dict.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
