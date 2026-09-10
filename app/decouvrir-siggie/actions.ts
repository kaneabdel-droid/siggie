'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// Compte de démonstration public (GIE WaloAgro), toujours déverrouillé. Chaque
// clic génère une connexion à usage unique côté serveur via l'API admin —
// aucun mot de passe n'est jamais stocké en clair ni transmis au visiteur,
// et chaque visiteur obtient sa propre session sans affecter les autres.
const DEMO_EMAIL = 'kaneabdou@yahoo.fr'

export async function loginDemo() {
  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: DEMO_EMAIL,
  })

  if (error || !data?.properties?.hashed_token) {
    console.error('Erreur génération lien démo:', error)
    redirect('/decouvrir-siggie?demo_error=1')
  }

  const supabase = await createClient()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: 'magiclink',
  })

  if (verifyError) {
    console.error('Erreur connexion démo:', verifyError)
    redirect('/decouvrir-siggie?demo_error=1')
  }

  redirect('/dashboard')
}
