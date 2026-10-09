'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTenantContext } from '@/utils/supabase/tenant'

export async function addStock(formData: FormData) {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  if (!tenant) return { error: 'GIE non trouvé.' }

  const nom = formData.get('nom') as string
  const code_barres = formData.get('code_barres') as string
  const quantite = parseFloat(formData.get('quantite') as string)
  const prix_vente = parseFloat(formData.get('prix_vente') as string)
  const date_peremption = formData.get('date_peremption') as string
  const lot = formData.get('lot') as string

  if (!nom || !quantite || !prix_vente || !date_peremption) {
    return { error: 'Veuillez remplir les champs obligatoires.' }
  }

  try {
    // 1. Chercher si le médicament existe déjà dans le catalogue global
    let medicament_id = null

    // Cherche d'abord par code barre si fourni
    if (code_barres) {
      const { data: existingMed } = await supabase
        .from('medicaments')
        .select('id')
        .eq('code_barres', code_barres)
        .maybeSingle()
      
      if (existingMed) {
        medicament_id = existingMed.id
      }
    }

    // Sinon cherche par nom
    if (!medicament_id) {
      const { data: existingMedName } = await supabase
        .from('medicaments')
        .select('id')
        .ilike('nom', nom)
        .maybeSingle()
        
      if (existingMedName) {
        medicament_id = existingMedName.id
      }
    }

    // 2. S'il n'existe pas, on le crée dans le catalogue global
    if (!medicament_id) {
      const { data: newMed, error: newMedError } = await supabase
        .from('medicaments')
        .insert({ nom, code_barres: code_barres || null })
        .select('id')
        .single()

      if (newMedError) throw newMedError
      medicament_id = newMed.id
    }

    // 3. Ajouter l'entrée en stock pour cette pharmacie
    const { error: stockError } = await supabase
      .from('stocks_pharmacie')
      .insert({
        gie_id: tenant.gieId,
        medicament_id,
        quantite,
        prix_vente,
        date_peremption,
        lot: lot || null
      })

    if (stockError) throw stockError

    revalidatePath('/pharmacie/stocks')
    return { success: true }
  } catch (err: any) {
    console.error('Erreur ajout stock:', err)
    return { error: err.message || 'Erreur lors de l\'ajout du stock' }
  }
}
