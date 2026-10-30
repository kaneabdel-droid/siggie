'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Download,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
} from 'lucide-react'
import { uploadJustificatifSolde, getJustificatifsMembre, deleteJustificatifMembre } from '@/app/(dashboard)/membres/actions'

type FileItem = {
  name: string
  storageName?: string
  storagePath?: string
  url: string
  created_at?: string | null
  size?: number
}

export default function JustificatifSoldeModal({
  membreId,
  membreNom,
  soldeInitial = 0,
  triggerButton,
  initialFilesCount = 0,
  onUpdated,
}: {
  membreId: string
  membreNom: string
  soldeInitial?: number | null
  triggerButton?: React.ReactNode
  initialFilesCount?: number
  onUpdated?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<FileItem[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFiles = useCallback(async () => {
    if (!membreId) return
    setLoading(true)
    setError('')
    try {
      const res = await getJustificatifsMembre(membreId)
      setFiles(res?.files || [])
    } catch (err: any) {
      setError(err?.message || "Erreur de chargement des justificatifs")
    } finally {
      setLoading(false)
    }
  }, [membreId])

  useEffect(() => {
    if (isOpen) {
      loadFiles()
    }
  }, [isOpen, loadFiles])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    setUploading(true)
    setError('')
    setSuccess('')

    const fd = new FormData()
    fd.append('file', selected)

    try {
      const res = await uploadJustificatifSolde(membreId, fd)
      if (res?.error) {
        setError(res.error)
      } else {
        setSuccess(`Document "${selected.name}" enregistré avec succès.`)
        await loadFiles()
        if (onUpdated) onUpdated()
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'envoi du fichier.")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(storageName?: string) {
    if (!storageName) return
    if (!confirm("Voulez-vous supprimer ce document justificatif ?")) return

    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res: any = await deleteJustificatifMembre(membreId, storageName)
      if (res?.error) {
        setError(String(res.error))
      } else {
        setSuccess("Document supprimé.")
        await loadFiles()
        if (onUpdated) onUpdated()
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la suppression.")
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.endsWith('.csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
    }
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      return <ImageIcon className="w-5 h-5 text-sky-500" />
    }
    return <FileText className="w-5 h-5 text-rose-500" />
  }

  const hasDoc = files.length > 0 || initialFilesCount > 0

  return (
    <>
      {triggerButton ? (
        <span onClick={() => setIsOpen(true)} className="inline-block cursor-pointer">
          {triggerButton}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
            hasDoc
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-surface hover:bg-background text-foreground border-surface-border'
          }`}
          title="Importer ou consulter le justificatif du solde initial (PDF, PNG, CSV)"
        >
          {hasDoc ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Paperclip className="w-3.5 h-3.5 text-foreground-muted" />
          )}
          <span>{hasDoc ? 'Justificatif joint' : 'Joindre justificatif'}</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/75 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative transform overflow-hidden rounded-2xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-surface-border p-5 bg-background/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Document Justificatif du Solde Initial
                    </h3>
                    <p className="text-xs text-foreground-muted">
                      Membre : <span className="font-semibold text-foreground">{membreNom}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-border/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Rappel Solde Initial */}
                <div className="p-3.5 rounded-xl border border-surface-border bg-background/60 flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground-muted">
                    Solde initial (Report à nouveau) :
                  </span>
                  <span className={`text-sm font-bold font-mono ${
                    Number(soldeInitial || 0) > 0
                      ? 'text-danger'
                      : Number(soldeInitial || 0) < 0
                      ? 'text-success'
                      : 'text-foreground-muted'
                  }`}>
                    {Number(soldeInitial || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                  </span>
                </div>

                {/* Notifications */}
                {error && (
                  <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                {/* Documents existants */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-2">
                    Document(s) rattaché(s)
                  </h4>

                  {loading ? (
                    <div className="text-xs text-foreground-muted py-4 text-center animate-pulse">
                      Chargement des justificatifs...
                    </div>
                  ) : files.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-surface-border text-center text-xs text-foreground-muted bg-background/20">
                      Aucun document justificatif importé pour le moment.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {files.map((file, idx) => (
                        <div
                          key={file.storagePath || idx}
                          className="p-3 rounded-xl border border-surface-border bg-surface hover:bg-background/40 transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {getFileIcon(file.name)}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate max-w-[220px]" title={file.name}>
                                {file.name}
                              </p>
                              {file.created_at && (
                                <p className="text-[10px] text-foreground-muted">
                                  Ajouté le {new Date(file.created_at).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                              title="Ouvrir le document dans un nouvel onglet"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <a
                              href={file.url}
                              download={file.name}
                              className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-border transition-colors"
                              title="Télécharger"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDelete(file.storageName)}
                              className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                              title="Supprimer ce document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Zone d'import de fichier */}
                <div className="pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-2">
                    Importer un nouveau justificatif
                  </h4>

                  <label className="border-2 border-dashed border-surface-border hover:border-primary/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-background/30 hover:bg-background/60 transition-all text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.csv"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="hidden"
                    />
                    <div className="p-3 rounded-full bg-primary/10 text-primary mb-2">
                      <Upload className={`w-5 h-5 ${uploading ? 'animate-bounce' : ''}`} />
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                      {uploading ? 'Téléversement en cours...' : 'Cliquez pour sélectionner un fichier'}
                    </span>
                    <span className="text-[11px] text-foreground-muted mt-1">
                      Formats acceptés : PDF, PNG, JPG ou CSV (relevé de solde)
                    </span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-surface-border p-4 bg-background/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-surface border border-surface-border text-foreground hover:bg-background transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
