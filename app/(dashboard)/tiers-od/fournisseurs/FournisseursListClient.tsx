'use client'

import { useState, useMemo } from 'react'
import { Search, Truck, Phone, MapPin, FileSpreadsheet, Eye } from 'lucide-react'
import Link from 'next/link'
import { FournisseurSummary } from '@/app/(dashboard)/bilans/releve-fournisseur/actions'
import AddFournisseurModal from '@/app/(dashboard)/bilans/releve-fournisseur/AddFournisseurModal'
import EditSoldeInitialFournisseurModal from '@/app/(dashboard)/bilans/releve-fournisseur/EditSoldeInitialFournisseurModal'
import { useUnite } from '@/components/DeviseProvider'

export default function FournisseursListClient({
  initialFournisseurs,
  dict,
  locale = 'fr',
}: {
  initialFournisseurs: FournisseurSummary[]
  dict: any
  locale?: string
}) {
  const unite = useUnite()
  const [fournisseurs, setFournisseurs] = useState<FournisseurSummary[]>(initialFournisseurs)
  const [query, setQuery] = useState('')

  const handleFournisseurCreated = (newFournisseur: any) => {
    setFournisseurs((prev) => [...prev, newFournisseur].sort((a, b) => a.nom.localeCompare(b.nom)))
  }

  const filteredFournisseurs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return fournisseurs
    return fournisseurs.filter((f) => {
      const nom = (f.nom || '').toLowerCase()
      const code = (f.code_fournisseur || '').toLowerCase()
      const tel = (f.telephone || '').toLowerCase()
      const adr = (f.adresse || '').toLowerCase()
      return nom.includes(q) || code.includes(q) || tel.includes(q) || adr.includes(q)
    })
  }, [fournisseurs, query])

  const totalDettes = useMemo(
    () => fournisseurs.reduce((sum, f) => sum + (Number(f.total_dette) || 0), 0),
    [fournisseurs]
  )
  const totalRegle = useMemo(
    () => fournisseurs.reduce((sum, f) => sum + (Number(f.total_regle) || 0), 0),
    [fournisseurs]
  )
  const totalSoldeDu = useMemo(
    () => fournisseurs.reduce((sum, f) => sum + (Number(f.solde_actuel) || 0), 0),
    [fournisseurs]
  )

  const numFormat = (n: number) =>
    Math.round(n).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')

  return (
    <div className="space-y-6">
      {/* KPI Cards Fournisseurs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Total Fournisseurs
            </span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold font-heading text-foreground">
            {fournisseurs.length}
          </p>
          <span className="text-xs text-foreground-muted">
            Partenaires & fournisseurs enregistrés
          </span>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Total Achats & Dettes
            </span>
            <span className="p-2 rounded-lg bg-danger/10 text-danger">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold font-heading text-danger">
            {numFormat(totalDettes)} {unite}
          </p>
          <span className="text-xs text-foreground-muted">
            Intrants, carburant, pièces & prestations
          </span>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Reste Dû aux Fournisseurs
            </span>
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold font-heading text-foreground">
            {numFormat(totalSoldeDu)} {unite}
          </p>
          <span className="text-xs text-foreground-muted">
            Règlements effectués : {numFormat(totalRegle)} {unite}
          </span>
        </div>
      </div>

      {/* Controls: Search & Actions */}
      <div className="sm:flex sm:items-center sm:justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-foreground-muted" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border border-surface-border py-2 pl-9 pr-3 bg-background text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-xs"
            placeholder="Rechercher par nom, code, téléphone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <Link
            href="/tiers-od/releve-fournisseur"
            className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-background transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-amber-500" />
            <span>Grand Livre des Fournisseurs</span>
          </Link>
          <AddFournisseurModal onCreated={handleFournisseurCreated} dict={dict} />
        </div>
      </div>

      {/* Table Fournisseurs */}
      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow-xs ring-1 ring-surface-border sm:rounded-lg bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-2 text-left text-xs font-semibold text-foreground-muted sm:pl-6 w-14">
                      N°
                    </th>
                    <th scope="col" className="py-3.5 pl-3 pr-3 text-left text-sm font-semibold text-foreground">
                      Code Fournisseur
                    </th>
                    <th scope="col" className="py-3.5 pl-3 pr-3 text-left text-sm font-semibold text-foreground">
                      Fournisseur / Raison sociale
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      Contact
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">
                      Total Dettes
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">
                      Total Règlements
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">
                      Solde Restant Dû
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-semibold text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {filteredFournisseurs.length > 0 ? (
                    filteredFournisseurs.map((f, index) => (
                      <tr key={f.id} className="hover:bg-background/50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-2 text-xs font-mono font-semibold text-foreground-muted sm:pl-6">
                          {String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="whitespace-nowrap py-4 pl-3 pr-3 text-sm">
                          <Link
                            href={`/tiers-od/releve-fournisseur?fournisseurId=${encodeURIComponent(f.id)}`}
                            className="font-mono text-xs font-bold text-amber-600 hover:underline"
                          >
                            {f.code_fournisseur || `FRS-${String(index + 1).padStart(3, '0')}`}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap py-4 pl-3 pr-3 text-sm font-medium text-foreground">
                          <div className="font-semibold text-foreground">{f.nom}</div>
                          {f.adresse && (
                            <div className="text-xs text-foreground-muted flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span>{f.adresse}</span>
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                          {f.telephone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-foreground-muted" />
                              <span>{f.telephone}</span>
                            </span>
                          ) : (
                            <span className="text-xs italic text-foreground-muted">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-danger font-medium">
                          {numFormat(f.total_dette || 0)} {unite}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-success font-medium">
                          {numFormat(f.total_regle || 0)} {unite}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-bold">
                          <span
                            className={
                              (f.solde_actuel || 0) > 0
                                ? 'text-danger'
                                : (f.solde_actuel || 0) < 0
                                ? 'text-primary'
                                : 'text-success'
                            }
                          >
                            {numFormat(f.solde_actuel || 0)} {unite}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <EditSoldeInitialFournisseurModal
                              fournisseur={f}
                              onSuccess={() => window.location.reload()}
                              dict={dict}
                            />
                            <Link
                              href={`/tiers-od/releve-fournisseur?fournisseurId=${encodeURIComponent(f.id)}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-surface hover:bg-background text-foreground border border-surface-border shadow-2xs transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-500" />
                              <span>Relevé</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        Aucun compte fournisseur trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
