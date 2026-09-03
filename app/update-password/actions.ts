'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    return redirect('/update-password?message=' + encodeURIComponent(error.message))
  }

  return redirect('/login?message=' + encodeURIComponent("Mot de passe mis à jour avec succès."))
}
