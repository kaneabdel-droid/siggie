import { Skeleton } from '@/components/ui/Skeleton'

export default function MembresLoading() {
  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mt-8 flex items-center space-x-4">
        <Skeleton className="h-10 w-full max-w-sm rounded-md" />
      </div>

      {/* Table des membres */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left sm:pl-6"><Skeleton className="h-4 w-24" /></th>
                    <th scope="col" className="px-3 py-3.5 text-left"><Skeleton className="h-4 w-20" /></th>
                    <th scope="col" className="px-3 py-3.5 text-left"><Skeleton className="h-4 w-24" /></th>
                    <th scope="col" className="px-3 py-3.5 text-left"><Skeleton className="h-4 w-16" /></th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6"><Skeleton className="h-4 w-32" /></td>
                      <td className="whitespace-nowrap px-3 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="whitespace-nowrap px-3 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="whitespace-nowrap px-3 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right sm:pr-6">
                        <Skeleton className="h-8 w-8 ml-auto rounded-md" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
