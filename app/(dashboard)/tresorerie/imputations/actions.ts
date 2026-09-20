'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

export async function getImputations() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('imputations')
    .select('*')
    .order('libelle')

  if (error) return { error: error.message }
  return { imputations: data }
}

function normalizeCategorie(categorie?: string) {
  return categorie === 'materiel' ? 'materiel' : 'exploitation'
}

function normalizeNature(nature?: string) {
  return nature === 'recette' ? 'recette' : 'depense'
}

export async function addImputation(libelle: string, compte: string, categorie?: string, nature?: string) {
  const denied = await requirePermission('imputations', 'create')
  if (denied) return denied as never
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
    categorie: normalizeCategorie(categorie),
    nature: normalizeNature(nature),
  })

  if (error) return { error: error.message }

  revalidatePath('/tresorerie/imputations')
  return { success: true }
}

export async function updateImputation(id: string, libelle: string, compte: string, categorie?: string, nature?: string) {
  const denied = await requirePermission('imputations', 'update')
  if (denied) return denied as never
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
    .update({ libelle: libelle.trim(), compte: compte.trim(), categorie: normalizeCategorie(categorie), nature: normalizeNature(nature) })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/tresorerie/imputations')
  return { success: true }
}

export async function deleteImputation(id: string) {
  const denied = await requirePermission('imputations', 'delete')
  if (denied) return denied as never
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
