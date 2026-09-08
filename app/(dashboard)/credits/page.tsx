import { createClient } from '@/utils/supabase/server'
import { Building, DollarSign, Clock, CheckCircle2 } from 'lucide-react'
import CreateCreditButton from './CreateCreditButton'
import CreditRowActions from './CreditRowActions'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function CreditsPage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  // 1. Fetch campaigns for the Create Modal
  const { data: campagnes } = await supabase
    .from('campagnes')
    .select('id, nom')
    .order('created_at', { ascending: false })

  // 2. Fetch credits with campaign info
  const { data: credits, error } = await supabase
    .from('credits')
    .select(`
      *,
      campagnes ( nom )
    `)
    .order('created_at', { ascending: false })

  const { data: comptes } = await supabase.from('comptes').select('id, nom, type_compte')

  // KPIs
  const totalDemande = credits?.reduce((sum, c) => sum + (c.montant_demande || 0), 0) || 0
  const totalAccorde = credits?.reduce((sum, c) => sum + (c.montant_accorde || 0), 0) || 0
  const enAttenteCount = credits?.filter(c => c.statut === 'en_attente').length || 0

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold font-heading text-foreground">{dict.credits.title}</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            {dict.credits.desc}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <CreateCreditButton campagnes={campagnes || []} dict={dict} />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="overflow-hidden rounded-xl bg-surface p-6 shadow-sm border border-surface-border transition-all hover:shadow-md flex items-center gap-4">
          <div className="rounded-lg bg-secondary/10 p-4">
            <DollarSign className="h-8 w-8 text-secondary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">{dict.credits.kpis.demanded}</dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight text-foreground">{totalDemande.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} FCFA</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl bg-surface p-6 shadow-sm border border-surface-border transition-all hover:shadow-md flex items-center gap-4">
          <div className="rounded-lg bg-success/10 p-4">
            <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">{dict.credits.kpis.granted}</dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight text-foreground">{totalAccorde.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} FCFA</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl bg-surface p-6 shadow-sm border border-surface-border transition-all hover:shadow-md flex items-center gap-4">
          <div className="rounded-lg bg-warning/10 p-4">
            <Clock className="h-8 w-8 text-warning" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">{dict.credits.kpis.pending}</dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight text-foreground">{enAttenteCount} {dict.credits.kpis.dossiers}</dd>
          </div>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">{dict.credits.table.season}</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">{dict.credits.table.bank}</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{dict.credits.table.demanded}</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{dict.credits.table.granted}</th>
                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-foreground">{dict.credits.table.status}</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">{dict.credits.table.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {credits && credits.length > 0 ? (
                    credits.map((credit) => (
                      <tr key={credit.id} className="hover:bg-background/50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">
                          {credit.campagnes?.nom || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground flex items-center gap-2">
                          <Building className="h-4 w-4 text-foreground-muted" />
                          {credit.banque_nom || <span className="text-foreground-muted italic">{dict.credits.table.unspecified}</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted text-right">
                          {credit.montant_demande.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} FCFA
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-medium text-foreground">
                          {credit.statut === 'valide' ? (
                            <span className="text-success">{credit.montant_accorde.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })} FCFA</span>
                          ) : '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                          <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            credit.statut === 'en_attente' ? 'bg-warning/10 text-warning ring-warning/20' : 
                            credit.statut === 'valide' ? 'bg-success/10 text-success ring-success/20' : 
                            'bg-danger/10 text-danger ring-danger/20'
                          }`}>
                            {credit.statut === 'en_attente' ? dict.credits.table.status_pending : credit.statut === 'valide' ? dict.credits.table.status_valid : dict.credits.table.status_rejected}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <CreditRowActions credit={credit} comptes={comptes || []} dict={dict} locale={locale} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        {dict.credits.table.empty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
