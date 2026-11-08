'use client'

import { useState, useMemo } from 'react'
import { Plus, Calculator, Info } from 'lucide-react'
import { addSortieStockNature } from './actions'
import { addClient } from '../../bilans/releve-client/actions'

const NEW_CLIENT_VALUE = '__new__'

export default function AddSortieModal({
  campagneId,
  campagneInfo,
  uniteStock = 'kg',
  membres,
  clients,
  onClientCreated,
  onSuccess,
  dict,
}: {
  campagneId: string
  campagneInfo?: any
  uniteStock?: string
  membres: any[]
  clients: { id: string; nom: string }[]
  onClientCreated: (client: { id: string; nom: string }) => void
  onSuccess: () => void
  dict: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [typeSortie, setTypeSortie] = useState<'vente' | 'ristourne'>('vente')
  const [tiersType, setTiersType] = useState('membre')
  const [clientId, setClientId] = useState('')
  const [newClientNom, setNewClientNom] = useState('')

  // Unité et quantités
  const [uniteVente, setUniteVente] = useState('kg')
  const [uniteStockCible, setUniteStockCible] = useState(uniteStock || 'kg')
  const [quantiteVente, setQuantiteVente] = useState('')
  const [prixUnitaire, setPrixUnitaire] = useState('')
  const [nbContenance, setNbContenance] = useState('')
  const [poidsKgStock, setPoidsKgStock] = useState('')

  const [dateSortie, setDateSortie] = useState(new Date().toISOString().slice(0, 10))
  const [motif, setMotif] = useState('')
  const [error, setError] = useState('')

  const t = dict?.remboursements_pages?.stock_nature?.form || {}

  const produitNom = campagneInfo?.produit_collecte || ''
  const isPaddy = produitNom.toLowerCase().includes('paddy') || produitNom.toLowerCase().includes('riz')

  // Calcul du montant total
  const montantTotal = useMemo(() => {
    const q = Number(quantiteVente) || 0
    const pu = Number(prixUnitaire) || 0
    return q * pu
  }, [quantiteVente, prixUnitaire])

  // Détection du besoin de conversion
  const isVenteEnKgEtStockEnSacs = uniteVente === 'kg' && (uniteStockCible === 'sacs' || isPaddy)
  const isVenteEnSacsEtStockEnKg = (uniteVente === 'sacs' || uniteVente === 'cageots' || uniteVente === 'cartons') && uniteStockCible === 'kg'

  // Suggestions automatiques de sacs
  const suggestion80kg = useMemo(() => {
    const q = Number(quantiteVente)
    if (!q || q <= 0) return null
    return Math.round(q / 80)
  }, [quantiteVente])

  const suggestion50kg = useMemo(() => {
    const q = Number(quantiteVente)
    if (!q || q <= 0) return null
    return Math.round(q / 50)
  }, [quantiteVente])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const qVente = Number(quantiteVente)
    const pu = Number(prixUnitaire)

    if (!qVente || qVente <= 0) {
      setError("Veuillez saisir une quantité vendue valide.")
      return
    }

    if (pu < 0) {
      setError("Le prix unitaire ne peut pas être négatif.")
      return
    }

    // Calcul de la quantité exacte déduite du stock physique
    let quantiteDeduitStock = qVente
    let nbContenanceFinal: number | undefined = undefined

    if (isVenteEnKgEtStockEnSacs) {
      const sacs = Number(nbContenance)
      if (!sacs || sacs <= 0) {
        setError("Veuillez renseigner le nombre de contenances / sacs correspondant à déduire du stock.")
        return
      }
      quantiteDeduitStock = sacs
      nbContenanceFinal = sacs
    } else if (isVenteEnSacsEtStockEnKg) {
      const kg = Number(poidsKgStock)
      if (!kg || kg <= 0) {
        setError("Veuillez renseigner le poids total en kg équivalent à déduire du stock.")
        return
      }
      quantiteDeduitStock = kg
      nbContenanceFinal = qVente
    } else if (nbContenance) {
      nbContenanceFinal = Number(nbContenance)
    }

    setLoading(true)
    const formData = new FormData(e.currentTarget)

    let resolvedClientId = clientId
    if (tiersType === 'client' && clientId === NEW_CLIENT_VALUE) {
      const clientRes = await addClient(newClientNom)
      if (clientRes?.error || !clientRes.client) {
        setLoading(false)
        setError(clientRes?.error || "Erreur lors de la création du client")
        return
      }
      resolvedClientId = clientRes.client.id
      onClientCreated(clientRes.client)
    }

    const res = await addSortieStockNature({
      campagne_id: campagneId,
      type_sortie: typeSortie,
      tiers_type: tiersType,
      membre_id: (formData.get('membre_id') as string) || undefined,
      client_id: tiersType === 'client' ? resolvedClientId : undefined,
      quantite: quantiteDeduitStock,
      prix_unitaire: pu,
      unite: uniteStockCible,
      unite_vente: uniteVente,
      quantite_vente: qVente,
      nb_contenance: nbContenanceFinal,
      motif: motif || undefined,
      date_sortie: dateSortie,
    })

    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setIsOpen(false)
      setClientId('')
      setNewClientNom('')
      setQuantiteVente('')
      setPrixUnitaire('')
      setNbContenance('')
      setPoidsKgStock('')
      setMotif('')
      onSuccess()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setUniteStockCible(uniteStock || 'kg')
          setIsOpen(true)
        }}
        disabled={!campagneId}
        className="inline-flex items-center gap-x-2 rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-secondary/90 disabled:opacity-50 transition-colors"
      >
        <Plus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
        <span>{dict?.remboursements_pages?.stock_nature?.add_sortie || "Enregistrer une sortie"}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-bold leading-6 text-foreground mb-1">
                  {typeSortie === 'vente' ? "Enregistrer une Vente de Stock" : "Enregistrer une Ristourne de Stock"}
                </h3>
                <p className="text-xs text-foreground-muted mb-4">
                  Produit : <span className="font-semibold text-foreground">{produitNom || 'Stock nature'}</span> • Unité actuelle du stock : <span className="font-semibold text-primary">{uniteStockCible}</span>
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger">
                    {error}
                  </div>
                )}

                <form id="add-sortie-form" onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="type_sortie" className="block text-xs font-semibold text-foreground mb-1">
                        Type d&apos;opération *
                      </label>
                      <select
                        name="type_sortie"
                        id="type_sortie"
                        value={typeSortie}
                        onChange={(e) => setTypeSortie(e.target.value as any)}
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      >
                        <option value="vente">Vente</option>
                        <option value="ristourne">Ristourne physique</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="tiers_type" className="block text-xs font-semibold text-foreground mb-1">
                        Bénéficiaire / Acheteur *
                      </label>
                      <select
                        name="tiers_type"
                        id="tiers_type"
                        value={tiersType}
                        onChange={(e) => setTiersType(e.target.value)}
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      >
                        <option value="membre">Membre du GIE</option>
                        <option value="client">Client externe (Acheteur)</option>
                      </select>
                    </div>
                  </div>

                  {tiersType === 'membre' ? (
                    <div>
                      <label htmlFor="membre_id" className="block text-xs font-semibold text-foreground mb-1">
                        Membre acheteur *
                      </label>
                      <select
                        name="membre_id"
                        id="membre_id"
                        required
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      >
                        <option value="">Sélectionner un membre</option>
                        {membres.map((m) => (
                          <option key={m.id} value={m.id}>{m.prenom} {m.nom} {m.code_membre ? `(${m.code_membre})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="client_id" className="block text-xs font-semibold text-foreground mb-1">
                        Client externe acheteur *
                      </label>
                      <select
                        id="client_id"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        required
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      >
                        <option value="">Sélectionner un client acheteur</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.nom}</option>
                        ))}
                        <option value={NEW_CLIENT_VALUE}>+ Nouveau client externe...</option>
                      </select>
                      {clientId === NEW_CLIENT_VALUE && (
                        <input
                          type="text"
                          value={newClientNom}
                          onChange={(e) => setNewClientNom(e.target.value)}
                          required
                          placeholder="Nom de l'acheteur / commerçant / rizerie..."
                          className="mt-2 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                        />
                      )}
                    </div>
                  )}

                  {/* Section Vente : Poids vs Contenance */}
                  <div className="p-3.5 rounded-lg bg-background border border-surface-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Unités & Tarification de la Vente</span>
                      <span className="text-[11px] text-foreground-muted">Poids (kg) ou Contenance (sacs, cageots)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          Unité de la vente *
                        </label>
                        <select
                          value={uniteVente}
                          onChange={(e) => setUniteVente(e.target.value)}
                          className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                        >
                          <option value="kg">Poids : kg (Kilogrammes)</option>
                          <option value="sacs">Contenance : sacs (Paddy / Oignon)</option>
                          <option value="cageots">Contenance : cageots</option>
                          <option value="cartons">Contenance : cartons</option>
                          <option value="tonnes">Poids : tonnes</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          Unité du stock physique *
                        </label>
                        <select
                          value={uniteStockCible}
                          onChange={(e) => setUniteStockCible(e.target.value)}
                          className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                        >
                          <option value="sacs">sacs (Stock compté en sacs)</option>
                          <option value="kg">kg (Stock pesé en kg)</option>
                          <option value="cageots">cageots</option>
                          <option value="cartons">cartons</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          Quantité vendue ({uniteVente}) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          min="0.01"
                          value={quantiteVente}
                          onChange={(e) => setQuantiteVente(e.target.value)}
                          placeholder={uniteVente === 'kg' ? "Ex: 5000" : "Ex: 60"}
                          className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          Prix unitaire (FCFA / {uniteVente}) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          min="0"
                          value={prixUnitaire}
                          onChange={(e) => setPrixUnitaire(e.target.value)}
                          placeholder={uniteVente === 'kg' ? "Ex: 300" : "Ex: 25000"}
                          className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Total calculé */}
                    {montantTotal > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-md bg-primary/10 border border-primary/20 text-xs">
                        <span className="font-semibold text-foreground">Montant total à facturer :</span>
                        <span className="font-bold text-primary text-sm">{montantTotal.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    )}

                    {/* RÈGLE SPÉCIFIQUE : Vente en kg et Stock en sacs / Paddy */}
                    {isVenteEnKgEtStockEnSacs && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                          <div className="text-xs text-amber-900 dark:text-amber-200">
                            <span className="font-semibold">Déduction du stock en sacs :</span> La vente est en kg mais le stock est géré en contenance. Indiquez le nombre exact de sacs sortis de l&apos;entrepôt.
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            Nombre de sacs à déduire du stock physique *
                          </label>
                          <input
                            type="number"
                            step="any"
                            required
                            min="0.1"
                            value={nbContenance}
                            onChange={(e) => setNbContenance(e.target.value)}
                            placeholder="Nombre de sacs sortis"
                            className="w-full rounded-md border border-amber-500/30 bg-surface px-3 py-2 text-sm text-foreground focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 shadow-2xs"
                          />
                        </div>

                        {(suggestion80kg || suggestion50kg) && (
                          <div className="flex items-center gap-2 pt-1 text-[11px] text-foreground-muted">
                            <Calculator className="h-3.5 w-3.5 text-primary" />
                            <span>Calcul rapide :</span>
                            {suggestion80kg && (
                              <button
                                type="button"
                                onClick={() => setNbContenance(String(suggestion80kg))}
                                className="px-2 py-0.5 rounded bg-surface border border-surface-border hover:bg-background text-primary font-medium"
                              >
                                ~80 kg/sac ({suggestion80kg} sacs)
                              </button>
                            )}
                            {suggestion50kg && (
                              <button
                                type="button"
                                onClick={() => setNbContenance(String(suggestion50kg))}
                                className="px-2 py-0.5 rounded bg-surface border border-surface-border hover:bg-background text-primary font-medium"
                              >
                                ~50 kg/sac ({suggestion50kg} sacs)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cas inverse : Vente en sacs et Stock en kg */}
                    {isVenteEnSacsEtStockEnKg && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                          <div className="text-xs text-amber-900 dark:text-amber-200">
                            <span className="font-semibold">Déduction du stock en kg :</span> La vente est en {uniteVente} mais le stock est pesé en kg. Indiquez le poids total en kg à déduire.
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-1">
                            Poids total en kg à déduire du stock physique *
                          </label>
                          <input
                            type="number"
                            step="any"
                            required
                            min="0.1"
                            value={poidsKgStock}
                            onChange={(e) => setPoidsKgStock(e.target.value)}
                            placeholder="Poids total en kg"
                            className="w-full rounded-md border border-amber-500/30 bg-surface px-3 py-2 text-sm text-foreground focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 shadow-2xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Même unité : champ indicatif nombre de contenance pour paddy si vente en kg */}
                    {!isVenteEnKgEtStockEnSacs && !isVenteEnSacsEtStockEnKg && isPaddy && (
                      <div>
                        <label className="block text-xs font-medium text-foreground-muted mb-1">
                          Nombre de sacs correspondant (mention sur facture/bon)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={nbContenance}
                          onChange={(e) => setNbContenance(e.target.value)}
                          placeholder="Ex: 62 sacs"
                          className="w-full rounded-md border border-surface-border bg-surface px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="date_sortie" className="block text-xs font-semibold text-foreground mb-1">
                        Date de sortie *
                      </label>
                      <input
                        type="date"
                        name="date_sortie"
                        id="date_sortie"
                        value={dateSortie}
                        onChange={(e) => setDateSortie(e.target.value)}
                        required
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      />
                    </div>

                    <div>
                      <label htmlFor="motif" className="block text-xs font-semibold text-foreground mb-1">
                        Motif / Référence BL
                      </label>
                      <input
                        type="text"
                        name="motif"
                        id="motif"
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        placeholder="Ex: Facture Vente N° 042"
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                <button
                  type="submit"
                  form="add-sortie-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-2xs hover:bg-primary/90 sm:w-auto disabled:opacity-50 transition-colors"
                >
                  {loading ? (dict?.common?.saving || "Enregistrement...") : (dict?.common?.save || "Valider la Sortie")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="mt-2 sm:mt-0 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-2xs ring-1 ring-inset ring-surface-border hover:bg-background sm:w-auto transition-colors"
                >
                  {dict?.common?.cancel || "Annuler"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
