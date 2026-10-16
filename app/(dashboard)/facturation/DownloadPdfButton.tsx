'use client'

import { useState } from 'react'
import { Download, Printer, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useUnite } from '@/components/DeviseProvider'
import { generateFacturePdf } from './facturePdfUtils'

export default function DownloadPdfButton({ facture, dict, gieName }: { facture: any; dict: any; gieName: string }) {
  const unite = useUnite()
  const [loadingAction, setLoadingAction] = useState<'download' | 'print' | null>(null)

  const handleAction = async (action: 'download' | 'print') => {
    setLoadingAction(action)
    try {
      const supabase = createClient()
      const { doc, filename } = await generateFacturePdf({
        facture,
        gieName,
        unite,
        supabaseClient: supabase,
      })

      if (action === 'download') {
        doc.save(filename)
      } else if (action === 'print') {
        doc.autoPrint()
        window.open(doc.output('bloburl'), '_blank')
      }
    } catch (error) {
      console.error("Erreur génération PDF:", error)
      alert("Impossible de générer le PDF.")
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <>
      <button 
        type="button"
        onClick={() => handleAction('print')}
        disabled={loadingAction !== null}
        className="text-foreground-muted hover:text-foreground p-1.5 rounded-md hover:bg-background transition-colors disabled:opacity-50" 
        title={dict?.facturation_extra?.print_tooltip || "Imprimer la facture"}
      >
        {loadingAction === 'print' ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Printer className="h-4 w-4" />}
      </button>
      <button 
        type="button"
        onClick={() => handleAction('download')}
        disabled={loadingAction !== null}
        className="text-foreground-muted hover:text-primary p-1.5 rounded-md hover:bg-background transition-colors disabled:opacity-50" 
        title={dict?.facturation_extra?.download_tooltip || "Télécharger PDF"}
      >
        {loadingAction === 'download' ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Download className="h-4 w-4" />}
      </button>
    </>
  )
}
