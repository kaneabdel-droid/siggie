'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function resetPasswordForEmail(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  // Remplacez process.env.NEXT_PUBLIC_SITE_URL par l'URL de votre site en production
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/update-password`,
  })

  if (error) {
    return redirect('/forgot-password?message=' + encodeURIComponent(error.message))
  }

  return redirect('/login?message=' + encodeURIComponent("Vérifiez votre boîte mail pour le lien de réinitialisation."))
}
