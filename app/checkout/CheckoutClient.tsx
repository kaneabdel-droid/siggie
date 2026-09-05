'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Smartphone, Banknote, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function CheckoutClient({ 
  initialPlan, 
  isLoggedIn, 
  currentTier, 
  isUpgrade 
}: { 
  initialPlan: string
  isLoggedIn: boolean
  currentTier: string
  isUpgrade: boolean
}) {
  const router = useRouter()
  const [paymentMethod, setPaymentMethod] = useState('wave')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

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
    priceToPay = `${numericPrice.toLocaleString('fr-FR')} FCFA`
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    
    // Simulate payment processing
    setTimeout(async () => {
      setIsProcessing(false)
      setIsSuccess(true)
      
      if (isUpgrade) {
        // Upgrade flow: Update the GIE via an action or API
        const { upgradeSubscription } = await import('./actions')
        await upgradeSubscription(initialPlan)
        
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        // Signup flow
        setTimeout(() => {
          router.push(`/signup?plan=${initialPlan}`)
        }, 2000)
      }
    }, 2000)
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-surface border border-surface-border p-8 rounded-2xl max-w-md w-full text-center shadow-lg">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-6" />
          <h2 className="text-2xl font-bold font-heading mb-2">Paiement Réussi !</h2>
          <p className="text-foreground-muted mb-6">
            {isUpgrade ? "Votre abonnement a été mis à jour avec succès." : "Merci d'avoir choisi Demba Solution. Nous préparons votre espace."}
          </p>
          <div className="animate-pulse flex space-x-2 justify-center">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <div className="w-2 h-2 bg-primary rounded-full animation-delay-200"></div>
            <div className="w-2 h-2 bg-primary rounded-full animation-delay-400"></div>
          </div>
          <p className="text-sm text-foreground-muted mt-4">
            {isUpgrade ? "Redirection vers le tableau de bord..." : "Redirection vers l'inscription..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/#tarifs" className="text-foreground-muted hover:text-primary flex items-center gap-2 w-fit transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour aux offres
          </Link>
        </div>

        <div className="bg-background border border-surface-border rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row">
          
          {/* Order Summary */}
          <div className="bg-primary/5 p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-surface-border">
            <h2 className="text-xl font-bold font-heading mb-6">Résumé de la commande</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground-muted">Abonnement</p>
                <p className="font-semibold text-lg">{selectedPlan.name}</p>
              </div>
              <div className="pt-4 border-t border-surface-border">
                <p className="text-sm text-foreground-muted mb-1">Total à payer (TTC)</p>
                <p className="text-2xl font-bold text-primary">{priceToPay}</p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="p-8 md:w-2/3">
            <h2 className="text-xl font-bold font-heading mb-6">Moyen de paiement</h2>
            
            <form onSubmit={handlePayment}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {/* Wave */}
                <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'wave' ? 'border-primary bg-primary/5' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                  <input type="radio" name="paymentMethod" value="wave" checked={paymentMethod === 'wave'} onChange={() => setPaymentMethod('wave')} className="sr-only" />
                  <Smartphone className={`w-8 h-8 mb-2 ${paymentMethod === 'wave' ? 'text-primary' : 'text-foreground-muted'}`} />
                  <span className={`font-semibold ${paymentMethod === 'wave' ? 'text-primary' : 'text-foreground'}`}>Wave</span>
                </label>

                {/* Orange Money */}
                <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'orange' ? 'border-[#FF7900] bg-[#FF7900]/5' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                  <input type="radio" name="paymentMethod" value="orange" checked={paymentMethod === 'orange'} onChange={() => setPaymentMethod('orange')} className="sr-only" />
                  <Smartphone className={`w-8 h-8 mb-2 ${paymentMethod === 'orange' ? 'text-[#FF7900]' : 'text-foreground-muted'}`} />
                  <span className={`font-semibold ${paymentMethod === 'orange' ? 'text-[#FF7900]' : 'text-foreground'}`}>Orange Money</span>
                </label>

                {/* Carte Visa */}
                <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'visa' ? 'border-primary bg-primary/5' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                  <input type="radio" name="paymentMethod" value="visa" checked={paymentMethod === 'visa'} onChange={() => setPaymentMethod('visa')} className="sr-only" />
                  <CreditCard className={`w-8 h-8 mb-2 ${paymentMethod === 'visa' ? 'text-primary' : 'text-foreground-muted'}`} />
                  <span className={`font-semibold ${paymentMethod === 'visa' ? 'text-primary' : 'text-foreground'}`}>Carte Bancaire</span>
                </label>

                {/* Virement */}
                <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'virement' ? 'border-primary bg-primary/5' : 'border-surface-border bg-surface hover:bg-black/5'}`}>
                  <input type="radio" name="paymentMethod" value="virement" checked={paymentMethod === 'virement'} onChange={() => setPaymentMethod('virement')} className="sr-only" />
                  <Banknote className={`w-8 h-8 mb-2 ${paymentMethod === 'virement' ? 'text-primary' : 'text-foreground-muted'}`} />
                  <span className={`font-semibold ${paymentMethod === 'virement' ? 'text-primary' : 'text-foreground'}`}>Virement</span>
                </label>
              </div>

              {paymentMethod === 'wave' || paymentMethod === 'orange' ? (
                <div className="mb-8">
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">Numéro de téléphone</label>
                  <input type="tel" id="phone" required placeholder={paymentMethod === 'wave' ? 'Ex: 77 123 45 67' : 'Ex: 78 123 45 67'} className="w-full rounded-md border border-surface-border bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              ) : null}

              {paymentMethod === 'visa' ? (
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Numéro de carte</label>
                    <input type="text" required placeholder="0000 0000 0000 0000" className="w-full rounded-md border border-surface-border bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Expiration</label>
                      <input type="text" required placeholder="MM/YY" className="w-full rounded-md border border-surface-border bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">CVC</label>
                      <input type="text" required placeholder="123" className="w-full rounded-md border border-surface-border bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>
                </div>
              ) : null}

              {paymentMethod === 'virement' ? (
                <div className="mb-8 bg-surface p-4 rounded-lg border border-surface-border">
                  <p className="text-sm text-foreground-muted mb-2">Veuillez effectuer le virement sur le compte suivant :</p>
                  <p className="font-mono font-semibold">SN010 01234 12345678901 12</p>
                  <p className="text-sm text-foreground-muted mt-2">Votre abonnement sera activé dès réception des fonds.</p>
                </div>
              ) : null}

              <button 
                type="submit" 
                disabled={isProcessing}
                className="w-full bg-primary text-white font-bold py-4 px-8 rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>Traitement en cours...</>
                ) : (
                  <>Payer {priceToPay.split(' ')[0]} FCFA</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
