import { CheckCircle2, XCircle } from 'lucide-react'
import { createAdminClient } from '@/utils/supabase/admin'
import { hasBictorysKeys, hasMonerooKeys, hasChariowKeys } from '@/lib/payments/config'
import ChariowProduitsEditor from './ChariowProduitsEditor'

export default async function AdminConfigPage() {
  const supabase = createAdminClient()

  const { data: produits } = await supabase.from('chariow_produits').select('montant, product_id').order('montant')
  const { data: tarifs } = await supabase.from('tarif_abonnement').select('niveau, prix_annuel').order('prix_annuel')

  const prestataires = [
    { nom: 'Bictorys (Wave, Orange Money)', ok: hasBictorysKeys },
    { nom: 'Moneroo (Carte bancaire)', ok: hasMonerooKeys },
    { nom: 'Chariow (Mobile Money)', ok: hasChariowKeys },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold font-heading mb-6">Configuration</h1>

      <div className="bg-background rounded-xl p-5 border border-surface-border mb-8">
        <h2 className="font-semibold mb-4">Prestataires de paiement</h2>
        <p className="text-sm text-foreground-muted mb-4">
          Les clés API vivent dans les variables d&apos;environnement du serveur (jamais affichées ici).
        </p>
        <ul className="space-y-2 text-sm">
          {prestataires.map((p) => (
            <li key={p.nom} className="flex items-center gap-2">
              {p.ok ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-danger" />}
              {p.nom} — {p.ok ? 'configuré' : 'non configuré'}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-background rounded-xl p-5 border border-surface-border">
        <h2 className="font-semibold mb-4">Produits Chariow</h2>
        <ChariowProduitsEditor produits={produits ?? []} tarifs={tarifs ?? []} />
      </div>
    </div>
  )
}
