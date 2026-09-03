'use client'

import { useState, useEffect, useCallback } from 'react'
import { getJournal } from '../actions'
import AddTransactionModal from './AddTransactionModal'

export default function JournalClient({ comptes }: { comptes: any[] }) {
  const [selectedCompte, setSelectedCompte] = useState(comptes[0]?.id || '')
  const [journal, setJournal] = useState<any[]>([])
  const [soldeInitial, setSoldeInitial] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchJournal = useCallback(async () => {
    if (!selectedCompte) return
    setLoading(true)
    const res = await getJournal(selectedCompte)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setError('')
      setJournal(res.journal || [])
      setSoldeInitial(res.soldeInitial || 0)
    }
  }, [selectedCompte])

  useEffect(() => {
    fetchJournal()
  }, [fetchJournal])

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-end sm:justify-between">
        <div className="max-w-sm w-full">
          <label htmlFor="compte" className="block text-sm font-medium text-foreground mb-1">Choisir un compte</label>
          <select
            id="compte"
            value={selectedCompte}
            onChange={(e) => setSelectedCompte(e.target.value)}
            className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
          >
            {comptes.map(c => (
              <option key={c.id} value={c.id}>{c.nom} ({c.type_compte})</option>
            ))}
          </select>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <AddTransactionModal compteId={selectedCompte} onSuccess={fetchJournal} />
        </div>
      </div>

      {loading && <div className="text-foreground-muted animate-pulse">Chargement du journal...</div>}
      {error && <div className="text-danger">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
          <table className="min-w-full divide-y divide-surface-border">
            <thead className="bg-background">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">Motif</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">Entrée</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">Sortie</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">Solde en cours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface">
              {journal.map((ligne, idx) => (
                <tr key={ligne.id || idx} className="hover:bg-surface-hover transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                    {new Date(ligne.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {ligne.motif}
                    {ligne.type_piece && <span className="ml-2 text-xs text-secondary">[{ligne.type_piece}]</span>}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-success font-medium">
                    {ligne.entree ? `+${ligne.entree.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}` : ''}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-danger font-medium">
                    {ligne.sortie ? `-${ligne.sortie.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}` : ''}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground font-semibold bg-background/50">
                    {ligne.solde.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
              {/* Ligne du solde initial */}
              <tr className="bg-background/80">
                <td colSpan={4} className="px-6 py-4 text-sm font-medium text-foreground text-right italic">
                  Solde Initial
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground font-semibold">
                  {Number(soldeInitial).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
