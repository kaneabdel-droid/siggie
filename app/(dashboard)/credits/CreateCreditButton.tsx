'use client'

import { useState, useMemo } from 'react'
import { Plus, Tractor, Sprout, Info, Calculator, ShieldCheck } from 'lucide-react'
import { addCredit } from './actions'
import { calculerEcheanceEstimee, type PeriodiciteRemboursement } from '@/lib/credits-types'

type Campagne = {
  id: string
  nom: string
}

export default function CreateCreditButton({ campagnes, dict }: { campagnes: Campagne[]; dict: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [typeCredit, setTypeCredit] = useState<'campagne' | 'equipement'>('campagne')

  // Champs de calcul dynamique pour le crédit d'équipement
  const [montantDemande, setMontantDemande] = useState<number>(0)
  const [tauxInteret, setTauxInteret] = useState<number>(7.5)
  const [dureeMois, setDureeMois] = useState<number>(36) // 3 ans par défaut
  const [periodicite, setPeriodicite] = useState<PeriodiciteRemboursement>('annuelle')

  const d = dict.credits_extra

  // Simulation d'échéance pour équipement moyen terme
  const simulation = useMemo(() => {
    if (typeCredit !== 'equipement') return null
    return calculerEcheanceEstimee(montantDemande, tauxInteret, dureeMois, periodicite)
  }, [typeCredit, montantDemande, tauxInteret, dureeMois, periodicite])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    formData.set('type_credit', typeCredit)
    if (typeCredit === 'equipement' && simulation) {
      formData.set('nombre_echeances', simulation.nombreEcheances.toString())
      formData.set('montant_echeance', simulation.montantEcheance.toString())
    }
    const res = await addCredit(formData)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsOpen(false)
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
        {d.create_btn}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-surface-border">
              <div className="bg-surface px-5 pb-5 pt-6 sm:p-6 sm:pb-5">
                <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
                  <div>
                    <h3 className="text-lg font-bold font-heading text-foreground">
                      Demande de Financement Bancaire
                    </h3>
                    <p className="text-xs text-foreground-muted">
                      Sélectionnez la nature du crédit : trésorerie de campagne ou investissement équipement.
                    </p>
                  </div>
                </div>

                <form action={handleSubmit} id="add-credit-form" className="space-y-4">
                  {/* Sélecteur de type de crédit : Campagne vs Équipement */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Type de crédit
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTypeCredit('campagne')
                          setDureeMois(12)
                        }}
                        className={`text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                          typeCredit === 'campagne'
                            ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500 text-foreground'
                            : 'border-surface-border bg-background/50 hover:bg-background text-foreground-muted'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${typeCredit === 'campagne' ? 'bg-emerald-500 text-white' : 'bg-surface text-foreground-muted'}`}>
                          <Sprout className="h-5 w-5 shrink-0" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            Crédit Campagne
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                              Court terme
                            </span>
                          </div>
                          <p className="text-xs text-foreground-muted mt-1 leading-snug">
                            Trésorerie d&apos;exploitation (semences, engrais, labour, gasoil). Remboursable à la récolte (6 à 12 mois).
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTypeCredit('equipement')
                          setDureeMois(36)
                        }}
                        className={`text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                          typeCredit === 'equipement'
                            ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500 text-foreground'
                            : 'border-surface-border bg-background/50 hover:bg-background text-foreground-muted'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${typeCredit === 'equipement' ? 'bg-indigo-500 text-white' : 'bg-surface text-foreground-muted'}`}>
                          <Tractor className="h-5 w-5 shrink-0" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            Crédit Équipement
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold">
                              Moyen terme
                            </span>
                          </div>
                          <p className="text-xs text-foreground-muted mt-1 leading-snug">
                            Investissement matériel (tracteur, moissonneuse, motopompe, hangars). Remboursable sur 2 à 5 ans.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Section Spécifique Équipement */}
                  {typeCredit === 'equipement' ? (
                    <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          Équipement ou Matériel financé *
                        </label>
                        <input
                          type="text"
                          name="equipement_nom"
                          required
                          placeholder="Ex: Tracteur New Holland 90CV, Moissonneuse-batteuse, Groupe motopompe..."
                          className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Campagne d&apos;acquisition (facultative)
                          </label>
                          <select
                            name="campagne_id"
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="">(Toutes campagnes / Indépendant)</option>
                            {campagnes.map(c => (
                              <option key={c.id} value={c.id}>{c.nom}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Périodicité des remboursements
                          </label>
                          <select
                            name="periodicite_remboursement"
                            value={periodicite}
                            onChange={(e) => setPeriodicite(e.target.value as PeriodiciteRemboursement)}
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="annuelle">Annuelle (1 fois par an après récolte)</option>
                            <option value="semestrielle">Semestrielle (2 fois par an)</option>
                            <option value="trimestrielle">Trimestrielle (4 fois par an)</option>
                            <option value="mensuelle">Mensuelle (12 fois par an)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Durée du crédit
                          </label>
                          <select
                            name="duree_credit"
                            value={dureeMois}
                            onChange={(e) => setDureeMois(parseInt(e.target.value, 10))}
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="24">2 ans (24 mois)</option>
                            <option value="36">3 ans (36 mois) - Standard</option>
                            <option value="48">4 ans (48 mois)</option>
                            <option value="60">5 ans (60 mois)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Taux d&apos;intérêt bancaire annuel (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            name="taux_interet"
                            value={tauxInteret}
                            onChange={(e) => setTauxInteret(parseFloat(e.target.value) || 0)}
                            placeholder="Ex: 7.5"
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Simulation de l'échéancier */}
                      {simulation && montantDemande > 0 && (
                        <div className="rounded-lg bg-surface border border-indigo-500/30 p-3 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
                            <Calculator className="h-4 w-4" /> Simulation d&apos;échéancier moyen terme :
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-foreground">
                            <div>
                              <span className="text-foreground-muted block text-[11px]">Échéances :</span>
                              <strong className="text-sm">{simulation.nombreEcheances} {periodicite}s</strong>
                            </div>
                            <div>
                              <span className="text-foreground-muted block text-[11px]">Montant / échéance :</span>
                              <strong className="text-sm text-indigo-600 dark:text-indigo-400">
                                {simulation.montantEcheance.toLocaleString('fr-FR')} FCFA
                              </strong>
                            </div>
                            <div>
                              <span className="text-foreground-muted block text-[11px]">Total intérêts :</span>
                              <strong className="text-sm">{simulation.totalInterets.toLocaleString('fr-FR')} FCFA</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Section Spécifique Crédit Campagne (Trésorerie) */
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">{d.modal.linked_campaign} *</label>
                        <select name="campagne_id" required className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none">
                          <option value="">{d.modal.select_campaign}</option>
                          {campagnes.map(c => (
                            <option key={c.id} value={c.id}>{c.nom}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">Mode de financement</label>
                        <select name="type_financement" defaultValue="global" className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none">
                          <option value="global">Financement Global (Enveloppe unique de trésorerie)</option>
                          <option value="par_intrant">Décliné par intrant ou service (Banque Agricole)</option>
                        </select>
                        <p className="mt-1 text-[11px] text-foreground-muted">
                          Permet de ventiler le crédit par ligne (semences, urée, labour...) et de suivre les décaissements directs fournisseurs.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Durée (mois)</label>
                          <input
                            type="number"
                            name="duree_credit"
                            defaultValue={12}
                            placeholder="6 à 12 mois"
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Taux d&apos;intérêt (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            name="taux_interet"
                            defaultValue={7.5}
                            placeholder="Ex: 7.5"
                            className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Champs Communs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">{d.modal.bank_optional}</label>
                      <input
                        type="text"
                        name="banque_nom"
                        placeholder="Ex: La Banque Agricole (LBA), CMS, BNDE..."
                        className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">{d.modal.amount_requested} *</label>
                      <input
                        type="number"
                        step="any"
                        name="montant_demande"
                        required
                        value={montantDemande || ''}
                        onChange={(e) => setMontantDemande(parseFloat(e.target.value) || 0)}
                        placeholder="Ex: 15 000 000"
                        className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm font-semibold focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">{d.modal.reason}</label>
                    <textarea
                      name="but_credit"
                      rows={2}
                      placeholder={typeCredit === 'equipement' ? "Précisions sur l'acquisition, devis fournisseur, capacité de travail..." : d.modal.reason_placeholder}
                      className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    ></textarea>
                  </div>
                </form>
              </div>

              <div className="bg-background/50 px-5 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-surface-border">
                <button
                  type="submit"
                  form="add-credit-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto disabled:opacity-50 transition-colors"
                >
                  {loading ? dict.common.creating : d.modal.create_submit}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto transition-colors"
                >
                  {dict.common.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
