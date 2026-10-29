import { Users, Leaf, Banknote, Tractor, ArrowRight, Wallet, ArrowDownLeft, PlusCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import { uniteMontant } from '@/lib/currency'
import CampagneComparatifSection, { type CampagneStatData } from './CampagneComparatifSection'

export default async function Dashboard() {
  const tenant = await getTenantContext()
  const isPremium = tenant?.subscriptionTier === 'premium'
  const unite = uniteMontant(tenant?.devise)
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  // Requêtes parallèles pour le tableau de bord et le comparatif inter-campagnes
  const [
    { count: membresCount },
    { data: campagneData },
    { data: recentsMembres },
    { data: comptes },
    { data: transactions },
    campagnesRes,
    campagneMembresRes,
    facturesRes,
    remboursementsRes,
  ] = await Promise.all([
    supabase.from('membres').select('*', { count: 'exact', head: true }),
    supabase.from('campagnes').select('id, nom, statut').eq('statut', 'en_cours').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    // Activités récentes (Derniers membres inscrits)
    supabase.from('membres').select('prenom, nom, created_at').order('created_at', { ascending: false }).limit(5),
    // Aperçu financier & Comptes (incluant caisse et banques)
    supabase.from('comptes').select('id, nom, type_compte, solde_initial'),
    supabase.from('transactions').select('id, compte_id, type_transaction, montant, date_transaction, created_at, motif, type_piece, comptes(nom, type_compte)'),
    // Campagnes pour le comparatif inter-saisons (disponible uniquement pour l'abonnement Premium)
    isPremium
      ? supabase.from('campagnes').select('id, nom, statut, date_debut, date_fin, produit_collecte, prix_collecte, created_at').order('created_at', { ascending: false })
      : Promise.resolve({ data: null }),
    isPremium
      ? supabase.from('campagne_membres').select('campagne_id, superficie, superficie_validee')
      : Promise.resolve({ data: null }),
    isPremium
      ? supabase.from('factures').select('id, campagne_id, montant_total, montant_interet, montant_paye')
      : Promise.resolve({ data: null }),
    isPremium
      ? supabase.from('remboursements').select('facture_id, montant_fcfa, quantite_nature')
      : Promise.resolve({ data: null }),
  ])

  const allCampagnes = campagnesRes?.data
  const allCampagneMembres = campagneMembresRes?.data
  const allFactures = facturesRes?.data
  const allRemboursements = remboursementsRes?.data

  // Indexation des factures et remboursements par campagne
  const facturesByCampagne = new Map<string, any[]>()
  const factureIdToCampagneId = new Map<string, string>()
  for (const f of allFactures || []) {
    if (f.campagne_id) {
      if (!facturesByCampagne.has(f.campagne_id)) facturesByCampagne.set(f.campagne_id, [])
      facturesByCampagne.get(f.campagne_id)!.push(f)
      factureIdToCampagneId.set(f.id, f.campagne_id)
    }
  }

  const remboursementsByCampagne = new Map<string, any[]>()
  for (const r of allRemboursements || []) {
    const campId = factureIdToCampagneId.get(r.facture_id)
    if (campId) {
      if (!remboursementsByCampagne.has(campId)) remboursementsByCampagne.set(campId, [])
      remboursementsByCampagne.get(campId)!.push(r)
    }
  }

  const membresByCampagne = new Map<string, any[]>()
  for (const cm of allCampagneMembres || []) {
    if (cm.campagne_id) {
      if (!membresByCampagne.has(cm.campagne_id)) membresByCampagne.set(cm.campagne_id, [])
      membresByCampagne.get(cm.campagne_id)!.push(cm)
    }
  }

  // Construction des statistiques par campagne
  const campagnesStats: CampagneStatData[] = (allCampagnes || []).map((c) => {
    const fList = facturesByCampagne.get(c.id) || []
    const rList = remboursementsByCampagne.get(c.id) || []
    const mList = membresByCampagne.get(c.id) || []

    const superficieTotal = mList.reduce((sum, m) => sum + (Number(m.superficie_validee) || Number(m.superficie) || 0), 0)
    const countMembres = mList.length

    const totalFacture = fList.reduce((sum, f) => sum + (Number(f.montant_total) || 0) + (Number(f.montant_interet) || 0), 0)
    const totalPaye = fList.reduce((sum, f) => sum + (Number(f.montant_paye) || 0), 0)
    const tauxRecouvrement = totalFacture > 0 ? Math.round((totalPaye / totalFacture) * 100) : 0
    const totalCollecte = rList.reduce((sum, r) => sum + (Number(r.quantite_nature) || 0), 0)

    const lower = c.nom.toLowerCase()
    let typeDetecte = 'Hivernale'
    if (lower.includes('csf') || lower.includes('froide')) {
      if (lower.includes('oignon')) typeDetecte = 'CSF Oignon'
      else if (lower.includes('tomate')) typeDetecte = 'CSF Tomate'
      else if (lower.includes('pomme')) typeDetecte = 'CSF Pomme de terre'
      else typeDetecte = 'CSF (Contre-Saison Froide)'
    } else if (lower.includes('csc') || lower.includes('chaude')) {
      if (lower.includes('riz')) typeDetecte = 'CSC Riz'
      else if (lower.includes('mais') || lower.includes('maïs')) typeDetecte = 'CSC Maïs'
      else typeDetecte = 'CSC (Contre-Saison Chaude)'
    } else if (lower.includes('hiv') || lower.includes('hivernale') || lower.includes('hivernage')) {
      typeDetecte = 'Hivernale'
    } else {
      const cleaned = c.nom.replace(/\b(19|20)\d{2}(-\d{2,4})?\b/g, '').replace(/[-_]/g, ' ').trim()
      typeDetecte = cleaned || 'Générale'
    }

    const yearMatch = c.nom.match(/\b(19|20\d{2}(-\d{2,4})?)\b/)
    const anneeDetectee = yearMatch ? yearMatch[0] : (c.date_debut ? new Date(c.date_debut).getFullYear().toString() : '')

    return {
      id: c.id,
      nom: c.nom,
      statut: c.statut,
      date_debut: c.date_debut,
      date_fin: c.date_fin,
      produit_collecte: c.produit_collecte,
      prix_collecte: c.prix_collecte ? Number(c.prix_collecte) : null,
      typeDetecte,
      anneeDetectee,
      superficieTotal,
      membresCount: countMembres,
      totalFacture,
      totalPaye,
      tauxRecouvrement,
      totalCollecte,
    }
  })

  const nomCampagne = campagneData?.nom || dict.dashboard.stats.season_none

  let tauxRemboursement = 0
  if (campagneData) {
    const { data: factures } = await supabase
      .from('factures')
      .select('montant_total, montant_paye')
      .eq('campagne_id', campagneData.id)

    if (factures && factures.length > 0) {
      let totalDue = 0
      let totalPaye = 0
      factures.forEach(f => {
        totalDue += f.montant_total || 0
        totalPaye += f.montant_paye || 0
      })
      if (totalDue > 0) {
        tauxRemboursement = Math.round((totalPaye / totalDue) * 100)
      }
    }
  }

  // Caisse & Trésorerie
  const caisseComptes = (comptes || []).filter(c => (c.type_compte || '').toLowerCase() === 'caisse')
  const caisseIds = new Set(caisseComptes.map(c => c.id))
  const caissePrincipale = caisseComptes[0] || null

  const soldeInitialTotal = comptes?.reduce((acc, c) => acc + (Number(c.solde_initial) || 0), 0) || 0
  const soldeInitialCaisse = caisseComptes.reduce((acc, c) => acc + (Number(c.solde_initial) || 0), 0)

  let totalEntrees = 0
  let totalSorties = 0
  let totalEntreesCaisse = 0
  let totalSortiesCaisse = 0
  let countPaiementsEspece = 0

  const paiementsEspeceList: any[] = []

  if (transactions) {
    transactions.forEach(t => {
      const isCaisse = caisseIds.has(t.compte_id) || (t.comptes as any)?.type_compte === 'caisse'
      const m = Number(t.montant || 0)

      if (t.type_transaction === 'entree') {
        totalEntrees += m
        if (isCaisse) {
          totalEntreesCaisse += m
          countPaiementsEspece++
          paiementsEspeceList.push(t)
        }
      } else if (t.type_transaction === 'sortie') {
        totalSorties += m
        if (isCaisse) {
          totalSortiesCaisse += m
        }
      }
    })
  }

  // Tri chronologique des paiements espèces récents (du plus récent au plus ancien)
  paiementsEspeceList.sort((a, b) => {
    const da = a.date_transaction || (a.created_at ? a.created_at.slice(0, 10) : '')
    const db = b.date_transaction || (b.created_at ? b.created_at.slice(0, 10) : '')
    if (da !== db) return db.localeCompare(da)
    return (b.created_at || '').localeCompare(a.created_at || '')
  })
  const recentsPaiementsEspece = paiementsEspeceList.slice(0, 5)

  const soldeActuel = soldeInitialTotal + totalEntrees - totalSorties
  const soldeCaisse = soldeInitialCaisse + totalEntreesCaisse - totalSortiesCaisse

  const stats = [
    { name: dict.dashboard.stats.members, value: membresCount || '0', icon: Users, desc: dict.dashboard.stats.members_desc, color: 'text-blue-600', bg: 'bg-blue-100', link: '/membres' },
    { name: dict.dashboard.stats.season, value: nomCampagne, icon: Leaf, desc: campagneData ? dict.dashboard.stats.season_active : dict.dashboard.stats.season_done, color: 'text-green-600', bg: 'bg-green-100', link: '/campagnes' },
    { name: dict.dashboard.stats.repayment, value: `${tauxRemboursement}%`, icon: Banknote, desc: dict.dashboard.stats.repayment_desc, color: 'text-emerald-600', bg: 'bg-emerald-100', link: '/remboursements' },
    {
      name: "Paiements Espèces",
      value: `${totalEntreesCaisse.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} ${unite}`,
      icon: Wallet,
      desc: `Solde caisse : ${soldeCaisse.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} ${unite}`,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      link: caissePrincipale ? `/tresorerie/journaux?compteId=${caissePrincipale.id}` : '/tresorerie',
      linkText: 'Consulter la caisse',
    },
    { name: dict.dashboard.stats.equipment, value: null, icon: Tractor, desc: '', color: 'text-orange-600', bg: 'bg-orange-100', link: '/materiel', linkText: dict.dashboard.stats.equipment_link },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">{dict.dashboard.title}</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {dict.dashboard.welcome}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface p-6 shadow-sm border border-surface-border transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-lg p-3 ${item.bg}`}>
                <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
              </div>
              {item.link && !item.linkText && (
                <Link href={item.link} className="text-foreground-muted hover:text-primary transition-colors">
                  <ArrowRight className="h-5 w-5" />
                </Link>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-foreground-muted">{item.name}</p>
              {item.value !== null ? (
                <p className="mt-1 text-2xl font-semibold text-foreground break-words">{item.value}</p>
              ) : item.link && item.linkText ? (
                <div className="mt-1">
                  <Link href={item.link} className="inline-flex items-center text-lg font-semibold text-foreground hover:text-primary transition-colors">
                    {item.linkText}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </div>
              ) : null}
            </div>
            <div className="mt-1">
              {item.desc && <span className="text-xs text-foreground-muted">{item.desc}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Comparatif Inter-Campagnes (ex: Hivernale N vs N-1, CSF N vs N-1) */}
      <CampagneComparatifSection 
        campagnes={campagnesStats} 
        unite={unite} 
        dict={dict} 
        isPremium={isPremium}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne 1 : Aperçu Financier Global & Caisse */}
        <div className="rounded-xl bg-surface border border-surface-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-surface-border bg-background/50 flex justify-between items-center">
            <h3 className="text-lg font-semibold leading-6 text-foreground">{dict.dashboard.finance.title}</h3>
            <Link href="/tresorerie" className="text-sm font-medium text-primary hover:text-primary/80">
              {dict.dashboard.finance.view_journal}
            </Link>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between bg-surface space-y-5">
            
            <div className="bg-background rounded-lg border border-surface-border p-5 text-center">
              <p className="text-sm font-medium text-foreground-muted mb-1">{dict.dashboard.finance.balance}</p>
              <p className={`text-3xl font-bold ${soldeActuel >= 0 ? 'text-foreground' : 'text-danger'}`}>
                {soldeActuel.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}{unite}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-success/10 border border-success/20 rounded-lg p-3.5 text-center">
                <p className="text-xs font-medium text-success mb-1">{dict.dashboard.finance.inflows}</p>
                <p className="text-base font-bold text-success truncate">
                  +{totalEntrees.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-danger/10 border border-danger/20 rounded-lg p-3.5 text-center">
                <p className="text-xs font-medium text-danger mb-1">{dict.dashboard.finance.outflows}</p>
                <p className="text-base font-bold text-danger truncate">
                  -{totalSorties.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Encart Caisse Espèces */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-lg shrink-0">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">Caisse (Espèces en main)</p>
                  <p className="text-[11px] text-foreground-muted truncate">
                    {countPaiementsEspece} encaissement{countPaiementsEspece > 1 ? 's' : ''} (+{totalEntreesCaisse.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} {unite.trim()})
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] text-foreground-muted">Solde caisse</p>
                <p className={`text-base font-bold font-mono ${soldeCaisse >= 0 ? 'text-amber-700 dark:text-amber-400' : 'text-danger'}`}>
                  {soldeCaisse.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} {unite.trim()}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Colonne 2 : Paiements en Espèces Récents */}
        <div className="rounded-xl bg-surface border border-surface-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-surface-border bg-background/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold leading-6 text-foreground">Paiements Espèces Récents</h3>
            </div>
            <Link href="/remboursements" className="text-xs font-semibold px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              + Encaisser
            </Link>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between bg-surface">
            <div className="space-y-3">
              {recentsPaiementsEspece && recentsPaiementsEspece.length > 0 ? (
                recentsPaiementsEspece.map((tx) => (
                  <div key={tx.id} className="p-3 rounded-lg bg-background border border-surface-border flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate" title={tx.motif || 'Paiement en espèces'}>
                        {tx.motif || 'Paiement en espèces'}
                      </p>
                      <div className="text-xs text-foreground-muted mt-0.5 flex items-center gap-2">
                        <span>
                          {tx.date_transaction
                            ? new Date(tx.date_transaction).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })
                            : tx.created_at
                            ? new Date(tx.created_at).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })
                            : '-'}
                        </span>
                        {tx.comptes?.nom && <span>• {tx.comptes.nom}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        +{Number(tx.montant || 0).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} {unite.trim()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-sm text-foreground-muted">
                  Aucun paiement en espèces enregistré pour le moment.
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
              <Link
                href={caissePrincipale ? `/tresorerie/journaux?compteId=${caissePrincipale.id}` : '/tresorerie'}
                className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
              >
                Voir le journal de caisse <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
        
        {/* Colonne 3 : Derniers Membres Inscrits */}
        <div className="rounded-xl bg-surface border border-surface-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-surface-border bg-background/50">
            <h3 className="text-lg font-semibold leading-6 text-foreground">{dict.dashboard.recent_members.title}</h3>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between bg-surface">
            <div className="flow-root">
              <ul role="list" className="-mb-8">
                {recentsMembres && recentsMembres.length > 0 ? (
                  recentsMembres.map((membre, idx) => (
                    <li key={idx} className="relative pb-8">
                      {idx !== recentsMembres.length - 1 ? (
                        <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-surface-border" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-surface">
                            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-foreground">
                              {dict.dashboard.recent_members.registered} <span className="font-medium">{membre.prenom} {membre.nom}</span>
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-foreground-muted">
                            <time dateTime={membre.created_at}>
                              {new Date(membre.created_at).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}
                            </time>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-foreground-muted text-center py-4">{dict.dashboard.recent_members.empty}</li>
                )}
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-border">
              <Link href="/membres" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1">
                {dict.dashboard.recent_members.view_all} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
