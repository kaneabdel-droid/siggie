'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, X, RotateCcw, Trash2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { getReleveClient, deletePaiementClient, deleteVenteClient } from './actions'
import AddClientModal from './AddClientModal'
import AddPaiementClientModal from './AddPaiementClientModal'
import EditPaiementClientModal from './EditPaiementClientModal'
import EditVenteClientModal from './EditVenteClientModal'
import EditSoldeInitialClientModal from './EditSoldeInitialClientModal'
import PrintSectionButton from '@/components/PrintSectionButton'
import { useUnite } from '@/components/DeviseProvider'
import DownloadPdfButton from '@/app/(dashboard)/facturation/DownloadPdfButton'
import FactureWhatsAppModal from '@/app/(dashboard)/facturation/FactureWhatsAppModal'
import FicheClientModal from '@/components/FicheClientModal'

type Client = { id: string; nom: string; telephone: string | null; solde_initial?: number; code_client?: string }

export default function ReleveClientClient({
  initialClients,
  dict,
  locale,
  gieName,
}: {
  initialClients: Client[]
  dict: any
  locale: string
  gieName: string
}) {
  const unite = useUnite()
  const [clients, setClients] = useState<Client[]>(initialClients)
  const searchParams = useSearchParams()
  const urlClientParam = searchParams.get('clientId') || searchParams.get('search')
  const matchedInitial = useMemo(() => {
    if (!urlClientParam) return null
    const paramLow = decodeURIComponent(urlClientParam).toLowerCase().trim()
    return initialClients.find((c) => {
      const cNom = c.nom.toLowerCase()
      return c.id === urlClientParam || cNom === paramLow || cNom.includes(paramLow) || paramLow.includes(cNom)
    })
  }, [urlClientParam, initialClients])
  const [selectedClient, setSelectedClient] = useState(
    matchedInitial ? matchedInitial.id : (initialClients[0]?.id || '')
  )
  useEffect(() => {
    if (matchedInitial && matchedInitial.id !== selectedClient) {
      setSelectedClient(matchedInitial.id)
    }
  }, [matchedInitial, selectedClient])
  const [journal, setJournal] = useState<any[]>([])
  const [soldeActuel, setSoldeActuel] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clientDetails, setClientDetails] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filtres et Recherche
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'vente' | 'prestation' | 'paiement'>('all')

  const t = dict?.bilans_pages?.releve_client || {}
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
      if (res.client) {
        setClientDetails(res.client)
        setClients((prev) =>
          prev.map((c) => (c.id === res.client.id ? { ...c, ...res.client } : c))
        )
      }
    }
  }, [selectedClient])

  useEffect(() => {
    fetchReleve()
  }, [fetchReleve])

  const handleClientCreated = (newClient: Client) => {
    setClients((prev) => [...prev, newClient].sort((a, b) => a.nom.localeCompare(b.nom)))
    setSelectedClient(newClient.id)
  }

  const handleDeletePaiement = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce paiement ? Les écritures de trésorerie et le solde du client seront immédiatement mis à jour.")) {
      return
    }
    setDeletingId(id)
    const res = await deletePaiementClient(id)
    setDeletingId(null)
    if (res?.error) {
      alert(res.error)
    } else {
      fetchReleve()
    }
  }

  const handleDeleteVente = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette vente ? La quantité sera réintégrée dans le stock en nature et le solde du client sera réajusté.")) {
      return
    }
    setDeletingId(id)
    const res = await deleteVenteClient(id)
    setDeletingId(null)
    if (res?.error) {
      alert(res.error)
    } else {
      fetchReleve()
    }
  }

  const currentClientObj = useMemo(() => {
    return clientDetails || clients.find((c) => c.id === selectedClient) || { id: selectedClient, nom: '' }
  }, [clientDetails, clients, selectedClient])

  const selectedClientNom = currentClientObj.nom || ''

  const filteredMouvements = useMemo(() => {
    return journal.filter((m) => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const desig = (m.designation || '').toLowerCase()
        const mont = String(m.montant || '')
        const dateStr = String(m.date || '')
        const qteStr = String(m.quantite || '')
        const typeStr = String(m.type || '')
        const matches =
          desig.includes(term) ||
          mont.includes(term) ||
          dateStr.includes(term) ||
          qteStr.includes(term) ||
          typeStr.includes(term)
        if (!matches) return false
      }
      return true
    })
  }, [journal, typeFilter, searchTerm])

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h3 className="text-base font-semibold leading-6 text-foreground">{t.title || "Grand Livre / Relevé Client"}</h3>
        <p className="mt-2 text-sm text-foreground-muted">{t.desc || "Consultez l'historique complet des factures et des règlements par client externe."}</p>
      </div>

      <div className="sm:flex sm:items-end sm:justify-between gap-4">
        <div className="max-w-sm w-full">
          <label htmlFor="client" className="block text-sm font-medium text-foreground mb-1">{t.select_client || "Sélectionner un client"}</label>
          <select
            id="client"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
          >
            {clients.length === 0 && <option value="">{t.no_clients || "Aucun client"}</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.nom} {c.code_client ? `(${c.code_client})` : ''}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
          <AddClientModal onCreated={handleClientCreated} dict={dict} />
          {selectedClient && (
            <>
              <AddPaiementClientModal clientId={selectedClient} onSuccess={fetchReleve} dict={dict} />
              <EditSoldeInitialClientModal client={currentClientObj} onSuccess={fetchReleve} dict={dict} />
              <FicheClientModal
                client={currentClientObj}
                gieName={gieName}
                dict={dict}
                locale={locale}
                triggerButton={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:bg-background transition-colors"
                  >
                    <span>Fiche client</span>
                  </button>
                }
              />
            </>
          )}
          {clients.length > 0 && !loading && !error && (
            <PrintSectionButton sectionId="releve-client-print" label={dict.common.print} />
          )}
        </div>
      </div>

      {clients.length === 0 && (
        <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
          {t.no_clients || "Aucun client enregistré."}
        </div>
      )}

      {clients.length > 0 && loading && <div className="text-foreground-muted animate-pulse">{t.loading || "Chargement..."}</div>}
      {error && <div className="text-danger p-4 bg-danger/10 rounded-md">{error}</div>}

      {clients.length > 0 && !loading && !error && (
        <div id="releve-client-print" className="space-y-4">
          <div className="hidden print:block mb-4">
            <h2 className="text-xl font-bold text-foreground">{gieName}</h2>
            <p className="text-sm text-foreground-muted">{t.title || "Relevé Client"} — {selectedClientNom}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className={`overflow-hidden rounded-lg px-4 py-5 shadow sm:p-6 max-w-xs ${soldeActuel > 0 ? 'bg-danger' : 'bg-success'} text-white`}>
              <dt className="text-sm font-medium text-white/90">{t.current_balance || "Solde actuel dû"}</dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight">{soldeActuel.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{unite}</dd>
            </div>

            {currentClientObj.solde_initial ? (
              <div className="overflow-hidden rounded-lg px-4 py-5 shadow sm:p-6 max-w-xs bg-surface border border-surface-border">
                <dt className="text-xs font-medium text-foreground-muted">Solde initial reporté</dt>
                <dd className="mt-1 text-lg font-bold text-foreground">
                  {Number(currentClientObj.solde_initial).toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{unite}
                </dd>
              </div>
            ) : null}
          </div>

          {/* Barre de Recherche et Filtre du Relevé Client */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface border border-surface-border p-3 rounded-lg shadow-2xs">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-foreground-muted" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par désignation, date, montant..."
                className="w-full rounded-md border border-surface-border bg-background py-1.5 pl-9 pr-8 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-foreground-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="rounded-md border border-surface-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
              >
                <option value="all">Tous types</option>
                <option value="vente">Ventes de stock</option>
                <option value="prestation">Prestations matériel</option>
                <option value="paiement">Paiements & règlements</option>
              </select>

              {(searchTerm || typeFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setTypeFilter('all')
                  }}
                  className="p-1.5 text-foreground-muted hover:text-foreground rounded-md border border-surface-border bg-background shadow-2xs"
                  title="Réinitialiser"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
            <table className="min-w-full divide-y divide-surface-border">
              <thead className="bg-background">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.date || "Date"}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.type || "Type"}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.quantity || "Quantité"}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.unit_price || "Prix unitaire"}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.amount || "Montant"}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.balance || "Solde"}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider print:hidden">Facture / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-surface">
                {filteredMouvements.map((m, idx) => {
                  const isDebit = m.type === 'vente' || m.type === 'prestation'
                  const isSoldeInit = m.raw?.isSoldeInitial
                  const isVente = m.type === 'vente' && !isSoldeInit
                  const isPaiementModifiable = m.type === 'paiement' && m.raw?.isPaiementClient && !isSoldeInit

                  const factureDoc =
                    m.type === 'prestation' && m.raw
                      ? { ...m.raw, type_document: 'prestation' as const, tiers_type: 'client' }
                      : m.type === 'vente' && m.raw && !isSoldeInit
                      ? { ...m.raw, type_document: 'vente_stock' as const, tiers_type: 'client', montant_total: m.montant }
                      : null

                  return (
                    <tr key={m.id || idx} className="hover:bg-surface-hover transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                        {new Date(m.date).toLocaleDateString(dateLocale)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            isSoldeInit
                              ? 'bg-purple-500/10 text-purple-600 ring-purple-500/20'
                              : m.type === 'vente'
                              ? 'bg-danger/10 text-danger ring-danger/20'
                              : m.type === 'prestation'
                              ? 'bg-secondary/15 text-secondary ring-secondary/20'
                              : 'bg-success/10 text-success ring-success/20'
                          }`}>
                            {isSoldeInit
                              ? 'Report Initial'
                              : m.type === 'vente'
                              ? (t.type_sale || 'Vente')
                              : m.type === 'prestation'
                              ? 'Prestation Matériel'
                              : (t.type_payment || 'Paiement')}
                          </span>
                          {m.designation && (
                            <span className="text-xs text-foreground font-medium">{m.designation}</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground-muted">
                        {m.quantite !== null
                          ? `${Number(m.quantite).toLocaleString(dateLocale, { maximumFractionDigits: 2 })}${m.unite ? ` ${m.unite}` : ''}`
                          : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground-muted">
                        {m.prix_unitaire !== null ? `${Number(m.prix_unitaire).toLocaleString(dateLocale, { maximumFractionDigits: 0 })}${unite}` : '-'}
                      </td>
                      <td className={`whitespace-nowrap px-6 py-4 text-sm text-right font-medium ${isDebit ? 'text-danger' : 'text-success'}`}>
                        {isDebit ? '+' : '-'}{Number(m.montant).toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{unite}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground font-semibold bg-background/50">
                        {Number(m.solde).toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{unite}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-right print:hidden">
                        <div className="flex items-center justify-end gap-1.5">
                          {factureDoc && (
                            <>
                              <FactureWhatsAppModal facture={factureDoc} gieName={gieName} dict={dict} />
                              <DownloadPdfButton facture={factureDoc} dict={dict} gieName={gieName} />
                            </>
                          )}

                          {isVente && (
                            <>
                              <EditVenteClientModal mouvement={m} onSuccess={fetchReleve} dict={dict} />
                              <button
                                type="button"
                                onClick={() => handleDeleteVente(m.id)}
                                disabled={deletingId === m.id}
                                className="p-1 rounded text-foreground-muted hover:text-danger hover:bg-background transition-colors disabled:opacity-50"
                                title="Supprimer cette facture de vente"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}

                          {isPaiementModifiable && (
                            <>
                              <EditPaiementClientModal mouvement={m} onSuccess={fetchReleve} dict={dict} />
                              <button
                                type="button"
                                onClick={() => handleDeletePaiement(m.id)}
                                disabled={deletingId === m.id}
                                className="p-1 rounded text-foreground-muted hover:text-danger hover:bg-background transition-colors disabled:opacity-50"
                                title="Supprimer ce paiement"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}

                          {!factureDoc && !isVente && !isPaiementModifiable && (
                            <span className="text-foreground-muted">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredMouvements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
                      {t.empty || "Aucune écriture enregistrée pour ce client."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
