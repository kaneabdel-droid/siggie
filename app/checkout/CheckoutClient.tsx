'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Smartphone, Banknote, ArrowLeft, Clock } from 'lucide-react'
import { initiateSubscriptionPayment } from './actions'

type MoyenPaiement = 'wave' | 'orange' | 'carte' | 'virement' | 'chariow'

export default function CheckoutClient({
  initialPlan,
  isLoggedIn,
  currentTier,
  isUpgrade,
  hasOnlinePayment,
  dict,
  locale,
}: {
  initialPlan: string
  isLoggedIn: boolean
  currentTier: string
  isUpgrade: boolean
  hasOnlinePayment: { mobileMoney: boolean; carte: boolean; chariow: boolean }
  dict: any
  locale: string
}) {
  const d = dict.checkout_extra
  const localeCode = locale === 'fr' ? 'fr-FR' : 'en-US'

  // Chariow ne facture que le prix plein d'un forfait (produit préconfiguré dans sa
  // boutique) : jamais disponible pour un montant de proratisation d'upgrade.
  const chariowDisponible = hasOnlinePayment.chariow && !isUpgrade

  const availableMethods: MoyenPaiement[] = [
    ...(hasOnlinePayment.mobileMoney ? (['wave', 'orange'] as const) : []),
    ...(hasOnlinePayment.carte ? (['carte'] as const) : []),
    ...(chariowDisponible ? (['chariow'] as const) : []),
    'virement',
  ]

  const router = useRouter()
  const [paymentMethod, setPaymentMethod] = useState<MoyenPaiement>(availableMethods[0])
  const [phoneLocal, setPhoneLocal] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [virementPending, setVirementPending] = useState(false)

  const plans = {
    standard: { name: 'Standard', price: '50.000 FCFA / an', value: 50000 },
    medium: { name: 'Medium', price: '75.000 FCFA / an', value: 75000 },
    premium: { name: 'Premium', price: '100.000 FCFA / an', value: 100000 }
  }

  const selectedPlan = plans[initialPlan as keyof typeof plans] || plans.standard
  const currentPlan = plans[currentTier as keyof typeof plans] || plans.standard

  let priceToPay = selectedPlan.price
  let numericPrice = selectedPlan.value

  if (isUpgrade) {
    numericPrice = selectedPlan.value - currentPlan.value
    if (numericPrice <= 0) numericPrice = selectedPlan.value
    priceToPay = `${numericPrice.toLocaleString(localeCode)} FCFA`
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isLoggedIn) {
      // Pas de paiement réel avant la création du compte — l'inscription est gratuite
      // et le passage à un forfait payant se fait depuis /abonnement une fois connecté.
      router.push(`/signup?plan=${initialPlan}`)
      return
    }

    setError(null)
    setIsProcessing(true)

    if (paymentMethod === 'chariow' && !phoneLocal.trim()) {
      setError(d.phone_required_error)
      setIsProcessing(false)
      return
    }

    const result = await initiateSubscriptionPayment(initialPlan, isUpgrade, paymentMethod, phoneLocal)

    setIsProcessing(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    if ('virement' in result) {
      setVirementPending(true)
      return
    }

    window.location.href = result.checkoutUrl
  }

  if (virementPending) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-surface border border-surface-border p-8 rounded-2xl max-w-md w-full text-center shadow-lg">
          <Clock className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold font-heading mb-2">{d.virement_saved_title}</h2>
          <p className="text-foreground-muted mb-6">
            {d.virement_saved_desc}
          </p>
          <Link href="/abonnement" className="text-primary font-semibold hover:text-primary-hover">
            {d.back_to_subscription}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/#tarifs" className="text-foreground-muted hover:text-primary flex items-center gap-2 w-fit transition-colors">
            <ArrowLeft className="w-4 h-4" /> {d.back_offers}
          </Link>
        </div>

        <div className="bg-background border border-surface-border rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row">

          {/* Order Summary */}
          <div className="bg-primary/5 p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-surface-border">
            <h2 className="text-xl font-bold font-heading mb-6">{d.order_summary}</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground-muted">{d.subscription}</p>
                <p className="font-semibold text-lg">{selectedPlan.name}</p>
              </div>
              <div className="pt-4 border-t border-surface-border">
                <p className="text-sm text-foreground-muted mb-1">{d.total_ttc}</p>
                <p className="text-2xl font-bold text-primary">{priceToPay}</p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="p-8 md:w-2/3">
            <h2 className="text-xl font-bold font-heading mb-6">{d.payment_method}</h2>

            {error && (
              <p className="mb-6 text-sm bg-danger/10 text-danger p-3 rounded-md">{error}</p>
            )}

            <form onSubmit={handlePayment}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {hasOnlinePayment.mobileMoney && (
                  <>
                    <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'wave' ? 'border-primary bg-primary/5' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                      <input type="radio" name="paymentMethod" value="wave" checked={paymentMethod === 'wave'} onChange={() => setPaymentMethod('wave')} className="sr-only" />
                      <Smartphone className={`w-8 h-8 mb-2 ${paymentMethod === 'wave' ? 'text-primary' : 'text-foreground-muted'}`} />
                      <span className={`font-semibold ${paymentMethod === 'wave' ? 'text-primary' : 'text-foreground'}`}>Wave</span>
                    </label>

                    <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'orange' ? 'border-[#FF7900] bg-[#FF7900]/5' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                      <input type="radio" name="paymentMethod" value="orange" checked={paymentMethod === 'orange'} onChange={() => setPaymentMethod('orange')} className="sr-only" />
                      <Smartphone className={`w-8 h-8 mb-2 ${paymentMethod === 'orange' ? 'text-[#FF7900]' : 'text-foreground-muted'}`} />
                      <span className={`font-semibold ${paymentMethod === 'orange' ? 'text-[#FF7900]' : 'text-foreground'}`}>{d.orange_money}</span>
                    </label>
                  </>
                )}

                {hasOnlinePayment.carte && (
                  <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'carte' ? 'border-primary bg-primary/5' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                    <input type="radio" name="paymentMethod" value="carte" checked={paymentMethod === 'carte'} onChange={() => setPaymentMethod('carte')} className="sr-only" />
                    <CreditCard className={`w-8 h-8 mb-2 ${paymentMethod === 'carte' ? 'text-primary' : 'text-foreground-muted'}`} />
                    <span className={`font-semibold ${paymentMethod === 'carte' ? 'text-primary' : 'text-foreground'}`}>{d.card}</span>
                  </label>
                )}

                {chariowDisponible && (
                  <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'chariow' ? 'border-primary bg-primary/5' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                    <input type="radio" name="paymentMethod" value="chariow" checked={paymentMethod === 'chariow'} onChange={() => setPaymentMethod('chariow')} className="sr-only" />
                    <Smartphone className={`w-8 h-8 mb-2 ${paymentMethod === 'chariow' ? 'text-primary' : 'text-foreground-muted'}`} />
                    <span className={`font-semibold ${paymentMethod === 'chariow' ? 'text-primary' : 'text-foreground'}`}>{d.mobile_money_chariow}</span>
                  </label>
                )}

                <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'virement' ? 'border-primary bg-primary/5' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                  <input type="radio" name="paymentMethod" value="virement" checked={paymentMethod === 'virement'} onChange={() => setPaymentMethod('virement')} className="sr-only" />
                  <Banknote className={`w-8 h-8 mb-2 ${paymentMethod === 'virement' ? 'text-primary' : 'text-foreground-muted'}`} />
                  <span className={`font-semibold ${paymentMethod === 'virement' ? 'text-primary' : 'text-foreground'}`}>{d.transfer}</span>
                </label>
              </div>

              {paymentMethod === 'virement' && (
                <div className="mb-8 bg-surface p-4 rounded-lg border border-surface-border">
                  <p className="text-sm text-foreground-muted mb-2">{d.transfer_instructions}</p>
                  <p className="font-mono font-semibold">SN048 08002 01057183001 43</p>
                  <p className="text-sm text-foreground-muted mt-2">{d.transfer_note}</p>
                </div>
              )}

              {paymentMethod === 'chariow' && (
                <div className="mb-8">
                  <label htmlFor="phoneLocal" className="block text-sm font-medium text-foreground mb-2">{d.phone_label}</label>
                  <input
                    type="tel"
                    id="phoneLocal"
                    required
                    value={phoneLocal}
                    onChange={(e) => setPhoneLocal(e.target.value)}
                    placeholder={d.phone_placeholder}
                    className="w-full rounded-md border border-surface-border bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {(paymentMethod === 'wave' || paymentMethod === 'orange' || paymentMethod === 'carte' || paymentMethod === 'chariow') && (
                <p className="mb-8 text-sm text-foreground-muted">
                  {d.redirect_notice_prefix} {paymentMethod === 'carte' ? d.redirect_notice_card : d.redirect_notice_mobile}.
                </p>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-primary text-white font-bold py-4 px-8 rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>{d.processing}</>
                ) : !isLoggedIn ? (
                  <>{d.create_account_btn}</>
                ) : (
                  <>{d.pay_prefix} {priceToPay.split(' ')[0]} FCFA</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
