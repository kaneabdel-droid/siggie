'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setLanguage } from '@/app/actions/i18n'
import { Check, Globe } from 'lucide-react'

const LANGUAGES = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'pt', name: 'Português' },
]

export default function LanguageSelector({ currentLang }: { currentLang: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSelect = (code: string) => {
    setIsOpen(false)
    if (code === currentLang) return
    
    startTransition(async () => {
      await setLanguage(code)
      // Hard refresh to ensure layout direction and server components update
      window.location.reload()
    })
  }

  const currentLangObj = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0]

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-md hover:bg-surface-border transition-colors text-foreground-muted hover:text-foreground"
        title="Changer de langue"
      >
        <Globe className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline-block uppercase">{currentLang}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-background border border-surface-border rounded-lg shadow-xl z-50 py-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              disabled={isPending}
              className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-surface-border transition-colors ${
                currentLang === lang.code ? 'text-primary font-bold' : 'text-foreground'
              }`}
            >
              {lang.name}
              {currentLang === lang.code && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
