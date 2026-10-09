'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTenantContext } from '@/utils/supabase/tenant'

export async function createCommande(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  if (!tenant) return { error: 'GIE non trouvé.' }

  const fournisseur_id = formData.get('fournisseur_id') as string
  const medicament_id = formData.get('medicament_id') as string
  const quantite_commandee = parseFloat(formData.get('quantite') as string)

  if (!fournisseur_id || !medicament_id || !quantite_commandee) {
    return { error: 'Veuillez remplir tous les champs obligatoires.' }
  }

  try {
    // 1. Créer la commande (pour la démo, on fait une commande par article, 
    // ou on pourrait l'ajouter à une commande "brouillon" existante)
    const { data: commande, error: cmdError } = await supabase
      .from('commandes_labo')
      .insert({
        gie_id: tenant.gieId,
        fournisseur_id,
        statut: 'envoyee' // On l'envoie directement pour la simplicité
      })
      .select('id')
      .single()

    if (cmdError) throw cmdError

    // 2. Ajouter la ligne de commande
    const { error: ligneError } = await supabase
      .from('lignes_commande_labo')
      .insert({
        commande_id: commande.id,
        medicament_id,
        quantite_commandee,
      })

    if (ligneError) throw ligneError

    revalidatePath('/pharmacie/commandes')
    return { success: true }
  } catch (err: any) {
    console.error('Erreur création commande:', err)
    return { error: err.message || 'Erreur lors de la création de la commande' }
  }
}

export async function accuserReception(commandeId: string) {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  if (!tenant) return { error: 'GIE non trouvé.' }

  try {
    // Marquer la commande comme complète
    const { error } = await supabase
      .from('commandes_labo')
      .update({ statut: 'complete', date_reception: new Date().toISOString() })
      .eq('id', commandeId)
      .eq('gie_id', tenant.gieId)

    if (error) throw error

    // Dans un système complet, ici on mettrait automatiquement à jour les stocks
    // (stocks_pharmacie) avec les quantités reçues dans lignes_commande_labo.

    revalidatePath('/pharmacie/commandes')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erreur lors de l\'accusé de réception' }
  }
}
