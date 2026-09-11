'use client'

import { useState, useEffect, useCallback } from 'react'
import { getReleveClient } from './actions'
import AddClientModal from './AddClientModal'
import AddPaiementClientModal from './AddPaiementClientModal'

type Client = { id: string; nom: string; telephone: string | null }

export default function ReleveClientClient({
  initialClients,
  dict,
  locale,
}: {
  initialClients: Client[]
  dict: any
  locale: string
}) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [selectedClient, setSelectedClient] = useState(initialClients[0]?.id || '')
  const [journal, setJournal] = useState<any[]>([])
  const [soldeActuel, setSoldeActuel] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const t = dict.bilans_pages.releve_client
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  const fetchReleve = useCallback(async () => {
    if (!selectedClient) return
    setLoading(true)
    const res = await getReleveClient(selectedClient)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setError('')
      setJournal(res.journal || [])
      setSoldeActuel(res.soldeActuel || 0)
    }
  }, [selectedClient])

  useEffect(() => {
    fetchReleve()
  }, [fetchReleve])

  const handleClientCreated = (client: Client) => {
    setClients((prev) => [...prev, client].sort((a, b) => a.nom.localeCompare(b.nom)))
    setSelectedClient(client.id)
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h3 className="text-base font-semibold leading-6 text-foreground">{t.title}</h3>
        <p className="mt-2 text-sm text-foreground-muted">{t.desc}</p>
      </div>

      <div className="sm:flex sm:items-end sm:justify-between gap-4">
        <div className="max-w-sm w-full">
          <label htmlFor="client" className="block text-sm font-medium text-foreground mb-1">{t.select_client}</label>
          <select
            id="client"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
          >
            {clients.length === 0 && <option value="">{t.no_clients}</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <AddClientModal onCreated={handleClientCreated} dict={dict} />
          <AddPaiementClientModal clientId={selectedClient} onSuccess={fetchReleve} dict={dict} />
        </div>
      </div>

      {clients.length === 0 && (
        <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
          {t.no_clients}
        </div>
      )}

      {clients.length > 0 && loading && <div className="text-foreground-muted animate-pulse">{t.loading}</div>}
      {error && <div className="text-danger p-4 bg-danger/10 rounded-md">{error}</div>}

      {clients.length > 0 && !loading && !error && (
        <>
          <div className={`overflow-hidden rounded-lg px-4 py-5 shadow sm:p-6 max-w-xs ${soldeActuel > 0 ? 'bg-danger' : 'bg-success'} text-white`}>
            <dt className="text-sm font-medium text-white/90">{t.current_balance}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight">{soldeActuel.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} FCFA</dd>
          </div>

          <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
            <table className="min-w-full divide-y divide-surface-border">
              <thead className="bg-background">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.date}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.type}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.quantity}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.unit_price}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.amount}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.balance}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-surface">
                {journal.map((m, idx) => (
                  <tr key={m.id || idx} className="hover:bg-surface-hover transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                      {new Date(m.date).toLocaleDateString(dateLocale)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        m.type === 'vente' ? 'bg-danger/10 text-danger ring-danger/20' : 'bg-success/10 text-success ring-success/20'
                      }`}>
                        {m.type === 'vente' ? t.type_sale : t.type_payment}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground-muted">
                      {m.quantite !== null ? Number(m.quantite).toLocaleString(dateLocale, { maximumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground-muted">
                      {m.prix_unitaire !== null ? `${Number(m.prix_unitaire).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} FCFA` : '-'}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-sm text-right font-medium ${m.type === 'vente' ? 'text-danger' : 'text-success'}`}>
                      {m.type === 'vente' ? '+' : '-'}{Number(m.montant).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} FCFA
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground font-semibold bg-background/50">
                      {Number(m.solde).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} FCFA
                    </td>
                  </tr>
                ))}
                {journal.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
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
