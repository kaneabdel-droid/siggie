'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteConsommation } from '../actions'
import EditConsommationModal from './EditConsommationModal'

export default function ConsommationsClient({ consommations, materiels, dict, locale }: { consommations: any[], materiels: any[], dict: any, locale: string }) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const t = dict.materiel_pages.consommations

  async function handleDelete(id: string) {
    if (!confirm(t.delete_confirm)) return
    setUpdatingId(id)
    const res = await deleteConsommation(id)
    if (res?.error) {
      alert(res.error)
      setUpdatingId(null)
    }
  }

  const total = consommations.reduce((sum, c) => sum + (c.montant_total || 0), 0)
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-surface-border rounded-lg p-4 flex justify-between items-center shadow-sm">
        <div>
          <h3 className="text-sm font-medium text-foreground-muted">{t.total}</h3>
          <p className="mt-1 text-2xl font-semibold text-danger">{total.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} FCFA</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-background">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{dict.common.date}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.equipment}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.type}</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.quantity}</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.amount}</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{dict.common.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-surface">
            {consommations.map((c) => (
              <tr key={c.id} className="hover:bg-surface-hover transition-colors">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                  {new Date(c.date_consommation).toLocaleDateString(dateLocale)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                  {c.materiel?.nom || '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground-muted">
                  <span className="font-medium text-foreground">{c.type_consommation}</span>
                  {c.fournisseur && <span className="block text-xs">{t.at_supplier} {c.fournisseur}</span>}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right">
                  {c.quantite ? c.quantite : '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right font-medium text-danger">
                  -{c.montant_total.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right">
                  <div className="flex items-center justify-end gap-2">
                    <EditConsommationModal consommation={c} materiels={materiels} dict={dict} />
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={updatingId === c.id}
                      title={t.delete_title}
                      className="text-danger hover:text-danger/80 p-1 rounded-md disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {consommations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
                  {t.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
