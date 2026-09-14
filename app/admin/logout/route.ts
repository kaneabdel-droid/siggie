import { NextResponse } from 'next/server'
import { createAdminIdentityClient } from '@/utils/supabase/admin-identity'

// Déconnexion de l'identité admin partagée (SSO inter-produits) — distincte de
// /logout qui déconnecte la session client (GIE). Efface le cookie à domaine
// .dembasolution.com, donc déconnecte aussi des autres produits DembaSolution.
export async function GET(request: Request) {
  const supabase = await createAdminIdentityClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/admin/login', request.url))
}
