'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  CalendarRange,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Sparkles,
  Lock,
  Printer,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import PrintSectionButton from '@/components/PrintSectionButton'
import { useUnite } from '@/components/DeviseProvider'

type Campagne = { id: string; nom: string; statut: string; date_debut?: string; date_fin?: string }
type Compte = { id: string; nom: string; type_compte?: string; solde_initial?: number }
type Transaction = {
  id: string
  compte_id: string
  type_transaction: string
  montant: number
  date_transaction?: string
  created_at: string
  motif?: string
  type_piece?: string
  campagne_id?: string
}

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export default function PlanFinancementClient({
  campagnes,
  comptes,
  transactions,
  subscriptionTier,
  gieName,
  dict,
  locale,
}: {
  campagnes: Campagne[]
  comptes: Compte[]
  transactions: Transaction[]
  subscriptionTier: string
  gieName: string
  dict: any
  locale: string
}) {
  const unite = useUnite()
  const isPremium = subscriptionTier === 'premium'
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  const activeCampagne = campagnes.find((c) => c.statut === 'en_cours')
  const [selectedCampagneId, setSelectedCampagneId] = useState<string>(
    activeCampagne?.id || campagnes[0]?.id || ''
  )
  const [activeTab, setActiveTab] = useState<'campagne' | 'annuel'>('campagne')
  const [selectedAnnee, setSelectedAnnee] = useState<number>(new Date().getFullYear())

  const selectedCampagne = campagnes.find((c) => c.id === selectedCampagneId) || null

  // Map des comptes pour lookup rapide
  const comptesMap = useMemo(() => new Map(comptes.map((c) => [c.id, c])), [comptes])

  // Règle de cadrage :
  // - Caisse : solde initial effectif au 01/09/2026 (données antérieures ignorées)
  // - Banques : solde initial effectif au 01/07/2026 (données antérieures ignorées)
  const isCaisse = (type_compte?: string) => (type_compte || '').toLowerCase() === 'caisse'
  const getDateMinCompte = (compteId: string) => {
    const c = comptesMap.get(compteId)
    return isCaisse(c?.type_compte) ? '2026-09-01' : '2026-07-01'
  }

  const isTxValide = (tx: Transaction) => {
    const txDateStr = (tx.date_transaction || tx.created_at || '').slice(0, 10)
    if (!txDateStr) return false
    const dateMin = getDateMinCompte(tx.compte_id)
    return txDateStr >= dateMin
  }

  // 1. Calcul du Plan de Financement par Campagne
  // Formule: Trésorerie départ + Encaissements du mois - Paiements du mois = Solde fin de mois (début mois suivant)
  const planCampagne = useMemo(() => {
    if (!selectedCampagne) return { moisData: [], totalIn: 0, totalOut: 0, soldeInitial: 0, soldeFinal: 0 }

    // Date de début et date de fin de la campagne
    let dDebut = selectedCampagne.date_debut ? new Date(selectedCampagne.date_debut) : new Date()
    let dFin = selectedCampagne.date_fin ? new Date(selectedCampagne.date_fin) : new Date(dDebut.getTime() + 180 * 24 * 60 * 60 * 1000)

    // Si les dates sont invalides, fallback sur une durée standard de 6 mois
    if (isNaN(dDebut.getTime())) dDebut = new Date()
    if (isNaN(dFin.getTime()) || dFin <= dDebut) dFin = new Date(dDebut.getTime() + 180 * 24 * 60 * 60 * 1000)

    // Liste des mois couverts par la campagne
    const moisBuckets: { year: number; month: number; label: string; debutMois: string; finMois: string }[] = []
    const cur = new Date(dDebut.getFullYear(), dDebut.getMonth(), 1)
    const end = new Date(dFin.getFullYear(), dFin.getMonth(), 1)

    while (cur <= end && moisBuckets.length < 12) {
      const year = cur.getFullYear()
      const month = cur.getMonth()
      const mStr = String(month + 1).padStart(2, '0')
      moisBuckets.push({
        year,
        month,
        label: `${MOIS_NOMS[month]} ${year}`,
        debutMois: `${year}-${mStr}-01`,
        finMois: `${year}-${mStr}-31`,
      })
      cur.setMonth(cur.getMonth() + 1)
    }

    if (moisBuckets.length === 0) {
      const year = dDebut.getFullYear()
      const month = dDebut.getMonth()
      const mStr = String(month + 1).padStart(2, '0')
      moisBuckets.push({
        year,
        month,
        label: `${MOIS_NOMS[month]} ${year}`,
        debutMois: `${year}-${mStr}-01`,
        finMois: `${year}-${mStr}-31`,
      })
    }

    // Filtrer les transactions valides de cette campagne
    // Règle: les données antérieures au 01/09/2026 pour la caisse et au 01/07/2026 pour les banques sont ignorées
    const txCampagne = transactions.filter(
      (tx) => tx.campagne_id === selectedCampagne.id && isTxValide(tx)
    )

    // Trésorerie initiale de départ au 1er mois de campagne :
    // Ne comprend que les soldes des comptes effectifs à cette date
    const premierMois = moisBuckets[0]?.debutMois || ''
    let totalSoldeInitialComptes = 0
    comptes.forEach((c) => {
      const dateMin = isCaisse(c.type_compte) ? '2026-09-01' : '2026-07-01'
      if (premierMois >= dateMin) {
        totalSoldeInitialComptes += Number(c.solde_initial || 0)
      }
    })

    let soldeCourant = totalSoldeInitialComptes
    let totalIn = 0
    let totalOut = 0

    const moisData = moisBuckets.map((b, idx) => {
      // Reprise en cours de campagne si un compte devient effectif durant ce mois
      let apportReprise = 0
      if (idx > 0) {
        comptes.forEach((c) => {
          const dateMin = isCaisse(c.type_compte) ? '2026-09-01' : '2026-07-01'
          if (dateMin >= b.debutMois && dateMin <= b.finMois) {
            apportReprise += Number(c.solde_initial || 0)
          }
        })
      }

      const soldeDepart = soldeCourant + apportReprise

      let encaissements = 0
      let decaissements = 0

      for (const tx of txCampagne) {
        const txDateStr = (tx.date_transaction || tx.created_at || '').slice(0, 10)
        if (!txDateStr) continue
        if (txDateStr >= b.debutMois && txDateStr <= b.finMois) {
          const m = Number(tx.montant || 0)
          if (tx.type_transaction === 'entree') {
            encaissements += m
          } else if (tx.type_transaction === 'sortie') {
            decaissements += m
          }
        }
      }

      const fluxNet = encaissements - decaissements
      const soldeFin = soldeDepart + fluxNet
      soldeCourant = soldeFin

      totalIn += encaissements
      totalOut += decaissements

      return {
        numeroMois: idx + 1,
        label: b.label,
        soldeDepart,
        apportReprise,
        encaissements,
        decaissements,
        fluxNet,
        soldeFin,
      }
    })

    return {
      moisData,
      totalIn,
      totalOut,
      soldeInitial: totalSoldeInitialComptes,
      soldeFinal: soldeCourant,
    }
  }, [selectedCampagne, transactions, comptes, comptesMap])

  // 2. Calcul du Plan de Trésorerie Annuel sur 12 Mois (Premium)
  const planAnnuel12Mois = useMemo(() => {
    // Calcul mois par mois (0 à 11) pour l'année sélectionnée
    let soldeReport = 0
    let anneeIn = 0
    let anneeOut = 0

    const moisData = MOIS_NOMS.map((nomMois, indexMois) => {
      const moisNum = indexMois + 1
      const mStr = String(moisNum).padStart(2, '0')
      const debutMoisStr = `${selectedAnnee}-${mStr}-01`
      const finMoisStr = `${selectedAnnee}-${mStr}-31`

      // Reprise des soldes initiaux :
      // - Banques : actives au 01/07/2026 (Juillet)
      // - Caisses : actives au 01/09/2026 (Septembre)
      // - Les données antérieures sont ignorées.
      let apportReprise = 0
      if (selectedAnnee === 2026) {
        if (indexMois === 6) { // Juillet 2026
          comptes.forEach((c) => {
            if (!isCaisse(c.type_compte)) {
              apportReprise += Number(c.solde_initial || 0)
            }
          })
        } else if (indexMois === 8) { // Septembre 2026
          comptes.forEach((c) => {
            if (isCaisse(c.type_compte)) {
              apportReprise += Number(c.solde_initial || 0)
            }
          })
        }
      } else if (selectedAnnee > 2026 && indexMois === 0) {
        comptes.forEach((c) => {
          apportReprise += Number(c.solde_initial || 0)
        })
      }

      const soldeDebut = soldeReport + apportReprise

      let rembMembres = 0
      let prestMateriel = 0
      let ventesStock = 0
      let autresEntrees = 0

      let intrantsSorties = 0
      let materielCarburant = 0
      let fraisGeneraux = 0
      let autresSorties = 0

      for (const tx of transactions) {
        if (!isTxValide(tx)) continue
        const txDateStr = (tx.date_transaction || tx.created_at || '').slice(0, 10)
        if (!txDateStr) continue

        if (txDateStr >= debutMoisStr && txDateStr <= finMoisStr) {
          const m = Number(tx.montant || 0)
          const motifLower = (tx.motif || '').toLowerCase()
          const pieceLower = (tx.type_piece || '').toLowerCase()

          if (tx.type_transaction === 'entree') {
            if (pieceLower.includes('remboursement') || motifLower.includes('remboursement')) {
              rembMembres += m
            } else if (pieceLower.includes('prestation') || motifLower.includes('prestation')) {
              prestMateriel += m
            } else if (motifLower.includes('vente') || motifLower.includes('stock')) {
              ventesStock += m
            } else {
              autresEntrees += m
            }
          } else if (tx.type_transaction === 'sortie') {
            if (motifLower.includes('intrant') || motifLower.includes('engrais') || motifLower.includes('semence')) {
              intrantsSorties += m
            } else if (motifLower.includes('carburant') || motifLower.includes('gasoil') || motifLower.includes('vidange') || motifLower.includes('reparation')) {
              materielCarburant += m
            } else if (motifLower.includes('salaire') || motifLower.includes('gestion') || motifLower.includes('reunion') || motifLower.includes('gardien') || motifLower.includes('indemnite') || motifLower.includes('faucardage')) {
              fraisGeneraux += m
            } else {
              autresSorties += m
            }
          }
        }
      }

      const totalEncaissements = rembMembres + prestMateriel + ventesStock + autresEntrees
      const totalDecaissements = intrantsSorties + materielCarburant + fraisGeneraux + autresSorties
      const netMensuel = totalEncaissements - totalDecaissements
      const soldeFin = soldeDebut + netMensuel
      soldeReport = soldeFin

      anneeIn += totalEncaissements
      anneeOut += totalDecaissements

      return {
        nomMois,
        indexMois,
        soldeDebut,
        apportReprise,
        rembMembres,
        prestMateriel,
        ventesStock,
        autresEntrees,
        totalEncaissements,
        intrantsSorties,
        materielCarburant,
        fraisGeneraux,
        autresSorties,
        totalDecaissements,
        netMensuel,
        soldeFin,
      }
    })

    return {
      moisData,
      anneeIn,
      anneeOut,
      netAnnuel: anneeIn - anneeOut,
      soldeFinal: soldeReport,
    }
  }, [transactions, comptes, selectedAnnee, comptesMap])

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="sm:flex sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold font-heading text-foreground">
              Plan de Financement & Trésorerie
            </h3>
            {isPremium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 px-2.5 py-0.5 text-xs font-semibold border border-amber-500/30">
                <Sparkles className="w-3 h-3 text-amber-500" />
                PREMIUM
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-foreground-muted">
            Gestion prévisionnelle et réelle des soldes de trésorerie (Solde départ + Encaissements - Paiements = Solde fin & report).
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center gap-2">
          <PrintSectionButton
            sectionId={activeTab === 'campagne' ? 'print-plan-campagne' : 'print-plan-annuel'}
            label={dict?.common?.print || "Imprimer"}
          />
        </div>
      </div>

      {/* Information Banner sur la convention de solde initial */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-foreground space-y-1">
          <p className="font-semibold text-primary">
            Cadrage des soldes de trésorerie :
          </p>
          <p className="text-foreground-muted">
            • <strong>Caisse</strong> : Solde initial effectif au <strong>01/09/2026</strong>. Les écritures antérieures manquantes sont ignorées.
          </p>
          <p className="text-foreground-muted">
            • <strong>Banques</strong> : Soldes initiaux effectifs au <strong>01/07/2026</strong>. Les écritures antérieures manquantes sont ignorées.
          </p>
        </div>
      </div>

      {/* Tabs navigation: Campagne vs 12 Mois Annuel */}
      <div className="border-b border-surface-border">
        <nav className="flex space-x-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('campagne')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'campagne'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Plan de Financement par Campagne</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('annuel')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'annuel'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            <span>Plan Annuel sur 12 Mois</span>
            {!isPremium && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-500/20">
                <Lock className="w-2.5 h-2.5" />
                PRO
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1 : PLAN DE FINANCEMENT PAR CAMPAGNE              */}
      {/* ========================================================= */}
      {activeTab === 'campagne' && (
        <div className="space-y-6" id="print-plan-campagne">
          {/* Campaign Selector */}
          <div className="sm:flex sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-surface-border bg-surface">
            <div className="max-w-sm w-full">
              <label htmlFor="campagne-select" className="block text-xs font-semibold text-foreground-muted mb-1">
                Campagne agricole analysée :
              </label>
              <select
                id="campagne-select"
                value={selectedCampagneId}
                onChange={(e) => setSelectedCampagneId(e.target.value)}
                className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground font-semibold shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              >
                {campagnes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} {c.statut === 'en_cours' ? '(En cours)' : `(${c.statut})`}
                  </option>
                ))}
              </select>
            </div>

            {selectedCampagne && (
              <div className="mt-3 sm:mt-0 text-xs text-foreground-muted flex items-center gap-3">
                <span>
                  Période : {selectedCampagne.date_debut ? new Date(selectedCampagne.date_debut).toLocaleDateString(dateLocale) : 'N/A'} au {selectedCampagne.date_fin ? new Date(selectedCampagne.date_fin).toLocaleDateString(dateLocale) : 'N/A'}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  selectedCampagne.statut === 'en_cours'
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-surface text-foreground-muted border border-surface-border'
                }`}>
                  {selectedCampagne.statut === 'en_cours' ? 'Campagne active' : selectedCampagne.statut}
                </span>
              </div>
            )}
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs">
              <div className="text-xs font-medium text-foreground-muted flex items-center justify-between">
                <span>Trésorerie Départ</span>
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-foreground">
                {planCampagne.soldeInitial.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
              </div>
              <div className="mt-1 text-[11px] text-foreground-muted">
                Solde initial au début de la campagne
              </div>
            </div>

            <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs">
              <div className="text-xs font-medium text-foreground-muted flex items-center justify-between">
                <span>Total Encaissements</span>
                <ArrowUpRight className="w-4 h-4 text-success" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-success">
                +{planCampagne.totalIn.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
              </div>
              <div className="mt-1 text-[11px] text-foreground-muted">
                Remboursements et encaissements reçus
              </div>
            </div>

            <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs">
              <div className="text-xs font-medium text-foreground-muted flex items-center justify-between">
                <span>Total Paiements</span>
                <ArrowDownRight className="w-4 h-4 text-danger" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-danger">
                -{planCampagne.totalOut.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
              </div>
              <div className="mt-1 text-[11px] text-foreground-muted">
                Dépenses et paiements effectués
              </div>
            </div>

            <div className={`rounded-xl border p-4 shadow-xs ${
              planCampagne.soldeFinal >= 0
                ? 'border-success/30 bg-success/5 text-success'
                : 'border-danger/30 bg-danger/5 text-danger'
            }`}>
              <div className="text-xs font-medium flex items-center justify-between">
                <span>Solde Final Campagne</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono">
                {planCampagne.soldeFinal.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
              </div>
              <div className="mt-1 text-[11px] opacity-80">
                Solde de clôture reporté au cycle suivant
              </div>
            </div>
          </div>

          {/* Month-by-month Table */}
          <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface shadow-xs">
            <div className="p-4 border-b border-surface-border bg-background/50 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground font-heading">
                  Tableau d'Équilibre Mensuel (Trésorerie départ + Encaissements - Paiements = Solde fin)
                </h4>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Rapprochement chronologique continu pour la campagne {selectedCampagne?.nom || ''}
                </p>
              </div>
            </div>

            <table className="min-w-full divide-y divide-surface-border text-left">
              <thead className="bg-background/80 text-xs text-foreground-muted font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">Mois de Campagne</th>
                  <th className="px-4 py-3 text-right">Trésorerie Départ</th>
                  <th className="px-4 py-3 text-right text-success">(+) Encaissements</th>
                  <th className="px-4 py-3 text-right text-danger">(-) Paiements</th>
                  <th className="px-4 py-3 text-right">Flux Net Mois</th>
                  <th className="px-4 py-3 text-right bg-background">(=) Solde Fin (Report)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-sm">
                {planCampagne.moisData.map((m) => (
                  <tr key={m.label} className="hover:bg-background/40 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{m.label}</div>
                      <div className="text-xs text-foreground-muted">Mois N° {m.numeroMois}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium text-foreground whitespace-nowrap">
                      <div>{m.soldeDepart.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}</div>
                      {m.apportReprise > 0 && (
                        <div className="text-[10px] text-primary font-sans font-medium">
                          +{m.apportReprise.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} F (reprise)
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-success whitespace-nowrap">
                      +{m.encaissements.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-danger whitespace-nowrap">
                      -{m.decaissements.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                    </td>
                    <td className={`px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap ${
                      m.fluxNet >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {m.fluxNet >= 0 ? '+' : ''}{m.fluxNet.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground bg-background/50 whitespace-nowrap">
                      {m.soldeFin.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                    </td>
                  </tr>
                ))}
                {planCampagne.moisData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-foreground-muted italic">
                      Aucune période définie pour cette campagne.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2 : PLAN ANNUEL SUR 12 MOIS (NIVEAU PREMIUM)       */}
      {/* ========================================================= */}
      {activeTab === 'annuel' && (
        <div className="space-y-6" id="print-plan-annuel">
          {!isPremium ? (
            /* Callout / Upgrade CTA for Non-Premium Tiers */
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center space-y-4 max-w-2xl mx-auto shadow-sm">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-foreground font-heading">
                Plan de Trésorerie Annuel sur 12 Mois
              </h4>
              <p className="text-sm text-foreground-muted max-w-lg mx-auto">
                Le plan de trésorerie annuel sur 12 mois consolidant toutes les campagnes, prestations de matériel, ventes et charges d'exploitation est exclusivement disponible avec l'abonnement <strong>Premium</strong>.
              </p>
              <div className="pt-2">
                <Link
                  href="/abonnement"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Passer au Forfait Premium</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            /* Premium 12-Month Table */
            <div className="space-y-6">
              <div className="sm:flex sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-surface-border bg-surface">
                <div>
                  <h4 className="text-sm font-bold text-foreground font-heading">
                    Plan de Trésorerie Annuel — {selectedAnnee}
                  </h4>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    Matrice de flux de trésorerie sur les 12 mois de l'année civile
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="annee-select" className="text-xs font-semibold text-foreground-muted">Année :</label>
                  <select
                    id="annee-select"
                    value={selectedAnnee}
                    onChange={(e) => setSelectedAnnee(Number(e.target.value))}
                    className="rounded-md border border-surface-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 12-Month Matrix Table */}
              <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface shadow-xs">
                <table className="min-w-full divide-y divide-surface-border text-left">
                  <thead className="bg-background/80 text-xs text-foreground-muted font-semibold uppercase">
                    <tr>
                      <th className="px-3 py-3 w-48">Mois</th>
                      <th className="px-3 py-3 text-right">Trésorerie Début</th>
                      <th className="px-3 py-3 text-right text-success">Remboursements</th>
                      <th className="px-3 py-3 text-right text-success">Prestations</th>
                      <th className="px-3 py-3 text-right text-success">Ventes Stock</th>
                      <th className="px-3 py-3 text-right text-success font-bold">Total Encais.</th>
                      <th className="px-3 py-3 text-right text-danger">Intrants</th>
                      <th className="px-3 py-3 text-right text-danger">Matériel/Carb.</th>
                      <th className="px-3 py-3 text-right text-danger font-bold">Total Décais.</th>
                      <th className="px-3 py-3 text-right font-bold">Flux Net</th>
                      <th className="px-3 py-3 text-right bg-background font-bold">Trésorerie Fin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-xs">
                    {planAnnuel12Mois.moisData.map((m) => (
                      <tr key={m.nomMois} className="hover:bg-background/40 transition-colors">
                        <td className="px-3 py-3 font-semibold text-foreground whitespace-nowrap">
                          {m.nomMois}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-foreground whitespace-nowrap">
                          <div>{m.soldeDebut.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}</div>
                          {m.apportReprise > 0 && (
                            <div className="text-[10px] text-primary font-sans font-medium">
                              +{m.apportReprise.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} F (reprise)
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-success whitespace-nowrap">
                          {m.rembMembres > 0 ? `+${m.rembMembres.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}` : '-'}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-success whitespace-nowrap">
                          {m.prestMateriel > 0 ? `+${m.prestMateriel.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}` : '-'}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-success whitespace-nowrap">
                          {m.ventesStock > 0 ? `+${m.ventesStock.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}` : '-'}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-success whitespace-nowrap bg-success/5">
                          +{m.totalEncaissements.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-danger whitespace-nowrap">
                          {m.intrantsSorties > 0 ? `-${m.intrantsSorties.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}` : '-'}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-danger whitespace-nowrap">
                          {m.materielCarburant > 0 ? `-${m.materielCarburant.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}` : '-'}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-danger whitespace-nowrap bg-danger/5">
                          -{m.totalDecaissements.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`px-3 py-3 text-right font-mono font-bold whitespace-nowrap ${
                          m.netMensuel >= 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {m.netMensuel >= 0 ? '+' : ''}{m.netMensuel.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-foreground bg-background/50 whitespace-nowrap">
                          {m.soldeFin.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
