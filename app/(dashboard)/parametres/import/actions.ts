'use server'

import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { revalidatePath } from 'next/cache'

export async function importerDonneesSiggie(
  typeId: 'membres' | 'intrants' | 'materiels' | 'clients',
  records: any[]
): Promise<{ succes: number; erreurs: number; details: string[] }> {
  try {
    const tenant = await getTenantContext()
    if (!tenant) {
      return { succes: 0, erreurs: records.length, details: ['Session expirée ou utilisateur non autorisé.'] }
    }

    const supabase = await createClient()
    const gieId = tenant.gieId

    let succes = 0
    let erreurs = 0
    const details: string[] = []

    if (!records || !Array.isArray(records) || records.length === 0) {
      return { succes: 0, erreurs: 0, details: ['Aucun enregistrement valide à importer.'] }
    }

    if (typeId === 'membres') {
      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        const nom = (r.nom || '').toString().trim()
        const prenom = (r.prenom || '').toString().trim()

        if (!nom || !prenom) {
          erreurs++
          details.push(`Ligne ${i + 1} : Le prénom et le nom sont obligatoires.`)
          continue
        }

        let codeMembre = (r.code_membre || r.code || '').toString().trim()
        if (!codeMembre) {
          codeMembre = `MB-${(i + 1).toString().padStart(4, '0')}`
        }

        const village = (r.village || '').toString().trim() || null
        const telephone = (r.telephone || r.tel || '').toString().trim() || null
        const statut = (r.statut || 'actif').toString().trim()

        const { error } = await supabase.from('membres').upsert(
          {
            gie_id: gieId,
            code_membre: codeMembre,
            nom,
            prenom,
            village,
            telephone,
            statut
          },
          { onConflict: 'gie_id,code_membre' }
        )

        if (error) {
          erreurs++
          details.push(`Ligne ${i + 1} (${prenom} ${nom}) : ${error.message}`)
        } else {
          succes++
        }
      }

      revalidatePath('/membres')
      revalidatePath('/dashboard')
    } else if (typeId === 'intrants') {
      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        const nom = (r.nom || '').toString().trim()

        if (!nom) {
          erreurs++
          details.push(`Ligne ${i + 1} : Le nom de l'intrant est obligatoire.`)
          continue
        }

        const typeIntrant = (r.type_intrant || r.type || 'Autre').toString().trim()
        const qte = parseFloat(r.quantite_stock || r.stock || '0')
        const prix = parseFloat(r.prix_unitaire || r.prix || '0')
        const description = (r.description || '').toString().trim() || null

        const { error } = await supabase.from('intrants').insert({
          gie_id: gieId,
          nom,
          type_intrant: typeIntrant,
          quantite_stock: isNaN(qte) ? 0 : qte,
          prix_unitaire: isNaN(prix) ? 0 : prix,
          description
        })

        if (error) {
          erreurs++
          details.push(`Ligne ${i + 1} (${nom}) : ${error.message}`)
        } else {
          succes++
        }
      }

      revalidatePath('/intrants')
    } else if (typeId === 'materiels') {
      const etatsValides = ['bon', 'en_panne', 'reparation']

      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        const nom = (r.nom || '').toString().trim()

        if (!nom) {
          erreurs++
          details.push(`Ligne ${i + 1} : Le nom du matériel est obligatoire.`)
          continue
        }

        let etat = (r.etat || 'bon').toString().toLowerCase().trim()
        if (!etatsValides.includes(etat)) etat = 'bon'

        const dateAcquisition = (r.date_acquisition || new Date().toISOString().split('T')[0]).toString().trim()

        const { error } = await supabase.from('materiels').insert({
          gie_id: gieId,
          nom,
          etat,
          date_acquisition: dateAcquisition
        })

        if (error) {
          erreurs++
          details.push(`Ligne ${i + 1} (${nom}) : ${error.message}`)
        } else {
          succes++
        }
      }

      revalidatePath('/materiel')
    } else if (typeId === 'clients') {
      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        const nom = (r.nom || '').toString().trim()

        if (!nom) {
          erreurs++
          details.push(`Ligne ${i + 1} : Le nom du client est obligatoire.`)
          continue
        }

        const telephone = (r.telephone || '').toString().trim() || null

        const { error } = await supabase.from('clients_externes').insert({
          gie_id: gieId,
          nom,
          telephone
        })

        if (error) {
          erreurs++
          details.push(`Ligne ${i + 1} (${nom}) : ${error.message}`)
        } else {
          succes++
        }
      }

      revalidatePath('/remboursements')
    }

    return { succes, erreurs, details }
  } catch (err: any) {
    return {
      succes: 0,
      erreurs: records.length,
      details: [`Erreur inattendue : ${err?.message || 'Erreur inconnue'}`]
    }
  }
}
