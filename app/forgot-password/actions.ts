'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function resetPasswordForEmail(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  // Passe par /auth/callback pour échanger le code Supabase contre une session
  // avant d'atterrir sur /update-password — sans ça, la page reçoit un visiteur
  // déconnecté et ne peut pas mettre à jour le mot de passe.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/update-password`,
  })

  if (error) {
    return redirect('/forgot-password?message=' + encodeURIComponent(error.message))
  }

  return redirect('/login?message=' + encodeURIComponent("Vérifiez votre boîte mail pour le lien de réinitialisation."))
}
