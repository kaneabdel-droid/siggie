import { Users, Leaf, Banknote, Tractor, ArrowRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function Dashboard() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  // Fetch real data
  const { count: membresCount } = await supabase.from('membres').select('*', { count: 'exact', head: true })
  
  const { data: campagneData } = await supabase
    .from('campagnes')
    .select('id, nom, statut')
    .eq('statut', 'en_cours')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
    
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

  // Activités récentes (Derniers membres inscrits)
  const { data: recentsMembres } = await supabase
    .from('membres')
    .select('prenom, nom, created_at')
    .order('created_at', { ascending: false })
    .limit(3)

  // Aperçu financier (Trésorerie)
  const { data: comptes } = await supabase.from('comptes').select('solde_initial')
  const soldeInitialTotal = comptes?.reduce((acc, c) => acc + (Number(c.solde_initial) || 0), 0) || 0

  const { data: transactions } = await supabase.from('transactions').select('type_transaction, montant')
  let totalEntrees = 0
  let totalSorties = 0
  
  if (transactions) {
    transactions.forEach(t => {
      if (t.type_transaction === 'entree') {
        totalEntrees += Number(t.montant)
      } else if (t.type_transaction === 'sortie') {
        totalSorties += Number(t.montant)
      }
    })
  }

  const soldeActuel = soldeInitialTotal + totalEntrees - totalSorties

  const stats = [
    { name: dict.dashboard.stats.members, value: membresCount || '0', icon: Users, desc: dict.dashboard.stats.members_desc, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: dict.dashboard.stats.season, value: nomCampagne, icon: Leaf, desc: campagneData ? dict.dashboard.stats.season_active : dict.dashboard.stats.season_done, color: 'text-green-600', bg: 'bg-green-100' },
    { name: dict.dashboard.stats.repayment, value: `${tauxRemboursement}%`, icon: Banknote, desc: dict.dashboard.stats.repayment_desc, color: 'text-emerald-600', bg: 'bg-emerald-100' },
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
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                <p className="mt-1 text-2xl font-semibold text-foreground">{item.value}</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-surface border border-surface-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-surface-border bg-background/50 flex justify-between items-center">
            <h3 className="text-lg font-semibold leading-6 text-foreground">{dict.dashboard.finance.title}</h3>
            <Link href="/tresorerie" className="text-sm font-medium text-primary hover:text-primary/80">
              {dict.dashboard.finance.view_journal}
            </Link>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center bg-surface space-y-6">
            
            <div className="bg-background rounded-lg border border-surface-border p-5 text-center">
              <p className="text-sm font-medium text-foreground-muted mb-1">{dict.dashboard.finance.balance}</p>
              <p className={`text-3xl font-bold ${soldeActuel >= 0 ? 'text-foreground' : 'text-danger'}`}>
                {soldeActuel.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} FCFA
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
                <p className="text-xs font-medium text-success mb-1">{dict.dashboard.finance.inflows}</p>
                <p className="text-lg font-bold text-success">
                  +{totalEntrees.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-danger/10 border border-danger/20 rounded-lg p-4 text-center">
                <p className="text-xs font-medium text-danger mb-1">{dict.dashboard.finance.outflows}</p>
                <p className="text-lg font-bold text-danger">
                  -{totalSorties.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

          </div>
        </div>
        
        <div className="rounded-xl bg-surface border border-surface-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-surface-border bg-background/50">
            <h3 className="text-lg font-semibold leading-6 text-foreground">{dict.dashboard.recent_members.title}</h3>
          </div>
          <div className="p-6 flex-1 bg-surface">
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
