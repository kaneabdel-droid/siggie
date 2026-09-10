import { createClient } from '@/utils/supabase/server'
import { getDictionary, getLocale } from '@/dictionaries'
import { getImputations } from './actions'
import CreateImputationButton from './CreateImputationButton'
import ImputationRowActions from './ImputationRowActions'

export default async function ImputationsPage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.tresorerie_pages.imputations

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = user
    ? await supabase.from('utilisateurs').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = userData?.role === 'admin'

  const { imputations, error } = await getImputations()

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold leading-6 text-foreground">{t.title}</h3>
          <p className="mt-2 text-sm text-foreground-muted">{t.desc}</p>
        </div>
        {isAdmin && (
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <CreateImputationButton dict={dict} />
          </div>
        )}
      </div>

      {!isAdmin && (
        <p className="mb-4 text-sm text-foreground-muted italic">{t.admin_only_notice}</p>
      )}

      <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-background">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.table.libelle}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.table.compte}</th>
              {isAdmin && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.table.actions}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-surface">
            {(imputations ?? []).map((imp) => (
              <tr key={imp.id} className="hover:bg-surface-hover transition-colors">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">{imp.libelle}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground-muted">{imp.compte}</td>
                {isAdmin && (
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <ImputationRowActions imputation={imp} dict={dict} />
                  </td>
                )}
              </tr>
            ))}
            {(imputations ?? []).length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 3 : 2} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
                  {t.table.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
