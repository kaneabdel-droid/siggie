import { getFournisseurs } from '@/app/(dashboard)/bilans/releve-fournisseur/actions'
import ReleveFournisseurClient from '@/app/(dashboard)/bilans/releve-fournisseur/ReleveFournisseurClient'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'

export default async function TiersReleveFournisseurPage() {
  const [{ fournisseurs, error }, locale, tenant] = await Promise.all([
    getFournisseurs(),
    getLocale(),
    getTenantContext(),
  ])

  const dict = await getDictionary(locale)
  const gieName = tenant?.gieName || 'Mon GIE'

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur : {error}</div>
  }

  return (
    <ReleveFournisseurClient
      initialFournisseurs={fournisseurs || []}
      dict={dict}
      locale={locale}
      gieName={gieName}
    />
  )
}

