import { getMateriels } from '../actions'
import AddMaterielModal from '../AddMaterielModal'
import MaterielClient from '../MaterielClient'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import PrintSectionButton from '@/components/PrintSectionButton'

export default async function MaterielPage() {
  const { materiels, error } = await getMateriels()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return (
    <div id="materiel-inventaire-print" className="pb-12">
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-4 mb-4">
        <div className="sm:flex-auto min-w-0">
          <h3 className="text-lg font-bold leading-6 text-foreground sm:truncate sm:text-xl font-heading">
            {dict.materiel.tabs.inventaire}
          </h3>
        </div>
        <div className="mt-2 sm:mt-0 sm:flex-none flex items-center gap-2">
          <PrintSectionButton sectionId="materiel-inventaire-print" label={dict.common.print} />
          <AddMaterielModal dict={dict} />
        </div>
      </div>
      <div className="hidden print:block mb-4">
        <h2 className="text-xl font-bold text-foreground">{tenant?.gieName || 'Mon GIE'}</h2>
        <p className="text-sm text-foreground-muted">{dict.materiel.tabs.inventaire}</p>
      </div>

      <MaterielClient materiels={materiels || []} dict={dict.materiel.inventaire_table} fullDict={dict} locale={locale} />
    </div>
  )
}
