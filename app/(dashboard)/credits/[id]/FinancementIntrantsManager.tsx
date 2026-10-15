'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Building,
  Check,
  Save,
  Wallet,
  Sparkles,
  Printer
} from 'lucide-react'
import {
  addCreditLigne,
  updateCreditLigne,
  updateCreditLignePaiement,
  deleteCreditLigne,
  updateCreditTypeFinancement
} from '../actions'
import { useUnite } from '@/components/DeviseProvider'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type IntrantCatalogue = {
  id: string
  nom: string
  type_intrant: string
  prix_unitaire?: number
}

type CreditLigne = {
  id: string
  credit_id: string
  intrant_id?: string | null
  type_rubrique: 'intrant' | 'service' | string
  designation: string
  fournisseur_nom?: string | null
  montant_accorde: number
  montant_paye: number
  observations?: string | null
  intrants?: { id: string; nom: string; type_intrant: string } | null
}

type CreditDetail = {
  id: string
  montant_demande: number
  montant_accorde: number
  statut: string
  banque_nom?: string | null
  type_financement?: string | null
  date_demande?: string | null
  but_credit?: string | null
  taux_interet?: number | null
  duree_credit?: number | null
  campagnes?: { id: string; nom: string } | null
}

export default function FinancementIntrantsManager({
  credit,
  lignesInitiales,
  intrantsCatalogue,
  gieNom,
  locale = 'fr',
}: {
  credit: CreditDetail
  lignesInitiales: CreditLigne[]
  intrantsCatalogue: IntrantCatalogue[]
  gieNom?: string
  locale?: string
}) {
  const unite = useUnite()
  const localeCode = locale === 'fr' ? 'fr-FR' : 'en-US'

  const [lignes, setLignes] = useState<CreditLigne[]>(lignesInitiales)
  const [typeFinancement, setTypeFinancement] = useState<string>(credit.type_financement || 'par_intrant')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editLigne, setEditLigne] = useState<CreditLigne | null>(null)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  // Suivi de l'édition directe du montant payé en ligne
  const [editingPaiements, setEditingPaiements] = useState<Record<string, string>>({})
  const [savingPaiementId, setSavingPaiementId] = useState<string | null>(null)

  // Totaux calculés
  const totalAccordeRubriques = lignes.reduce((sum, l) => sum + Number(l.montant_accorde || 0), 0)
  const totalPayeRubriques = lignes.reduce((sum, l) => sum + Number(l.montant_paye || 0), 0)
  const totalEcartRubriques = totalAccordeRubriques - totalPayeRubriques

  const montantTotalCredit = Number(credit.montant_accorde || credit.montant_demande || 0)
  const ecartConformite = montantTotalCredit - totalAccordeRubriques
  const estConforme = Math.abs(ecartConformite) === 0

  // Mise à jour rapide du montant payé
  const handlePaiementChange = (ligneId: string, val: string) => {
    setEditingPaiements(prev => ({ ...prev, [ligneId]: val }))
  }

  const handleSavePaiement = async (ligne: CreditLigne) => {
    const valStr = editingPaiements[ligne.id]
    if (valStr === undefined) return
    const montantPaye = parseFloat(valStr) || 0
    setSavingPaiementId(ligne.id)
    const res = await updateCreditLignePaiement(ligne.id, montantPaye, credit.id)
    setSavingPaiementId(null)
    if (res?.error) {
      alert(res.error)
    } else {
      setLignes(prev =>
        prev.map(l => (l.id === ligne.id ? { ...l, montant_paye: montantPaye } : l))
      )
      setEditingPaiements(prev => {
        const next = { ...prev }
        delete next[ligne.id]
        return next
      })
    }
  }

  // Changement de mode de financement
  const handleToggleMode = (mode: string) => {
    setTypeFinancement(mode)
    startTransition(async () => {
      const res = await updateCreditTypeFinancement(credit.id, mode)
      if (res?.error) {
        setFeedback(`Erreur : ${res.error}`)
      } else {
        setFeedback(`Mode mis à jour : ${mode === 'par_intrant' ? 'Décliné par intrant' : 'Global'}`)
        setTimeout(() => setFeedback(null), 3000)
      }
    })
  }

  // Soumission Ajout d'une ligne
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.append('credit_id', credit.id)

    startTransition(async () => {
      const res = await addCreditLigne(formData)
      if (res?.error) {
        alert(res.error)
      } else {
        setIsAddOpen(false)
        window.location.reload()
      }
    })
  }

  // Soumission Modification d'une ligne
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editLigne) return
    const formData = new FormData(e.currentTarget)
    formData.append('credit_id', credit.id)

    startTransition(async () => {
      const res = await updateCreditLigne(editLigne.id, formData)
      if (res?.error) {
        alert(res.error)
      } else {
        setEditLigne(null)
        window.location.reload()
      }
    })
  }

  // Suppression
  const handleDeleteLigne = async (id: string, designation: string) => {
    if (!confirm(`Supprimer la ligne "${designation}" ?`)) return
    startTransition(async () => {
      const res = await deleteCreditLigne(id, credit.id)
      if (res?.error) {
        alert(res.error)
      } else {
        setLignes(prev => prev.filter(l => l.id !== id))
      }
    })
  }

  // Exportation PDF bancaire
  const exportPdf = () => {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text(`PLAN DE FINANCEMENT PAR INTRANT & SERVICE`, 14, 20)
    doc.setFontSize(11)
    doc.text(`GIE : ${gieNom || 'Groupement Agricole'}`, 14, 28)
    doc.text(`Banque : ${credit.banque_nom || 'Non spécifiée'} | Campagne : ${credit.campagnes?.nom || '-'}`, 14, 34)
    doc.text(`Montant Total Accordé : ${montantTotalCredit.toLocaleString(localeCode)} ${unite}`, 14, 40)
    doc.text(`Date d'édition : ${new Date().toLocaleDateString(localeCode)}`, 14, 46)

    const tableRows = lignes.map(l => {
      const accorde = Number(l.montant_accorde || 0)
      const paye = Number(l.montant_paye || 0)
      const ecart = accorde - paye
      return [
        l.designation + (l.fournisseur_nom ? ` (${l.fournisseur_nom})` : ''),
        l.type_rubrique === 'service' ? 'Service' : 'Intrant',
        `${accorde.toLocaleString(localeCode)} ${unite}`,
        `${paye.toLocaleString(localeCode)} ${unite}`,
        `${ecart.toLocaleString(localeCode)} ${unite}`,
      ]
    })

    tableRows.push([
      'TOTAL GÉNÉRAL',
      '',
      `${totalAccordeRubriques.toLocaleString(localeCode)} ${unite}`,
      `${totalPayeRubriques.toLocaleString(localeCode)} ${unite}`,
      `${totalEcartRubriques.toLocaleString(localeCode)} ${unite}`,
    ])

    autoTable(doc, {
      startY: 52,
      head: [['Intrant ou Service', 'Type', 'Montant Accordé', 'Montant Payé / Décaissé', 'Écart (Accordé - Payé)']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [24, 76, 56], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    })

    const finalY = (doc as any).lastAutoTable?.finalY || 180
    doc.setFontSize(10)
    doc.text(`Règle bancaire : Somme des rubriques accordées = ${totalAccordeRubriques.toLocaleString(localeCode)} ${unite}`, 14, finalY + 12)
    doc.text(`Statut de conformité : ${estConforme ? 'CONFORME (100% alloué)' : ecartConformite > 0 ? `RESTE À ALLOUER (${ecartConformite.toLocaleString(localeCode)} ${unite})` : `DÉPASSEMENT (+${Math.abs(ecartConformite).toLocaleString(localeCode)} ${unite})`}`, 14, finalY + 18)

    doc.text('Signature Responsable GIE', 20, finalY + 35)
    doc.text('Cachet & Visa Banque Partenaire', 130, finalY + 35)

    doc.save(`Financement_Intrants_${credit.banque_nom || 'Credit'}_${credit.campagnes?.nom || 'Campagne'}.pdf`)
  }

  return (
    <div className="space-y-6">
      {/* Navigation & En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/credits"
            className="text-foreground-muted hover:text-primary flex items-center gap-1.5 text-sm font-medium mb-2 transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" /> Retour aux crédits bancaires
          </Link>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading text-foreground">
                Financement Décliné par Intrant & Service
              </h1>
              <p className="text-sm text-foreground-muted">
                {credit.banque_nom || 'Banque partenaire'} · Campagne : <strong>{credit.campagnes?.nom || '-'}</strong> · Crédit accordé : <strong>{montantTotalCredit.toLocaleString(localeCode)}{unite}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sélecteur de mode */}
          <div className="inline-flex rounded-lg border border-surface-border bg-surface p-1 text-xs font-semibold">
            <button
              onClick={() => handleToggleMode('global')}
              disabled={isPending}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                typeFinancement === 'global' ? 'bg-background text-foreground shadow-sm' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Financement Global
            </button>
            <button
              onClick={() => handleToggleMode('par_intrant')}
              disabled={isPending}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                typeFinancement === 'par_intrant' ? 'bg-primary text-white shadow-sm' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Décliné par Intrant (Banque Agricole)
            </button>
          </div>

          <button
            onClick={exportPdf}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:bg-background transition-colors"
          >
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" /> Ajouter une rubrique
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-success/10 text-success border border-success/20 text-sm font-medium animate-in fade-in duration-200">
          {feedback}
        </div>
      )}

      {/* Règle d'or de la banque agricole & Alerte de conformité */}
      <div
        className={`rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          estConforme
            ? 'bg-success/5 border-success/30 text-success'
            : ecartConformite > 0
            ? 'bg-warning/5 border-warning/30 text-warning'
            : 'bg-danger/5 border-danger/30 text-danger'
        }`}
      >
        <div className="flex items-start gap-3">
          {estConforme ? (
            <CheckCircle2 className="h-6 w-6 shrink-0 text-success mt-0.5" />
          ) : ecartConformite > 0 ? (
            <AlertTriangle className="h-6 w-6 shrink-0 text-warning mt-0.5" />
          ) : (
            <AlertCircle className="h-6 w-6 shrink-0 text-danger mt-0.5" />
          )}
          <div>
            <h3 className="font-bold text-base text-foreground font-heading">
              {estConforme
                ? 'Conformité Bancaire Validée : 100% du crédit est alloué'
                : ecartConformite > 0
                ? `Reste à allouer : ${ecartConformite.toLocaleString(localeCode)} ${unite}`
                : `Dépassement du crédit accordé : +${Math.abs(ecartConformite).toLocaleString(localeCode)} ${unite}`}
            </h3>
            <p className="text-sm text-foreground-muted mt-0.5">
              Règle banque agricole : la somme des rubriques accordées (<strong>{totalAccordeRubriques.toLocaleString(localeCode)}{unite}</strong>) doit être exactement égale au montant total du crédit accordé (<strong>{montantTotalCredit.toLocaleString(localeCode)}{unite}</strong>).
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              estConforme
                ? 'bg-success/20 text-success'
                : ecartConformite > 0
                ? 'bg-warning/20 text-warning'
                : 'bg-danger/20 text-danger'
            }`}
          >
            {estConforme ? 'Conforme' : ecartConformite > 0 ? 'Non alloué' : 'Dépassement'}
          </span>
        </div>
      </div>

      {/* 4 KPIs de suivi financier */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-surface p-5 border border-surface-border shadow-sm">
          <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Crédit Total Accordé</p>
          <p className="text-2xl font-bold font-heading text-foreground mt-2">
            {montantTotalCredit.toLocaleString(localeCode)}{unite}
          </p>
          <p className="text-xs text-foreground-muted mt-1">{credit.banque_nom || 'Banque partenaire'}</p>
        </div>

        <div className="rounded-xl bg-surface p-5 border border-surface-border shadow-sm">
          <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Somme des Rubriques Accordées</p>
          <p className="text-2xl font-bold font-heading text-primary mt-2">
            {totalAccordeRubriques.toLocaleString(localeCode)}{unite}
          </p>
          <p className="text-xs text-foreground-muted mt-1">{lignes.length} poste(s) d&apos;intrant ou service</p>
        </div>

        <div className="rounded-xl bg-surface p-5 border border-surface-border shadow-sm">
          <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Total Payé Fournisseurs / Décaissé</p>
          <p className="text-2xl font-bold font-heading text-success mt-2">
            {totalPayeRubriques.toLocaleString(localeCode)}{unite}
          </p>
          <p className="text-xs text-foreground-muted mt-1">Montant déjà décaissé / réglé</p>
        </div>

        <div className="rounded-xl bg-surface p-5 border border-surface-border shadow-sm">
          <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Écart Global Restant</p>
          <p className={`text-2xl font-bold font-heading mt-2 ${totalEcartRubriques >= 0 ? 'text-primary' : 'text-danger'}`}>
            {totalEcartRubriques.toLocaleString(localeCode)}{unite}
          </p>
          <p className="text-xs text-foreground-muted mt-1">Disponible restant à décaisser</p>
        </div>
      </div>

      {/* Tableau des 4 colonnes demandées */}
      <div className="rounded-xl border border-surface-border bg-surface overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-surface-border bg-background/50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground font-heading">
              Décomposition du Crédit par Intrant & Service
            </h2>
            <p className="text-xs text-foreground-muted">
              Saisissez directement dans la colonne <strong>Montant payé au fournisseur</strong> pour enregistrer les décaissements.
            </p>
          </div>
          <span className="text-xs text-foreground-muted">{lignes.length} ligne(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-surface-border">
            <thead className="bg-background text-xs uppercase tracking-wider text-foreground-muted">
              <tr>
                <th className="px-6 py-3.5 font-semibold">1. Intrant ou Service</th>
                <th className="px-6 py-3.5 font-semibold text-right">2. Montant Accordé</th>
                <th className="px-6 py-3.5 font-semibold text-right">3. Montant Payé / Décaissé</th>
                <th className="px-6 py-3.5 font-semibold text-right">4. Écart (Accordé - Payé)</th>
                <th className="px-6 py-3.5 font-semibold text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface">
              {lignes.length > 0 ? (
                lignes.map((ligne) => {
                  const accorde = Number(ligne.montant_accorde || 0)
                  const paye = Number(ligne.montant_paye || 0)
                  const ecart = accorde - paye
                  const isEditingCurrent = editingPaiements[ligne.id] !== undefined
                  const currentValue = isEditingCurrent ? editingPaiements[ligne.id] : paye.toString()
                  const isSaving = savingPaiementId === ligne.id

                  return (
                    <tr key={ligne.id} className="hover:bg-background/40 transition-colors">
                      {/* Colonne 1: Intrant ou service */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                              ligne.type_rubrique === 'service'
                                ? 'bg-secondary/10 text-secondary border border-secondary/20'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}
                          >
                            {ligne.type_rubrique === 'service' ? 'Service' : 'Intrant'}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{ligne.designation}</p>
                            {ligne.fournisseur_nom && (
                              <p className="text-xs text-foreground-muted mt-0.5 flex items-center gap-1">
                                <Building className="h-3 w-3" /> Fournisseur : <strong className="text-foreground">{ligne.fournisseur_nom}</strong>
                              </p>
                            )}
                            {ligne.observations && (
                              <p className="text-xs text-foreground-muted italic mt-0.5">{ligne.observations}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Colonne 2: Montant accordé */}
                      <td className="px-6 py-4 text-right font-semibold text-foreground text-sm whitespace-nowrap">
                        {accorde.toLocaleString(localeCode)}{unite}
                      </td>

                      {/* Colonne 3: Montant payé au fournisseur (ou décaissé) avec saisie inline */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={currentValue}
                            onChange={(e) => handlePaiementChange(ligne.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSavePaiement(ligne)
                              }
                            }}
                            className="w-32 rounded-lg border border-surface-border bg-background px-2.5 py-1.5 text-right text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                            title="Modifiez le montant payé et appuyez sur Enregistrer ou Entrée"
                          />
                          <span className="text-xs text-foreground-muted font-medium">{unite}</span>
                          {isEditingCurrent && (
                            <button
                              onClick={() => handleSavePaiement(ligne)}
                              disabled={isSaving}
                              className="ml-1 rounded-md bg-success p-1 text-white hover:bg-success/80 shadow transition-colors"
                              title="Enregistrer le montant payé"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Colonne 4: Écart = Accordé - Payé */}
                      <td className="px-6 py-4 text-right font-bold whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            ecart === 0
                              ? 'bg-success/10 text-success border border-success/20'
                              : ecart > 0
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-danger/10 text-danger border border-danger/20'
                          }`}
                        >
                          {ecart.toLocaleString(localeCode)}{unite}
                          {ecart === 0 ? ' (Soldé)' : ecart > 0 ? ' (Disponible)' : ' (Dépassement)'}
                        </span>
                      </td>

                      {/* Colonne 5: Actions */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditLigne(ligne)}
                            className="p-1.5 rounded-lg text-foreground-muted hover:text-primary hover:bg-surface transition-colors"
                            title="Modifier cette rubrique"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLigne(ligne.id, ligne.designation)}
                            className="p-1.5 rounded-lg text-foreground-muted hover:text-danger hover:bg-surface transition-colors"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-foreground-muted text-sm">
                    <Layers className="h-10 w-10 mx-auto text-foreground-muted/40 mb-3" />
                    Aucune rubrique définie pour ce crédit.
                    <br />
                    Cliquez sur <strong>« Ajouter une rubrique »</strong> pour ventiler les intrants et services financés par la banque.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Totalisation */}
            {lignes.length > 0 && (
              <tfoot className="bg-background/80 font-bold border-t-2 border-surface-border text-foreground">
                <tr>
                  <td className="px-6 py-4 text-sm font-heading">
                    TOTAL DES RUBRIQUES ({lignes.length})
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-heading text-primary">
                    {totalAccordeRubriques.toLocaleString(localeCode)}{unite}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-heading text-success">
                    {totalPayeRubriques.toLocaleString(localeCode)}{unite}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-heading">
                    <span className={totalEcartRubriques >= 0 ? 'text-primary' : 'text-danger'}>
                      {totalEcartRubriques.toLocaleString(localeCode)}{unite}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal Ajout Rubrique */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/75 transition-opacity" onClick={() => setIsAddOpen(false)} />

            <div className="relative transform overflow-hidden rounded-xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <form onSubmit={handleAddSubmit}>
                <div className="bg-surface px-6 pt-6 pb-4">
                  <h3 className="text-lg font-bold font-heading text-foreground mb-4 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" /> Nouvelle Rubrique de Financement
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground">Type de rubrique</label>
                      <select
                        name="type_rubrique"
                        defaultValue="intrant"
                        className="mt-1 block w-full rounded-lg bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                        id="add-type-rubrique"
                      >
                        <option value="intrant">Intrant agricole (Semences, Engrais, Produits phyto...)</option>
                        <option value="service">Service & Prestation (Labour, Récolte, Carburant, Moisson...)</option>
                      </select>
                    </div>

                    {/* Sélection rapide intrant catalogue */}
                    {intrantsCatalogue.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-foreground">
                          Choisir depuis le catalogue d&apos;intrants du GIE (optionnel)
                        </label>
                        <select
                          className="mt-1 block w-full rounded-lg bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                          onChange={(e) => {
                            const selected = intrantsCatalogue.find(i => i.id === e.target.value)
                            if (selected) {
                              const desigInput = document.getElementById('add-designation') as HTMLInputElement
                              if (desigInput) desigInput.value = `${selected.nom} (${selected.type_intrant})`
                              const intrantHidden = document.getElementById('add-intrant-id') as HTMLInputElement
                              if (intrantHidden) intrantHidden.value = selected.id
                            }
                          }}
                        >
                          <option value="">Sélectionner un intrant existant...</option>
                          {intrantsCatalogue.map(i => (
                            <option key={i.id} value={i.id}>{i.nom} ({i.type_intrant})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <input type="hidden" name="intrant_id" id="add-intrant-id" />

                    <div>
                      <label className="block text-sm font-medium text-foreground">Désignation de l&apos;intrant ou service *</label>
                      <input
                        type="text"
                        name="designation"
                        id="add-designation"
                        required
                        placeholder="Ex: Semences certifiées Sahel 108, Engrais Urée 46%, Labour mécanisé..."
                        className="mt-1 block w-full rounded-lg bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground">Fournisseur ou Prestataire (optionnel)</label>
                      <input
                        type="text"
                        name="fournisseur_nom"
                        placeholder="Ex: Sedab, Tropicasem, ICS, Prestataire local..."
                        className="mt-1 block w-full rounded-lg bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground">Montant Accordé * ({unite})</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          name="montant_accorde"
                          required
                          placeholder="Ex: 1500000"
                          className="mt-1 block w-full rounded-lg bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground">Montant Déjà Payé ({unite})</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          name="montant_paye"
                          defaultValue="0"
                          className="mt-1 block w-full rounded-lg bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground">Observations / Référence (optionnel)</label>
                      <input
                        type="text"
                        name="observations"
                        placeholder="Ex: Facture proforma N°45, décaissement par virement direct..."
                        className="mt-1 block w-full rounded-lg bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-background/80 px-6 py-4 flex flex-row-reverse gap-3 border-t border-surface-border">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-hover disabled:opacity-50"
                  >
                    {isPending ? 'Enregistrement...' : 'Ajouter la rubrique'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="rounded-lg bg-surface border border-surface-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-background"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modification Rubrique */}
      {editLigne && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/75 transition-opacity" onClick={() => setEditLigne(null)} />

            <div className="relative transform overflow-hidden rounded-xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <form onSubmit={handleEditSubmit}>
                <div className="bg-surface px-6 pt-6 pb-4">
                  <h3 className="text-lg font-bold font-heading text-foreground mb-4 flex items-center gap-2">
                    <Edit2 className="h-5 w-5 text-primary" /> Modifier la Rubrique
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground">Type de rubrique</label>
                      <select
                        name="type_rubrique"
                        defaultValue={editLigne.type_rubrique || 'intrant'}
                        className="mt-1 block w-full rounded-lg bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      >
                        <option value="intrant">Intrant agricole</option>
                        <option value="service">Service & Prestation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground">Désignation *</label>
                      <input
                        type="text"
                        name="designation"
                        defaultValue={editLigne.designation}
                        required
                        className="mt-1 block w-full rounded-lg bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground">Fournisseur ou Prestataire</label>
                      <input
                        type="text"
                        name="fournisseur_nom"
                        defaultValue={editLigne.fournisseur_nom || ''}
                        className="mt-1 block w-full rounded-lg bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground">Montant Accordé * ({unite})</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          name="montant_accorde"
                          defaultValue={editLigne.montant_accorde}
                          required
                          className="mt-1 block w-full rounded-lg bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground">Montant Payé / Décaissé ({unite})</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          name="montant_paye"
                          defaultValue={editLigne.montant_paye}
                          className="mt-1 block w-full rounded-lg bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground">Observations</label>
                      <input
                        type="text"
                        name="observations"
                        defaultValue={editLigne.observations || ''}
                        className="mt-1 block w-full rounded-lg bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-background/80 px-6 py-4 flex flex-row-reverse gap-3 border-t border-surface-border">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-hover disabled:opacity-50"
                  >
                    {isPending ? 'Enregistrement...' : 'Mettre à jour'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditLigne(null)}
                    className="rounded-lg bg-surface border border-surface-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-background"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
