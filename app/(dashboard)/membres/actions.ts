'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addMembre(formData: FormData) {
  const supabase = await createClient()

  // Récupérer le gie_id de l'utilisateur connecté
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
    nom: formData.get('nom'),
    prenom: formData.get('prenom'),
    village: formData.get('village'),
    telephone: formData.get('telephone'),
    superficie: parseFloat(formData.get('superficie') as string) || 0,
    statut: formData.get('statut') || 'actif'
  }

  const { error } = await supabase.from('membres').insert([data])

  if (error) {
    console.error("Erreur ajout membre:", error)
    return { error: error.message }
  }

  revalidatePath('/membres')
  return { success: true }
}

export async function updateMembre(id: string, formData: FormData) {
  const supabase = await createClient()

  const data = {
    nom: formData.get('nom'),
    prenom: formData.get('prenom'),
    village: formData.get('village'),
    telephone: formData.get('telephone'),
    superficie: parseFloat(formData.get('superficie') as string) || 0,
    statut: formData.get('statut')
  }

  const { error } = await supabase
    .from('membres')
    .update(data)
    .eq('id', id)

  if (error) {
    console.error("Erreur modification membre:", error)
    return { error: error.message }
  }

  revalidatePath('/membres')
  return { success: true }
}

export async function deleteMembre(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('membres')
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Erreur suppression membre:", error)
    return { error: error.message }
  }

  revalidatePath('/membres')
  return { success: true }
}
