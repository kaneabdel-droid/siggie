'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import LanguageSelector from '@/components/LanguageSelector'

export default function ClientNavbar({ dict, currentLang }: { dict: any, currentLang: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl font-bold font-heading text-primary">DEMBA SOLUTION</span>
          </div>
          <nav className="hidden md:flex gap-6 items-center">
            <a href="#produits" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors">{dict.landing.nav.products}</a>
            <a href="#tarifs" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors">{dict.landing.nav.pricing}</a>
            <a href="#astuces" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors">{dict.landing.nav.tips}</a>
          </nav>
          <div className="flex gap-2 sm:gap-4 items-center">
            <LanguageSelector currentLang={currentLang} />
            <Link href="/login" className="text-sm font-medium text-foreground-muted hover:text-primary transition-colors hidden sm:block">{dict.landing.nav.login}</Link>
            <Link href="#tarifs" className="rounded-full bg-primary px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all">
              {dict.landing.nav.subscribe}
            </Link>
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
          <a href="#produits" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary">{dict.landing.nav.products}</a>
          <a href="#tarifs" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary">{dict.landing.nav.pricing}</a>
          <a href="#astuces" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary">{dict.landing.nav.tips}</a>
          <hr className="border-surface-border" />
          <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-foreground hover:text-primary">{dict.landing.nav.login}</Link>
        </div>
      )}
    </header>
  )
}
