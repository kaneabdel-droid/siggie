'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Tractor,
  Calendar,
  Building,
  Printer,
  Edit2,
  Check,
  X,
} from 'lucide-react'
import { useUnite } from '@/components/DeviseProvider'
import {
  getCreditEquipementNom,
  getCreditPeriodicite,
  cleanButCredit,
  findLinkedMateriel,
  resolveCreditEquipementStartDate,
  parseLocalDate,
} from '@/lib/credits-types'
import { updateCreditEquipementDateAcquisition } from '../actions'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type MaterielItem = {
  id: string
  nom: string
  date_acquisition?: string | null
  valeur_acquisition?: number | null
  duree_vie_economique?: number | null
  fournisseur?: string | null
  type_materiel?: string | null
}

type CreditDetail = {
  id: string
  montant_demande: number
  montant_accorde: number
  statut: string
  banque_nom?: string | null
  but_credit?: string | null
  date_demande?: string | null
  created_at?: string
  duree_credit?: number | null
  taux_interet?: number | null
  type_credit?: string | null
  equipement_nom?: string | null
  periodicite_remboursement?: string | null
  campagnes?: { id: string; nom: string } | null
}

export default function CreditEquipementDetail({
  credit,
  materiels = [],
  gieNom,
  locale,
}: {
  credit: CreditDetail
  materiels?: MaterielItem[]
  gieNom?: string
  locale: string
}) {
  const unite = useUnite()
  const uniteClean = unite ? unite.trim() : ''
  const localeCode = locale === 'fr' ? 'fr-FR' : 'en-US'

  const linkedMateriel = useMemo(() => findLinkedMateriel(credit, materiels), [credit, materiels])
  const initialStartDateStr = useMemo(
    () => resolveCreditEquipementStartDate(credit, materiels),
    [credit, materiels]
  )

  const [customStartDate, setCustomStartDate] = useState<string>(
    initialStartDateStr ? initialStartDateStr.slice(0, 10) : new Date().toISOString().slice(0, 10)
  )
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [savingDate, setSavingDate] = useState(false)

  const equipementNom = linkedMateriel?.nom || getCreditEquipementNom(credit) || 'Équipement agricole'
  const periodicite = getCreditPeriodicite(credit)
  const dureeMois = credit.duree_credit || 36
  const dureeAnnees = Math.max(1, Math.round(dureeMois / 12))
  const tauxInteret = credit.taux_interet || 7.5
  const capital = credit.statut === 'valide' && credit.montant_accorde > 0 ? credit.montant_accorde : credit.montant_demande
  const cleanedReason = cleanButCredit(credit.but_credit)

  // Formatage sécurisé pour jsPDF (remplace les espaces insécables Unicode \u202F et \u00A0 par des espaces normaux pour éviter les '/')
  const formatMontantPdf = (montant: number) => {
    const formatted = Math.round(Number(montant || 0))
      .toLocaleString(localeCode, { maximumFractionDigits: 0 })
      .replace(/[\u00A0\u202F]/g, ' ')
    return uniteClean ? `${formatted} ${uniteClean}` : formatted
  }

  const formatMontantUi = (montant: number) => {
    const formatted = Math.round(Number(montant || 0)).toLocaleString(localeCode, {
      maximumFractionDigits: 0,
    })
    return uniteClean ? `${formatted} ${uniteClean}` : formatted
  }

  async function handleSaveDateAcquisition() {
    if (!customStartDate) return
    setSavingDate(true)
    const res = await updateCreditEquipementDateAcquisition(
      credit.id,
      customStartDate,
      linkedMateriel?.id || null
    )
    setSavingDate(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsEditingDate(false)
    }
  }

  const dateDemarrageObj = useMemo(() => parseLocalDate(customStartDate), [customStartDate])
  const dateDemarrageFormatted = useMemo(
    () =>
      dateDemarrageObj.toLocaleDateString(localeCode, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    [dateDemarrageObj, localeCode]
  )

  // Calcul du tableau d'amortissement prévisionnel calé sur la date d'acquisition du matériel
  const amortissement = useMemo(() => {
    let echeancesParAn = 1
    if (periodicite === 'semestrielle') echeancesParAn = 2
    else if (periodicite === 'trimestrielle') echeancesParAn = 4
    else if (periodicite === 'mensuelle') echeancesParAn = 12

    const totalEcheances = Math.max(1, Math.round((dureeMois / 12) * echeancesParAn))
    const tauxPeriodique = (tauxInteret / 100) / echeancesParAn

    let annuite = 0
    if (tauxPeriodique === 0) {
      annuite = capital / totalEcheances
    } else {
      annuite = (capital * tauxPeriodique) / (1 - Math.pow(1 + tauxPeriodique, -totalEcheances))
    }

    const lignes = []
    let restantDebut = capital
    let totalInterets = 0
    let totalAmortissement = 0

    const dateBase = parseLocalDate(customStartDate)

    for (let i = 1; i <= totalEcheances; i++) {
      const interets = restantDebut * tauxPeriodique
      const amort = annuite - interets
      const restantFin = Math.max(0, restantDebut - amort)

      totalInterets += interets
      totalAmortissement += amort

      // Date estimée de l'échéance à partir de la date d'acquisition du matériel
      const dateEch = new Date(dateBase.getFullYear(), dateBase.getMonth(), dateBase.getDate())
      const moisAjoutes = Math.round((12 / echeancesParAn) * i)
      dateEch.setMonth(dateEch.getMonth() + moisAjoutes)

      lignes.push({
        numero: i,
        dateEstimee: dateEch.toLocaleDateString(localeCode, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        restantDebut: Math.round(restantDebut),
        amortissement: Math.round(amort),
        interets: Math.round(interets),
        annuiteTotale: Math.round(annuite),
        restantFin: Math.round(restantFin),
      })

      restantDebut = restantFin
    }

    return {
      totalEcheances,
      annuiteConstante: Math.round(annuite),
      totalInterets: Math.round(totalInterets),
      coutTotalCredit: Math.round(capital + totalInterets),
      lignes,
    }
  }, [capital, dureeMois, periodicite, tauxInteret, customStartDate, localeCode])

  // Export PDF de l'échéancier avec formatage propre des montants (sans caractères '/' liés aux espaces insécables)
  function exportPDF() {
    const doc = new jsPDF({ orientation: 'portrait' })
    const margin = 14

    doc.setFontSize(15)
    doc.setTextColor(30, 41, 59)
    doc.text("PLAN D'AMORTISSEMENT - CREDIT EQUIPEMENT", margin, 18)

    doc.setFontSize(9.5)
    doc.setTextColor(100, 116, 139)
    doc.text(`Organisation : ${gieNom || 'GIE'}`, margin, 25)
    doc.text(`Equipement : ${equipementNom}`, margin, 30.5)
    doc.text(`Date d'acquisition / Demarrage du credit : ${dateDemarrageFormatted}`, margin, 36)
    doc.text(`Organisme preteur : ${credit.banque_nom || 'Non specifie'}`, margin, 41.5)
    doc.text(
      `Montant finance : ${formatMontantPdf(capital)} | Taux : ${tauxInteret}% | Duree : ${dureeAnnees} ans (${dureeMois} mois)`,
      margin,
      47
    )

    const tableData = amortissement.lignes.map((l) => [
      `Echeance ${l.numero}`,
      l.dateEstimee.replace(/[\u00A0\u202F]/g, ' '),
      formatMontantPdf(l.restantDebut),
      formatMontantPdf(l.amortissement),
      formatMontantPdf(l.interets),
      formatMontantPdf(l.annuiteTotale),
      formatMontantPdf(l.restantFin),
    ])

    autoTable(doc, {
      startY: 53,
      head: [
        [
          'Echeance',
          'Date echeance',
          { content: 'Capital debut', styles: { halign: 'right' } },
          { content: 'Amortissement', styles: { halign: 'right' } },
          { content: 'Interets', styles: { halign: 'right' } },
          { content: 'Echeance totale', styles: { halign: 'right' } },
          { content: 'Capital restant', styles: { halign: 'right' } },
        ],
      ],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 24 },
        2: { halign: 'right', cellWidth: 'wrap' },
        3: { halign: 'right', cellWidth: 'wrap' },
        4: { halign: 'right', cellWidth: 'wrap' },
        5: { halign: 'right', fontStyle: 'bold', cellWidth: 'wrap' },
        6: { halign: 'right', cellWidth: 'wrap' },
      },
      foot: [
        [
          'TOTAL',
          '',
          '',
          { content: formatMontantPdf(capital), styles: { halign: 'right' } },
          { content: formatMontantPdf(amortissement.totalInterets), styles: { halign: 'right' } },
          { content: formatMontantPdf(amortissement.coutTotalCredit), styles: { halign: 'right' } },
          { content: formatMontantPdf(0), styles: { halign: 'right' } },
        ],
      ],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    })

    doc.save(`echeancier-credit-equipement-${credit.id.slice(0, 8)}.pdf`)
  }

  return (
    <div className="space-y-6">
      {/* Header navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/credits"
            className="p-2 rounded-lg border border-surface-border bg-surface hover:bg-background text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                <Tractor className="h-3.5 w-3.5" /> Crédit d&apos;Équipement (Moyen terme)
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  credit.statut === 'valide'
                    ? 'bg-success/10 text-success'
                    : credit.statut === 'en_attente'
                    ? 'bg-warning/10 text-warning'
                    : 'bg-danger/10 text-danger'
                }`}
              >
                {credit.statut === 'valide' ? 'Accordé' : credit.statut === 'en_attente' ? 'En attente' : 'Rejeté'}
              </span>
            </div>
            <h1 className="text-2xl font-bold font-heading text-foreground mt-1">
              {equipementNom}
            </h1>
          </div>
        </div>

        <button
          onClick={exportPDF}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
        >
          <Printer className="h-4 w-4" /> Exporter l&apos;Échéancier PDF
        </button>
      </div>

      {/* Résumé du Financement Équipement */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <div className="text-xs text-foreground-muted font-medium uppercase tracking-wider">Montant Financé</div>
          <div className="text-xl font-bold text-foreground mt-2">
            {formatMontantUi(capital)}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            Demandé : {formatMontantUi(credit.montant_demande)}
          </div>
        </div>

        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider">
              Démarrage / Acquisition
            </div>
            {!isEditingDate && (
              <button
                type="button"
                onClick={() => setIsEditingDate(true)}
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 p-1 rounded hover:bg-indigo-500/10"
                title="Modifier la date d'acquisition du matériel / démarrage du crédit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {isEditingDate ? (
            <div className="mt-2 space-y-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="block w-full rounded-md bg-background border border-surface-border text-foreground px-2 py-1 text-xs"
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveDateAcquisition}
                  disabled={savingDate}
                  className="inline-flex items-center gap-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 text-[11px] font-semibold disabled:opacity-50"
                >
                  <Check className="h-3 w-3" /> {savingDate ? '...' : 'Synchroniser'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingDate(false)}
                  className="inline-flex items-center gap-1 rounded bg-surface border border-surface-border text-foreground px-2 py-1 text-[11px]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-base font-bold text-foreground mt-2 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{dateDemarrageFormatted}</span>
              </div>
              <div className="text-[11px] text-foreground-muted mt-1">
                {linkedMateriel ? `Synchronisé avec la fiche matériel` : `Date d'acquisition de référence`}
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <div className="text-xs text-foreground-muted font-medium uppercase tracking-wider">Durée & Périodicité</div>
          <div className="text-xl font-bold text-foreground mt-2">
            {dureeAnnees} ans <span className="text-xs font-normal text-foreground-muted">({dureeMois} mois)</span>
          </div>
          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1 capitalize">
            {amortissement.totalEcheances} échéances {periodicite}s
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <div className="text-xs text-foreground-muted font-medium uppercase tracking-wider">Échéance Estimée</div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
            {formatMontantUi(amortissement.annuiteConstante)}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            Taux d&apos;intérêt : {tauxInteret}% l&apos;an
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <div className="text-xs text-foreground-muted font-medium uppercase tracking-wider">Organisme Prêteur</div>
          <div className="text-lg font-bold text-foreground mt-2 flex items-center gap-1.5">
            <Building className="h-4 w-4 text-foreground-muted shrink-0" />
            <span className="truncate">{credit.banque_nom || 'Non spécifié'}</span>
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            Coût total crédit : {formatMontantUi(amortissement.coutTotalCredit)}
          </div>
        </div>
      </div>

      {cleanedReason && (
        <div className="rounded-xl border border-surface-border bg-surface/50 p-4 text-xs text-foreground space-y-1">
          <strong className="text-foreground-muted uppercase tracking-wider text-[11px] block">Motif / Caractéristiques :</strong>
          <p>{cleanedReason}</p>
        </div>
      )}

      {/* Tableau d'amortissement prévisionnel */}
      <div className="rounded-xl border border-surface-border bg-surface overflow-hidden">
        <div className="p-4 border-b border-surface-border bg-background/50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" /> Échéancier Pluri-annuel & Amortissement
            </h2>
            <p className="text-xs text-foreground-muted">
              Décomposition du capital, des intérêts bancaires et des annuités à compter du{' '}
              <strong className="text-foreground">{dateDemarrageFormatted}</strong> (date d&apos;acquisition du matériel).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background/80 text-foreground-muted border-b border-surface-border uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">N° Échéance</th>
                <th className="px-4 py-3 font-semibold">Date d&apos;échéance</th>
                <th className="px-4 py-3 font-semibold text-right">Capital début</th>
                <th className="px-4 py-3 font-semibold text-right text-emerald-600 dark:text-emerald-400">Amortissement</th>
                <th className="px-4 py-3 font-semibold text-right text-warning">Intérêts</th>
                <th className="px-4 py-3 font-semibold text-right font-bold text-indigo-600 dark:text-indigo-400">Échéance Totale</th>
                <th className="px-4 py-3 font-semibold text-right">Capital restant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {amortissement.lignes.map((l) => (
                <tr key={l.numero} className="hover:bg-background/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    Échéance #{l.numero}
                  </td>
                  <td className="px-4 py-3 text-foreground-muted font-mono">
                    {l.dateEstimee}
                  </td>
                  <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                    {formatMontantUi(l.restantDebut)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatMontantUi(l.amortissement)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-warning whitespace-nowrap">
                    {formatMontantUi(l.interets)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    {formatMontantUi(l.annuiteTotale)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground-muted whitespace-nowrap">
                    {formatMontantUi(l.restantFin)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-background/80 border-t-2 border-surface-border font-semibold text-foreground">
              <tr>
                <td colSpan={2} className="px-4 py-3 uppercase">Total Cumulé</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-mono font-bold whitespace-nowrap">
                  {formatMontantUi(capital)}
                </td>
                <td className="px-4 py-3 text-right text-warning font-mono font-bold whitespace-nowrap">
                  {formatMontantUi(amortissement.totalInterets)}
                </td>
                <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400 font-mono font-bold whitespace-nowrap">
                  {formatMontantUi(amortissement.coutTotalCredit)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-foreground-muted whitespace-nowrap">
                  {formatMontantUi(0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
