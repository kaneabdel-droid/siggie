'use client'

import { useMemo, useState } from 'react'
import { Filter, Phone, RotateCcw, Trash2 } from 'lucide-react'
import { deletePrestation } from '../actions'
import EditPrestationModal from './EditPrestationModal'
import type { ProduitMateriel } from './PrestationFields'
import type { ContexteBudgetMateriel } from '../BudgetCampagneChamps'
import { useUnite } from '@/components/DeviseProvider'
import DownloadPdfButton from '@/app/(dashboard)/facturation/DownloadPdfButton'
import FactureWhatsAppModal from '@/app/(dashboard)/facturation/FactureWhatsAppModal'

export default function PrestationsClient({
  prestations,
  materiels,
  produits,
  varietes,
  budget,
  dict,
  locale,
  gieName = 'Mon GIE',
}: {
  prestations: any[]
  materiels: any[]
  produits: ProduitMateriel[]
  varietes: Record<string, string[]>
  budget: ContexteBudgetMateriel
  dict: any
  locale: string
  gieName?: string
}) {
  const uniteDevise = useUnite()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedMaterielId, setSelectedMaterielId] = useState<string>('all')
  const [selectedCampagneId, setSelectedCampagneId] = useState<string>('all')
  const [dateDebut, setDateDebut] = useState<string>('')
  const [dateFin, setDateFin] = useState<string>('')
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

  const filteredPrestations = useMemo(() => {
    return prestations.filter((p) => {
      if (selectedMaterielId !== 'all' && p.materiel_id !== selectedMaterielId) return false
      if (selectedCampagneId === '__none__') {
        if (p.campagne_id) return false
      } else if (selectedCampagneId !== 'all' && p.campagne_id !== selectedCampagneId) {
        return false
      }
      const d = p.date_prestation ? String(p.date_prestation).slice(0, 10) : ''
      if (dateDebut && (!d || d < dateDebut)) return false
      if (dateFin && (!d || d > dateFin)) return false
      return true
    })
  }, [prestations, selectedMaterielId, selectedCampagneId, dateDebut, dateFin])

  const hasActiveFilters =
    selectedMaterielId !== 'all' ||
    selectedCampagneId !== 'all' ||
    Boolean(dateDebut) ||
    Boolean(dateFin)

  function resetFilters() {
    setSelectedMaterielId('all')
    setSelectedCampagneId('all')
    setDateDebut('')
    setDateFin('')
  }

  const total = filteredPrestations.reduce((sum, p) => sum + (p.montant_facture || 0), 0)

  // Totaux pointés par unité de travail (ha, h, sacs…)
  const totauxUnites = new Map<string, number>()
  for (const p of filteredPrestations) {
    const q = Number(p.quantite_traitee || (p.unite === 'ha' || !p.unite ? p.superficie : 0) || 0)
    if (q) totauxUnites.set(unite(p), (totauxUnites.get(unite(p)) ?? 0) + q)
  }

  const th = 'px-4 py-3 text-start text-xs font-medium text-foreground-muted uppercase tracking-wider'
  const inputClass =
    'block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

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
        {hasActiveFilters && (
          <p className="text-xs text-foreground-muted">
            {filteredPrestations.length} sur {prestations.length} prestation(s)
          </p>
        )}
      </div>

      {/* Barre de filtres */}
      <div className="rounded-lg border border-surface-border bg-surface p-4 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Filtres</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Réinitialiser
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="filter-prest-materiel" className="block text-xs font-medium text-foreground-muted mb-1">
              {t.headers.equipment}
            </label>
            <select
              id="filter-prest-materiel"
              value={selectedMaterielId}
              onChange={(e) => setSelectedMaterielId(e.target.value)}
              className={inputClass}
            >
              <option value="all">Tous les matériels</option>
              {materiels.map((m) => (
                <option key={m.id} value={m.id}>{m.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-prest-campagne" className="block text-xs font-medium text-foreground-muted mb-1">
              Campagne
            </label>
            <select
              id="filter-prest-campagne"
              value={selectedCampagneId}
              onChange={(e) => setSelectedCampagneId(e.target.value)}
              className={inputClass}
            >
              <option value="all">Toutes les campagnes</option>
              <option value="__none__">Sans campagne</option>
              {(budget.campagnes || []).map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-prest-debut" className="block text-xs font-medium text-foreground-muted mb-1">
              Période (Du)
            </label>
            <input
              id="filter-prest-debut"
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="filter-prest-fin" className="block text-xs font-medium text-foreground-muted mb-1">
              Période (Au)
            </label>
            <input
              id="filter-prest-fin"
              type="date"
              value={dateFin}
              min={dateDebut || undefined}
              onChange={(e) => setDateFin(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
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
            {filteredPrestations.map((p) => {
              const quantite = Number(p.quantite_traitee || (p.unite === 'ha' || !p.unite ? p.superficie : 0) || 0)
              const isMembre =
                p.tiers_type === 'membre' ||
                Boolean(p.membre_id) ||
                (!p.client_id &&
                  p.client_nom &&
                  (budget.membres || []).some(
                    (m) => `${m.prenom} ${m.nom}`.trim().toLowerCase() === String(p.client_nom).trim().toLowerCase()
                  ))
              const factureDoc = {
                ...p,
                type_document: 'prestation' as const,
                tiers_type: isMembre ? 'membre' : 'client',
              }

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
                    {p.client_nom && (
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span>{t.for_client} <strong className="text-foreground">{p.client_nom}</strong></span>
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          isMembre ? 'bg-primary/10 text-primary' : 'bg-secondary/15 text-secondary'
                        }`}>
                          {isMembre ? 'Relevé Membre' : 'Relevé Client'}
                        </span>
                      </span>
                    )}
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
                    <div className="flex items-center justify-end gap-1">
                      <FactureWhatsAppModal facture={factureDoc} gieName={gieName} dict={dict} />
                      <DownloadPdfButton facture={factureDoc} dict={dict} gieName={gieName} />
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
            {filteredPrestations.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
                  {hasActiveFilters ? 'Aucune prestation ne correspond aux filtres sélectionnés.' : t.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

