'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SMTData, SMTVolet } from '@/lib/smt'
import { useUnite } from '@/components/DeviseProvider'
import PrintSectionButton from '@/components/PrintSectionButton'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  BookOpen,
  Wheat,
  Tractor,
  Layers,
  Landmark,
  FileSpreadsheet,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { saveSmtSaisie } from './actions'

type Props = {
  annee: number
  annees: number[]
  data: SMTData
  gieName: string
  canEdit: boolean
  dict: any
  locale: string
}

export default function SMTClient({
  annee,
  annees,
  data,
  gieName,
  canEdit,
  dict,
  locale,
}: Props) {
  const router = useRouter()
  const unite = useUnite()
  const [activeTab, setActiveTab] = useState<'exploitation' | 'bilan' | 'tresorerie'>('exploitation')
  const [voletTab, setVoletTab] = useState<'global' | 'agricole' | 'materiel'>('global')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'
  const fmt = (v: number) =>
    Number(v || 0).toLocaleString(dateLocale, { maximumFractionDigits: 0 }) + ' ' + unite.trim()

  const handleYearChange = (newYear: number) => {
    router.push(`/bilans/smt?annee=${newYear}`)
  }

  const handleSaveSaisie = (rubrique: string, raw: string) => {
    const val = Number(raw.replace(/\s/g, '').replace(',', '.')) || 0
    setMessage(null)
    startTransition(async () => {
      const res = await saveSmtSaisie(annee, rubrique, val)
      if (res && 'error' in res && res.error) {
        setMessage(res.error)
      } else {
        router.refresh()
      }
    })
  }

  const currentVolet: SMTVolet =
    voletTab === 'agricole'
      ? data.compteExploitation.agricole
      : voletTab === 'materiel'
      ? data.compteExploitation.materiel
      : data.compteExploitation.global

  return (
    <div className="space-y-6" id="smt-print-area">
      {/* En-tête impression */}
      <div className="hidden print:block border-b border-surface-border pb-4 mb-4">
        <h1 className="text-2xl font-bold text-foreground">{gieName}</h1>
        <p className="text-sm text-foreground-muted">
          Système Minimal de Trésorerie (SMT) — Exercice {annee}
        </p>
      </div>

      {/* Barre d'outils et sélecteur d'année */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-4 rounded-xl border border-surface-border shadow-sm">
        <div className="flex items-center gap-3">
          <label htmlFor="smt-annee" className="text-sm font-semibold text-foreground">
            Exercice comptable :
          </label>
          <select
            id="smt-annee"
            value={annee}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="rounded-md border border-surface-border bg-background px-3 py-1.5 text-sm font-bold text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          >
            {annees.map((y) => (
              <option key={y} value={y}>
                Exercice {y}
              </option>
            ))}
          </select>
        </div>

        {/* Bouton impression */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <PrintSectionButton sectionId="smt-print-area" label="Imprimer le SMT" />
        </div>
      </div>

      {message && (
        <div className="p-3 text-sm rounded-md bg-danger/10 text-danger border border-danger/20">
          {message}
        </div>
      )}

      {/* Cartes Récapitulatives SMT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-surface-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-foreground-muted text-xs font-medium mb-1">
            <span>Trésorerie de Clôture (au 31/12)</span>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground truncate">
            {fmt(data.fluxTresorerie.soldeCloture)}
          </div>
          <p className="text-xs text-foreground-muted mt-1">
            Ouverture : {fmt(data.fluxTresorerie.soldeOuverture)}
          </p>
        </div>

        <div className="bg-surface border border-surface-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-foreground-muted text-xs font-medium mb-1">
            <span>Recettes d&apos;Exploitation</span>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <div className="text-2xl font-bold text-success truncate">
            {fmt(data.compteExploitation.global.totalRecettes)}
          </div>
          <p className="text-xs text-foreground-muted mt-1">
            Ventes récoltes & prestations
          </p>
        </div>

        <div className="bg-surface border border-surface-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-foreground-muted text-xs font-medium mb-1">
            <span>Dépenses d&apos;Exploitation</span>
            <TrendingDown className="w-4 h-4 text-danger" />
          </div>
          <div className="text-2xl font-bold text-danger truncate">
            {fmt(data.compteExploitation.global.totalDepenses)}
          </div>
          <p className="text-xs text-foreground-muted mt-1">
            Intrants, carburant, charges
          </p>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${
          data.compteExploitation.global.resultatNet >= 0
            ? 'bg-success/5 border-success/30 text-success'
            : 'bg-danger/5 border-danger/30 text-danger'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span>Résultat Net SMT</span>
            <Scale className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold truncate">
            {fmt(data.compteExploitation.global.resultatNet)}
          </div>
          <p className="text-xs mt-1 opacity-80">
            {data.compteExploitation.global.resultatNet >= 0 ? 'Excédent d\'exercice' : 'Déficit d\'exercice'}
          </p>
        </div>
      </div>

      {/* Navigation des 3 piliers du SMT */}
      <div className="flex flex-wrap border-b border-surface-border gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('exploitation')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'exploitation'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          1. Compte d&apos;Exploitation SMT
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bilan')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'bilan'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          }`}
        >
          <Scale className="w-4 h-4" />
          2. Bilan SMT (Situation Patrimoniale)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tresorerie')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'tresorerie'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          }`}
        >
          <Wallet className="w-4 h-4" />
          3. Livre & Flux de Trésorerie SMT
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 1. COMPTE D'EXPLOITATION SMT                                         */}
      {/* ==================================================================== */}
      {activeTab === 'exploitation' && (
        <div className="space-y-6">
          {/* Sous-onglets de déclinaison : Global / Exploitation / Matériel */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-lg border border-surface-border">
            <div className="text-sm font-semibold text-foreground">
              Déclinaison de l&apos;activité :
            </div>
            <div className="flex gap-1.5 bg-background p-1 rounded-lg border border-surface-border">
              <button
                type="button"
                onClick={() => setVoletTab('global')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                  voletTab === 'global'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Compte Global
              </button>
              <button
                type="button"
                onClick={() => setVoletTab('agricole')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                  voletTab === 'agricole'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <Wheat className="w-3.5 h-3.5" />
                Volet Exploitation Agricole
              </button>
              <button
                type="button"
                onClick={() => setVoletTab('materiel')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                  voletTab === 'materiel'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <Tractor className="w-3.5 h-3.5" />
                Volet Matériel & Équipements
              </button>
            </div>
          </div>

          {/* Tableau Compte d'Exploitation */}
          <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
            <div className="p-4 bg-background/50 border-b border-surface-border flex justify-between items-center">
              <div>
                <h3 className="font-bold text-foreground text-base font-heading">
                  {currentVolet.titre} — Exercice {annee}
                </h3>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Conforme SYSCOHADA Système Minimal de Trésorerie (Recettes & Dépenses corrigées des variations de stocks, créances, dettes et amortissements).
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-foreground-muted block">Résultat net du volet</span>
                <span className={`text-lg font-bold ${
                  currentVolet.resultatNet >= 0 ? 'text-success' : 'text-danger'
                }`}>
                  {fmt(currentVolet.resultatNet)}
                </span>
              </div>
            </div>

            <div className="divide-y divide-surface-border text-sm">
              {/* SECTION I : RECETTES D'EXPLOITATION */}
              <div className="bg-success/5 px-4 py-2 text-xs font-bold text-success uppercase tracking-wider flex justify-between items-center">
                <span>I. Recettes d&apos;exploitation (A)</span>
                <span>{fmt(currentVolet.totalRecettes)}</span>
              </div>
              <table className="min-w-full divide-y divide-surface-border">
                <tbody className="divide-y divide-surface-border">
                  {currentVolet.recettes.map((r, idx) => (
                    <tr key={idx} className="hover:bg-background/40">
                      <td className="px-4 py-2.5 text-foreground">{r.libelle}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground tabular-nums">
                        {fmt(r.montant)}
                      </td>
                    </tr>
                  ))}
                  {currentVolet.recettes.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-center text-foreground-muted italic">
                        Aucune recette enregistrée pour cette période.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* SECTION II : DÉPENSES D'EXPLOITATION */}
              <div className="bg-danger/5 px-4 py-2 text-xs font-bold text-danger uppercase tracking-wider flex justify-between items-center">
                <span>II. Dépenses d&apos;exploitation (B)</span>
                <span>{fmt(currentVolet.totalDepenses)}</span>
              </div>
              <table className="min-w-full divide-y divide-surface-border">
                <tbody className="divide-y divide-surface-border">
                  {currentVolet.depenses.map((d, idx) => (
                    <tr key={idx} className="hover:bg-background/40">
                      <td className="px-4 py-2.5 text-foreground">{d.libelle}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground tabular-nums">
                        {fmt(d.montant)}
                      </td>
                    </tr>
                  ))}
                  {currentVolet.depenses.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-center text-foreground-muted italic">
                        Aucune dépense enregistrée pour cette période.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* SOLDE DE TRÉSORERIE */}
              <div className="bg-surface p-4 flex justify-between items-center font-bold text-sm border-t-2 border-surface-border">
                <span className="text-foreground">
                  III. Solde brut de trésorerie d&apos;exploitation (A - B)
                </span>
                <span className={`text-base tabular-nums ${
                  currentVolet.soldeTresorerie >= 0 ? 'text-success' : 'text-danger'
                }`}>
                  {fmt(currentVolet.soldeTresorerie)}
                </span>
              </div>

              {/* SECTION IV : AJUSTEMENTS D'INVENTAIRE SMT */}
              <div className="bg-primary/5 px-4 py-2 text-xs font-bold text-primary uppercase tracking-wider flex justify-between items-center">
                <span>IV. Ajustements de fin d&apos;exercice SMT (C)</span>
                <span className="tabular-nums">{fmt(currentVolet.totalAjustements)}</span>
              </div>
              <table className="min-w-full divide-y divide-surface-border">
                <tbody className="divide-y divide-surface-border">
                  {currentVolet.ajustements.map((a, idx) => (
                    <tr key={idx} className="hover:bg-background/40">
                      <td className="px-4 py-2.5 text-foreground">{a.libelle}</td>
                      <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${
                        a.montant >= 0 ? 'text-foreground' : 'text-danger'
                      }`}>
                        {fmt(a.montant)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* RESULTAT NET FINAL SMT */}
              <div className={`p-4 flex justify-between items-center font-bold text-base border-t-2 ${
                currentVolet.resultatNet >= 0
                  ? 'bg-success/10 text-success border-success/30'
                  : 'bg-danger/10 text-danger border-danger/30'
              }`}>
                <div>
                  <span>V. RÉSULTAT NET DE L&apos;EXERCICE (SMT) (A - B + C)</span>
                  <span className="block text-xs font-normal opacity-80 mt-0.5">
                    {currentVolet.resultatNet >= 0
                      ? 'Excédent net dégagé par l\'activité'
                      : 'Déficit net de l\'activité'}
                  </span>
                </div>
                <span className="text-xl tabular-nums">
                  {fmt(currentVolet.resultatNet)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. BILAN SMT (SITUATION PATRIMONIALE)                                */}
      {/* ==================================================================== */}
      {activeTab === 'bilan' && (
        <div className="space-y-6">
          <div className="bg-surface p-4 rounded-xl border border-surface-border shadow-sm flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="text-xs text-foreground-muted leading-relaxed">
              Le <strong>Bilan du Système Minimal de Trésorerie (SMT)</strong> récapitule la situation patrimoniale de la coopérative au 31 décembre de l&apos;exercice {annee}, comparée à l&apos;exercice N-1. Il met en regard les biens et créances (Actif) avec les dettes et fonds propres (Passif).
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* --- ACTIF SMT --- */}
            <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col">
              <div className="bg-primary/10 px-4 py-3 border-b border-surface-border flex justify-between items-center">
                <h4 className="font-bold text-primary text-base font-heading">
                  ACTIF SMT (Biens & Créances)
                </h4>
                <span className="text-xs font-semibold text-primary">Exercice {annee}</span>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-surface-border text-sm">
                  <thead>
                    <tr className="bg-background/50 text-[11px] font-semibold text-foreground-muted uppercase">
                      <th className="px-3 py-2 text-left">Postes de l&apos;Actif</th>
                      <th className="px-3 py-2 text-right">Brut</th>
                      <th className="px-3 py-2 text-right">Amort.</th>
                      <th className="px-3 py-2 text-right">Net N</th>
                      <th className="px-3 py-2 text-right">Net N-1</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {/* Immobilisations */}
                    <tr className="hover:bg-background/40">
                      <td className="px-3 py-2.5 text-foreground font-medium">
                        {data.bilan.actif.immobilisations.libelle}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.actif.immobilisations.brut)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-danger">
                        {fmt(data.bilan.actif.immobilisations.amortissement)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-foreground">
                        {fmt(data.bilan.actif.immobilisations.net)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.actif.immobilisations.netN1)}
                      </td>
                    </tr>

                    {/* Stocks */}
                    <tr className="hover:bg-background/40">
                      <td className="px-3 py-2.5 text-foreground font-medium">
                        {data.bilan.actif.stocksTotal.libelle}
                        <span className="block text-[11px] text-foreground-muted">
                          Intrants ({fmt(data.bilan.actif.stocksIntrants.net)}) + Nature ({fmt(data.bilan.actif.stocksNature.net)})
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.actif.stocksTotal.brut)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">-</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-foreground">
                        {fmt(data.bilan.actif.stocksTotal.net)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.actif.stocksTotal.netN1)}
                      </td>
                    </tr>

                    {/* Créances */}
                    <tr className="hover:bg-background/40">
                      <td className="px-3 py-2.5 text-foreground font-medium">
                        {data.bilan.actif.creancesTotal.libelle}
                        <span className="block text-[11px] text-foreground-muted">
                          Membres ({fmt(data.bilan.actif.creancesMembres.net)}) + Acheteurs ({fmt(data.bilan.actif.creancesClients.net)})
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.actif.creancesTotal.brut)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">-</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-foreground">
                        {fmt(data.bilan.actif.creancesTotal.net)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.actif.creancesTotal.netN1)}
                      </td>
                    </tr>

                    {/* Disponibilités */}
                    <tr className="hover:bg-background/40">
                      <td className="px-3 py-2.5 text-foreground font-medium">
                        {data.bilan.actif.disponibilites.libelle}
                        <span className="block text-[11px] text-foreground-muted">
                          Soldes positifs des comptes et caisses
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.actif.disponibilites.brut)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">-</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-foreground">
                        {fmt(data.bilan.actif.disponibilites.net)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.actif.disponibilites.netN1)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/5 font-bold text-foreground border-t-2 border-primary/20">
                      <td className="px-3 py-3">{data.bilan.actif.totalActif.libelle}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {fmt(data.bilan.actif.totalActif.brut)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-danger">
                        {fmt(data.bilan.actif.totalActif.amortissement)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-primary text-base">
                        {fmt(data.bilan.actif.totalActif.net)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.actif.totalActif.netN1)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* --- PASSIF SMT --- */}
            <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col">
              <div className="bg-primary/10 px-4 py-3 border-b border-surface-border flex justify-between items-center">
                <h4 className="font-bold text-primary text-base font-heading">
                  PASSIF SMT (Ressources & Dettes)
                </h4>
                <span className="text-xs font-semibold text-primary">Exercice {annee}</span>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-surface-border text-sm">
                  <thead>
                    <tr className="bg-background/50 text-[11px] font-semibold text-foreground-muted uppercase">
                      <th className="px-3 py-2 text-left">Postes du Passif</th>
                      <th className="px-3 py-2 text-right">Montant Net N</th>
                      <th className="px-3 py-2 text-right">Montant Net N-1</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {/* Fonds Propres */}
                    <tr className="hover:bg-background/40">
                      <td className="px-3 py-2.5 text-foreground font-medium">
                        {data.bilan.passif.capital.libelle}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-foreground">
                        {fmt(data.bilan.passif.capital.net)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.passif.capital.netN1)}
                      </td>
                    </tr>

                    {/* Résultat Net */}
                    <tr className="hover:bg-background/40">
                      <td className="px-3 py-2.5 text-foreground font-medium">
                        {data.bilan.passif.resultatNet.libelle}
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${
                        data.bilan.passif.resultatNet.net >= 0 ? 'text-success' : 'text-danger'
                      }`}>
                        {fmt(data.bilan.passif.resultatNet.net)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.passif.resultatNet.netN1)}
                      </td>
                    </tr>

                    {/* Subventions */}
                    <tr className="hover:bg-background/40">
                      <td className="px-3 py-2.5 text-foreground font-medium">
                        {data.bilan.passif.subventions.libelle}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                        {canEdit ? (
                          <input
                            type="text"
                            defaultValue={data.bilan.passif.subventions.net ? String(data.bilan.passif.subventions.net) : ''}
                            placeholder="0"
                            disabled={isPending}
                            onBlur={(e) => handleSaveSaisie('subventions', e.target.value)}
                            className="w-28 rounded border border-surface-border bg-background px-2 py-0.5 text-right text-xs"
                          />
                        ) : (
                          fmt(data.bilan.passif.subventions.net)
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.passif.subventions.netN1)}
                      </td>
                    </tr>

                    {/* Emprunts Équipement */}
                    <tr className="hover:bg-background/40">
                      <td className="px-3 py-2.5 text-foreground font-medium">
                        {data.bilan.passif.empruntsEquipement.libelle}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                        {canEdit ? (
                          <input
                            type="text"
                            defaultValue={data.bilan.passif.empruntsEquipement.net ? String(data.bilan.passif.empruntsEquipement.net) : ''}
                            placeholder="0"
                            disabled={isPending}
                            onBlur={(e) => handleSaveSaisie('emprunts', e.target.value)}
                            className="w-28 rounded border border-surface-border bg-background px-2 py-0.5 text-right text-xs"
                          />
                        ) : (
                          fmt(data.bilan.passif.empruntsEquipement.net)
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.passif.empruntsEquipement.netN1)}
                      </td>
                    </tr>

                    {/* Crédits de campagne en cours */}
                    <tr className="hover:bg-background/40">
                      <td className="px-3 py-2.5 text-foreground font-medium">
                        {data.bilan.passif.creditsCampagne.libelle}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-foreground">
                        {fmt(data.bilan.passif.creditsCampagne.net)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.passif.creditsCampagne.netN1)}
                      </td>
                    </tr>

                    {/* Dettes fournisseurs */}
                    <tr className="hover:bg-background/40">
                      <td className="px-3 py-2.5 text-foreground font-medium">
                        {data.bilan.passif.dettesFournisseurs.libelle}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-foreground">
                        {fmt(data.bilan.passif.dettesFournisseurs.net)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.passif.dettesFournisseurs.netN1)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/5 font-bold text-foreground border-t-2 border-primary/20">
                      <td className="px-3 py-3">{data.bilan.passif.totalPassif.libelle}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-primary text-base">
                        {fmt(data.bilan.passif.totalPassif.net)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground-muted">
                        {fmt(data.bilan.passif.totalPassif.netN1)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. LIVRE & FLUX DE TRÉSORERIE SMT                                    */}
      {/* ==================================================================== */}
      {activeTab === 'tresorerie' && (
        <div className="space-y-6">
          {/* Situation des comptes de trésorerie */}
          <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
            <div className="p-4 bg-background/50 border-b border-surface-border">
              <h3 className="font-bold text-foreground text-base font-heading">
                Soldes et Flux par Compte de Trésorerie — Exercice {annee}
              </h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                Détail des mouvements enregistrés sur chaque compte bancaire et caisse de la coopérative.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-surface-border text-sm">
                <thead>
                  <tr className="bg-background/50 text-xs font-semibold text-foreground-muted uppercase">
                    <th className="px-4 py-2.5 text-left">Compte / Caisse</th>
                    <th className="px-4 py-2.5 text-right">Solde au 01/01</th>
                    <th className="px-4 py-2.5 text-right text-success">Total Entrées (+)</th>
                    <th className="px-4 py-2.5 text-right text-danger">Total Sorties (-)</th>
                    <th className="px-4 py-2.5 text-right">Solde au 31/12</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {data.fluxTresorerie.comptes.map((c) => (
                    <tr key={c.id} className="hover:bg-background/40">
                      <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-primary shrink-0" />
                        <span>{c.nom}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground-muted">
                        {fmt(c.soldeInitial)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-success">
                        +{fmt(c.entrees)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-danger">
                        -{fmt(c.sorties)}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-bold ${
                        c.soldeFinal >= 0 ? 'text-foreground' : 'text-danger'
                      }`}>
                        {fmt(c.soldeFinal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface font-bold text-foreground border-t-2 border-surface-border">
                    <td className="px-4 py-3">TOTAL TRÉSORERIE GLOBALE</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(data.fluxTresorerie.soldeOuverture)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-success">
                      +{fmt(data.fluxTresorerie.totalEntrees)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-danger">
                      -{fmt(data.fluxTresorerie.totalSorties)}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums text-base ${
                      data.fluxTresorerie.soldeCloture >= 0 ? 'text-primary' : 'text-danger'
                    }`}>
                      {fmt(data.fluxTresorerie.soldeCloture)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Grille Recettes vs Dépenses par nature */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recettes par poste */}
            <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
              <div className="bg-success/10 px-4 py-3 border-b border-surface-border flex justify-between items-center">
                <h4 className="font-bold text-success text-sm uppercase tracking-wide">
                  Encaissements par nature
                </h4>
                <span className="font-bold text-success tabular-nums">
                  {fmt(data.fluxTresorerie.totalEntrees)}
                </span>
              </div>
              <ul className="divide-y divide-surface-border text-sm">
                {data.fluxTresorerie.recettesParPoste.map((r, i) => (
                  <li key={i} className="px-4 py-2.5 flex justify-between items-center hover:bg-background/40">
                    <span className="text-foreground">{r.libelle}</span>
                    <span className="font-medium text-success tabular-nums">+{fmt(r.montant)}</span>
                  </li>
                ))}
                {data.fluxTresorerie.recettesParPoste.length === 0 && (
                  <li className="px-4 py-4 text-center text-foreground-muted italic">
                    Aucune recette enregistrée.
                  </li>
                )}
              </ul>
            </div>

            {/* Dépenses par poste */}
            <div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
              <div className="bg-danger/10 px-4 py-3 border-b border-surface-border flex justify-between items-center">
                <h4 className="font-bold text-danger text-sm uppercase tracking-wide">
                  Décaissements par nature
                </h4>
                <span className="font-bold text-danger tabular-nums">
                  {fmt(data.fluxTresorerie.totalSorties)}
                </span>
              </div>
              <ul className="divide-y divide-surface-border text-sm">
                {data.fluxTresorerie.depensesParPoste.map((d, i) => (
                  <li key={i} className="px-4 py-2.5 flex justify-between items-center hover:bg-background/40">
                    <span className="text-foreground">{d.libelle}</span>
                    <span className="font-medium text-danger tabular-nums">-{fmt(d.montant)}</span>
                  </li>
                ))}
                {data.fluxTresorerie.depensesParPoste.length === 0 && (
                  <li className="px-4 py-4 text-center text-foreground-muted italic">
                    Aucune dépense enregistrée.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
