'use client'

import { useState, useEffect, useCallback } from 'react'
import { getReleveMembre } from './actions'

export default function ReleveMembreClient({
  membres,
  dict,
  locale,
}: {
  membres: any[]
  dict: any
  locale: string
}) {
  const [selectedMembre, setSelectedMembre] = useState(membres[0]?.id || '')
  const [lignes, setLignes] = useState<any[]>([])
  const [soldeFinal, setSoldeFinal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const t = dict.bilans_pages.releve_membre
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  const fetchReleve = useCallback(async () => {
    if (!selectedMembre) return
    setLoading(true)
    const res = await getReleveMembre(selectedMembre)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setError('')
      setLignes(res.lignes || [])
      setSoldeFinal(res.soldeFinal || 0)
    }
  }, [selectedMembre])

  useEffect(() => {
    fetchReleve()
  }, [fetchReleve])

  if (membres.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
        {t.no_members}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h3 className="text-base font-semibold leading-6 text-foreground">{t.title}</h3>
        <p className="mt-2 text-sm text-foreground-muted">{t.desc}</p>
      </div>

      <div className="max-w-sm">
        <label htmlFor="membre" className="block text-sm font-medium text-foreground mb-1">{t.select_member}</label>
        <select
          id="membre"
          value={selectedMembre}
          onChange={(e) => setSelectedMembre(e.target.value)}
          className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
        >
          {membres.map((m) => (
            <option key={m.id} value={m.id}>{m.prenom} {m.nom} {m.code_membre ? `[${m.code_membre}]` : ''}</option>
          ))}
        </select>
      </div>

      {loading && <div className="text-foreground-muted animate-pulse">{t.loading}</div>}
      {error && <div className="text-danger p-4 bg-danger/10 rounded-md">{error}</div>}

      {!loading && !error && (
        <>
          <div className={`overflow-hidden rounded-lg px-4 py-5 shadow sm:p-6 max-w-xs ${soldeFinal > 0 ? 'bg-danger' : 'bg-success'} text-white`}>
            <dt className="text-sm font-medium text-white/90">{t.current_balance}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight">{soldeFinal.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} FCFA</dd>
          </div>

          <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
            <table className="min-w-full divide-y divide-surface-border">
              <thead className="bg-background">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.season}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.date}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.billed}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.paid}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.balance}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-surface">
                {lignes.map((l) => (
                  <tr key={l.id} className="hover:bg-surface-hover transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">{l.campagne}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground-muted">
                      {l.date ? new Date(l.date).toLocaleDateString(dateLocale) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground">
                      {l.montant_facture.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} FCFA
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-success">
                      {l.montant_paye.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} FCFA
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-sm text-right font-semibold ${l.solde_progressif > 0 ? 'text-danger' : 'text-success'}`}>
                      {l.solde_progressif.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} FCFA
                    </td>
                  </tr>
                ))}
                {lignes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
                      {t.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
