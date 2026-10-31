'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { getReleveFournisseur, FournisseurSummary, MouvementFournisseur } from './actions'
import AddFournisseurModal from './AddFournisseurModal'
import AddPaiementFournisseurModal from './AddPaiementFournisseurModal'
import PrintSectionButton from '@/components/PrintSectionButton'
import { useUnite } from '@/components/DeviseProvider'
import {
  Truck,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  Phone,
  MapPin,
  Search,
  X,
  RotateCcw,
  Filter
} from 'lucide-react'

export default function ReleveFournisseurClient({
  initialFournisseurs,
  dict,
  locale,
  gieName,
}: {
  initialFournisseurs: FournisseurSummary[]
  dict: any
  locale: string
  gieName: string
}) {
  const unite = useUnite()
  const [fournisseurs, setFournisseurs] = useState<FournisseurSummary[]>(initialFournisseurs)
  const searchParams = useSearchParams()
  const urlParam = searchParams.get('fournisseurId') || searchParams.get('search')
  const matchedInitial = useMemo(() => {
    if (!urlParam) return null
    const paramLow = decodeURIComponent(urlParam).toLowerCase().trim()
    return initialFournisseurs.find((f) => {
      const fNom = f.nom.toLowerCase()
      const fCode = (f.code_fournisseur || '').toLowerCase()
      return f.id === urlParam || fNom === paramLow || fCode === paramLow || fNom.includes(paramLow) || paramLow.includes(fNom)
    })
  }, [urlParam, initialFournisseurs])
  const [selectedFournisseur, setSelectedFournisseur] = useState(
    matchedInitial ? matchedInitial.id : (initialFournisseurs[0]?.id || '')
  )
  useEffect(() => {
    if (matchedInitial && matchedInitial.id !== selectedFournisseur) {
      setSelectedFournisseur(matchedInitial.id)
    }
  }, [matchedInitial, selectedFournisseur])
  const [searchTerm, setSearchTerm] = useState('')
  const [journal, setJournal] = useState<MouvementFournisseur[]>([])
  const [fournisseurDetails, setFournisseurDetails] = useState<any>(null)
  const [totalDette, setTotalDette] = useState(0)
  const [totalRegle, setTotalRegle] = useState(0)
  const [soldeActuel, setSoldeActuel] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filtres de recherche sur les écritures du Grand Livre
  const [searchMouvement, setSearchMouvement] = useState('')
  const [natureFilter, setNatureFilter] = useState<'all' | 'dette' | 'reglement'>('all')

  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  const fetchReleve = useCallback(async () => {
    if (!selectedFournisseur) return
    setLoading(true)
    const res = await getReleveFournisseur(selectedFournisseur)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setError('')
      setJournal(res.journal || [])
      setFournisseurDetails(res.fournisseur || null)
      setTotalDette(res.totalDette || 0)
      setTotalRegle(res.totalRegle || 0)
      setSoldeActuel(res.soldeActuel || 0)
    }
  }, [selectedFournisseur])

  useEffect(() => {
    fetchReleve()
  }, [fetchReleve])

  const handleFournisseurCreated = (fournisseur: any) => {
    setFournisseurs((prev) => [...prev, fournisseur].sort((a, b) => a.nom.localeCompare(b.nom)))
    setSelectedFournisseur(fournisseur.id)
  }

  const selectedItem = fournisseurs.find((f) => f.id === selectedFournisseur)
  const currentNom = fournisseurDetails?.nom || selectedItem?.nom || ''

  // Filtrage des écritures du Grand Livre
  const filteredMouvements = useMemo(() => {
    return journal.filter((m) => {
      if (natureFilter !== 'all' && m.type !== natureFilter) {
        return false
      }
      if (searchMouvement.trim()) {
        const term = searchMouvement.toLowerCase().trim()
        const desig = (m.designation || '').toLowerCase()
        const ref = (m.piece_ref || '').toLowerCase()
        const cp = (m.compte_nom || '').toLowerCase()
        const montStr = String(m.montant || '')
        const debStr = String(m.debit || '')
        const credStr = String(m.credit || '')
        const dateStr = String(m.date || '')

        const matches =
          desig.includes(term) ||
          ref.includes(term) ||
          cp.includes(term) ||
          montStr.includes(term) ||
          debStr.includes(term) ||
          credStr.includes(term) ||
          dateStr.includes(term)

        if (!matches) return false
      }
      return true
    })
  }, [journal, natureFilter, searchMouvement])

  const formatAmount = (val: number) =>
    val.toLocaleString(dateLocale, { maximumFractionDigits: 0 })

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h3 className="text-xl font-bold font-heading text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Suivi & Relevé Fournisseur (Grand Livre)
          </h3>
          <p className="mt-1 text-sm text-foreground-muted">
            Grand Livre des dettes fournisseurs, suivi des achats (intrants, matériels) et des règlements de trésorerie avec solde progressif.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-2.5">
          <AddFournisseurModal onCreated={handleFournisseurCreated} dict={dict} />
          <AddPaiementFournisseurModal
            fournisseurNom={currentNom}
            soldeActuel={soldeActuel}
            onSuccess={fetchReleve}
            dict={dict}
          />
          {journal.length > 0 && (
            <PrintSectionButton sectionId="releve-fournisseur-print" label="Imprimer le relevé" />
          )}
        </div>
      </div>

      {/* Sélecteur de Fournisseur */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface border border-surface-border rounded-xl p-4 shadow-xs">
        <div className="md:col-span-1 space-y-1.5">
          <label className="block text-xs font-semibold text-foreground">
            Sélectionner un Fournisseur
          </label>
          <div className="relative">
            <select
              value={selectedFournisseur}
              onChange={(e) => setSelectedFournisseur(e.target.value)}
              className="block w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
            >
              {fournisseurs.length === 0 && <option value="">Aucun fournisseur</option>}
              {fournisseurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom} ({f.code_fournisseur}) - Reste: {formatAmount(f.solde_actuel)} {unite}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedItem && (
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 bg-background rounded-lg border border-surface-border p-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {selectedItem.nom.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                  {selectedItem.nom}
                  <span className="text-[10px] bg-secondary/15 text-secondary px-2 py-0.5 rounded font-mono">
                    {selectedItem.code_fournisseur}
                  </span>
                </h4>
                <div className="flex items-center gap-3 text-xs text-foreground-muted mt-0.5">
                  {selectedItem.telephone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedItem.telephone}
                    </span>
                  )}
                  {fournisseurDetails?.adresse && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {fournisseurDetails.adresse}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                soldeActuel > 0
                  ? 'bg-danger/10 text-danger border border-danger/20'
                  : 'bg-success/10 text-success border border-success/20'
              }`}>
                {soldeActuel > 0 ? (
                  <>
                    <AlertCircle className="h-3.5 w-3.5" />
                    Dette en cours : {formatAmount(soldeActuel)} {unite}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Compte Fournisseur soldé
                  </>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Total Dettes (Facturé)
            </span>
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {formatAmount(totalDette)} {unite}
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            Achats d&apos;intrants & prestations matériel
          </p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Total Règlements (Payé)
            </span>
            <span className="rounded-lg bg-success/10 p-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-success">
            {formatAmount(totalRegle)} {unite}
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            Sorties de trésorerie (Caisse / Banque / Mobile Money)
          </p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Solde Restant Dû (Dette)
            </span>
            <span className={`rounded-lg p-2 ${soldeActuel > 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
              <TrendingDown className="h-5 w-5" />
            </span>
          </div>
          <div className={`mt-2 text-2xl font-bold ${soldeActuel > 0 ? 'text-danger' : 'text-success'}`}>
            {formatAmount(soldeActuel)} {unite}
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            Reste à payer au fournisseur
          </p>
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center text-sm text-foreground-muted animate-pulse bg-surface border border-surface-border rounded-xl">
          Chargement du Grand Livre fournisseur...
        </div>
      )}

      {error && (
        <div className="p-4 bg-danger/10 text-danger rounded-xl border border-danger/20 text-sm">
          {error}
        </div>
      )}

      {/* Grand Livre Table */}
      {!loading && !error && (
        <div id="releve-fournisseur-print" className="space-y-4">
          <div className="hidden print:block mb-4 p-4 border-b border-surface-border">
            <h2 className="text-xl font-bold text-foreground">{gieName}</h2>
            <p className="text-sm text-foreground-muted">Relevé Grand Livre Fournisseur — {currentNom}</p>
            <div className="mt-2 text-xs flex gap-6 text-foreground-muted">
              <span>Date d&apos;édition : {new Date().toLocaleDateString(dateLocale)}</span>
              <span>Dette totale : {formatAmount(totalDette)} {unite}</span>
              <span>Règlements : {formatAmount(totalRegle)} {unite}</span>
              <span><strong>Reste dû : {formatAmount(soldeActuel)} {unite}</strong></span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-xs">
            <div className="p-3 border-b border-surface-border bg-background flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm text-foreground">
                  Grand Livre des Mouvements ({filteredMouvements.length} sur {journal.length} écriture{journal.length > 1 ? 's' : ''})
                </h4>
              </div>

              {/* Filtre et Recherche */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                    <Search className="h-3.5 w-3.5 text-foreground-muted" />
                  </div>
                  <input
                    type="text"
                    value={searchMouvement}
                    onChange={(e) => setSearchMouvement(e.target.value)}
                    placeholder="Filtrer désignation, réf, compte, montant..."
                    className="w-full rounded-md border border-surface-border bg-surface py-1 pl-8 pr-7 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                  {searchMouvement && (
                    <button
                      type="button"
                      onClick={() => setSearchMouvement('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-2 text-foreground-muted hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <select
                  value={natureFilter}
                  onChange={(e) => setNatureFilter(e.target.value as any)}
                  className="rounded-md border border-surface-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                >
                  <option value="all">Toutes natures</option>
                  <option value="dette">Factures / Dettes (+)</option>
                  <option value="reglement">Règlements (-)</option>
                </select>

                {(searchMouvement || natureFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchMouvement('')
                      setNatureFilter('all')
                    }}
                    className="p-1 text-foreground-muted hover:text-foreground rounded border border-surface-border bg-surface shadow-2xs"
                    title="Réinitialiser le filtre"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-surface-border text-sm">
                <thead className="bg-background/60">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                      Nature
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                      Désignation & Réf.
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                      Facturé (Dette +)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                      Réglé (Paiement -)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                      Solde Restant Dû
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {filteredMouvements.map((m: MouvementFournisseur) => {
                    const isDette = m.type === 'dette'
                    return (
                      <tr key={m.id} className="hover:bg-surface-hover transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-foreground">
                          {new Date(m.date).toLocaleDateString(dateLocale)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isDette
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              : 'bg-success/10 text-success border border-success/20'
                          }`}>
                            {isDette ? 'Facture / Achat' : 'Règlement trésorerie'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground">
                          <div className="font-medium text-foreground">{m.designation}</div>
                          <div className="text-[11px] text-foreground-muted flex items-center gap-2 mt-0.5">
                            {m.piece_ref && <span>Réf: <strong>{m.piece_ref}</strong></span>}
                            {m.compte_nom && <span>Compte: {m.compte_nom}</span>}
                            {m.quantite && (
                              <span>Qté: {m.quantite} {m.unite || ''} {m.prix_unitaire ? `à ${formatAmount(m.prix_unitaire)} ${unite}` : ''}</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-xs text-foreground">
                          {m.debit > 0 ? (
                            <span className="text-amber-600 font-semibold">
                              +{formatAmount(m.debit)} {unite}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-xs text-foreground">
                          {m.credit > 0 ? (
                            <span className="text-success font-semibold">
                              -{formatAmount(m.credit)} {unite}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-xs">
                          <span className={m.solde > 0 ? 'text-danger' : 'text-success'}>
                            {formatAmount(m.solde)} {unite}
                          </span>
                        </td>
                      </tr>
                    )
                  })}

                  {filteredMouvements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-foreground-muted italic text-xs">
                        {searchMouvement || natureFilter !== 'all'
                          ? "Aucun mouvement ne correspond à votre recherche."
                          : "Aucune opération ou facture enregistrée pour ce fournisseur."}
                      </td>
                    </tr>
                  )}
                </tbody>
                {journal.length > 0 && (
                  <tfoot className="bg-background font-semibold border-t-2 border-surface-border">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-foreground">
                        Totaux du Grand Livre :
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-amber-600">
                        {formatAmount(totalDette)} {unite}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-success">
                        {formatAmount(totalRegle)} {unite}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-danger">
                        {formatAmount(soldeActuel)} {unite}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

