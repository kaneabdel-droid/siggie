'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTenantContext } from '@/utils/supabase/tenant'

export async function submitVente(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  if (!tenant) {
    return { error: 'Erreur: Contexte GIE introuvable.' }
  }

  const cartStr = formData.get('cart') as string
  const moyen_paiement = formData.get('moyen_paiement') as string
  const montant_total_str = formData.get('montant_total') as string

  if (!cartStr || !montant_total_str) {
    return { error: 'Données invalides' }
  }

  const cart = JSON.parse(cartStr)
  const montant_total = parseFloat(montant_total_str)

  try {
    // 1. Créer la vente
    const { data: venteData, error: venteError } = await supabase
      .from('ventes_pharmacie')
      .insert({
        gie_id: tenant.gieId,
        montant_total,
        moyen_paiement
      })
      .select()
      .single()

    if (venteError) throw venteError

    // 2. Créer les lignes de vente et mettre à jour le stock
    const lignesToInsert = cart.map((item: any) => ({
      vente_id: venteData.id,
      medicament_id: item.medicament_id,
      quantite: item.quantite,
      prix_unitaire: item.prix_unitaire
    }))

    const { error: lignesError } = await supabase
      .from('lignes_vente_pharmacie')
      .insert(lignesToInsert)

    if (lignesError) throw lignesError

    // 3. Mettre à jour les stocks (diminuer la quantité)
    // Note : Dans un cas réel avec forte concurrence, on utiliserait une fonction RPC 
    // ou un trigger pour éviter les conditions de course (race conditions).
    // Ici, nous faisons une simple mise à jour itérative.
    for (const item of cart) {
      // Récupérer le stock actuel (on prend le premier lot expiré ou le stock global)
      const { data: stockData } = await supabase
        .from('stocks_pharmacie')
        .select('id, quantite')
        .eq('gie_id', tenant.gieId)
        .eq('medicament_id', item.medicament_id)
        .limit(1)
        .single()

      if (stockData) {
        await supabase
          .from('stocks_pharmacie')
          .update({ quantite: stockData.quantite - item.quantite })
          .eq('id', stockData.id)
      }
    }

    // 4. (Optionnel) Enregistrer dans la table tresorerie_transactions globale
    // Cela dépend de la politique d'intégration financière du SaaS.

    revalidatePath('/pharmacie/pos')
    return { success: true }
  } catch (error: any) {
    console.error("Erreur lors de l'enregistrement de la vente:", error)
    return { error: error.message || 'Une erreur est survenue' }
  }
}
