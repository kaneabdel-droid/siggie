'use client'

import { useState } from 'react'
import { Phone, Trash2 } from 'lucide-react'
import { deletePrestation } from '../actions'
import EditPrestationModal from './EditPrestationModal'
import type { ProduitMateriel } from './PrestationFields'
import type { ContexteBudgetMateriel } from '../BudgetCampagneChamps'
import { useUnite } from '@/components/DeviseProvider'

export default function PrestationsClient({
  prestations,
  materiels,
  produits,
  varietes,
  budget,
  dict,
  locale,
}: {
  prestations: any[]
  materiels: any[]
  produits: ProduitMateriel[]
  varietes: Record<string, string[]>
  budget: ContexteBudgetMateriel
  dict: any
  locale: string
}) {
  const uniteDevise = useUnite()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const t = dict.materiel_pages.prestations
  const dateLocale = locale === 'fr' ? 'fr-FR' : locale === 'ar' ? 'ar-SN' : 'en-US'
  const nombre = (n: number) => Number(n).toLocaleString(dateLocale, { maximumFractionDigits: 2 })

  async function handleDelete(id: string) {
    if (!confirm(t.delete_confirm)) return
    setUpdatingId(id)
    const res = await deletePrestation(id)
    if (res?.error) {
      alert(res.error)
      setUpdatingId(null)
    }
  }

  function unite(p: any) {
    if (p.unite === 'autre') return p.unite_autre || t.units.autre
    return t.units[p.unite ?? 'ha']
  }

  const total = prestations.reduce((sum, p) => sum + (p.montant_facture || 0), 0)

  // Totaux pointés par unité de travail (ha, h, sacs…)
  const totauxUnites = new Map<string, number>()
  for (const p of prestations) {
    const q = Number(p.quantite_traitee || (p.unite === 'ha' || !p.unite ? p.superficie : 0) || 0)
    if (q) totauxUnites.set(unite(p), (totauxUnites.get(unite(p)) ?? 0) + q)
  }

  const th = 'px-4 py-3 text-start text-xs font-medium text-foreground-muted uppercase tracking-wider'

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-surface-border rounded-lg p-4 flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <div>
          <h3 className="text-sm font-medium text-foreground-muted">{t.total}</h3>
          <p className="mt-1 text-2xl font-semibold text-success">{total.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{uniteDevise}</p>
        </div>
        {totauxUnites.size > 0 && (
          <div>
            <h3 className="text-sm font-medium text-foreground-muted">{t.headers.quantity}</h3>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {[...totauxUnites].map(([u, q]) => `${nombre(q)} ${u}`).join(' · ')}
            </p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-background">
            <tr>
              <th scope="col" className={th}>{dict.common.date}</th>
              <th scope="col" className={th}>{t.headers.equipment}</th>
              <th scope="col" className={th}>{t.headers.type}</th>
              <th scope="col" className={`${th} text-end`}>{t.headers.quantity}</th>
              <th scope="col" className={th}>{t.headers.obtained}</th>
              <th scope="col" className={`${th} text-end`}>{t.headers.amount}</th>
              <th scope="col" className={`${th} text-end print:hidden`}>{dict.common.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-surface">
            {prestations.map((p) => {
              const quantite = Number(p.quantite_traitee || (p.unite === 'ha' || !p.unite ? p.superficie : 0) || 0)
              return (
                <tr key={p.id} className="hover:bg-surface-hover transition-colors align-top">
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-foreground">
                    {new Date(p.date_prestation).toLocaleDateString(dateLocale)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-foreground">
                    {p.materiel?.nom || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground-muted">
                    <span className="font-medium text-foreground">{p.type_prestation}</span>
                    {p.campagne?.nom && <span className="ms-2 rounded bg-background px-1.5 py-0.5 text-xs">{p.campagne.nom}</span>}
                    {p.client_nom && <span className="block text-xs">{t.for_client} {p.client_nom}</span>}
                    {p.client_telephone && (
                      <a href={`tel:${p.client_telephone.replace(/[^\d+]/g, '')}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline" dir="ltr">
                        <Phone className="h-3 w-3" aria-hidden="true" />
                        {p.client_telephone}
                      </a>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-end text-foreground">
                    {quantite ? `${nombre(quantite)} ${unite(p)}` : '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground-muted">
                    {p.quantite_obtenue != null ? (
                      <>
                        <span className="text-foreground">
                          {nombre(p.quantite_obtenue)} {p.unite_obtenue}
                          {p.produit?.nom && ` · ${p.produit.nom}`}
                        </span>
                        {p.variete && <span className="block text-xs">{dict.materiel_pages.prestations.form.variety_label} : {p.variete}</span>}
                        {p.mode_paiement === 'part_recolte' && p.part_quantite != null && (
                          <span className="block text-xs">
                            {t.share} {nombre(p.taux_part)} % : {nombre(p.part_quantite)} {p.unite_obtenue}
                          </span>
                        )}
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-end font-medium text-success">
                    +{Number(p.montant_facture).toLocaleString(dateLocale, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-end print:hidden">
                    <div className="flex items-center justify-end gap-2">
                      <EditPrestationModal prestation={p} materiels={materiels} produits={produits} varietes={varietes} budget={budget} dict={dict} />
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={updatingId === p.id}
                        title={t.delete_title}
                        className="text-danger hover:text-danger/80 p-1 rounded-md disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {prestations.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
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
