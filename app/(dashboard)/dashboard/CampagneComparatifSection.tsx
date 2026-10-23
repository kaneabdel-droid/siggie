'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  GitCompare, 
  Calendar, 
  Layers, 
  Users, 
  Scale, 
  Banknote, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  BarChart3,
  Percent,
  HelpCircle,
  Lock,
  ArrowRight
} from 'lucide-react'

export type CampagneStatData = {
  id: string
  nom: string
  statut: string
  date_debut?: string | null
  date_fin?: string | null
  produit_collecte?: string | null
  prix_collecte?: number | null
  typeDetecte: string
  anneeDetectee: string
  superficieTotal: number
  membresCount: number
  totalFacture: number
  totalPaye: number
  tauxRecouvrement: number
  totalCollecte: number
}

interface CampagneComparatifProps {
  campagnes: CampagneStatData[]
  unite?: string
  dict?: any
  isPremium?: boolean
}

export default function CampagneComparatifSection({
  campagnes,
  unite = 'FCFA',
  dict,
  isPremium = false,
}: CampagneComparatifProps) {
  // Types disponibles parmi les campagnes
  const typesDisponibles = useMemo(() => {
    const set = new Set<string>()
    campagnes.forEach(c => {
      if (c.typeDetecte) set.add(c.typeDetecte)
    })
    return Array.from(set)
  }, [campagnes])

  // Type sélectionné (par défaut le premier type ayant au moins 2 campagnes, sinon le premier tout court)
  const defaultType = useMemo(() => {
    const withMultiple = typesDisponibles.find(t => campagnes.filter(c => c.typeDetecte === t).length >= 2)
    return withMultiple || typesDisponibles[0] || 'Toutes'
  }, [typesDisponibles, campagnes])

  const [selectedType, setSelectedType] = useState<string>(defaultType)

  // Campagnes éligibles selon le filtre de type
  const eligibleCampagnes = useMemo(() => {
    if (selectedType === 'Toutes') return campagnes
    return campagnes.filter(c => c.typeDetecte === selectedType)
  }, [campagnes, selectedType])

  // Sélection des 2 campagnes à comparer (N et N-1)
  const [selectedIdN, setSelectedIdN] = useState<string>(() => {
    return eligibleCampagnes[0]?.id || campagnes[0]?.id || ''
  })
  const [selectedIdN1, setSelectedIdN1] = useState<string>(() => {
    return eligibleCampagnes[1]?.id || (campagnes.length > 1 ? campagnes[1]?.id : '')
  })

  // Mettre à jour la sélection quand on change de type
  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    const list = type === 'Toutes' ? campagnes : campagnes.filter(c => c.typeDetecte === type)
    if (list.length >= 2) {
      setSelectedIdN(list[0].id)
      setSelectedIdN1(list[1].id)
    } else if (list.length === 1) {
      setSelectedIdN(list[0].id)
      // Essayer de trouver une autre campagne pour N-1
      const other = campagnes.find(c => c.id !== list[0].id)
      if (other) setSelectedIdN1(other.id)
    }
  }

  const campN = useMemo(() => campagnes.find(c => c.id === selectedIdN) || eligibleCampagnes[0], [campagnes, selectedIdN, eligibleCampagnes])
  const campN1 = useMemo(() => campagnes.find(c => c.id === selectedIdN1) || eligibleCampagnes[1], [campagnes, selectedIdN1, eligibleCampagnes])

  // Calcul des deltas et variations
  const metrics = useMemo(() => {
    if (!campN || !campN1) return null

    const calcDelta = (valN: number, valN1: number) => {
      const delta = valN - valN1
      const pct = valN1 > 0 ? ((valN - valN1) / valN1) * 100 : valN > 0 ? 100 : 0
      return { delta, pct: Math.round(pct * 10) / 10 }
    }

    return {
      superficie: {
        valN: campN.superficieTotal,
        valN1: campN1.superficieTotal,
        ...calcDelta(campN.superficieTotal, campN1.superficieTotal),
        unit: 'ha'
      },
      membres: {
        valN: campN.membresCount,
        valN1: campN1.membresCount,
        ...calcDelta(campN.membresCount, campN1.membresCount),
        unit: 'membres'
      },
      facturation: {
        valN: campN.totalFacture,
        valN1: campN1.totalFacture,
        ...calcDelta(campN.totalFacture, campN1.totalFacture),
        unit: unite
      },
      recouvrement: {
        valN: campN.totalPaye,
        valN1: campN1.totalPaye,
        ...calcDelta(campN.totalPaye, campN1.totalPaye),
        unit: unite
      },
      tauxRecouvrement: {
        valN: campN.tauxRecouvrement,
        valN1: campN1.tauxRecouvrement,
        delta: campN.tauxRecouvrement - campN1.tauxRecouvrement,
        pct: campN.tauxRecouvrement - campN1.tauxRecouvrement, // en points de pourcentage
        unit: '%'
      },
      collecte: {
        valN: campN.totalCollecte,
        valN1: campN1.totalCollecte,
        ...calcDelta(campN.totalCollecte, campN1.totalCollecte),
        unit: 'kg'
      },
      coutHa: {
        valN: campN.superficieTotal > 0 ? Math.round(campN.totalFacture / campN.superficieTotal) : 0,
        valN1: campN1.superficieTotal > 0 ? Math.round(campN1.totalFacture / campN1.superficieTotal) : 0,
        ...calcDelta(
          campN.superficieTotal > 0 ? Math.round(campN.totalFacture / campN.superficieTotal) : 0,
          campN1.superficieTotal > 0 ? Math.round(campN1.totalFacture / campN1.superficieTotal) : 0
        ),
        unit: `${unite}/ha`
      }
    }
  }, [campN, campN1, unite])

  if (!isPremium) {
    return (
      <div id="comparatif-campagnes" className="bg-surface border border-surface-border rounded-xl shadow-sm overflow-hidden transition-all relative">
        {/* Accent top gradient line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-emerald-500 to-indigo-500" />

        {/* Header */}
        <div className="p-6 border-b border-surface-border bg-gradient-to-r from-background via-surface to-background flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                <GitCompare className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-bold font-heading text-foreground">
                Comparatif Inter-Campagnes (N vs N-1)
              </h3>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-3 w-3" />
                Module Réservé Premium
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground-muted max-w-2xl">
              Comparez les campagnes de même saisonnalité (Hivernale N vs N-1, CSF N vs N-1) pour évaluer la croissance des superficies, des crédits d&apos;intrants et du taux de recouvrement.
            </p>
          </div>

          <Link
            href="/abonnement"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-semibold text-xs shadow-sm hover:bg-primary/90 transition shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Passer à la formule Premium
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Teaser area with decorative background mockup and central upgrade card */}
        <div className="relative p-6 sm:p-10 bg-background/50 overflow-hidden">
          {/* Blurred decorative preview mockup in background */}
          <div className="select-none pointer-events-none opacity-40 blur-[2px] transition-all" aria-hidden="true">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-surface rounded-xl p-4 border border-surface-border">
                <div className="flex items-center justify-between text-xs text-foreground-muted">
                  <span>Superficie Emblavée</span>
                  <Layers className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground">148.5 ha</div>
                <div className="mt-2 text-xs text-success font-semibold flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> +22.4 ha (+17.8%)
                </div>
              </div>

              <div className="bg-surface rounded-xl p-4 border border-surface-border">
                <div className="flex items-center justify-between text-xs text-foreground-muted">
                  <span>Producteurs Engagés</span>
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground">86 membres</div>
                <div className="mt-2 text-xs text-success font-semibold flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> +14 membres (+19.4%)
                </div>
              </div>

              <div className="bg-surface rounded-xl p-4 border border-surface-border">
                <div className="flex items-center justify-between text-xs text-foreground-muted">
                  <span>Crédit Intrants Engagé</span>
                  <Banknote className="h-4 w-4 text-amber-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground">34.8 M FCFA</div>
                <div className="mt-2 text-xs text-primary font-semibold flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> +4.2 M (+13.7%)
                </div>
              </div>

              <div className="bg-surface rounded-xl p-4 border border-surface-border">
                <div className="flex items-center justify-between text-xs text-foreground-muted">
                  <span>Taux de Recouvrement</span>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground">96%</div>
                <div className="mt-2 text-xs text-success font-semibold flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> +8 pts vs N-1
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-surface rounded-xl p-5 border border-surface-border h-48 flex items-center justify-center">
                <div className="flex items-end gap-6 h-32 w-full max-w-md justify-around">
                  <div className="w-12 bg-emerald-500 rounded-t h-28" />
                  <div className="w-12 bg-indigo-500 rounded-t h-20" />
                  <div className="w-12 bg-emerald-500 rounded-t h-24" />
                  <div className="w-12 bg-indigo-500 rounded-t h-16" />
                </div>
              </div>
              <div className="bg-surface rounded-xl p-5 border border-surface-border h-48" />
            </div>
          </div>

          {/* Foreground Glassmorphic Locked Card */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative max-w-xl w-full bg-surface/90 backdrop-blur-md rounded-2xl border border-surface-border shadow-xl p-6 sm:p-8 text-center ring-1 ring-primary/10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-600 text-white shadow-md shadow-primary/25 mb-4">
                <Lock className="h-6 w-6" />
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary uppercase tracking-wider mb-2">
                <Sparkles className="h-3 w-3" /> Fonctionnalité Premium
              </span>

              <h4 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
                Débloquez le Comparatif Inter-Campagnes
              </h4>

              <p className="mt-2 text-sm text-foreground-muted leading-relaxed max-w-md mx-auto">
                Pilotez la performance de votre coopérative d&apos;une saison à l&apos;autre avec des analyses détaillées, graphiques comparatifs et diagnostics d&apos;aide à la décision.
              </p>

              {/* Avantages clés */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left text-xs text-foreground bg-background/60 p-4 rounded-xl border border-surface-border">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Comparaison automatique saison par saison (Hivernale N vs N-1, CSF)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Évolution des superficies emblavées et productivité</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Analyse des crédits engagés et indicateurs de solvabilité</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Graphiques doubles barres & diagnostics analytiques</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/abonnement"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow hover:bg-primary/90 transition"
                >
                  <Sparkles className="h-4 w-4" />
                  Passer à la formule Premium
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/campagnes"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-surface-border bg-surface text-foreground font-semibold text-sm hover:bg-background transition"
                >
                  Voir mes campagnes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (campagnes.length === 0) {
    return null
  }

  return (
    <div id="comparatif-campagnes" className="bg-surface border border-surface-border rounded-xl shadow-sm overflow-hidden transition-all">
      {/* Header */}
      <div className="p-6 border-b border-surface-border bg-gradient-to-r from-background via-surface to-background flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <GitCompare className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-bold font-heading text-foreground">
              Comparatif Inter-Campagnes (N vs N-1)
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Formule Premium
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground-muted">
            Comparez les campagnes de même saisonnalité (Hivernale N vs N-1, CSF N vs N-1) pour évaluer la croissance des superficies, crédits et taux de recouvrement.
          </p>
        </div>

        {/* Sélecteur de type de campagne */}
        {typesDisponibles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 bg-background p-1 rounded-lg border border-surface-border">
            {typesDisponibles.map((t) => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  selectedType === t
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                }`}
              >
                {t}
              </button>
            ))}
            <button
              onClick={() => handleTypeChange('Toutes')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                selectedType === 'Toutes'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface'
              }`}
            >
              Toutes
            </button>
          </div>
        )}
      </div>

      {/* Barre de sélection des deux campagnes */}
      <div className="px-6 py-4 bg-background/50 border-b border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Campagne N */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
              Campagne N (Réf.)
            </span>
            <select
              value={selectedIdN}
              onChange={(e) => setSelectedIdN(e.target.value)}
              className="rounded-md border border-surface-border bg-surface py-1.5 px-3 text-xs font-semibold text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} {c.statut === 'en_cours' ? '• (En cours)' : ''}
                </option>
              ))}
            </select>
          </div>

          <span className="text-foreground-muted font-bold text-xs uppercase px-1">VS</span>

          {/* Campagne N-1 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">
              Campagne N-1 (Comp.)
            </span>
            <select
              value={selectedIdN1}
              onChange={(e) => setSelectedIdN1(e.target.value)}
              className="rounded-md border border-surface-border bg-surface py-1.5 px-3 text-xs font-semibold text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {campagnes.map((c) => (
                <option key={c.id} value={c.id} disabled={c.id === selectedIdN}>
                  {c.nom} {c.statut === 'en_cours' ? '• (En cours)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {campN && campN1 && (
          <div className="text-xs text-foreground-muted flex items-center gap-2 shrink-0">
            <Calendar className="h-4 w-4 text-primary" />
            <span>
              {campN.nom} ({campN.anneeDetectee || 'Année N'}) vs {campN1.nom} ({campN1.anneeDetectee || 'Année N-1'})
            </span>
          </div>
        )}
      </div>

      {/* Contenu comparatif */}
      {campN && campN1 && metrics ? (
        <div className="p-6 space-y-8">
          {/* 1. KPI Cards comparatives avec Delta et indicateurs de tendance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Superficie */}
            <div className="bg-background rounded-xl p-4 border border-surface-border hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground-muted">Superficie Emblavée</span>
                <Layers className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-2xl font-bold text-foreground">
                  {metrics.superficie.valN.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} <span className="text-sm font-normal text-foreground-muted">ha</span>
                </div>
                <div className="text-xs text-foreground-muted text-right">
                  N-1 : {metrics.superficie.valN1.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ha
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-surface-border/60">
                <span className="text-foreground-muted">Évolution :</span>
                <span className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded ${
                  metrics.superficie.delta >= 0 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
                }`}>
                  {metrics.superficie.delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {metrics.superficie.delta >= 0 ? '+' : ''}{metrics.superficie.delta.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ha ({metrics.superficie.pct > 0 ? '+' : ''}{metrics.superficie.pct}%)
                </span>
              </div>
            </div>

            {/* Producteurs / Membres inscrits */}
            <div className="bg-background rounded-xl p-4 border border-surface-border hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground-muted">Producteurs Engagés</span>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-2xl font-bold text-foreground">
                  {metrics.membres.valN} <span className="text-sm font-normal text-foreground-muted">membres</span>
                </div>
                <div className="text-xs text-foreground-muted text-right">
                  N-1 : {metrics.membres.valN1} membres
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-surface-border/60">
                <span className="text-foreground-muted">Évolution :</span>
                <span className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded ${
                  metrics.membres.delta >= 0 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
                }`}>
                  {metrics.membres.delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {metrics.membres.delta >= 0 ? '+' : ''}{metrics.membres.delta} ({metrics.membres.pct > 0 ? '+' : ''}{metrics.membres.pct}%)
                </span>
              </div>
            </div>

            {/* Crédits / Facturation */}
            <div className="bg-background rounded-xl p-4 border border-surface-border hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground-muted">Crédit Intrants Engagé</span>
                <Banknote className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-2xl font-bold text-foreground truncate">
                  {(metrics.facturation.valN / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} <span className="text-sm font-normal text-foreground-muted">M {unite}</span>
                </div>
                <div className="text-xs text-foreground-muted text-right shrink-0">
                  N-1 : {(metrics.facturation.valN1 / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-surface-border/60">
                <span className="text-foreground-muted">Évolution :</span>
                <span className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded ${
                  metrics.facturation.delta >= 0 ? 'text-foreground bg-primary/10' : 'text-foreground-muted bg-surface'
                }`}>
                  {metrics.facturation.delta >= 0 ? '+' : ''}{(metrics.facturation.delta / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M ({metrics.facturation.pct > 0 ? '+' : ''}{metrics.facturation.pct}%)
                </span>
              </div>
            </div>

            {/* Taux de Recouvrement */}
            <div className="bg-background rounded-xl p-4 border border-surface-border hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground-muted">Taux de Recouvrement</span>
                <CheckCircle2 className={`h-4 w-4 ${metrics.tauxRecouvrement.valN >= 80 ? 'text-success' : 'text-amber-500'}`} />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-2xl font-bold text-foreground">
                  {metrics.tauxRecouvrement.valN}%
                </div>
                <div className="text-xs text-foreground-muted text-right">
                  N-1 : {metrics.tauxRecouvrement.valN1}%
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-surface-border/60">
                <span className="text-foreground-muted">Écart net :</span>
                <span className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded ${
                  metrics.tauxRecouvrement.delta >= 0 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
                }`}>
                  {metrics.tauxRecouvrement.delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {metrics.tauxRecouvrement.delta >= 0 ? '+' : ''}{metrics.tauxRecouvrement.delta} pts
                </span>
              </div>
            </div>
          </div>

          {/* 2. Visual Graphs: Double Bar Chart & Entonnoir Financier */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Graphique 1: Bar Chart comparatif groupé (SVG) */}
            <div className="lg:col-span-2 bg-background rounded-xl p-5 border border-surface-border flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-surface-border">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Comparaison Directe des Volumes (N vs N-1)
                  </h4>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    Surfaces, Effectifs et Engagements financiers comparés
                  </p>
                </div>
                {/* Légende */}
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-xs bg-emerald-500 inline-block shadow-xs" />
                    <span className="text-foreground font-semibold">{campN.nom} (N)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-xs bg-indigo-500 inline-block shadow-xs" />
                    <span className="text-foreground font-semibold">{campN1.nom} (N-1)</span>
                  </div>
                </div>
              </div>

              {/* Rendu SVG dynamique et interactif */}
              <div className="py-6">
                <GroupedBarChartSVG
                  data={[
                    {
                      label: 'Superficie',
                      sublabel: 'hectares (ha)',
                      valN: metrics.superficie.valN,
                      valN1: metrics.superficie.valN1,
                      formatVal: (v) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ha`,
                      growth: metrics.superficie.pct,
                    },
                    {
                      label: 'Membres',
                      sublabel: 'inscrits',
                      valN: metrics.membres.valN,
                      valN1: metrics.membres.valN1,
                      formatVal: (v) => `${v} prod.`,
                      growth: metrics.membres.pct,
                    },
                    {
                      label: 'Facturation',
                      sublabel: `millions ${unite}`,
                      valN: Math.round(metrics.facturation.valN / 1000000 * 10) / 10,
                      valN1: Math.round(metrics.facturation.valN1 / 1000000 * 10) / 10,
                      formatVal: (v) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}M`,
                      growth: metrics.facturation.pct,
                    },
                    {
                      label: 'Recouvrement',
                      sublabel: `millions ${unite}`,
                      valN: Math.round(metrics.recouvrement.valN / 1000000 * 10) / 10,
                      valN1: Math.round(metrics.recouvrement.valN1 / 1000000 * 10) / 10,
                      formatVal: (v) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}M`,
                      growth: metrics.recouvrement.pct,
                    },
                  ]}
                />
              </div>

              <div className="pt-3 border-t border-surface-border text-xs text-foreground-muted flex items-center justify-between">
                <span>Indicateurs calibrés sur l'échelle comparative</span>
                <span className="font-medium text-primary">Croissance globale moyenne : {
                  Math.round(((metrics.superficie.pct + metrics.membres.pct + metrics.facturation.pct) / 3) * 10) / 10
                }%</span>
              </div>
            </div>

            {/* Graphique 2: Entonnoir financier & Recouvrement progressif */}
            <div className="bg-background rounded-xl p-5 border border-surface-border flex flex-col justify-between">
              <div>
                <div className="pb-4 border-b border-surface-border">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Scale className="h-4 w-4 text-emerald-500" />
                    Santé du Recouvrement
                  </h4>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    Remboursements perçus vs restant à solder
                  </p>
                </div>

                <div className="mt-5 space-y-6">
                  {/* Barre Campagne N */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {campN.nom} (N)
                      </span>
                      <span className="font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                        {metrics.tauxRecouvrement.valN}% recouvré
                      </span>
                    </div>
                    {/* Visual Dual Bar */}
                    <div className="h-5 w-full bg-surface-border/60 rounded-full overflow-hidden flex shadow-inner">
                      <div 
                        style={{ width: `${Math.min(metrics.tauxRecouvrement.valN, 100)}%` }} 
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all duration-700"
                      >
                        {metrics.tauxRecouvrement.valN > 15 ? `${metrics.tauxRecouvrement.valN}%` : ''}
                      </div>
                      <div 
                        style={{ width: `${Math.max(100 - metrics.tauxRecouvrement.valN, 0)}%` }} 
                        className="bg-amber-400/40 h-full"
                        title="Reste à recouvrer"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-foreground-muted mt-1 px-1">
                      <span>Recouvré : {metrics.recouvrement.valN.toLocaleString('fr-FR')}{unite}</span>
                      <span>Total : {metrics.facturation.valN.toLocaleString('fr-FR')}{unite}</span>
                    </div>
                  </div>

                  {/* Barre Campagne N-1 */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        {campN1.nom} (N-1)
                      </span>
                      <span className="font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded">
                        {metrics.tauxRecouvrement.valN1}% recouvré
                      </span>
                    </div>
                    {/* Visual Dual Bar */}
                    <div className="h-5 w-full bg-surface-border/60 rounded-full overflow-hidden flex shadow-inner">
                      <div 
                        style={{ width: `${Math.min(metrics.tauxRecouvrement.valN1, 100)}%` }} 
                        className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all duration-700"
                      >
                        {metrics.tauxRecouvrement.valN1 > 15 ? `${metrics.tauxRecouvrement.valN1}%` : ''}
                      </div>
                      <div 
                        style={{ width: `${Math.max(100 - metrics.tauxRecouvrement.valN1, 0)}%` }} 
                        className="bg-amber-400/40 h-full"
                        title="Reste à recouvrer"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-foreground-muted mt-1 px-1">
                      <span>Recouvré : {metrics.recouvrement.valN1.toLocaleString('fr-FR')}{unite}</span>
                      <span>Total : {metrics.facturation.valN1.toLocaleString('fr-FR')}{unite}</span>
                    </div>
                  </div>
                </div>

                {/* Diagnostic box */}
                <div className="mt-6 p-3.5 bg-surface rounded-lg border border-surface-border">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="text-xs text-foreground">
                      <p className="font-semibold">Bilan de recouvrement :</p>
                      <p className="text-foreground-muted mt-0.5 leading-relaxed">
                        {metrics.tauxRecouvrement.delta >= 0 
                          ? `Performance en hausse de +${metrics.tauxRecouvrement.delta} pts par rapport à la campagne ${campN1.nom}. La solvabilité des membres est bien maîtrisée.`
                          : `Taux en repli de ${metrics.tauxRecouvrement.delta} pts par rapport à la campagne ${campN1.nom}. Assurer le suivi des relances et encaissements.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reste à recouvrer comparatif */}
              <div className="pt-4 mt-4 border-t border-surface-border flex justify-between items-center text-xs">
                <span className="text-foreground-muted">Solde restant N :</span>
                <span className="font-bold text-danger">
                  {Math.max(metrics.facturation.valN - metrics.recouvrement.valN, 0).toLocaleString('fr-FR')}{unite}
                </span>
              </div>
            </div>

          </div>

          {/* 3. Tableau Synthétique Détaillé Ligne par Ligne */}
          <div className="bg-background rounded-xl border border-surface-border overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-border bg-surface/50 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground">Tableau Récapitulatif Analytique</h4>
                <p className="text-xs text-foreground-muted">Synthèse chiffrée complète des écarts entre les deux campagnes</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-surface-border bg-surface/30 text-foreground-muted font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Indicateur Clé</th>
                    <th className="py-3 px-4 text-right text-emerald-600 font-bold">{campN.nom} (N)</th>
                    <th className="py-3 px-4 text-right text-indigo-600 font-bold">{campN1.nom} (N-1)</th>
                    <th className="py-3 px-4 text-right">Écart Absolu</th>
                    <th className="py-3 px-4 text-right">Variation (%)</th>
                    <th className="py-3 px-4 text-center">Tendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {/* Superficie */}
                  <tr className="hover:bg-surface/40 transition-colors">
                    <td className="py-3 px-4 sm:px-6 font-medium text-foreground">Superficie totale déclarée (ha)</td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">{metrics.superficie.valN.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ha</td>
                    <td className="py-3 px-4 text-right text-foreground-muted">{metrics.superficie.valN1.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ha</td>
                    <td className="py-3 px-4 text-right font-medium">{metrics.superficie.delta >= 0 ? '+' : ''}{metrics.superficie.delta.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ha</td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={metrics.superficie.pct >= 0 ? 'text-success' : 'text-danger'}>
                        {metrics.superficie.pct >= 0 ? '+' : ''}{metrics.superficie.pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <TrendBadge pct={metrics.superficie.pct} />
                    </td>
                  </tr>

                  {/* Membres inscrits */}
                  <tr className="hover:bg-surface/40 transition-colors">
                    <td className="py-3 px-4 sm:px-6 font-medium text-foreground">Nombre de producteurs inscrits</td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">{metrics.membres.valN}</td>
                    <td className="py-3 px-4 text-right text-foreground-muted">{metrics.membres.valN1}</td>
                    <td className="py-3 px-4 text-right font-medium">{metrics.membres.delta >= 0 ? '+' : ''}{metrics.membres.delta}</td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={metrics.membres.pct >= 0 ? 'text-success' : 'text-danger'}>
                        {metrics.membres.pct >= 0 ? '+' : ''}{metrics.membres.pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <TrendBadge pct={metrics.membres.pct} />
                    </td>
                  </tr>

                  {/* Superficie moyenne par membre */}
                  <tr className="hover:bg-surface/40 transition-colors">
                    <td className="py-3 px-4 sm:px-6 font-medium text-foreground">Superficie moyenne par producteur</td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">
                      {metrics.membres.valN > 0 ? (metrics.superficie.valN / metrics.membres.valN).toFixed(1) : 0} ha
                    </td>
                    <td className="py-3 px-4 text-right text-foreground-muted">
                      {metrics.membres.valN1 > 0 ? (metrics.superficie.valN1 / metrics.membres.valN1).toFixed(1) : 0} ha
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {((metrics.membres.valN > 0 ? metrics.superficie.valN / metrics.membres.valN : 0) - (metrics.membres.valN1 > 0 ? metrics.superficie.valN1 / metrics.membres.valN1 : 0)).toFixed(1)} ha
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      -
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[11px] text-foreground-muted">Moyenne</span>
                    </td>
                  </tr>

                  {/* Facturation intrants totale */}
                  <tr className="hover:bg-surface/40 transition-colors">
                    <td className="py-3 px-4 sm:px-6 font-medium text-foreground">Crédits de campagne facturés</td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">{metrics.facturation.valN.toLocaleString('fr-FR')}{unite}</td>
                    <td className="py-3 px-4 text-right text-foreground-muted">{metrics.facturation.valN1.toLocaleString('fr-FR')}{unite}</td>
                    <td className="py-3 px-4 text-right font-medium">{metrics.facturation.delta >= 0 ? '+' : ''}{metrics.facturation.delta.toLocaleString('fr-FR')}{unite}</td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={metrics.facturation.pct >= 0 ? 'text-primary' : 'text-foreground-muted'}>
                        {metrics.facturation.pct >= 0 ? '+' : ''}{metrics.facturation.pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <TrendBadge pct={metrics.facturation.pct} />
                    </td>
                  </tr>

                  {/* Coût moyen crédit / ha */}
                  <tr className="hover:bg-surface/40 transition-colors">
                    <td className="py-3 px-4 sm:px-6 font-medium text-foreground">Coût moyen crédit / hectare</td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">{metrics.coutHa.valN.toLocaleString('fr-FR')}{unite}</td>
                    <td className="py-3 px-4 text-right text-foreground-muted">{metrics.coutHa.valN1.toLocaleString('fr-FR')}{unite}</td>
                    <td className="py-3 px-4 text-right font-medium">{metrics.coutHa.delta >= 0 ? '+' : ''}{metrics.coutHa.delta.toLocaleString('fr-FR')}{unite}</td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={metrics.coutHa.pct <= 0 ? 'text-success' : 'text-amber-500'}>
                        {metrics.coutHa.pct >= 0 ? '+' : ''}{metrics.coutHa.pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <TrendBadge pct={-metrics.coutHa.pct} />
                    </td>
                  </tr>

                  {/* Remboursements perçus */}
                  <tr className="hover:bg-surface/40 transition-colors">
                    <td className="py-3 px-4 sm:px-6 font-medium text-foreground">Montants perçus (Remboursements)</td>
                    <td className="py-3 px-4 text-right font-bold text-success">{metrics.recouvrement.valN.toLocaleString('fr-FR')}{unite}</td>
                    <td className="py-3 px-4 text-right text-foreground-muted">{metrics.recouvrement.valN1.toLocaleString('fr-FR')}{unite}</td>
                    <td className="py-3 px-4 text-right font-medium">{metrics.recouvrement.delta >= 0 ? '+' : ''}{metrics.recouvrement.delta.toLocaleString('fr-FR')}{unite}</td>
                    <td className="py-3 px-4 text-right font-bold text-success">
                      {metrics.recouvrement.pct >= 0 ? '+' : ''}{metrics.recouvrement.pct}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <TrendBadge pct={metrics.recouvrement.pct} />
                    </td>
                  </tr>

                  {/* Taux de recouvrement */}
                  <tr className="hover:bg-surface/40 transition-colors bg-surface/20">
                    <td className="py-3 px-4 sm:px-6 font-bold text-foreground">Taux de recouvrement effectif</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">{metrics.tauxRecouvrement.valN}%</td>
                    <td className="py-3 px-4 text-right text-foreground-muted">{metrics.tauxRecouvrement.valN1}%</td>
                    <td className="py-3 px-4 text-right font-bold">{metrics.tauxRecouvrement.delta >= 0 ? '+' : ''}{metrics.tauxRecouvrement.delta} pts</td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={metrics.tauxRecouvrement.delta >= 0 ? 'text-success' : 'text-danger'}>
                        {metrics.tauxRecouvrement.delta >= 0 ? '+' : ''}{metrics.tauxRecouvrement.delta} pts
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <TrendBadge pct={metrics.tauxRecouvrement.delta} />
                    </td>
                  </tr>

                  {/* Collecte en nature */}
                  {(metrics.collecte.valN > 0 || metrics.collecte.valN1 > 0) && (
                    <tr className="hover:bg-surface/40 transition-colors">
                      <td className="py-3 px-4 sm:px-6 font-medium text-foreground">
                        Volume récolte collecté ({campN.produit_collecte || 'Nature'})
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-foreground">
                        {(metrics.collecte.valN / 1000).toFixed(1)} tonnes
                      </td>
                      <td className="py-3 px-4 text-right text-foreground-muted">
                        {(metrics.collecte.valN1 / 1000).toFixed(1)} tonnes
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {metrics.collecte.delta >= 0 ? '+' : ''}{(metrics.collecte.delta / 1000).toFixed(1)} t
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={metrics.collecte.pct >= 0 ? 'text-success' : 'text-danger'}>
                          {metrics.collecte.pct >= 0 ? '+' : ''}{metrics.collecte.pct}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <TrendBadge pct={metrics.collecte.pct} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-background/50">
          <HelpCircle className="h-8 w-8 text-foreground-muted mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-foreground">Au moins 2 campagnes sont requises pour la comparaison</h4>
          <p className="text-xs text-foreground-muted mt-1 max-w-md mx-auto">
            Créez une deuxième campagne du même type (ex: Hivernale 2025 ou CSF 2025-2026) pour activer la comparaison automatique des saisons N vs N-1.
          </p>
        </div>
      )}
    </div>
  )
}

function TrendBadge({ pct }: { pct: number }) {
  if (pct > 5) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
        <TrendingUp className="h-3 w-3" />
        Hausse
      </span>
    )
  }
  if (pct < -5) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
        <TrendingDown className="h-3 w-3" />
        Baisse
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground-muted bg-surface px-2 py-0.5 rounded-full">
      <Minus className="h-3 w-3" />
      Stable
    </span>
  )
}

// Composant SVG Bar Chart Groupé (N vs N-1)
function GroupedBarChartSVG({
  data
}: {
  data: {
    label: string
    sublabel: string
    valN: number
    valN1: number
    formatVal: (v: number) => string
    growth: number
  }[]
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // Trouver le max pour chaque item pour normaliser la hauteur des barres relatives
  const chartHeight = 160
  const barWidth = 24
  const groupSpacing = 90

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[480px]">
        <svg 
          viewBox="0 0 460 210" 
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Dégradé Campagne N (Émeraude) */}
            <linearGradient id="grad-n" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            {/* Dégradé Campagne N-1 (Indigo) */}
            <linearGradient id="grad-n1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            {/* Ligne pointillée */}
            <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="10" y2="0" stroke="currentColor" strokeOpacity="0.06" />
            </pattern>
          </defs>

          {/* Grille horizontale de fond */}
          <line x1="20" y1="30" x2="440" y2="30" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" />
          <line x1="20" y1="75" x2="440" y2="75" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" />
          <line x1="20" y1="120" x2="440" y2="120" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" />
          <line x1="20" y1="165" x2="440" y2="165" stroke="currentColor" strokeOpacity="0.2" />

          {/* Groupes de barres */}
          {data.map((item, idx) => {
            const maxVal = Math.max(item.valN, item.valN1, 0.001)
            // Hauteur max = 120px
            const heightN = Math.max((item.valN / maxVal) * 115, 6)
            const heightN1 = Math.max((item.valN1 / maxVal) * 115, 6)

            const groupX = 45 + idx * groupSpacing
            const yBase = 165

            const isHovered = hoveredIdx === idx

            return (
              <g 
                key={item.label}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Zone de survol transparent */}
                <rect
                  x={groupX - 12}
                  y="15"
                  width={barWidth * 2 + 30}
                  height="160"
                  fill={isHovered ? 'currentColor' : 'transparent'}
                  fillOpacity={isHovered ? 0.04 : 0}
                  rx="6"
                />

                {/* Badge de croissance au-dessus du groupe */}
                <g transform={`translate(${groupX + barWidth + 3}, 22)`}>
                  <rect
                    x="-24"
                    y="-12"
                    width="48"
                    height="16"
                    rx="8"
                    fill={item.growth >= 0 ? '#10b981' : '#ef4444'}
                    fillOpacity="0.15"
                  />
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    fill={item.growth >= 0 ? '#059669' : '#dc2626'}
                    fontSize="9"
                    fontWeight="700"
                  >
                    {item.growth >= 0 ? '+' : ''}{item.growth}%
                  </text>
                </g>

                {/* Barre N (Émeraude) */}
                <rect
                  x={groupX}
                  y={yBase - heightN}
                  width={barWidth}
                  height={heightN}
                  fill="url(#grad-n)"
                  rx="4"
                  className="transition-all duration-300"
                />
                {/* Valeur N au-dessus de la barre */}
                <text
                  x={groupX + barWidth / 2}
                  y={yBase - heightN - 4}
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="9.5"
                  fontWeight="600"
                >
                  {item.formatVal(item.valN)}
                </text>

                {/* Barre N-1 (Indigo) */}
                <rect
                  x={groupX + barWidth + 6}
                  y={yBase - heightN1}
                  width={barWidth}
                  height={heightN1}
                  fill="url(#grad-n1)"
                  rx="4"
                  className="transition-all duration-300"
                />
                {/* Valeur N-1 au-dessus de la barre */}
                <text
                  x={groupX + barWidth + 6 + barWidth / 2}
                  y={yBase - heightN1 - 4}
                  textAnchor="middle"
                  fill="currentColor"
                  fillOpacity="0.75"
                  fontSize="9"
                  fontWeight="500"
                >
                  {item.formatVal(item.valN1)}
                </text>

                {/* Libellé sous la barre */}
                <text
                  x={groupX + barWidth + 3}
                  y={yBase + 16}
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="11"
                  fontWeight="600"
                >
                  {item.label}
                </text>
                <text
                  x={groupX + barWidth + 3}
                  y={yBase + 28}
                  textAnchor="middle"
                  fill="currentColor"
                  fillOpacity="0.5"
                  fontSize="9"
                >
                  {item.sublabel}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
