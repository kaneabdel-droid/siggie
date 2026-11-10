'use client'

import { useState, useEffect, useCallback } from 'react'
import { getRapprochement } from '../actions'
import { Building2, Landmark, Wallet, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import PrintSectionButton from '@/components/PrintSectionButton'
import { useUnite } from '@/components/DeviseProvider'
import { cleanButCredit } from '@/lib/credits-types'

export default function RapprochementClient({
  campagnes,
  initialCampagneId,
  dict,
  locale,
  gieName,
}: {
  campagnes: any[]
  initialCampagneId?: string
  dict: any
  locale: string
  gieName: string
}) {
  const unite = useUnite()
  const [selectedCampagne, setSelectedCampagne] = useState(
    initialCampagneId || campagnes[0]?.id || ''
  )
  const [selectedCreditId, setSelectedCreditId] = useState<string>('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const t = dict.tresorerie_pages.rapprochement
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  const fetchBilan = useCallback(async (campagneId: string, creditId?: string) => {
    if (!campagneId) return
    setLoading(true)
    const res = await getRapprochement(campagneId, creditId || undefined)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
      setData(null)
    } else {
      setError('')
      setData(res)
      if (res?.credit?.id) {
        setSelectedCreditId(res.credit.id)
      }
    }
  }, [])

  useEffect(() => {
    fetchBilan(selectedCampagne, selectedCreditId || undefined)
  }, [selectedCampagne, selectedCreditId, fetchBilan])

  const handleCampagneChange = (campId: string) => {
    setSelectedCampagne(campId)
    setSelectedCreditId('')
  }

  const currentCampagne = campagnes.find((c) => c.id === selectedCampagne)

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-end sm:justify-between gap-4 mb-4 flex-wrap">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end w-full sm:w-auto">
          {/* Sélecteur de campagne */}
          <div className="w-full sm:w-80">
            <label htmlFor="campagne" className="block text-sm font-medium text-foreground mb-1">
              {t.select_campaign}
            </label>
            <select
              id="campagne"
              value={selectedCampagne}
              onChange={(e) => handleCampagneChange(e.target.value)}
              className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
            >
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} ({c.statut})
                  {c.hasCreditCampagne
                    ? ' — 🌾 Crédit Campagne'
                    : c.hasCreditEquipement
                    ? " — 🚜 (Équipement seul)"
                    : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sélecteur de crédit de campagne (si la campagne a plusieurs crédits de campagne) */}
          {data?.creditsCampagne && data.creditsCampagne.length > 1 && (
            <div className="w-full sm:w-80">
              <label htmlFor="credit-select" className="block text-sm font-medium text-foreground mb-1">
                {t.select_credit || 'Choisir le crédit de campagne'}
              </label>
              <select
                id="credit-select"
                value={selectedCreditId || data.credit?.id || ''}
                onChange={(e) => setSelectedCreditId(e.target.value)}
                className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              >
                {data.creditsCampagne.map((cr: any) => (
                  <option key={cr.id} value={cr.id}>
                    {cr.banque_nom} — {cr.montant_accorde.toLocaleString(dateLocale)} {unite.trim()}
                    {cr.but_credit ? ` (${cleanButCredit(cr.but_credit)})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!loading && data && (
          <div className="mt-4 sm:mt-0">
            <PrintSectionButton sectionId="rapprochement-print" label={dict.common.print} />
          </div>
        )}
      </div>

      {loading && <div className="text-foreground-muted animate-pulse">{t.loading}</div>}

      {error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Rapprochement non disponible pour cette campagne</h4>
              <p className="text-sm leading-relaxed">{error}</p>
              {campagnes.some((c) => c.hasCreditCampagne && c.id !== selectedCampagne) && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      const firstCampWithCredit = campagnes.find((c) => c.hasCreditCampagne)
                      if (firstCampWithCredit) {
                        handleCampagneChange(firstCampWithCredit.id)
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 transition shadow-sm"
                  >
                    🌾 Basculer sur {campagnes.find((c) => c.hasCreditCampagne)?.nom} (Crédit Campagne disponible)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6" id="rapprochement-print">
          <div className="hidden print:block mb-4">
            <h2 className="text-xl font-bold text-foreground">{gieName}</h2>
            <p className="text-sm text-foreground-muted">
              {t.title} — {currentCampagne?.nom || ''}
            </p>
          </div>

          {/* Bannière d'information de cadrage */}
          <div className="flex items-center gap-2.5 text-xs text-foreground-muted bg-surface border border-surface-border p-3 rounded-lg">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span>
              Ce rapprochement s&apos;applique exclusivement aux <strong>crédits de campagne</strong> (court terme : semences, engrais, récolte). Les crédits d&apos;équipement (investissements matériels) sont exclus et suivis dans le module <strong>Matériel</strong>.
            </span>
          </div>

          {/* Section Bilan */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-surface-border p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Landmark className="w-5 h-5" />
                  <span>{t.credit_granted}</span>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  🌾 Campagne
                </span>
              </div>
              <div className="text-2xl font-bold text-foreground break-words">
                {data.bilan.montantAccorde.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{' '}
                <span className="text-sm font-normal text-foreground-muted">{unite.trim()}</span>
              </div>
              <div className="text-sm text-foreground-muted mt-1 break-words">
                <span className="font-medium text-foreground">{data.credit.banque_nom}</span>
                {data.credit.but_credit && (
                  <span className="ml-1 text-xs text-foreground-muted">
                    ({cleanButCredit(data.credit.but_credit) || 'Court terme'})
                  </span>
                )}
              </div>
            </div>

            <div className="bg-surface border border-surface-border p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 text-warning font-semibold mb-2">
                <Building2 className="w-5 h-5" />
                {t.supplier_payments}
              </div>
              <div className="text-2xl font-bold text-foreground break-words">
                {data.bilan.totalPaiementsFournisseurs.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{' '}
                <span className="text-sm font-normal text-foreground-muted">{unite.trim()}</span>
              </div>
              <div className="text-xs text-foreground-muted mt-1">
                {data.paiementsFournisseurs.length} paiement(s)
              </div>
            </div>

            <div className="bg-surface border border-surface-border p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 text-danger font-semibold mb-2">
                <Wallet className="w-5 h-5" />
                {t.cash_withdrawals}
              </div>
              <div className="text-2xl font-bold text-foreground break-words">
                {data.bilan.totalRetraits.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{' '}
                <span className="text-sm font-normal text-foreground-muted">{unite.trim()}</span>
              </div>
              <div className="text-xs text-foreground-muted mt-1">
                {data.retraits.length} retrait(s)
              </div>
            </div>

            <div className="border border-gray-200 bg-gray-100 p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 font-semibold mb-2 text-black">
                <CheckCircle2 className="w-5 h-5" />
                {t.credit_balance}
              </div>
              <div className="text-2xl font-bold text-black break-words">
                {data.bilan.soldeCredit.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{' '}
                <span className="text-sm font-normal text-black">{unite.trim()}</span>
              </div>
              <div className="text-xs text-black/70 mt-1">
                Disponible restant sur le crédit
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
                          {p.montant.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{unite}
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
                          {r.montant.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{unite}
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
