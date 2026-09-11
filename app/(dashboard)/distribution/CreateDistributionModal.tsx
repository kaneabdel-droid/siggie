'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addDistributionsByIntrant, addDistributionsByMembre } from './actions'
import { isStockableType, isForfaitaireType } from '@/lib/intrants/types'

type Campagne = { id: string; nom: string }
type Membre = { id: string; prenom: string; nom: string; telephone?: string; code_membre?: string }
type Intrant = { id: string; nom: string; type_intrant: string; quantite_stock: number; prix_unitaire: number }
type CampagneMembre = { campagne_id: string; membre: Membre }
type CampagneIntrant = { campagne_id: string; intrant_id: string; prix_facturation: number }

export default function CreateDistributionModal({
  campagnes,
  campagneMembres,
  intrants,
  campagneIntrants,
  dict
}: {
  campagnes: Campagne[]
  campagneMembres: CampagneMembre[]
  intrants: Intrant[]
  campagneIntrants: CampagneIntrant[]
  dict: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'intrant' | 'membre'>('intrant')
  const d = dict.distribution_extra.create_modal

  const [selectedCampagneId, setSelectedCampagneId] = useState('')
  const [selectedIntrantId, setSelectedIntrantId] = useState('')
  const [selectedMembreId, setSelectedMembreId] = useState('')

  // State for Option 1 (By Intrant)
  const [quantitiesByMembre, setQuantitiesByMembre] = useState<Record<string, number>>({})

  // State for Option 2 (By Membre)
  const [quantitiesByIntrant, setQuantitiesByIntrant] = useState<Record<string, number>>({})

  // Reset function
  const resetForm = () => {
    setSelectedCampagneId('')
    setSelectedIntrantId('')
    setSelectedMembreId('')
    setQuantitiesByMembre({})
    setQuantitiesByIntrant({})
  }

  const closeAndReset = () => {
    setIsOpen(false)
    resetForm()
  }

  // Derived data
  const enrolledMembres = campagneMembres
    .filter(cm => cm.campagne_id === selectedCampagneId)
    .map(cm => cm.membre)

  const campaignIntrantIds = campagneIntrants
    .filter(ci => ci.campagne_id === selectedCampagneId)
    .map(ci => ci.intrant_id)

  const campaignAvailableIntrants = intrants.filter(i => campaignIntrantIds.includes(i.id))

  // Calculate totals for validation
  const totalByIntrant = Object.values(quantitiesByMembre).reduce((sum, q) => sum + (q || 0), 0)
  const selectedIntrant = campaignAvailableIntrants.find(i => i.id === selectedIntrantId)

  async function handleOption1Submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCampagneId || !selectedIntrantId) return

    const distributions = Object.entries(quantitiesByMembre)
      .filter(([_, q]) => q > 0)
      .map(([membre_id, quantite]) => ({ membre_id, quantite }))

    if (distributions.length === 0) return alert(d.invalid_quantity_alert)
    if (selectedIntrant && isStockableType(selectedIntrant.type_intrant) && totalByIntrant > selectedIntrant.quantite_stock) {
      return alert(d.exceeds_stock_alert)
    }

    setLoading(true)
    const res = await addDistributionsByIntrant(selectedCampagneId, selectedIntrantId, distributions)
    setLoading(false)

    if (res?.error) {
      alert(res.error)
    } else {
      closeAndReset()
    }
  }

  async function handleOption2Submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCampagneId || !selectedMembreId) return

    const distributions = Object.entries(quantitiesByIntrant)
      .filter(([_, q]) => q > 0)
      .map(([intrant_id, quantite]) => ({ intrant_id, quantite }))

    if (distributions.length === 0) return alert(d.invalid_quantity_alert)

    setLoading(true)
    const res = await addDistributionsByMembre(selectedCampagneId, selectedMembreId, distributions)
    setLoading(false)

    if (res?.error) {
      alert(res.error)
    } else {
      closeAndReset()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="block rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        {dict.distribution_extra.create_btn}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={closeAndReset} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-surface-border flex flex-col max-h-[90vh]">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4 border-b border-surface-border shrink-0">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {d.title}
                </h3>

                {/* Tabs */}
                <div className="border-b border-surface-border mb-4">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                      onClick={() => { setTab('intrant'); resetForm() }}
                      className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                        tab === 'intrant'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-foreground-muted hover:border-surface-border hover:text-foreground'
                      }`}
                    >
                      {d.tab1}
                    </button>
                    <button
                      onClick={() => { setTab('membre'); resetForm() }}
                      className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                        tab === 'membre'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-foreground-muted hover:border-surface-border hover:text-foreground'
                      }`}
                    >
                      {d.tab2}
                    </button>
                  </nav>
                </div>

                {/* Common Campaign Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground">{d.campaign}</label>
                  <select
                    value={selectedCampagneId}
                    onChange={(e) => setSelectedCampagneId(e.target.value)}
                    className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2"
                  >
                    <option value="">{d.select_campaign}</option>
                    {campagnes.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="px-4 py-5 sm:p-6 overflow-y-auto">
                {selectedCampagneId ? (
                  <>
                    {enrolledMembres.length === 0 ? (
                      <div className="text-sm text-warning p-4 bg-warning/10 rounded-md">
                        {d.no_members_prefix}{' '}
                        <a href={`/campagnes/${selectedCampagneId}/config`} className="underline font-semibold hover:text-warning/80">
                          {d.no_members_link}
                        </a>
                        {' '}{d.no_members_suffix}
                      </div>
                    ) : (
                      <>
                        {/* ---------------- OPTION 1 ---------------- */}
                        {tab === 'intrant' && (
                          <>
                            {campaignAvailableIntrants.length === 0 ? (
                              <div className="text-sm text-warning p-4 bg-warning/10 rounded-md">
                                {d.no_products_prefix}{' '}
                                <a href={`/campagnes/${selectedCampagneId}/config`} className="underline font-semibold hover:text-warning/80">
                                  {d.no_products_link}
                                </a>
                                {' '}{d.no_products_suffix}
                              </div>
                            ) : (
                              <form id="dist-form" onSubmit={handleOption1Submit} className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-foreground">{d.product_to_distribute}</label>
                                  <select
                                    value={selectedIntrantId}
                                    onChange={(e) => setSelectedIntrantId(e.target.value)}
                                    className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2"
                                  >
                                    <option value="">{d.select_product}</option>
                                    {campaignAvailableIntrants.map(i => (
                                      <option key={i.id} value={i.id} disabled={isStockableType(i.type_intrant) && i.quantite_stock <= 0}>
                                        {i.nom}{isStockableType(i.type_intrant) ? ` (${d.stock_label}: ${i.quantite_stock})` : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {selectedIntrantId && selectedIntrant && (
                                  <div className="mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                      <label className="block text-sm font-medium text-foreground">
                                        {isForfaitaireType(selectedIntrant.type_intrant) ? d.amounts_by_member : d.quantities_by_member}
                                      </label>
                                      {isStockableType(selectedIntrant.type_intrant) && (
                                        <span className={`text-sm font-medium ${totalByIntrant > selectedIntrant.quantite_stock ? 'text-danger' : 'text-foreground-muted'}`}>
                                          {d.total_entered} {totalByIntrant} / {selectedIntrant.quantite_stock}
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-2 border border-surface-border rounded-md p-2 bg-background max-h-64 overflow-y-auto">
                                      {enrolledMembres.map(m => (
                                        <div key={m.id} className="flex items-center justify-between gap-4 p-2 hover:bg-surface rounded-md">
                                          <div className="text-sm">
                                            <div className="font-medium text-foreground">{m.prenom} {m.nom}</div>
                                            <div className="text-xs text-foreground-muted">{m.code_membre}</div>
                                          </div>
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0"
                                            value={quantitiesByMembre[m.id] || ''}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value)
                                              setQuantitiesByMembre(prev => ({
                                                ...prev,
                                                [m.id]: isNaN(val) ? 0 : val
                                              }))
                                            }}
                                            className="w-24 rounded-md bg-surface border border-surface-border text-foreground px-2 py-1 text-right"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </form>
                            )}
                          </>
                        )}

                        {/* ---------------- OPTION 2 ---------------- */}
                        {tab === 'membre' && (
                          <form id="dist-form" onSubmit={handleOption2Submit} className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground">{d.beneficiary}</label>
                              <select
                                value={selectedMembreId}
                                onChange={(e) => setSelectedMembreId(e.target.value)}
                                className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2"
                              >
                                <option value="">{d.select_member}</option>
                                {enrolledMembres.map(m => (
                                  <option key={m.id} value={m.id}>{m.prenom} {m.nom} {m.code_membre ? `[${m.code_membre}]` : (m.telephone ? `(${m.telephone})` : '')}</option>
                                ))}
                              </select>
                            </div>

                            {selectedMembreId && (
                              <div className="mt-4">
                                <label className="block text-sm font-medium text-foreground mb-2">{d.quantities_by_product}</label>
                                {campaignAvailableIntrants.length === 0 ? (
                                  <div className="text-sm text-foreground-muted italic">{d.no_intrants_configured}</div>
                                ) : (
                                  <div className="space-y-2 border border-surface-border rounded-md p-2 bg-background max-h-64 overflow-y-auto">
                                    {campaignAvailableIntrants.map(i => {
                                      const q = quantitiesByIntrant[i.id] || 0
                                      const stockable = isStockableType(i.type_intrant)
                                      const forfaitaire = isForfaitaireType(i.type_intrant)
                                      const exceed = stockable && q > i.quantite_stock
                                      return (
                                        <div key={i.id} className="flex items-center justify-between gap-4 p-2 hover:bg-surface rounded-md">
                                          <div className="text-sm">
                                            <div className="font-medium text-foreground">{i.nom}{forfaitaire ? ` (${d.amount_unit})` : ''}</div>
                                            {stockable && (
                                              <div className={`text-xs ${exceed ? 'text-danger' : 'text-foreground-muted'}`}>{d.stock_colon} {i.quantite_stock}</div>
                                            )}
                                          </div>
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max={stockable ? i.quantite_stock : undefined}
                                            placeholder="0"
                                            value={quantitiesByIntrant[i.id] || ''}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value)
                                              setQuantitiesByIntrant(prev => ({
                                                ...prev,
                                                [i.id]: isNaN(val) ? 0 : val
                                              }))
                                            }}
                                            className={`w-24 rounded-md bg-surface border px-2 py-1 text-right ${exceed ? 'border-danger text-danger focus:ring-danger' : 'border-surface-border text-foreground'}`}
                                          />
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </form>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-foreground-muted text-center py-4">
                    {d.select_campaign_prompt}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-surface-border shrink-0">
                <button
                  type="submit"
                  form="dist-form"
                  disabled={loading || !selectedCampagneId || enrolledMembres.length === 0}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? d.validating : d.validate_submit}
                </button>
                <button
                  type="button"
                  onClick={closeAndReset}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict.common.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
