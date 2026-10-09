'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, ScanLine } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { submitVente } from './actions'

type Medicament = {
  id: string
  nom: string
  code_barres: string | null
  prix_vente: number
  quantite_stock: number
  date_peremption: string
}

type LigneCart = {
  medicament_id: string
  nom: string
  prix_unitaire: number
  quantite: number
}

export default function PointDeVenteClient({ 
  initialMedicaments 
}: { 
  initialMedicaments: Medicament[] 
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<LigneCart[]>([])
  const [moyenPaiement, setMoyenPaiement] = useState<'especes' | 'carte' | 'mobile_money'>('especes')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Simulation de scan de code-barres :
  // Si on tape vite, on considère que c'est un scan et on ajoute directement.
  // Pour la simulation manuelle, on ajoute un bouton "Scanner".

  const filteredMedicaments = initialMedicaments.filter(m => 
    m.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.code_barres && m.code_barres.includes(searchTerm))
  )

  const addToCart = (med: Medicament) => {
    setCart(prev => {
      const existing = prev.find(item => item.medicament_id === med.id)
      if (existing) {
        // Optionnel : vérifier si on dépasse le stock
        if (existing.quantite + 1 > med.quantite_stock) return prev
        return prev.map(item => item.medicament_id === med.id ? { ...item, quantite: item.quantite + 1 } : item)
      }
      return [...prev, { medicament_id: med.id, nom: med.nom, prix_unitaire: med.prix_vente, quantite: 1 }]
    })
    setSearchTerm('')
    if (searchInputRef.current) searchInputRef.current.focus()
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.medicament_id === id) {
        const newQ = item.quantite + delta
        return newQ > 0 ? { ...item, quantite: newQ } : item
      }
      return item
    }))
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.medicament_id !== id))
  }

  const totalAmount = cart.reduce((sum, item) => sum + (item.prix_unitaire * item.quantite), 0)

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setIsSubmitting(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('cart', JSON.stringify(cart))
    formData.append('moyen_paiement', moyenPaiement)
    formData.append('montant_total', totalAmount.toString())

    const result = await submitVente(formData)

    setIsSubmitting(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Vente enregistrée avec succès !' })
      setCart([])
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Colonne de Gauche : Recherche & Scan */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="bg-surface border border-surface-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold font-heading text-foreground">Catalogue Médicaments</h2>
            {/* Simulation Scan Code Barres */}
            <button 
              onClick={() => {
                // Simule le scan du premier produit pour la démo
                if (initialMedicaments.length > 0) addToCart(initialMedicaments[0])
              }}
              className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium hover:bg-primary/20 transition-colors"
            >
              <ScanLine className="w-5 h-5" />
              Simuler Scan
            </button>
          </div>
          
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-foreground-muted" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-surface-border rounded-xl bg-background text-foreground focus:ring-primary focus:border-primary transition-shadow shadow-sm"
              placeholder="Rechercher par nom ou scanner le code-barres..."
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredMedicaments.slice(0, 12).map(med => (
              <div 
                key={med.id} 
                onClick={() => addToCart(med)}
                className="border border-surface-border rounded-xl p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all group bg-background"
              >
                <div className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">{med.nom}</div>
                <div className="text-sm text-foreground-muted mb-2">Stock: {med.quantite_stock}</div>
                <div className="text-primary font-bold">{med.prix_vente.toLocaleString('fr-FR')} FCFA</div>
              </div>
            ))}
            {filteredMedicaments.length === 0 && (
              <div className="col-span-full text-center py-8 text-foreground-muted">
                Aucun médicament trouvé
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Colonne de Droite : Panier / Ticket de caisse */}
      <div className="bg-surface border border-surface-border rounded-2xl shadow-sm flex flex-col h-[calc(100vh-8rem)] sticky top-6">
        <div className="p-6 border-b border-surface-border">
          <h2 className="text-xl font-bold font-heading text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Panier en cours
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center text-foreground-muted py-12">
              Le panier est vide. Scanner un article pour commencer.
            </div>
          ) : (
            cart.map(item => (
              <div key={item.medicament_id} className="flex items-center justify-between bg-background p-3 rounded-xl border border-surface-border">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-foreground truncate">{item.nom}</div>
                  <div className="text-sm text-foreground-muted">{item.prix_unitaire.toLocaleString('fr-FR')} FCFA / u</div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="flex items-center bg-surface border border-surface-border rounded-lg">
                    <button onClick={() => updateQuantity(item.medicament_id, -1)} className="p-1 hover:text-primary"><Minus className="w-4 h-4" /></button>
                    <span className="w-8 text-center font-medium">{item.quantite}</span>
                    <button onClick={() => updateQuantity(item.medicament_id, 1)} className="p-1 hover:text-primary"><Plus className="w-4 h-4" /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.medicament_id)} className="text-danger hover:text-danger/80 p-1">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-surface-border bg-background/50 rounded-b-2xl">
          <div className="flex justify-between items-center mb-6">
            <span className="text-foreground-muted font-medium">Total à payer</span>
            <span className="text-3xl font-bold text-primary">{totalAmount.toLocaleString('fr-FR')} FCFA</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            <button 
              onClick={() => setMoyenPaiement('especes')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${moyenPaiement === 'especes' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-surface-border hover:bg-surface-border'}`}
            >
              <Banknote className="w-5 h-5" />
              <span className="text-xs font-medium">Espèces</span>
            </button>
            <button 
              onClick={() => setMoyenPaiement('mobile_money')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${moyenPaiement === 'mobile_money' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-surface-border hover:bg-surface-border'}`}
            >
              <Smartphone className="w-5 h-5" />
              <span className="text-xs font-medium">Mobile</span>
            </button>
            <button 
              onClick={() => setMoyenPaiement('carte')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${moyenPaiement === 'carte' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-surface-border hover:bg-surface-border'}`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-xs font-medium">Carte</span>
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              {message.text}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isSubmitting ? 'Enregistrement...' : 'Valider l\'encaissement'}
          </button>
        </div>
      </div>
    </div>
  )
}
