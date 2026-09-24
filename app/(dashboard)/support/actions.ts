'use server'

import { createClient } from '@/utils/supabase/server'
import { getDictionary } from '@/dictionaries'
import { transfererAuSupport, SUJET_MAX, MESSAGE_MAX } from '@/lib/support/transferer'

export async function sendMessage(formData: FormData) {
  const dict = await getDictionary()
  const errors = dict.support.form.errors

  const sujet = String(formData.get('sujet') || '').trim()
  const message = String(formData.get('message') || '').trim()

  if (!sujet || !message) {
    return { error: errors.required }
  }
  if (sujet.length > SUJET_MAX || message.length > MESSAGE_MAX) {
    return { error: errors.too_long }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return { error: errors.not_authenticated }
  }

  const { data: profil } = await supabase
    .from('utilisateurs')
    .select('gie_id, gies(nom)')
    .eq('id', user.id)
    .single()

  if (!profil?.gie_id) {
    return { error: errors.failed }
  }

  const gie = profil.gies as unknown as { nom: string } | null
  const emailEnvoye = await transfererAuSupport({
    produit: 'SIGGIE',
    email: user.email,
    organisation: gie?.nom || '—',
    sujet,
    message,
  })

  const { error: insertError } = await supabase.from('support_messages').insert({
    gie_id: profil.gie_id,
    user_id: user.id,
    email: user.email,
    sujet,
    message,
    email_envoye: emailEnvoye,
  })

  if (insertError) {
    console.error('Enregistrement message support échoué', insertError)
  }

  // Échec seulement si la demande n'a été ni transmise ni enregistrée.
  if (!emailEnvoye && insertError) {
    return { error: errors.failed }
  }

  return { success: true }
}
