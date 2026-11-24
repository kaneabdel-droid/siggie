'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Percent, Banknote, Calendar, TrendingUp, Layers, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { calculerInteret, getCreditsCampagneForInteret } from './actions'

export default function CalculInteretModal({
  campagnes,
  dict,
}: {
  campagnes: { id: string; nom: string }[]
  dict: any
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedCampagneId, setSelectedCampagneId] = useState<string>('')
  const [selectedSpecId, setSelectedSpecId] = useState<string>('all')
  const [loadingCredits, setLoadingCredits] = useState(false)
  const [credits, setCredits] = useState<any[]>([])
  const [speculations, setSpeculations] = useState<any[]>([])
  const t = dict.facturation_extra?.interet || {
    btn: "Calcul de l'intérêt",
    title: "Calculer et répartir l'intérêt du crédit",
    desc: "Répartit l'intérêt du crédit validé de la campagne entre les factures des membres, selon la méthode choisie.",
    campaign: "Campagne",
    select_campaign: "Sélectionnez une campagne",
    method_label: "Méthode de répartition",
    method_superficie: "Au prorata des superficies exploitées pour la campagne",
    method_intrants: "Au prorata du total des intrants facturés au membre",
    calculating: "Calcul en cours...",
    submit: "Calculer et répartir",
  }

  // Chargement des crédits et spéculations dès la sélection d'une campagne
  useEffect(() => {
    if (!selectedCampagneId) {
      setCredits([])
      setSpeculations([])
      return
    }

    let active = true
    setLoadingCredits(true)
    getCreditsCampagneForInteret(selectedCampagneId)
      .then((res: any) => {
        if (!active) return
        setCredits(res.credits || [])
        setSpeculations(res.speculations || [])
        setSelectedSpecId('all')
      })
      .catch((err) => {
        console.error("Erreur chargement crédits campagne:", err)
        if (active) {
          setCredits([])
          setSpeculations([])
        }
      })
      .finally(() => {
        if (active) setLoadingCredits(false)
      })

    return () => {
      active = false
    }
  }, [selectedCampagneId])

  // Filtrage des crédits selon la spéculation sélectionnée
  const filteredCredits = selectedSpecId === 'all'
    ? credits
    : credits.filter((c) => c.speculation_id === selectedSpecId)

  const totalInteretAffiches = filteredCredits.reduce((sum, c) => sum + (Number(c.interet_calcule) || 0), 0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedCampagneId) {
      alert("Veuillez sélectionner une campagne.")
      return
    }

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const methode = (formData.get('methode') as 'superficie' | 'intrants') || 'superficie'

    const res = await calculerInteret(selectedCampagneId, methode, {
      speculationId: selectedSpecId !== 'all' ? selectedSpecId : null,
    })
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-surface border border-surface-border px-3 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-background"
      >
        <Percent className="h-4 w-4" />
        {t.btn}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Percent className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold leading-6 text-foreground">
                    {t.title}
                  </h3>
                </div>
                <p className="text-sm text-foreground-muted mb-4">{t.desc}</p>

                <form id="calcul-interet-form" onSubmit={handleSubmit} className="space-y-4">
                  {/* Choix de la campagne */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t.campaign}</label>
                    <select
                      name="campagne_id"
                      required
                      value={selectedCampagneId}
                      onChange={(e) => setSelectedCampagneId(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="">{t.select_campaign}</option>
                      {campagnes.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>

                  {/* Choix de la spéculation si la campagne en comporte plusieurs */}
                  {selectedCampagneId && speculations.length > 1 && (
                    <div>
                      <label className="block text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-primary" />
                        Spéculation (Culture) concernée
                      </label>
                      <select
                        value={selectedSpecId}
                        onChange={(e) => setSelectedSpecId(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      >
                        <option value="all">Toutes les spéculations (Répartition globale ou par culture)</option>
                        {speculations.map((s) => (
                          <option key={s.id} value={s.id}>
                            Culture : {s.nom} {s.variete ? `(${s.variete})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Visualisation des crédits trouvés et calcul des intérêts */}
                  {selectedCampagneId && (
                    <div className="rounded-lg border border-surface-border bg-background/50 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                          <Banknote className="h-3.5 w-3.5 text-primary" />
                          Crédit(s) détecté(s) pour cette campagne
                        </span>
                        {loadingCredits && (
                          <span className="text-xs text-foreground-muted flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Recherche...
                          </span>
                        )}
                      </div>

                      {loadingCredits ? (
                        <div className="py-3 text-center text-xs text-foreground-muted">
                          Recherche des crédits, taux et durées...
                        </div>
                      ) : filteredCredits.length === 0 ? (
                        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <strong>Aucun crédit de campagne actif trouvé</strong> pour cette sélection.
                            <br />
                            Vérifiez que le crédit a bien été saisi avec son montant, taux d'intérêt (% &gt; 0) et durée (en mois) dans la page <em>Crédits & Financement</em>.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredCredits.map((c) => (
                            <div
                              key={c.id}
                              className="rounded-md border border-surface-border bg-surface p-2.5 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between font-medium text-foreground">
                                <span className="flex items-center gap-1.5">
                                  <span className="font-semibold">{c.banque_nom}</span>
                                  {c.speculation_nom && (
                                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                      {c.speculation_nom}
                                    </span>
                                  )}
                                </span>
                                <span className="font-bold text-primary">
                                  {Math.round(c.interet_calcule).toLocaleString('fr-FR')} FCFA d'intérêt
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-foreground-muted">
                                <span>Montant : <strong className="text-foreground">{Math.round(c.montant).toLocaleString('fr-FR')} FCFA</strong></span>
                                <span>Taux : <strong className="text-foreground">{c.taux_interet}%</strong></span>
                                <span>Durée : <strong className="text-foreground">{c.duree_credit} mois</strong></span>
                              </div>
                            </div>
                          ))}

                          <div className="pt-1.5 border-t border-surface-border flex items-center justify-between font-semibold text-xs text-foreground">
                            <span>Total intérêts à répartir :</span>
                            <span className="text-sm font-bold text-primary">
                              {Math.round(totalInteretAffiches).toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Méthode de répartition */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">{t.method_label}</label>
                    <label className="flex items-start gap-2 p-3 rounded-md border border-surface-border cursor-pointer hover:bg-background">
                      <input type="radio" name="methode" value="superficie" defaultChecked className="mt-1" />
                      <div>
                        <span className="text-sm font-medium text-foreground">{t.method_superficie}</span>
                        <p className="text-xs text-foreground-muted">
                          (Chaque membre supporte l'intérêt au prorata de sa surface emblavée pour la culture concernée)
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 p-3 rounded-md border border-surface-border cursor-pointer hover:bg-background">
                      <input type="radio" name="methode" value="intrants" className="mt-1" />
                      <div>
                        <span className="text-sm font-medium text-foreground">{t.method_intrants}</span>
                        <p className="text-xs text-foreground-muted">
                          (Chaque membre supporte l'intérêt au prorata du montant total de ses dotations)
                        </p>
                      </div>
                    </label>
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form="calcul-interet-form"
                  disabled={loading || loadingCredits || totalInteretAffiches <= 0}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? t.calculating : totalInteretAffiches > 0 ? `Répartir (${Math.round(totalInteretAffiches).toLocaleString('fr-FR')} FCFA)` : t.submit}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict.common?.cancel || 'Annuler'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
