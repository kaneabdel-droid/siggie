'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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

  const data = {
    gie_id: userData.gie_id,
    type_intrant: formData.get('type_intrant'),
    nom: formData.get('nom'),
    fournisseur: formData.get('fournisseur') || null,
    quantite_stock: parseFloat(formData.get('quantite_stock') as string) || 0,
    prix_unitaire: parseFloat(formData.get('prix_unitaire') as string) || 0,
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

  const data = {
    type_intrant: formData.get('type_intrant'),
    nom: formData.get('nom'),
    fournisseur: formData.get('fournisseur') || null,
    quantite_stock: parseFloat(formData.get('quantite_stock') as string) || 0,
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

  const id = formData.get('intrant_id') as string
  const quantite_achetee = parseFloat(formData.get('quantite') as string) || 0

  if (!id || quantite_achetee <= 0) {
    return { error: "Données invalides" }
  }

  // Fetch existing quantity
  const { data: intrant } = await supabase
    .from('intrants')
    .select('quantite_stock')
    .eq('id', id)
    .single()

  if (!intrant) {
    return { error: "Intrant introuvable" }
  }

  const { error } = await supabase
    .from('intrants')
    .update({ quantite_stock: intrant.quantite_stock + quantite_achetee })
    .eq('id', id)

  if (error) {
    console.error("Erreur achat intrant:", error)
    return { error: error.message }
  }

  revalidatePath('/intrants')
  return { success: true }
}
