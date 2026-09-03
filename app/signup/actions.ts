'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        gie_nom: formData.get('gie_nom') as string,
      },
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return redirect('/signup?message=' + encodeURIComponent(error.message))
  }

  // Si l'inscription réussit, on redirige vers le login avec un message de succès
  return redirect('/login?message=' + encodeURIComponent("Compte créé avec succès. Vérifiez votre boîte mail si nécessaire."))
}
