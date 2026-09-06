import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'

export default async function CheckoutRetourPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams
  const supabase = await createClient()

  const { data: payment } = ref
    ? await supabase.from('abonnement_paiements').select('statut, niveau').eq('id', ref).maybeSingle()
    : { data: null }

  const statut = payment?.statut ?? 'pending'

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="bg-surface border border-surface-border p-8 rounded-2xl max-w-md w-full text-center shadow-lg">
        {statut === 'completed' ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-6" />
            <h2 className="text-2xl font-bold font-heading mb-2">Abonnement activé !</h2>
            <p className="text-foreground-muted mb-6">
              Merci, votre paiement a été confirmé et votre forfait {payment?.niveau} est actif.
            </p>
            <Link href="/dashboard" className="text-primary font-semibold hover:text-primary-hover">
              Accéder au tableau de bord
            </Link>
          </>
        ) : statut === 'failed' ? (
          <>
            <XCircle className="w-16 h-16 text-danger mx-auto mb-6" />
            <h2 className="text-2xl font-bold font-heading mb-2">Paiement non abouti</h2>
            <p className="text-foreground-muted mb-6">
              Le paiement n&apos;a pas pu être confirmé. Vous pouvez réessayer depuis votre espace abonnement.
            </p>
            <Link href="/abonnement" className="text-primary font-semibold hover:text-primary-hover">
              Réessayer
            </Link>
          </>
        ) : (
          <>
            <Clock className="w-16 h-16 text-primary mx-auto mb-6 animate-pulse" />
            <h2 className="text-2xl font-bold font-heading mb-2">Vérification du paiement...</h2>
            <p className="text-foreground-muted mb-6">
              Cela peut prendre quelques instants. Actualisez cette page ou revenez plus tard sur votre espace abonnement.
            </p>
            <Link href="/abonnement" className="text-primary font-semibold hover:text-primary-hover">
              Retour à mon abonnement
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
