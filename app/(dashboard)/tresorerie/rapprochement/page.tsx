import { createClient } from '@/utils/supabase/server'
import RapprochementClient from './RapprochementClient'

export default async function RapprochementPage() {
  const supabase = await createClient()

  // On récupère toutes les campagnes du GIE
  const { data: campagnes, error } = await supabase
    .from('campagnes')
    .select('id, nom, statut')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error.message}</div>
  }

  if (!campagnes || campagnes.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
        Aucune campagne trouvée.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-base font-semibold leading-6 text-foreground">Rapprochement Bancaire</h3>
        <p className="mt-2 text-sm text-foreground-muted">
          Bilan de l'utilisation du crédit de la banque pour une campagne donnée.
        </p>
      </div>

      <RapprochementClient campagnes={campagnes} />
    </div>
  )
}
