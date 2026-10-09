import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { FileText, Send, CheckCircle2 } from 'lucide-react'
import CreateCommandeButton from './CreateCommandeButton'
import ReceiveCommandeButton from './ReceiveCommandeButton'

export const metadata = {
  title: 'Commandes Labo | D-PHARMA',
}

export default async function CommandesLaboPage() {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  // 1. Récupérer les commandes du GIE
  const { data: commandes } = await supabase
    .from('commandes_labo')
    .select(`
      id,
      statut,
      date_commande,
      date_reception,
      fournisseurs_labo!inner (nom),
      lignes_commande_labo (
        quantite_commandee,
        medicaments (nom)
      )
    `)
    //.eq('gie_id', tenant?.gieId) // RLS
    .order('date_commande', { ascending: false })

  // 2. Récupérer la liste des fournisseurs et des médicaments pour le formulaire
  const { data: fournisseurs } = await supabase.from('fournisseurs_labo').select('id, nom')
  const { data: medicaments } = await supabase.from('medicaments').select('id, nom').order('nom')

  // Statistiques
  const cmds = commandes || []
  const envoyeesCount = cmds.filter(c => c.statut === 'envoyee').length
  const recuesCount = cmds.filter(c => c.statut === 'complete').length

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto min-w-0">
          <h2 className="text-2xl font-bold font-heading text-foreground break-words">Commandes Laboratoires</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Passez commande auprès de vos fournisseurs et accusez réception après contrôle de la marchandise.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 flex flex-wrap gap-3 sm:flex-none">
          <CreateCommandeButton 
            fournisseurs={fournisseurs || []} 
            medicaments={medicaments || []} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center gap-3">
          <div className="rounded-md bg-info/20 p-2.5 shrink-0">
            <FileText className="h-5 w-5 text-info" />
          </div>
          <div className="min-w-0">
            <dt className="text-sm font-medium text-foreground-muted">Total Commandes</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{cmds.length}</dd>
          </div>
        </div>
        
        <div className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-warning/50 flex items-center gap-3">
          <div className="rounded-md bg-warning/20 p-2.5 shrink-0">
            <Send className="h-5 w-5 text-warning" />
          </div>
          <div className="min-w-0">
            <dt className="text-sm font-medium text-foreground-muted">En attente de livraison</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-warning">{envoyeesCount}</dd>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-success/50 flex items-center gap-3">
          <div className="rounded-md bg-success/20 p-2.5 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div className="min-w-0">
            <dt className="text-sm font-medium text-foreground-muted">Réceptionnées</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-success">{recuesCount}</dd>
          </div>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">Date</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Fournisseur / Labo</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Contenu (Détail)</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Statut</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {cmds.length > 0 ? (
                    cmds.map((cmd) => (
                      <tr key={cmd.id} className="hover:bg-background/50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">
                          {new Date(cmd.date_commande).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                          {cmd.fournisseurs_labo?.nom}
                        </td>
                        <td className="px-3 py-4 text-sm text-foreground-muted">
                          <ul className="list-disc pl-4 space-y-1">
                            {cmd.lignes_commande_labo?.map((ligne: any, idx: number) => (
                              <li key={idx}>
                                {ligne.quantite_commandee}x <span className="font-medium text-foreground">{ligne.medicaments?.nom}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {cmd.statut === 'complete' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                              Livré le {new Date(cmd.date_reception).toLocaleDateString('fr-FR')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                              En cours de livraison
                            </span>
                          )}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          {cmd.statut === 'envoyee' && (
                            <ReceiveCommandeButton commandeId={cmd.id} />
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        Aucune commande en cours.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
