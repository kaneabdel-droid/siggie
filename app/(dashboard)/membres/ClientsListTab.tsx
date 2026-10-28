'use client'

import { useState, useMemo } from 'react'
import { Search, UserPlus, Phone, Tag, Eye, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'
import FicheClientModal from '@/components/FicheClientModal'
import AddClientModal from '@/app/(dashboard)/bilans/releve-client/AddClientModal'

type ClientItem = {
  id: string
  nom: string
  telephone: string | null
  code_client?: string | null
}

export default function ClientsListTab({
  initialClients,
  gieName,
  dict,
  locale = 'fr',
}: {
  initialClients: ClientItem[]
  gieName: string
  dict: any
  locale?: string
}) {
  const [clients, setClients] = useState<ClientItem[]>(initialClients)
  const [query, setQuery] = useState('')

  const handleClientCreated = (newClient: ClientItem) => {
    setClients((prev) => [...prev, newClient].sort((a, b) => a.nom.localeCompare(b.nom)))
  }

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) => {
      const nom = (c.nom || '').toLowerCase()
      const code = (c.code_client || '').toLowerCase()
      const tel = (c.telephone || '').toLowerCase()
      return nom.includes(q) || code.includes(q) || tel.includes(q)
    })
  }, [clients, query])

  return (
    <div className="space-y-6">
      {/* Controls: Search & Add button */}
      <div className="sm:flex sm:items-center sm:justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-foreground-muted" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border border-surface-border py-2 pl-9 pr-3 bg-background text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-xs"
            placeholder="Rechercher par nom, code (CLI-...), téléphone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <Link
            href="/bilans/releve-client"
            className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-background transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span>Relevés de comptes clients</span>
          </Link>
          <AddClientModal onCreated={handleClientCreated} dict={dict} />
        </div>
      </div>

      {/* Table */}
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
                      Code client (cliquable)
                    </th>
                    <th scope="col" className="py-3.5 pl-3 pr-3 text-left text-sm font-semibold text-foreground">
                      Nom du client
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      Téléphone
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      Type
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-semibold text-foreground">
                      Fiche & Relevé
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client, index) => {
                      const displayCode = client.code_client || `CLI-${client.id ? client.id.slice(0, 4).toUpperCase() : String(index + 1).padStart(3, '0')}`
                      return (
                        <tr key={client.id} className="hover:bg-background/50 transition-colors">
                          <td className="whitespace-nowrap py-4 pl-4 pr-2 text-xs font-mono font-semibold text-foreground-muted sm:pl-6">
                            {String(index + 1).padStart(2, '0')}
                          </td>
                          <td className="whitespace-nowrap py-4 pl-3 pr-3 text-sm">
                            <FicheClientModal
                              client={{ ...client, code_client: displayCode }}
                              gieName={gieName}
                              dict={dict}
                              locale={locale}
                            />
                          </td>
                          <td className="whitespace-nowrap py-4 pl-3 pr-3 text-sm font-medium text-foreground">
                            {client.nom}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted font-mono">
                            {client.telephone ? (
                              <span className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-foreground-muted" />
                                {client.telephone}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                            <span className="inline-flex items-center rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary border border-secondary/20">
                              Client externe
                            </span>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <FicheClientModal
                                client={{ ...client, code_client: displayCode }}
                                gieName={gieName}
                                dict={dict}
                                locale={locale}
                                triggerButton={
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-surface hover:bg-background text-foreground border border-surface-border shadow-2xs transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                    <span>Toutes les données</span>
                                  </button>
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        Aucun client trouvé.
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
