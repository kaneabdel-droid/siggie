'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { isStockableType } from '@/lib/intrants/types'

export async function addIntrant(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()
    
  if (!userData) throw new Error("Utilisateur introuvable")

  // Le fournisseur et le prix sont désormais renseignés lors du premier achat
  // (voir buyIntrant) plutôt qu'à la création de la fiche produit.
  const typeIntrant = formData.get('type_intrant') as string
  const data = {
    gie_id: userData.gie_id,
    type_intrant: typeIntrant,
    nom: formData.get('nom'),
    fournisseur: null,
    quantite_stock: isStockableType(typeIntrant) ? (parseFloat(formData.get('quantite_stock') as string) || 0) : 0,
    prix_unitaire: 0,
    description: formData.get('description') || null,
  }

  const { error } = await supabase.from('intrants').insert([data])

  if (error) {
    console.error("Erreur ajout intrant:", error)
    return { error: error.message }
  }

  revalidatePath('/intrants')
  return { success: true }
}

export async function updateIntrant(id: string, formData: FormData) {
  const supabase = await createClient()

  const typeIntrant = formData.get('type_intrant') as string
  const data = {
    type_intrant: typeIntrant,
    nom: formData.get('nom'),
    fournisseur: formData.get('fournisseur') || null,
    quantite_stock: isStockableType(typeIntrant) ? (parseFloat(formData.get('quantite_stock') as string) || 0) : 0,
    prix_unitaire: parseFloat(formData.get('prix_unitaire') as string) || 0,
    description: formData.get('description') || null,
  }

  const { error } = await supabase
    .from('intrants')
    .update(data)
    .eq('id', id)

  if (error) {
    console.error("Erreur modification intrant:", error)
    return { error: error.message }
  }

  revalidatePath('/intrants')
  return { success: true }
}

export async function deleteIntrant(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('intrants')
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Erreur suppression intrant:", error)
    return { error: error.message }
  }

  revalidatePath('/intrants')
  return { success: true }
}

export async function buyIntrant(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) throw new Error("Utilisateur introuvable")

  const id = formData.get('intrant_id') as string
  const quantite_achetee = parseFloat(formData.get('quantite') as string) || 0
  const prix_unitaire = parseFloat(formData.get('prix_unitaire') as string) || 0
  const fournisseur = (formData.get('fournisseur') as string)?.trim() || null
  const date_achat = (formData.get('date_achat') as string) || new Date().toISOString().slice(0, 10)
  const numero_facture = (formData.get('numero_facture') as string)?.trim() || null

  if (!id || quantite_achetee <= 0 || prix_unitaire <= 0) {
    return { error: "Données invalides" }
  }

  // Fetch existing quantity
  const { data: intrant } = await supabase
    .from('intrants')
    .select('quantite_stock, type_intrant')
    .eq('id', id)
    .single()

  if (!intrant) {
    return { error: "Intrant introuvable" }
  }
  if (!isStockableType(intrant.type_intrant)) {
    return { error: "Cet intrant n'est pas suivi en stock" }
  }

  // Historique de l'achat : conserve fournisseur, prix, date et n° facture
  // même si le prix ou le fournisseur changent à l'achat suivant.
  const { error: achatError } = await supabase.from('achats_intrants').insert({
    gie_id: userData.gie_id,
    intrant_id: id,
    quantite: quantite_achetee,
    prix_unitaire,
    fournisseur,
    date_achat,
    numero_facture,
  })

  if (achatError) {
    console.error("Erreur enregistrement achat:", achatError)
    return { error: achatError.message }
  }

  // Le prix et le fournisseur de la fiche intrant reflètent le dernier achat
  // (utilisés pour la facturation des campagnes).
  const { error } = await supabase
    .from('intrants')
    .update({
      quantite_stock: intrant.quantite_stock + quantite_achetee,
      prix_unitaire,
      fournisseur,
    })
    .eq('id', id)

  if (error) {
    console.error("Erreur achat intrant:", error)
    return { error: error.message }
  }

  revalidatePath('/intrants')
  return { success: true }
}
