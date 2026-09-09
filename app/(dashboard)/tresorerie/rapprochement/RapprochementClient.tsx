'use client'

import { useState, useEffect, useCallback } from 'react'
import { getRapprochement } from '../actions'
import { Building2, Landmark, Wallet, CheckCircle2 } from 'lucide-react'

export default function RapprochementClient({ campagnes, dict, locale }: { campagnes: any[], dict: any, locale: string }) {
  const [selectedCampagne, setSelectedCampagne] = useState(campagnes[0]?.id || '')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const t = dict.tresorerie_pages.rapprochement
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  const fetchBilan = useCallback(async () => {
    if (!selectedCampagne) return
    setLoading(true)
    const res = await getRapprochement(selectedCampagne)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
      setData(null)
    } else {
      setError('')
      setData(res)
    }
  }, [selectedCampagne])

  useEffect(() => {
    fetchBilan()
  }, [fetchBilan])

  return (
    <div className="space-y-6">
      <div className="max-w-sm mb-8">
        <label htmlFor="campagne" className="block text-sm font-medium text-foreground mb-1">{t.select_campaign}</label>
        <select
          id="campagne"
          value={selectedCampagne}
          onChange={(e) => setSelectedCampagne(e.target.value)}
          className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
        >
          {campagnes.map(c => (
            <option key={c.id} value={c.id}>{c.nom} ({c.statut})</option>
          ))}
        </select>
      </div>

      {loading && <div className="text-foreground-muted animate-pulse">{t.loading}</div>}
      {error && <div className="text-danger p-4 bg-danger/10 rounded-md">{error}</div>}

      {!loading && data && (
        <div className="space-y-8">
          {/* Section Bilan */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-surface-border p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                <Landmark className="w-5 h-5" />
                {t.credit_granted}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {data.bilan.montantAccorde.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-foreground-muted">FCFA</span>
              </div>
              <div className="text-sm text-foreground-muted mt-1">{data.credit.banque_nom}</div>
            </div>

            <div className="bg-surface border border-surface-border p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 text-warning font-semibold mb-2">
                <Building2 className="w-5 h-5" />
                {t.supplier_payments}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {data.bilan.totalPaiementsFournisseurs.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-foreground-muted">FCFA</span>
              </div>
            </div>

            <div className="bg-surface border border-surface-border p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 text-danger font-semibold mb-2">
                <Wallet className="w-5 h-5" />
                {t.cash_withdrawals}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {data.bilan.totalRetraits.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-foreground-muted">FCFA</span>
              </div>
            </div>

            <div className={`border p-4 rounded-lg shadow-sm text-white ${data.bilan.soldeCredit >= 0 ? 'bg-success border-success' : 'bg-danger border-danger'}`}>
              <div className="flex items-center gap-2 font-semibold mb-2 text-white">
                <CheckCircle2 className="w-5 h-5" />
                {t.credit_balance}
              </div>
              <div className="text-2xl font-bold text-white">
                {data.bilan.soldeCredit.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-white">FCFA</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Paiements fournisseurs */}
            <div className="bg-surface rounded-lg shadow border border-surface-border">
              <div className="px-4 py-5 sm:px-6 border-b border-surface-border">
                <h3 className="text-lg font-medium leading-6 text-foreground">{t.supplier_payments_title}</h3>
              </div>
              <ul role="list" className="divide-y divide-surface-border">
                {data.paiementsFournisseurs.map((p: any) => (
                  <li key={p.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">{p.motif}</p>
                      <div className="ml-2 flex flex-shrink-0">
                        <p className="inline-flex rounded-full bg-warning/10 px-2 text-xs font-semibold leading-5 text-warning">
                          {p.montant.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} FCFA
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-foreground-muted">
                          {t.account_label} : {p.comptes?.nom || t.unknown_account}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-foreground-muted sm:mt-0">
                        {new Date(p.date_transaction).toLocaleDateString(dateLocale)}
                      </div>
                    </div>
                  </li>
                ))}
                {data.paiementsFournisseurs.length === 0 && (
                  <li className="px-4 py-4 sm:px-6 text-sm text-foreground-muted italic">{t.no_payment}</li>
                )}
              </ul>
            </div>

            {/* Retraits Espèces */}
            <div className="bg-surface rounded-lg shadow border border-surface-border">
              <div className="px-4 py-5 sm:px-6 border-b border-surface-border">
                <h3 className="text-lg font-medium leading-6 text-foreground">{t.cash_withdrawals_title}</h3>
              </div>
              <ul role="list" className="divide-y divide-surface-border">
                {data.retraits.map((r: any) => (
                  <li key={r.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">{r.motif}</p>
                      <div className="ml-2 flex flex-shrink-0">
                        <p className="inline-flex rounded-full bg-danger/10 px-2 text-xs font-semibold leading-5 text-danger">
                          {r.montant.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} FCFA
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-foreground-muted">
                          {t.account_label} : {r.comptes?.nom || t.unknown_account}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-foreground-muted sm:mt-0">
                        {new Date(r.date_transaction).toLocaleDateString(dateLocale)}
                      </div>
                    </div>
                  </li>
                ))}
                {data.retraits.length === 0 && (
                  <li className="px-4 py-4 sm:px-6 text-sm text-foreground-muted italic">{t.no_withdrawal}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
