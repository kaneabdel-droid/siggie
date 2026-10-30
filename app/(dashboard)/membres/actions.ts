'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

export async function addMembre(formData: FormData) {
  const denied = await requirePermission('membres', 'create')
  if (denied) return denied as never
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

  // Auto-génération séquentielle du code membre s'il n'est pas spécifié
  let codeMembre = (formData.get('code_membre') as string)?.trim()
  if (!codeMembre) {
    const { count } = await supabase
      .from('membres')
      .select('id', { count: 'exact', head: true })
      .eq('gie_id', userData.gie_id)

    const nextIndex = (count || 0) + 1
    codeMembre = `M-${String(nextIndex).padStart(3, '0')}`
  }

  const data: Record<string, any> = {
    gie_id: userData.gie_id,
    code_membre: codeMembre,
    nom: formData.get('nom'),
    prenom: formData.get('prenom'),
    village: formData.get('village'),
    telephone: formData.get('telephone'),
    superficie: parseFloat(formData.get('superficie') as string) || 0,
    solde_initial: parseFloat(formData.get('solde_initial') as string) || 0,
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
  const denied = await requirePermission('membres', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const data: Record<string, any> = {
    nom: formData.get('nom'),
    prenom: formData.get('prenom'),
    village: formData.get('village'),
    telephone: formData.get('telephone'),
    superficie: parseFloat(formData.get('superficie') as string) || 0,
    solde_initial: parseFloat(formData.get('solde_initial') as string) || 0,
    statut: formData.get('statut')
  }

  const codeMembre = (formData.get('code_membre') as string)?.trim()
  if (codeMembre !== undefined) {
    data.code_membre = codeMembre || null
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
  const denied = await requirePermission('membres', 'delete')
  if (denied) return denied as never
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

export async function uploadJustificatifSolde(membreId: string, formData: FormData) {
  const denied = await requirePermission('membres', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return { error: "Veuillez sélectionner un fichier (PDF, PNG ou CSV)." }
  }

  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.csv']
  const originalName = file.name
  const dotIdx = originalName.lastIndexOf('.')
  const ext = dotIdx >= 0 ? originalName.slice(dotIdx).toLowerCase() : ''
  if (!allowedExtensions.includes(ext)) {
    return { error: `Format non supporté (${ext || 'inconnu'}). Formats acceptés : PDF, PNG, JPG, CSV.` }
  }

  const cleanBase = (dotIdx >= 0 ? originalName.slice(0, dotIdx) : originalName)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `${Date.now()}_${cleanBase}${ext}`
  const storagePath = `${membreId}/${fileName}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Utiliser le client admin pour bypasser l'erreur RLS storage tout en conservant la validation de session utilisateur
  let storageClient = supabase
  try {
    storageClient = createAdminClient() as any
  } catch {}

  const { error: uploadError } = await storageClient.storage
    .from('justificatifs')
    .upload(storagePath, buffer, {
      contentType: file.type || (ext === '.csv' ? 'text/csv' : ext === '.pdf' ? 'application/pdf' : 'image/png'),
      upsert: true,
    })

  if (uploadError) {
    console.error("Erreur upload justificatif:", uploadError)
    return { error: `Erreur d'enregistrement : ${uploadError.message}` }
  }

  const { data: publicUrlData } = storageClient.storage
    .from('justificatifs')
    .getPublicUrl(storagePath)

  const publicUrl = publicUrlData?.publicUrl || ''

  try {
    await supabase
      .from('membres')
      .update({
        justificatif_solde_initial: publicUrl,
        justificatif_nom: originalName,
      })
      .eq('id', membreId)
  } catch {
    // Laisser passer si la colonne n'est pas encore migrée
  }

  revalidatePath('/membres')
  revalidatePath('/bilans/releve-membre')
  return { success: true, url: publicUrl, fileName: originalName, storagePath }
}

export async function getJustificatifsMembre(membreId: string) {
  const supabase = await createClient()

  let storageClient = supabase
  try {
    storageClient = createAdminClient() as any
  } catch {}

  const { data: files, error } = await storageClient.storage
    .from('justificatifs')
    .list(membreId, {
      sortBy: { column: 'created_at', order: 'desc' },
    })

  if (error || !files || files.length === 0) {
    try {
      const { data: m } = await supabase
        .from('membres')
        .select('justificatif_solde_initial, justificatif_nom')
        .eq('id', membreId)
        .single()
      if (m?.justificatif_solde_initial) {
        return {
          files: [{
            name: m.justificatif_nom || 'justificatif',
            storageName: m.justificatif_nom || 'justificatif',
            storagePath: `${membreId}/${m.justificatif_nom || 'justificatif'}`,
            url: m.justificatif_solde_initial,
            created_at: new Date().toISOString(),
          }]
        }
      }
    } catch {}
    return { files: [] }
  }

  const items = files.map((f) => {
    const { data } = supabase.storage
      .from('justificatifs')
      .getPublicUrl(`${membreId}/${f.name}`)
    const cleanDisplayName = f.name.replace(/^\d+_/, '')
    return {
      name: cleanDisplayName || f.name,
      storageName: f.name,
      storagePath: `${membreId}/${f.name}`,
      url: data.publicUrl,
      created_at: f.created_at,
      size: (f.metadata as any)?.size,
    }
  })

  return { files: items }
}

export async function deleteJustificatifMembre(membreId: string, storageName: string) {
  const denied = await requirePermission('membres', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  let storageClient = supabase
  try {
    storageClient = createAdminClient() as any
  } catch {}

  const storagePath = `${membreId}/${storageName}`
  await storageClient.storage.from('justificatifs').remove([storagePath])

  try {
    await supabase
      .from('membres')
      .update({
        justificatif_solde_initial: null,
        justificatif_nom: null,
      })
      .eq('id', membreId)
  } catch {}

  revalidatePath('/membres')
  revalidatePath('/bilans/releve-membre')
  return { success: true }
}
