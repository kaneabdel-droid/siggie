'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getImputations() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('imputations')
    .select('*')
    .order('libelle')

  if (error) return { error: error.message }
  return { imputations: data }
}

export async function addImputation(libelle: string, compte: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }
  if (userData.role !== 'admin') return { error: "Réservé à l'administrateur du GIE" }
  if (!libelle.trim() || !compte.trim()) return { error: "Libellé et compte requis" }

  const { error } = await supabase.from('imputations').insert({
    gie_id: userData.gie_id,
    libelle: libelle.trim(),
    compte: compte.trim(),
  })

  if (error) return { error: error.message }

  revalidatePath('/tresorerie/imputations')
  return { success: true }
}

export async function updateImputation(id: string, libelle: string, compte: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }
  if (userData.role !== 'admin') return { error: "Réservé à l'administrateur du GIE" }
  if (!libelle.trim() || !compte.trim()) return { error: "Libellé et compte requis" }

  const { error } = await supabase
    .from('imputations')
    .update({ libelle: libelle.trim(), compte: compte.trim() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/tresorerie/imputations')
  return { success: true }
}

export async function deleteImputation(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }
  if (userData.role !== 'admin') return { error: "Réservé à l'administrateur du GIE" }

  const { error } = await supabase.from('imputations').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/tresorerie/imputations')
  return { success: true }
}
