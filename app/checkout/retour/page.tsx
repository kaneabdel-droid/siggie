import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function CheckoutRetourPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const d = dict.checkout_extra.retour

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
            <h2 className="text-2xl font-bold font-heading mb-2">{d.activated_title}</h2>
            <p className="text-foreground-muted mb-6">
              {d.activated_desc_prefix} {payment?.niveau} {d.activated_desc_suffix}
            </p>
            <Link href="/dashboard" className="text-primary font-semibold hover:text-primary-hover">
              {d.dashboard_link}
            </Link>
          </>
        ) : statut === 'failed' ? (
          <>
            <XCircle className="w-16 h-16 text-danger mx-auto mb-6" />
            <h2 className="text-2xl font-bold font-heading mb-2">{d.failed_title}</h2>
            <p className="text-foreground-muted mb-6">
              {d.failed_desc}
            </p>
            <Link href="/abonnement" className="text-primary font-semibold hover:text-primary-hover">
              {d.retry_link}
            </Link>
          </>
        ) : (
          <>
            <Clock className="w-16 h-16 text-primary mx-auto mb-6 animate-pulse" />
            <h2 className="text-2xl font-bold font-heading mb-2">{d.pending_title}</h2>
            <p className="text-foreground-muted mb-6">
              {d.pending_desc}
            </p>
            <Link href="/abonnement" className="text-primary font-semibold hover:text-primary-hover">
              {dict.checkout_extra.back_to_subscription}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
