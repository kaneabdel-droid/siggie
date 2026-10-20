'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, WifiOff, Wifi, User, Lock, CheckCircle2, ShieldCheck } from 'lucide-react'
import { login, type LoginActionResult } from '@/app/login/actions'
import {
  cacheOfflineAccount,
  verifyOfflineCredentials,
  getOfflineSession,
} from '@/lib/offline/offline-auth'

export default function ClientLoginForm({ dict, next }: { dict: any, next?: string }) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const activeSession = getOfflineSession()
    if (activeSession && !navigator.onLine) {
      setSuccessNotice(`Session locale détectée pour ${activeSession.user.nomComplet || activeSession.user.identifiant}.`)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    setSuccessNotice(null)

    const cleanIdentifier = identifier.trim()
    if (!cleanIdentifier || !password) {
      setMessage('Veuillez renseigner votre identifiant et votre mot de passe.')
      return
    }

    // 1. CAS HORS-LIGNE DIRECT (Pas de réseau Internet)
    if (!isOnline || !navigator.onLine) {
      startTransition(async () => {
        const offRes = await verifyOfflineCredentials(cleanIdentifier, password)
        if (offRes.success && offRes.session) {
          document.cookie = 'demba_offline_active=1; path=/; max-age=2592000; SameSite=Lax'
          setSuccessNotice('Connexion locale validée ! Accès à votre espace SIGGIE hors-ligne...')
          setTimeout(() => {
            window.location.href = next || '/dashboard'
          }, 600)
        } else {
          setMessage(offRes.error || 'Identifiant ou mot de passe incorrect en mode hors-ligne.')
        }
      })
      return
    }

    // 2. CAS EN LIGNE (Tentative réseau avec repli hors-ligne automatique)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('email', cleanIdentifier)
      formData.set('password', password)
      if (next) formData.set('next', next)

      try {
        const res: LoginActionResult = await login(formData)

        if (res.error) {
          if (res.error.toLowerCase().includes('fetch') || res.error.toLowerCase().includes('réseau') || res.error.toLowerCase().includes('network')) {
            const offRes = await verifyOfflineCredentials(cleanIdentifier, password)
            if (offRes.success) {
              document.cookie = 'demba_offline_active=1; path=/; max-age=2592000; SameSite=Lax'
              setSuccessNotice('Réseau instable : connexion locale hors-ligne activée !')
              setTimeout(() => {
                window.location.href = next || '/dashboard'
              }, 600)
              return
            }
          }
          setMessage(res.error)
          return
        }

        if (res.success) {
          if (res.userContext) {
            try {
              await cacheOfflineAccount(cleanIdentifier, password, res.userContext)
            } catch (err) {
              console.warn('Erreur mise en cache hors-ligne SIGGIE:', err)
            }
          }

          document.cookie = 'demba_offline_active=1; path=/; max-age=2592000; SameSite=Lax'

          // Pré-mettre en cache le shell du dashboard en tâche de fond
          if ('caches' in window) {
            try {
              const cache = await caches.open('demba-offline-siggie-v3')
              const dashRes = await fetch('/dashboard')
              if (dashRes && dashRes.ok) {
                await cache.put('/dashboard', dashRes)
              }
            } catch (cacheErr) {
              console.warn('Erreur pré-mise en cache dashboard shell:', cacheErr)
            }
          }

          setSuccessNotice('Connexion réussie ! Redirection...')
          window.location.href = res.redirectUrl || '/dashboard'
        }
      } catch (networkError: any) {
        const offRes = await verifyOfflineCredentials(cleanIdentifier, password)
        if (offRes.success) {
          document.cookie = 'demba_offline_active=1; path=/; max-age=2592000; SameSite=Lax'
          setSuccessNotice('Connexion hors-ligne de secours validée !')
          setTimeout(() => {
            window.location.href = next || '/dashboard'
          }, 600)
        } else {
          setMessage(
            'Impossible de joindre le serveur et aucun compte hors-ligne synchronisé trouvé. Vérifiez votre connexion Internet.'
          )
        }
      }
    })
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {/* Alerte Mode Réseau / Hors-ligne */}
      {!isOnline && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Mode hors-ligne direct actif</span>
            Vous pouvez vous connecter avec vos identifiants habituels mémorisés sur cet appareil. Vos opérations seront synchronisées automatiquement dès le retour d&apos;Internet.
          </div>
        </div>
      )}

      {/* Messages d'erreur ou de succès */}
      {message && (
        <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium text-center">
          {message}
        </div>
      )}
      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="identifier"
          className="block text-sm font-medium leading-6 text-foreground"
        >
          {dict.auth.login.email}
        </label>
        <div className="mt-2">
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="ex: amadou_caisse, 771234567 ou email@domaine.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className="block w-full rounded-md border-0 py-2 px-3 bg-surface text-foreground shadow-sm ring-1 ring-inset ring-foreground-muted focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-sm font-medium leading-6 text-foreground"
          >
            {dict.auth.login.password}
          </label>
          <div className="text-sm">
            <a href="/forgot-password" className="font-semibold text-primary hover:text-primary-hover">
              {dict.auth.login.forgot}
            </a>
          </div>
        </div>
        <div className="mt-2 relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="block w-full rounded-md border-0 py-2 px-3 pr-10 bg-surface text-foreground shadow-sm ring-1 ring-inset ring-foreground-muted focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-foreground-muted hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 transition-all"
        >
          {isPending ? 'Vérification...' : dict.auth.login.btn}
        </button>
      </div>

      {isOnline ? (
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-foreground-muted pt-1">
          <Wifi className="h-3 w-3 text-emerald-500" />
          <span>Connecté au serveur en ligne (synchronisation activée)</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 pt-1">
          <ShieldCheck className="h-3 w-3" />
          <span>Authentification locale autonome sans réseau</span>
        </div>
      )}
    </form>
  )
}
