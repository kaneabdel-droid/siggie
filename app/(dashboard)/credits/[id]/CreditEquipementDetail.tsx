'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Tractor,
  Calendar,
  Building,
  DollarSign,
  Printer,
  CheckCircle2,
  Clock,
  Layers,
  FileSpreadsheet,
  Banknote,
  ShieldCheck
} from 'lucide-react'
import { useUnite } from '@/components/DeviseProvider'
import {
  getCreditEquipementNom,
  getCreditPeriodicite,
  cleanButCredit,
  calculerEcheanceEstimee,
  type PeriodiciteRemboursement
} from '@/lib/credits-types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  gieNom,
  locale,
}: {
  credit: CreditDetail
  gieNom?: string
  locale: string
}) {
  const unite = useUnite()
  const localeCode = locale === 'fr' ? 'fr-FR' : 'en-US'

  const equipementNom = getCreditEquipementNom(credit) || 'Équipement agricole'
  const periodicite = getCreditPeriodicite(credit)
  const dureeMois = credit.duree_credit || 36
  const dureeAnnees = Math.max(1, Math.round(dureeMois / 12))
  const tauxInteret = credit.taux_interet || 7.5
  const capital = credit.statut === 'valide' && credit.montant_accorde > 0 ? credit.montant_accorde : credit.montant_demande
  const cleanedReason = cleanButCredit(credit.but_credit)

  // Calcul du tableau d'amortissement prévisionnel
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

    const dateBase = credit.created_at ? new Date(credit.created_at) : new Date()

    for (let i = 1; i <= totalEcheances; i++) {
      const interets = restantDebut * tauxPeriodique
      const amort = annuite - interets
      const restantFin = Math.max(0, restantDebut - amort)

      totalInterets += interets
      totalAmortissement += amort

      // Date estimée de l'échéance
      const dateEch = new Date(dateBase)
      const moisAjoutes = Math.round((12 / echeancesParAn) * i)
      dateEch.setMonth(dateEch.getMonth() + moisAjoutes)

      lignes.push({
        numero: i,
        dateEstimee: dateEch.toLocaleDateString(localeCode, { year: 'numeric', month: 'short' }),
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
  }, [capital, dureeMois, periodicite, tauxInteret, credit.created_at, localeCode])

  // Export PDF de l'échéancier
  function exportPDF() {
    const doc = new jsPDF({ orientation: 'portrait' })
    const margin = 14

    doc.setFontSize(16)
    doc.setTextColor(30, 41, 59)
    doc.text(`PLAN D'AMORTISSEMENT — CRÉDIT ÉQUIPEMENT`, margin, 20)

    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`Organisation : ${gieNom || 'GIE'}`, margin, 27)
    doc.text(`Équipement : ${equipementNom}`, margin, 33)
    doc.text(`Organisme prêteur : ${credit.banque_nom || 'Non spécifié'}`, margin, 39)
    doc.text(`Montant financé : ${capital.toLocaleString(localeCode)} ${unite} • Taux : ${tauxInteret}% • Durée : ${dureeAnnees} ans (${dureeMois} mois)`, margin, 45)

    const tableData = amortissement.lignes.map((l) => [
      `Échéance ${l.numero}`,
      l.dateEstimee,
      `${l.restantDebut.toLocaleString(localeCode)} ${unite}`,
      `${l.amortissement.toLocaleString(localeCode)} ${unite}`,
      `${l.interets.toLocaleString(localeCode)} ${unite}`,
      `${l.annuiteTotale.toLocaleString(localeCode)} ${unite}`,
      `${l.restantFin.toLocaleString(localeCode)} ${unite}`,
    ])

    autoTable(doc, {
      startY: 52,
      head: [
        ['Échéance', 'Période', 'Capital début', 'Amortissement', 'Intérêts', 'Échéance totale', 'Capital restant'],
      ],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      foot: [
        [
          'TOTAL',
          '',
          '',
          `${capital.toLocaleString(localeCode)} ${unite}`,
          `${amortissement.totalInterets.toLocaleString(localeCode)} ${unite}`,
          `${amortissement.coutTotalCredit.toLocaleString(localeCode)} ${unite}`,
          '0',
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <div className="text-xs text-foreground-muted font-medium uppercase tracking-wider">Montant Financé</div>
          <div className="text-xl font-bold text-foreground mt-2">
            {capital.toLocaleString(localeCode)} {unite}
          </div>
          <div className="text-xs text-foreground-muted mt-1">
            Demandé : {credit.montant_demande.toLocaleString(localeCode)} {unite}
          </div>
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
            {amortissement.annuiteConstante.toLocaleString(localeCode)} {unite}
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
            Coût total crédit : {amortissement.coutTotalCredit.toLocaleString(localeCode)} {unite}
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
              Décomposition du capital, des intérêts bancaires et des annuités à rembourser sur {dureeAnnees} ans.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background/80 text-foreground-muted border-b border-surface-border uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">N° Échéance</th>
                <th className="px-4 py-3 font-semibold">Période indicative</th>
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
                  <td className="px-4 py-3 text-right font-mono">
                    {l.restantDebut.toLocaleString(localeCode)} {unite}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    {l.amortissement.toLocaleString(localeCode)} {unite}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-warning">
                    {l.interets.toLocaleString(localeCode)} {unite}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {l.annuiteTotale.toLocaleString(localeCode)} {unite}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground-muted">
                    {l.restantFin.toLocaleString(localeCode)} {unite}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-background/80 border-t-2 border-surface-border font-semibold text-foreground">
              <tr>
                <td colSpan={2} className="px-4 py-3 uppercase">Total Cumulé</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  {capital.toLocaleString(localeCode)} {unite}
                </td>
                <td className="px-4 py-3 text-right text-warning font-mono font-bold">
                  {amortissement.totalInterets.toLocaleString(localeCode)} {unite}
                </td>
                <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                  {amortissement.coutTotalCredit.toLocaleString(localeCode)} {unite}
                </td>
                <td className="px-4 py-3 text-right font-mono text-foreground-muted">0 {unite}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
