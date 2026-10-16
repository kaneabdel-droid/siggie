'use client'

import { useState, useTransition } from 'react'
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Printer,
  Search,
  SlidersHorizontal,
  Check,
  Edit2,
  X,
  FileCheck2,
  RotateCcw
} from 'lucide-react'
import { updateValidationSuperficie, validerToutConforme, reinitialiserValidation } from './actions'

export type CampagneMembreValidation = {
  campagne_id: string
  membre_id: string
  superficie: number
  superficie_validee: number | null
  casier: string | null
  statut_validation: 'en_attente' | 'valide' | 'partiel' | 'non_emblave' | 'litige' | string
  date_controle: string | null
  controleur: string | null
  observations: string | null
  valide_at: string | null
  membre?: {
    id: string
    nom: string
    prenom: string
    telephone?: string | null
    village?: string | null
    code_membre?: string | null
  }
}

type Props = {
  campagne: {
    id: string
    nom: string
    saison?: string
    annee?: number
  }
  records: CampagneMembreValidation[]
  gieName: string
}

export default function ValidationTable({ campagne, records, gieName }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [selectedRecord, setSelectedRecord] = useState<CampagneMembreValidation | null>(null)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Quick filter
  const filtered = records.filter((r) => {
    const fullName = `${r.membre?.nom || ''} ${r.membre?.prenom || ''} ${r.casier || ''} ${r.membre?.village || ''}`.toLowerCase()
    const matchesSearch = fullName.includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'tous' || r.statut_validation === statusFilter
    return matchesSearch && matchesStatus
  })

  // KPIs
  const totalMembres = records.length
  const totalDeclare = records.reduce((acc, r) => acc + (Number(r.superficie) || 0), 0)
  const totalValide = records.reduce((acc, r) => {
    if (r.statut_validation === 'valide' || r.statut_validation === 'partiel') {
      return acc + (Number(r.superficie_validee) || 0)
    }
    return acc
  }, 0)
  const ecartNet = totalValide - totalDeclare
  const countValides = records.filter((r) => r.statut_validation === 'valide').length
  const countPartiels = records.filter((r) => r.statut_validation === 'partiel').length
  const countLitiges = records.filter((r) => r.statut_validation === 'litige').length
  const countNonEmblaves = records.filter((r) => r.statut_validation === 'non_emblave').length
  const countEnAttente = records.filter((r) => !r.statut_validation || r.statut_validation === 'en_attente').length

  const handleQuickValidate = (record: CampagneMembreValidation) => {
    const formData = new FormData()
    formData.set('superficie_validee', String(record.superficie))
    formData.set('casier', record.casier || '')
    formData.set('statut_validation', 'valide')
    formData.set('date_controle', new Date().toISOString().split('T')[0])
    formData.set('controleur', 'Chef d\'exploitation')
    formData.set('observations', 'Conforme tour de casier')

    startTransition(async () => {
      const res = await updateValidationSuperficie(record.campagne_id, record.membre_id, formData)
      if (res?.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: `Superficie de ${record.membre?.nom} validée conforme.` })
      }
    })
  }

  const handleBulkValidate = () => {
    if (!confirm(`Valider comme conformes tous les membres en attente (${countEnAttente}) pour cette campagne ?`)) {
      return
    }

    startTransition(async () => {
      const res = await validerToutConforme(campagne.id, 'Chef d\'exploitation')
      if (res?.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: `${res.count || 0} parcelles validées conformes.` })
      }
    })
  }

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedRecord) return

    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const res = await updateValidationSuperficie(selectedRecord.campagne_id, selectedRecord.membre_id, formData)
      if (res?.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: 'Validation enregistrée avec succès.' })
        setSelectedRecord(null)
      }
    })
  }

  const handleReset = (record: CampagneMembreValidation) => {
    if (!confirm(`Réinitialiser le contrôle pour ${record.membre?.nom} ${record.membre?.prenom} ?`)) return
    startTransition(async () => {
      const res = await reinitialiserValidation(record.campagne_id, record.membre_id)
      if (res?.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: 'Contrôle réinitialisé.' })
      }
    })
  }

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'valide':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20"><CheckCircle className="h-3 w-3" /> Validé conforme</span>
      case 'partiel':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20"><AlertTriangle className="h-3 w-3" /> Partiel (écart)</span>
      case 'non_emblave':
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20"><X className="h-3 w-3" /> Non emblavé (0 ha)</span>
      case 'litige':
        return <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/20"><AlertTriangle className="h-3 w-3" /> En litige</span>
      case 'en_attente':
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-foreground-muted/10 px-2.5 py-0.5 text-xs font-semibold text-foreground-muted border border-surface-border"><Clock className="h-3 w-3" /> En attente de tour</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center justify-between border ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-75"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-surface-border shadow-sm">
          <p className="text-xs text-foreground-muted uppercase font-medium">Membres engagés</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalMembres}</p>
          <p className="text-xs text-foreground-muted mt-1">{countValides} validés • {countEnAttente} en attente</p>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-surface-border shadow-sm">
          <p className="text-xs text-foreground-muted uppercase font-medium">Superficie déclarée</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalDeclare.toFixed(2)} <span className="text-sm font-normal text-foreground-muted">ha</span></p>
          <p className="text-xs text-foreground-muted mt-1">Estimations initiales</p>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-surface-border shadow-sm">
          <p className="text-xs text-foreground-muted uppercase font-medium">Superficie validée</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{totalValide.toFixed(2)} <span className="text-sm font-normal text-foreground-muted">ha</span></p>
          <p className="text-xs text-foreground-muted mt-1">Mesurée au tour de casier</p>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-surface-border shadow-sm">
          <p className="text-xs text-foreground-muted uppercase font-medium">Écart net de superficie</p>
          <p className={`text-2xl font-bold mt-1 ${ecartNet < 0 ? 'text-amber-400' : ecartNet > 0 ? 'text-blue-400' : 'text-foreground'}`}>
            {ecartNet > 0 ? `+${ecartNet.toFixed(2)}` : ecartNet.toFixed(2)} <span className="text-sm font-normal text-foreground-muted">ha</span>
          </p>
          <p className="text-xs text-foreground-muted mt-1">{countPartiels} écart(s) • {countLitiges} litige(s)</p>
        </div>
      </div>

      {/* Filter and Action bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-surface p-4 rounded-xl border border-surface-border">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Rechercher membre, casier, village..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-foreground-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-background border border-surface-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="tous">Tous les statuts ({records.length})</option>
              <option value="en_attente">En attente ({countEnAttente})</option>
              <option value="valide">Validés conformes ({countValides})</option>
              <option value="partiel">Partiels avec écart ({countPartiels})</option>
              <option value="non_emblave">Non emblavés ({countNonEmblaves})</option>
              <option value="litige">En litige ({countLitiges})</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          {countEnAttente > 0 && (
            <button
              onClick={handleBulkValidate}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 shadow-sm"
              title="Valider automatiquement toutes les surfaces déclarées en attente"
            >
              <FileCheck2 className="h-4 w-4" />
              Tout valider conforme ({countEnAttente})
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-background border border-surface-border text-foreground rounded-lg text-sm font-medium transition"
          >
            <Printer className="h-4 w-4 text-foreground-muted" />
            Imprimer PV
          </button>
        </div>
      </div>

      {/* Printable PV Header */}
      <div className="hidden print:block text-center border-b border-surface-border pb-4 mb-4">
        <h1 className="text-xl font-bold uppercase">{gieName}</h1>
        <h2 className="text-lg font-semibold text-foreground">PROCÈS-VERBAL DU TOUR DE CASIER — VALIDATION DES SURFACES EMBLAVÉES</h2>
        <p className="text-sm text-foreground-muted">Campagne : {campagne.nom} {campagne.saison ? `(${campagne.saison} ${campagne.annee || ''})` : ''} • Date d&apos;édition : {new Date().toLocaleDateString('fr-FR')}</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-background/60">
            <tr>
              <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Membre</th>
              <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Casier / Parcelle</th>
              <th scope="col" className="px-3 py-3.5 text-right text-xs font-semibold text-foreground uppercase tracking-wider">Sup. Déclarée</th>
              <th scope="col" className="px-3 py-3.5 text-right text-xs font-semibold text-foreground uppercase tracking-wider">Sup. Validée</th>
              <th scope="col" className="px-3 py-3.5 text-right text-xs font-semibold text-foreground uppercase tracking-wider">Écart</th>
              <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Statut Tour</th>
              <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Contrôleur / Date</th>
              <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Observations</th>
              <th scope="col" className="relative px-4 py-3.5 text-right text-xs font-semibold text-foreground uppercase tracking-wider print:hidden">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-surface">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-foreground-muted italic">
                  Aucun membre trouvé pour cette sélection.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const dec = Number(r.superficie) || 0
                const val = r.superficie_validee !== null ? Number(r.superficie_validee) : null
                const diff = val !== null ? val - dec : null

                return (
                  <tr key={`${r.campagne_id}-${r.membre_id}`} className="hover:bg-background/40 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <div className="font-medium text-foreground">{r.membre?.nom} {r.membre?.prenom}</div>
                      <div className="text-xs text-foreground-muted">{r.membre?.village || 'Village non renseigné'} {r.membre?.telephone ? `• ${r.membre.telephone}` : ''}</div>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-sm">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-background border border-surface-border text-foreground">
                        {r.casier || 'Non assigné'}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-sm text-right font-medium text-foreground">
                      {dec.toFixed(2)} ha
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-sm text-right font-bold">
                      {val !== null ? (
                        <span className={val === dec ? 'text-emerald-400' : val < dec ? 'text-amber-400' : 'text-blue-400'}>
                          {val.toFixed(2)} ha
                        </span>
                      ) : (
                        <span className="text-foreground-muted italic text-xs">Non mesuré</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-sm text-right font-medium">
                      {diff !== null ? (
                        <span className={diff === 0 ? 'text-foreground-muted' : diff < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                          {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} ha
                        </span>
                      ) : (
                        <span className="text-foreground-muted">-</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-sm">
                      {getStatusBadge(r.statut_validation)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-xs text-foreground-muted">
                      <div>{r.controleur || '-'}</div>
                      <div>{r.date_controle ? new Date(r.date_controle).toLocaleDateString('fr-FR') : ''}</div>
                    </td>

                    <td className="px-3 py-3 text-xs text-foreground-muted max-w-[200px] truncate" title={r.observations || ''}>
                      {r.observations || '-'}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm text-right print:hidden">
                      <div className="flex items-center justify-end gap-1.5">
                        {(!r.statut_validation || r.statut_validation === 'en_attente') && (
                          <button
                            onClick={() => handleQuickValidate(r)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                            title="Valider conforme en un clic"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedRecord(r)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
                          title="Modifier le contrôle du casier"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        {r.statut_validation && r.statut_validation !== 'en_attente' && (
                          <button
                            onClick={() => handleReset(r)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background transition"
                            title="Réinitialiser en attente"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Printable Signature Section */}
      <div className="hidden print:grid grid-cols-2 gap-8 pt-12 text-sm text-foreground">
        <div className="border border-surface-border p-4 rounded-lg">
          <p className="font-semibold mb-12">Le Chef d&apos;exploitation (Contrôleur du casier) :</p>
          <p className="text-xs text-foreground-muted">Signature & Date : ____________________</p>
        </div>
        <div className="border border-surface-border p-4 rounded-lg">
          <p className="font-semibold mb-12">Le Président / Bureau du GIE :</p>
          <p className="text-xs text-foreground-muted">Signature & Cachet : ____________________</p>
        </div>
      </div>

      {/* Edit Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-lg w-full border border-surface-border shadow-2xl p-6 relative">
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 p-1.5 text-foreground-muted hover:text-foreground rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-foreground">Contrôle Tour de Casier</h3>
            <p className="text-sm text-foreground-muted mt-1">
              Membre : <strong className="text-foreground">{selectedRecord.membre?.nom} {selectedRecord.membre?.prenom}</strong> • {selectedRecord.membre?.village || ''}
            </p>

            <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-foreground-muted mb-1">
                    Superficie Déclarée
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${Number(selectedRecord.superficie || 0).toFixed(2)} ha`}
                    className="w-full bg-background/50 border border-surface-border rounded-lg px-3 py-2 text-sm text-foreground-muted"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-foreground mb-1">
                    Superficie Validée (ha) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    name="superficie_validee"
                    defaultValue={selectedRecord.superficie_validee ?? selectedRecord.superficie}
                    className="w-full bg-background border border-primary/50 focus:border-primary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-foreground mb-1">
                    Casier / Parcelle
                  </label>
                  <input
                    type="text"
                    name="casier"
                    placeholder="Ex: C-14, P-02, Bloc A"
                    defaultValue={selectedRecord.casier || ''}
                    className="w-full bg-background border border-surface-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-foreground mb-1">
                    Statut du contrôle
                  </label>
                  <select
                    name="statut_validation"
                    defaultValue={selectedRecord.statut_validation || 'valide'}
                    className="w-full bg-background border border-surface-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="valide">Validé conforme</option>
                    <option value="partiel">Partiel (écart de surface)</option>
                    <option value="non_emblave">Non emblavé (0 ha)</option>
                    <option value="litige">En litige / Contesté</option>
                    <option value="en_attente">En attente de tour</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-foreground mb-1">
                    Date du contrôle
                  </label>
                  <input
                    type="date"
                    name="date_controle"
                    defaultValue={selectedRecord.date_controle || new Date().toISOString().split('T')[0]}
                    className="w-full bg-background border border-surface-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-foreground mb-1">
                    Contrôleur
                  </label>
                  <input
                    type="text"
                    name="controleur"
                    placeholder="Nom du contrôleur"
                    defaultValue={selectedRecord.controleur || 'Chef d\'exploitation'}
                    className="w-full bg-background border border-surface-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-foreground mb-1">
                  Observations / Remarques
                </label>
                <textarea
                  name="observations"
                  rows={2}
                  placeholder="Ex: Borne déplacée, canal secondaire enherbé, reprise partielle..."
                  defaultValue={selectedRecord.observations || ''}
                  className="w-full bg-background border border-surface-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition disabled:opacity-50"
                >
                  {isPending ? 'Enregistrement...' : 'Enregistrer la validation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
