'use client'

import { useState, useEffect } from 'react'
import { X, Copy, Check, Download, Share2, Loader2, Phone, AlertCircle, Sparkles } from 'lucide-react'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { useUnite } from '@/components/DeviseProvider'
import { createClient } from '@/utils/supabase/client'
import { 
  formatWhatsAppPhone, 
  buildFactureWhatsAppText, 
  generateFacturePdf,
  formatFactureAmount 
} from './facturePdfUtils'
import { updateMembreTelephone } from './actions'

interface FactureWhatsAppModalProps {
  facture: any
  gieName: string
  dict?: any
  buttonVariant?: 'icon' | 'button'
  triggerClassName?: string
}

export default function FactureWhatsAppModal({
  facture,
  gieName,
  dict,
  buttonVariant = 'icon',
  triggerClassName,
}: FactureWhatsAppModalProps) {
  const unite = useUnite()
  const [isOpen, setIsOpen] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [telephone, setTelephone] = useState('')
  const [savePhoneToDb, setSavePhoneToDb] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [canSharePdf, setCanSharePdf] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [sharingPdf, setSharingPdf] = useState(false)
  const [pdfData, setPdfData] = useState<{ doc: any; file: File; filename: string } | null>(null)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)

  const membre = facture.membre
  const nomMembre = `${membre?.prenom || ''} ${membre?.nom || ''}`.trim() || 'Membre'
  const idCourt = (facture.id || '').substring(0, 8).toUpperCase()

  // Détecter la disponibilité de Web Share API pour les fichiers PDF (iOS Safari, Android Chrome)
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function'
    ) {
      try {
        const testFile = new File(['test'], 'facture.pdf', { type: 'application/pdf' })
        setCanSharePdf(navigator.canShare({ files: [testFile] }))
      } catch {
        setCanSharePdf(false)
      }
    }
  }, [])

  // À l'ouverture du modal, charger les données de détail et pré-remplir le message
  const handleOpen = async () => {
    setIsOpen(true)
    setErrorNotice(null)
    const initialPhone = membre?.telephone || ''
    setTelephone(initialPhone)
    setSavePhoneToDb(!initialPhone) // cocher par défaut si le numéro n'était pas déjà renseigné
    setLoadingDetails(true)

    try {
      const supabase = createClient()
      const result = await generateFacturePdf({
        facture,
        gieName,
        unite,
        supabaseClient: supabase,
      })

      setPdfData({
        doc: result.doc,
        file: result.file,
        filename: result.filename,
      })

      const generatedText = buildFactureWhatsAppText({
        facture,
        gieName,
        unite,
        distributions: result.distributions,
        credits: result.credits,
      })
      setMessage(generatedText)
    } catch (err) {
      console.error('Erreur chargement facture WhatsApp:', err)
      // En cas d'erreur de chargement approfondi, générer le texte standard
      setMessage(
        buildFactureWhatsAppText({
          facture,
          gieName,
          unite,
        })
      )
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setErrorNotice(null)
    setCopied(false)
  }

  // Sauvegarde éventuelle du numéro en base
  const maybePersistPhone = async () => {
    const membreId = membre?.id || facture.membre_id
    if (savePhoneToDb && membreId && telephone.trim()) {
      try {
        await updateMembreTelephone(membreId, telephone.trim())
      } catch (e) {
        console.warn('Impossible de mettre à jour le téléphone du membre:', e)
      }
    }
  }

  // Action 1 : Ouvrir WhatsApp Web / Mobile avec le message préparé
  const handleOpenWhatsApp = async () => {
    setErrorNotice(null)
    const { cleanPhone, isValid } = formatWhatsAppPhone(telephone)

    if (!isValid) {
      setErrorNotice(
        dict?.facturation_extra?.whatsapp_modal?.error_no_phone ||
        'Veuillez renseigner un numéro de téléphone valide (ex: 77 123 45 67 ou +221...).'
      )
      return
    }

    await maybePersistPhone()
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Action 2 : Partager avec le fichier PDF sur mobile via Web Share API
  const handleSharePdfWithWhatsApp = async () => {
    setErrorNotice(null)
    setSharingPdf(true)

    try {
      let fileToShare = pdfData?.file
      if (!fileToShare) {
        const supabase = createClient()
        const result = await generateFacturePdf({
          facture,
          gieName,
          unite,
          supabaseClient: supabase,
        })
        fileToShare = result.file
      }

      await maybePersistPhone()

      if (navigator.share) {
        await navigator.share({
          title: `Facture ${idCourt} - ${nomMembre}`,
          text: message,
          files: [fileToShare],
        })
      }
    } catch (err: any) {
      // Ignorer l'annulation par l'utilisateur
      if (err?.name !== 'AbortError') {
        console.error('Erreur partage natif:', err)
        setErrorNotice('Le partage natif a échoué. Utilisez le bouton "Ouvrir WhatsApp" ci-dessous.')
      }
    } finally {
      setSharingPdf(false)
    }
  }

  // Action 3 : Télécharger le PDF (pour l'attacher manuellement dans WhatsApp Web sur PC)
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      if (pdfData?.doc && pdfData?.filename) {
        pdfData.doc.save(pdfData.filename)
      } else {
        const supabase = createClient()
        const result = await generateFacturePdf({
          facture,
          gieName,
          unite,
          supabaseClient: supabase,
        })
        result.doc.save(result.filename)
      }
    } catch (err) {
      console.error('Erreur téléchargement PDF:', err)
      setErrorNotice('Impossible de télécharger le PDF.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  // Action 4 : Copier le texte
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error('Erreur copie presse-papier:', err)
    }
  }

  const phoneInfo = formatWhatsAppPhone(telephone)

  return (
    <>
      {/* Bouton déclencheur */}
      {buttonVariant === 'button' ? (
        <button
          type="button"
          onClick={handleOpen}
          className={
            triggerClassName ||
            'inline-flex items-center gap-2 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] dark:text-[#25D366] px-3 py-1.5 text-xs font-semibold transition-colors border border-[#25D366]/30'
          }
          title={dict?.facturation_extra?.whatsapp_tooltip || 'Envoyer la facture par WhatsApp'}
        >
          <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
          <span>WhatsApp</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className={
            triggerClassName ||
            'p-1.5 rounded-md text-foreground-muted hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors'
          }
          title={dict?.facturation_extra?.whatsapp_tooltip || 'Envoyer la facture par WhatsApp'}
          aria-label={dict?.facturation_extra?.whatsapp_tooltip || 'Envoyer la facture par WhatsApp'}
        >
          <WhatsAppIcon className="h-4 w-4" />
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xl rounded-2xl border border-surface-border bg-surface p-6 shadow-2xl space-y-5 my-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-surface-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366] ring-1 ring-[#25D366]/30">
                  <WhatsAppIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
                    {dict?.facturation_extra?.whatsapp_modal?.title || 'Envoyer la facture par WhatsApp'}
                  </h3>
                  <p className="text-xs text-foreground-muted">
                    Facture <span className="font-mono font-semibold text-foreground">#{idCourt}</span> &bull; {nomMembre}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1 text-foreground-muted hover:bg-background hover:text-foreground transition-colors"
                title={dict?.common?.close || 'Fermer'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Alerte Erreur éventuelle */}
            {errorNotice && (
              <div className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorNotice}</span>
              </div>
            )}

            {/* Champ Destinataire / Téléphone */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                {dict?.facturation_extra?.whatsapp_modal?.phone_label || 'Numéro WhatsApp du destinataire'}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Phone className="h-4 w-4 text-foreground-muted" />
                </div>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder={
                    dict?.facturation_extra?.whatsapp_modal?.phone_placeholder ||
                    'Ex: 77 123 45 67 ou +221 77 123 45 67'
                  }
                  className="block w-full rounded-lg border border-surface-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-[#25D366] focus:outline-hidden focus:ring-2 focus:ring-[#25D366]/20 transition-all shadow-xs"
                />
              </div>

              {/* Indicateur de formatage international */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-foreground-muted pt-0.5">
                {phoneInfo.isValid ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="h-3 w-3" />
                    Destinataire WhatsApp : +{phoneInfo.cleanPhone}
                  </span>
                ) : telephone.trim() ? (
                  <span className="text-amber-500">
                    Format à vérifier (incluez l&apos;indicatif ou numéro à 9 chiffres)
                  </span>
                ) : (
                  <span>
                    {dict?.facturation_extra?.whatsapp_modal?.phone_hint ||
                      'Pour le Sénégal, tapez simplement les 9 chiffres (ex: 77...)'}
                  </span>
                )}

                {/* Option enregistrer pour ce membre */}
                {membre?.id && (
                  <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-foreground select-none">
                    <input
                      type="checkbox"
                      checked={savePhoneToDb}
                      onChange={(e) => setSavePhoneToDb(e.target.checked)}
                      className="rounded border-surface-border text-[#25D366] focus:ring-[#25D366] h-3.5 w-3.5"
                    />
                    <span>
                      {dict?.facturation_extra?.whatsapp_modal?.save_phone_checkbox ||
                        'Enregistrer sur la fiche membre'}
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Aperçu du Message WhatsApp */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#25D366]" />
                  {dict?.facturation_extra?.whatsapp_modal?.preview_title || 'Message qui sera transmis'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">
                        {dict?.facturation_extra?.whatsapp_modal?.copied || 'Copié !'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>{dict?.facturation_extra?.whatsapp_modal?.copy_btn || 'Copier le texte'}</span>
                    </>
                  )}
                </button>
              </div>

              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center p-8 border border-surface-border rounded-xl bg-background/50 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-[#25D366]" />
                  <span className="text-xs text-foreground-muted">Préparation du récapitulatif détaillé...</span>
                </div>
              ) : (
                <div className="relative rounded-xl border border-emerald-500/20 bg-[#25D366]/5 dark:bg-[#25D366]/10 p-3.5">
                  <textarea
                    rows={8}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-transparent font-sans text-xs leading-relaxed text-foreground placeholder:text-foreground-muted focus:outline-hidden resize-y"
                    placeholder="Contenu du message WhatsApp..."
                  />
                  <div className="mt-1 text-[10px] text-foreground-muted italic text-right">
                    Vous pouvez modifier le texte ci-dessus avant l&apos;envoi.
                  </div>
                </div>
              )}
            </div>

            {/* Actions principales */}
            <div className="space-y-2 pt-2 border-t border-surface-border">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Bouton Télécharger PDF (toujours pratique pour le glisser dans WhatsApp Web) */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf || loadingDetails}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-2 text-xs font-medium text-foreground hover:bg-background transition-colors disabled:opacity-50"
                  title="Télécharger la facture PDF pour la joindre dans WhatsApp"
                >
                  {downloadingPdf ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span>{dict?.facturation_extra?.whatsapp_modal?.download_pdf_btn || 'Facture PDF'}</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Bouton Partage avec fichier PDF (uniquement sur terminaux supportant Web Share avec fichier) */}
                  {canSharePdf && (
                    <button
                      type="button"
                      onClick={handleSharePdfWithWhatsApp}
                      disabled={sharingPdf || loadingDetails}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366] bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                      title="Ouvre le menu de partage pour envoyer le fichier PDF directement dans WhatsApp"
                    >
                      {sharingPdf ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Share2 className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {dict?.facturation_extra?.whatsapp_modal?.share_pdf_btn || 'Partager le PDF'}
                      </span>
                    </button>
                  )}

                  {/* Bouton Principal : Ouvrir WhatsApp */}
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    disabled={loadingDetails}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#22bf5b] text-white px-4 py-2 text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    <span>
                      {dict?.facturation_extra?.whatsapp_modal?.send_btn || 'Ouvrir WhatsApp'}
                    </span>
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-foreground-muted text-center pt-1">
                Le lien ouvre directement votre discussion WhatsApp avec le récapitulatif pré-rempli.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
