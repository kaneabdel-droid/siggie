import { getComptes } from '../actions'
import JournalClient from './JournalClient'

export default async function JournauxPage() {
  const { comptes, error } = await getComptes()

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  if (!comptes || comptes.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
        Aucun compte trouvé. Veuillez d'abord créer un compte.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-base font-semibold leading-6 text-foreground">Journaux de Caisse et de Banque</h3>
        <p className="mt-2 text-sm text-foreground-muted">
          Sélectionnez un compte pour voir toutes ses opérations avec le solde progressif.
        </p>
      </div>

      <JournalClient comptes={comptes} />
    </div>
  )
}
