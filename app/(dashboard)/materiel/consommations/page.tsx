import { getConsommations, getMateriels } from '../actions'
import AddConsommationModal from './AddConsommationModal'
import ConsommationsClient from './ConsommationsClient'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import PrintSectionButton from '@/components/PrintSectionButton'

export default async function ConsommationsPage() {
  const { consommations, error } = await getConsommations()
  const { materiels } = await getMateriels() // Pour le dropdown du formulaire
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return (
    <div id="materiel-consommations-print">
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-4 mb-6">
        <div className="min-w-0">
          <h3 className="text-xl font-bold leading-7 text-foreground break-words">{dict.materiel_pages.consommations.title}</h3>
          <p className="mt-1 text-sm text-foreground-muted break-words">
            {dict.materiel_pages.consommations.desc}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:flex-none flex items-center gap-2">
          <PrintSectionButton sectionId="materiel-consommations-print" label={dict.common.print} />
          <AddConsommationModal materiels={materiels || []} dict={dict} />
        </div>
      </div>
      <div className="hidden print:block mb-4">
        <h2 className="text-xl font-bold text-foreground">{tenant?.gieName || 'Mon GIE'}</h2>
        <p className="text-sm text-foreground-muted">{dict.materiel_pages.consommations.title}</p>
      </div>

      <ConsommationsClient consommations={consommations || []} materiels={materiels || []} dict={dict} locale={locale} />
    </div>
  )
}
