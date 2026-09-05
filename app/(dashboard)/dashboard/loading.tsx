import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface p-6 shadow-sm border border-surface-border">
            <div className="flex items-center justify-between">
              <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
            <div className="mt-4">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="mt-2">
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Aperçu Financier */}
        <div className="rounded-xl bg-surface border border-surface-border shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-6 border-b border-surface-border flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center space-y-6">
            <div className="rounded-lg border border-surface-border p-5 text-center">
              <Skeleton className="h-4 w-32 mx-auto mb-4" />
              <Skeleton className="h-10 w-48 mx-auto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          </div>
        </div>
        
        {/* Membres Récents */}
        <div className="rounded-xl bg-surface border border-surface-border shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-6 border-b border-surface-border">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
