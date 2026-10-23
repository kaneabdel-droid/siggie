'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Maximize2, X, Film, Volume2, Sparkles, CheckCircle2 } from 'lucide-react'

interface SiggieVideoPlayerProps {
  title?: string
  subtitle?: string
  badge?: string
  videoSrc?: string
  variant?: 'card' | 'hero'
}

export default function SiggieVideoPlayer({
  title = 'Présentation complète de SIGGIE',
  subtitle = 'Visite guidée et démonstration complète de la gestion des campagnes, membres, intrants et trésorerie.',
  badge = 'Vidéo officielle • 29 min',
  videoSrc = '/videos/siggie-presentation.mp4',
  variant = 'card',
}: SiggieVideoPlayerProps) {
  const [hasStarted, setHasStarted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const modalVideoRef = useRef<HTMLVideoElement | null>(null)

  const handleStartInline = () => {
    setHasStarted(true)
  }

  const handleOpenModal = () => {
    // Si la vidéo inline était en cours, on la met en pause
    if (videoRef.current) {
      videoRef.current.pause()
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    if (modalVideoRef.current) {
      modalVideoRef.current.pause()
    }
    setIsModalOpen(false)
  }

  // Écoute de la touche Échap pour fermer la modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isModalOpen])

  return (
    <>
      <div className={`relative overflow-hidden rounded-3xl border border-surface-border bg-gradient-to-br from-surface via-background to-surface shadow-2xl transition-all ${variant === 'hero' ? 'max-w-5xl mx-auto' : 'w-full'}`}>
        {/* Glow décoratif en arrière-plan */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          {/* Header de la carte */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase mb-2">
                <Film className="w-3.5 h-3.5" />
                <span>{badge}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
                {title}
              </h3>
              {subtitle && (
                <p className="mt-1 text-sm text-foreground-muted max-w-2xl">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border bg-surface text-foreground-muted hover:text-foreground hover:bg-background text-xs font-medium transition-colors shadow-sm"
                title="Agrandir en plein écran"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Plein écran</span>
              </button>
            </div>
          </div>

          {/* Cadre vidéo ou Façade de préchargement zéro bande passante */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/90 border border-surface-border/80 shadow-inner flex items-center justify-center">
            {hasStarted ? (
              <video
                ref={videoRef}
                src={videoSrc}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="w-full h-full object-contain"
              >
                Votre navigateur ne prend pas en charge la lecture de vidéos MP4.
              </video>
            ) : (
              /* Façade ultra-légère (0 Mo chargé tant que l'utilisateur ne clique pas) */
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-black/60 via-black/80 to-black/95">
                {/* Image de fond stylisée via CSS (sans requête HTTP externe) */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-emerald-950 to-transparent pointer-events-none" />

                {/* Bouton Play animé */}
                <button
                  type="button"
                  onClick={handleStartInline}
                  className="group relative z-10 flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-white shadow-xl shadow-primary/30 hover:scale-110 hover:bg-primary-hover active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary/40 cursor-pointer"
                  aria-label="Lancer la vidéo de présentation"
                >
                  <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping pointer-events-none" />
                  <Play className="w-9 h-9 sm:w-11 sm:h-11 translate-x-0.5 fill-white text-white drop-shadow-md group-hover:scale-105 transition-transform" />
                </button>

                <p className="relative z-10 mt-5 text-base sm:text-lg font-semibold text-white drop-shadow-sm">
                  Lancer la vidéo de présentation
                </p>
                <p className="relative z-10 mt-1 text-xs text-white/70 max-w-md">
                  Démonstration complète pas-à-pas • Chargement à la demande optimisé
                </p>

                {/* Badges de caractéristiques au bas de la façade */}
                <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-white/80">
                  <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Durée : 29 min
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                    <Sparkles className="w-3.5 h-3.5 text-secondary" /> Qualité HD
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                    <Volume2 className="w-3.5 h-3.5 text-primary" /> Audio en français
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer d'information sous la vidéo */}
          <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-foreground-muted gap-2 px-1">
            <span>SIGGIE — Système Intégré de Gestion pour GIE & Coopératives</span>
            <span className="hidden sm:inline">•</span>
            <span>Flux optimisé : lecture progressive sans ralentir l&apos;application</span>
          </div>
        </div>
      </div>

      {/* Modal Cinéma Plein Écran */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-5xl rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm text-foreground truncate max-w-md">
                  {title}
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface transition-colors"
                aria-label="Fermer la vidéo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lecteur vidéo dans la modal */}
            <div className="relative aspect-video w-full bg-black">
              <video
                ref={modalVideoRef}
                src={videoSrc}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="w-full h-full object-contain"
              >
                Votre navigateur ne prend pas en charge la lecture de vidéos MP4.
              </video>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
