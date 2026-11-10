import { getFournisseurs } from '@/app/(dashboard)/bilans/releve-fournisseur/actions'
import { getDictionary, getLocale } from '@/dictionaries'
import FournisseursListClient from './FournisseursListClient'

export default async function TiersFournisseursPage() {
  const [{ fournisseurs, error }, locale] = await Promise.all([
    getFournisseurs(),
    getLocale(),
  ])

  const dict = await getDictionary(locale)

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur : {error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Comptes Fournisseurs</h3>
          <p className="text-sm text-foreground-muted">
            Gestion du répertoire des fournisseurs d&apos;intrants, matériels, carburant et prestataires du GIE.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
          {fournisseurs?.length || 0} fournisseur{(fournisseurs?.length || 0) > 1 ? 's' : ''}
        </span>
      </div>

      <FournisseursListClient
        initialFournisseurs={fournisseurs || []}
        dict={dict}
        locale={locale}
      />
    </div>
  )
}

