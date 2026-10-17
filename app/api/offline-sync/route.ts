import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { revalidatePath } from 'next/cache'

export async function GET() {
  return NextResponse.json({ status: 'online', service: 'siggie-sync', timestamp: Date.now() })
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext()
    if (!tenant || !tenant.gieId) {
      return NextResponse.json({ success: false, error: 'Session GIE non authentifiée' }, { status: 401 })
    }

    const body = await req.json()
    const { actionType, payload } = body
    const supabase = await createClient()

    if (actionType === 'remboursement' || actionType === 'creer_remboursement') {
      const { membre_id, campagne_id, montant, date_remboursement, mode_paiement, reference } = payload

      const { data, error } = await supabase
        .from('remboursements')
        .insert({
          gie_id: tenant.gieId,
          membre_id,
          campagne_id: campagne_id || null,
          montant: Number(montant) || 0,
          date_remboursement: date_remboursement || new Date().toISOString().split('T')[0],
          mode_paiement: mode_paiement || 'especes',
          reference: reference ? `${reference} [Sync Hors-Ligne]` : '[Sync Hors-Ligne]',
        })
        .select()
        .single()

      if (error) throw error

      revalidatePath('/remboursements')
      revalidatePath('/dashboard')
      return NextResponse.json({ success: true, id: data.id })
    }

    if (actionType === 'transaction_tresorerie' || actionType === 'tresorerie') {
      const { compte_id, type_transaction, montant, motif, date_transaction } = payload

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          gie_id: tenant.gieId,
          compte_id: compte_id || null,
          type_transaction: type_transaction || 'entree',
          montant: Number(montant) || 0,
          motif: motif ? `${motif} [Sync Hors-Ligne]` : 'Transaction [Sync Hors-Ligne]',
          date_transaction: date_transaction || new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (error) throw error

      revalidatePath('/tresorerie')
      revalidatePath('/dashboard')
      return NextResponse.json({ success: true, id: data.id })
    }

    if (actionType === 'distribution' || actionType === 'distribution_intrant') {
      const { membre_id, intrant_id, quantite, campagne_id } = payload

      const { data, error } = await supabase
        .from('distributions')
        .insert({
          gie_id: tenant.gieId,
          membre_id,
          intrant_id,
          campagne_id: campagne_id || null,
          quantite: Number(quantite) || 0,
          date_distribution: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (error) throw error

      revalidatePath('/distribution')
      revalidatePath('/intrants')
      revalidatePath('/dashboard')
      return NextResponse.json({ success: true, id: data.id })
    }

    return NextResponse.json({ success: false, error: `Action inconnue: ${actionType}` }, { status: 400 })
  } catch (error: any) {
    console.error('Erreur API offline-sync siggie:', error)
    return NextResponse.json({ success: false, error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
