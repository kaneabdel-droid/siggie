'use client'

import { 
  Banknote, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Tractor,
  Wallet
} from 'lucide-react'

type StatsProps = {
  tresorerie: { soldeActuel: number, totalEntrees: number, totalSorties: number },
  creances: { facturesImpayees: number, creditsEnCours: number, totalCreances: number },
  materiel: { rentabiliteNette: number, totalRecettes: number, totalDepenses: number, amortissementCumule: number }
}

export default function BilansClient({ stats }: { stats: StatsProps }) {
  return (
    <div className="space-y-6">
      
      {/* 1. Trésorerie Globale */}
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Trésorerie Globale</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-surface border border-surface-border overflow-hidden rounded-lg shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Wallet className="h-6 w-6 text-foreground-muted" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-foreground-muted truncate">Solde Actuel</dt>
                    <dd>
                      <div className="text-2xl font-semibold text-foreground">
                        {stats.tresorerie.soldeActuel.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-surface-border overflow-hidden rounded-lg shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-success" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-foreground-muted truncate">Total Entrées</dt>
                    <dd>
                      <div className="text-2xl font-semibold text-success">
                        {stats.tresorerie.totalEntrees.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-surface-border overflow-hidden rounded-lg shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingDown className="h-6 w-6 text-danger" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-foreground-muted truncate">Total Sorties</dt>
                    <dd>
                      <div className="text-2xl font-semibold text-danger">
                        {stats.tresorerie.totalSorties.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Créances & Dettes */}
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4 mt-8">Engagements et Créances</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-warning/10 border border-warning/20 overflow-hidden rounded-lg shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-warning" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-warning truncate">Factures Impayées</dt>
                    <dd>
                      <div className="text-2xl font-semibold text-warning">
                        {stats.creances.facturesImpayees.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-warning/10 border border-warning/20 overflow-hidden rounded-lg shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Banknote className="h-6 w-6 text-warning" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-warning truncate">Crédits Non Remboursés</dt>
                    <dd>
                      <div className="text-2xl font-semibold text-warning">
                        {stats.creances.creditsEnCours.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Synthèse Matériel */}
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4 mt-8">Synthèse Parc Matériel</h3>
        <div className="bg-surface border border-surface-border rounded-lg shadow-sm p-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center">
              <Tractor className="h-8 w-8 text-primary mr-3" />
              <div>
                <h4 className="text-lg font-semibold text-foreground">Rentabilité Nette du Parc</h4>
                <p className="text-sm text-foreground-muted">Recettes - Dépenses - Amortissements</p>
              </div>
            </div>
            <div className={`mt-4 sm:mt-0 text-3xl font-bold ${stats.materiel.rentabiliteNette >= 0 ? 'text-success' : 'text-danger'}`}>
              {stats.materiel.rentabiliteNette.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-surface-border pt-6">
            <div>
              <p className="text-sm text-foreground-muted">Total Recettes</p>
              <p className="text-lg font-semibold text-success">+{stats.materiel.totalRecettes.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA</p>
            </div>
            <div>
              <p className="text-sm text-foreground-muted">Total Dépenses</p>
              <p className="text-lg font-semibold text-danger">-{stats.materiel.totalDepenses.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA</p>
            </div>
            <div>
              <p className="text-sm text-foreground-muted">Dépréciation (Amort.)</p>
              <p className="text-lg font-semibold text-danger">-{Math.round(stats.materiel.amortissementCumule).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
