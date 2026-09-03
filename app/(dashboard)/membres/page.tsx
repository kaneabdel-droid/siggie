import { createClient } from '@/utils/supabase/server'
import { Search } from 'lucide-react'
import SearchMembres from './SearchMembres'
import CreateMembreButton from './CreateMembreButton'
import MembreRowActions from './MembreRowActions'

export default async function MembresPage({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const query = params?.query || ''

  // Fetch members for the current GIE
  let queryBuilder = supabase
    .from('membres')
    .select('*')
    .order('nom', { ascending: true })

  if (query) {
    queryBuilder = queryBuilder.or(`nom.ilike.%${query}%,prenom.ilike.%${query}%,village.ilike.%${query}%`)
  }

  const { data: membres, error } = await queryBuilder

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold font-heading text-foreground">Membres</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Liste de tous les membres du GIE, incluant leur nom, village, et numéro de téléphone.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <CreateMembreButton />
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mt-8 flex items-center space-x-4">
        <SearchMembres />
      </div>

      {/* Table des membres */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">
                      Nom complet
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      Village
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      Téléphone
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      Statut
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {membres && membres.length > 0 ? (
                    membres.map((membre) => (
                      <tr key={membre.id} className="hover:bg-background/50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">
                          {membre.nom} {membre.prenom}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                          {membre.village || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                          {membre.telephone || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            membre.statut === 'actif' ? 'bg-primary/10 text-primary ring-primary/20' : 'bg-foreground-muted/10 text-foreground-muted ring-foreground-muted/20'
                          }`}>
                            {membre.statut === 'actif' ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <MembreRowActions membre={membre} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        Aucun membre trouvé. Cliquez sur "Nouveau Membre" pour commencer.
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
