'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, ChevronDown, LogIn } from 'lucide-react'
import { useState } from 'react'
import LanguageSelector from '@/components/LanguageSelector'

export default function ClientNavbar({
  dict,
  currentLang,
  isSiggieOnly = false,
}: {
  dict: any
  currentLang: string
  isSiggieOnly?: boolean
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pricingMenuOpen, setPricingMenuOpen] = useState(false)
  const [subscribeMenuOpen, setSubscribeMenuOpen] = useState(false)
  const [loginMenuOpen, setLoginMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href={isSiggieOnly ? "/decouvrir-siggie" : "/"} className="flex items-center gap-2 shrink-0">
            <Image src="/logo-icon.png" alt="SIGGIE - Demba Solution" width={248} height={260} className="h-8 w-auto sm:h-9" priority />
            <span className="text-lg sm:text-xl font-bold font-heading text-primary whitespace-nowrap">
              {isSiggieOnly ? 'SIGGIE' : 'DEMBA SOLUTION'}
            </span>
          </Link>

          {/* Navigation Desktop */}
          {isSiggieOnly ? (
            <nav className="hidden md:flex gap-6 items-center">
              <Link href="/decouvrir-siggie" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Accueil
              </Link>
              <Link href="/tarifs" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors">
                Tarifs & Formules
              </Link>
              <Link href="/guide" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors">
                Guide d&apos;utilisation
              </Link>
              <a href="#contact" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors">
                {dict.landing.nav.contact}
              </a>
            </nav>
          ) : (
            <nav className="hidden md:flex gap-6 items-center">
              <a href="#produits" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors">{dict.landing.nav.products}</a>
              <div className="relative" onMouseEnter={() => setPricingMenuOpen(true)} onMouseLeave={() => setPricingMenuOpen(false)}>
                <button className="flex items-center gap-1 text-sm font-medium text-foreground-muted hover:text-primary transition-colors">
                  {dict.landing.nav.pricing} <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {pricingMenuOpen && (
                  <div className="absolute left-0 top-full pt-2 w-44">
                    <div className="bg-background border border-surface-border rounded-lg shadow-xl py-1">
                      <Link href="/tarifs" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">SIGGIE</Link>
                      <a href="https://d-quinca.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-QUINCA</a>
                      <a href="https://d-intrants.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-INTRANTS</a>
                      <a href="https://d-agro.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-AGROBUSINESS</a>
                      <a href="https://scholar.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-SCHOLAR</a>
                      <a href="https://d-pharma.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-PHARMA</a>
                      <a href="https://d-ferme.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-FERME</a>
                    </div>
                  </div>
                )}
              </div>
              <a href="#astuces" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors">{dict.landing.nav.tips}</a>
              <a href="#contact" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors">{dict.landing.nav.contact}</a>
            </nav>
          )}

          {/* Boutons d'action en haut à droite */}
          <div className="flex gap-2 sm:gap-3 items-center">
            <LanguageSelector currentLang={currentLang} />

            {isSiggieOnly ? (
              /* Mode SIGGIE DIRECT : Bouton Connexion directe sans voir les autres applications */
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Connexion</span>
                </Link>
                <Link
                  href="/tarifs"
                  className="hidden sm:inline-flex items-center gap-1 rounded-full border border-surface-border px-3.5 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-all"
                >
                  S&apos;abonner
                </Link>
              </div>
            ) : (
              /* Mode Portail DEMBA : Dropdowns multi-produits */
              <>
                <div className="relative" onMouseEnter={() => setLoginMenuOpen(true)} onMouseLeave={() => setLoginMenuOpen(false)}>
                  <button className="flex items-center gap-1 rounded-full border border-surface-border px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-all">
                    {dict.landing.nav.login} <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {loginMenuOpen && (
                    <div className="absolute right-0 top-full pt-2 w-44">
                      <div className="bg-background border border-surface-border rounded-lg shadow-xl py-1">
                        <Link href="/login" className="block px-4 py-2 text-sm font-semibold text-primary hover:bg-black/5">SIGGIE (Connexion)</Link>
                        <a href="https://d-quinca.dembasolution.com/login" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-QUINCA</a>
                        <a href="https://d-intrants.dembasolution.com/login" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-INTRANTS</a>
                        <a href="https://d-agro.dembasolution.com/login" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-AGROBUSINESS</a>
                        <a href="https://scholar.dembasolution.com/login" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-SCHOLAR</a>
                        <a href="https://pcas.dembasolution.com/login" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">PCAS</a>
                        <a href="https://d-pharma.dembasolution.com/login" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-PHARMA</a>
                        <a href="https://d-ferme.dembasolution.com/login" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-FERME</a>
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative" onMouseEnter={() => setSubscribeMenuOpen(true)} onMouseLeave={() => setSubscribeMenuOpen(false)}>
                  <button className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all">
                    {dict.landing.nav.subscribe} <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {subscribeMenuOpen && (
                    <div className="absolute right-0 top-full pt-2 w-44">
                      <div className="bg-background border border-surface-border rounded-lg shadow-xl py-1">
                        <Link href="/tarifs" className="block px-4 py-2 text-sm font-semibold text-primary hover:bg-black/5">SIGGIE (Tarifs)</Link>
                        <a href="https://d-quinca.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-QUINCA</a>
                        <a href="https://d-intrants.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-INTRANTS</a>
                        <a href="https://d-agro.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-AGROBUSINESS</a>
                        <a href="https://scholar.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-SCHOLAR</a>
                        <a href="https://d-pharma.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-PHARMA</a>
                        <a href="https://d-ferme.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-foreground hover:bg-black/5">D-FERME</a>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              className="md:hidden p-2 text-foreground-muted"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-surface-border bg-background/95 backdrop-blur-md px-4 py-4 space-y-4">
          {isSiggieOnly ? (
            <>
              <Link href="/decouvrir-siggie" onClick={() => setMobileMenuOpen(false)} className="block text-base font-semibold text-primary">
                Découvrir SIGGIE
              </Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-sm">
                Connexion SIGGIE
              </Link>
              <Link href="/tarifs" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary">
                Tarifs & Formules
              </Link>
              <Link href="/guide" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary">
                Guide d&apos;utilisation
              </Link>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary">
                {dict.landing.nav.contact}
              </a>
            </>
          ) : (
            <>
              <a href="#produits" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary">{dict.landing.nav.products}</a>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-sm">
                Connexion SIGGIE
              </Link>
              <div>
                <p className="text-base font-medium text-foreground mb-2">{dict.landing.nav.pricing}</p>
                <div className="pl-4 space-y-2">
                  <Link href="/tarifs" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-foreground-muted hover:text-primary">SIGGIE</Link>
                  <a href="https://d-quinca.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-foreground-muted hover:text-primary">D-QUINCA</a>
                  <a href="https://d-intrants.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-foreground-muted hover:text-primary">D-INTRANTS</a>
                  <a href="https://d-agro.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-foreground-muted hover:text-primary">D-AGROBUSINESS</a>
                  <a href="https://scholar.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-foreground-muted hover:text-primary">D-SCHOLAR</a>
                  <a href="https://d-pharma.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-foreground-muted hover:text-primary">D-PHARMA</a>
                  <a href="https://d-ferme.dembasolution.com/tarifs" target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-foreground-muted hover:text-primary">D-FERME</a>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  )
}

