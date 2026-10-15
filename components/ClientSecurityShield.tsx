'use client'

import { useEffect } from 'react'

/**
 * Bouclier de sécurité côté client :
 * - Détecte l'intégration frauduleuse dans une iFrame (anti-clickjacking / anti-clonage visuel).
 * - Brise immédiatement tout cadre parent malveillant (Frame-Busting).
 */
export default function ClientSecurityShield() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Vérifie si la page s'exécute dans une fenêtre imbriquée (iFrame)
    if (window.top && window.top !== window.self) {
      try {
        // Tente de briser le cadre et de rediriger la fenêtre principale vers l'URL officielle
        window.top.location.href = window.self.location.href
      } catch {
        // En cas de bac à sable iFrame empêchant la redirection du parent (sandbox),
        // on neutralise l'affichage pour empêcher tout détournement de clic
        document.body.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#090d16;color:#ffffff;font-family:system-ui,sans-serif;text-align:center;padding:24px;">
            <div style="max-width:520px;background:#131c2e;border:1px solid #1e293b;border-radius:12px;padding:32px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
              <div style="font-size:40px;margin-bottom:16px;">🛡️</div>
              <h2 style="font-size:20px;font-weight:700;margin-bottom:12px;color:#f87171;">Avertissement de Sécurité</h2>
              <p style="font-size:14px;line-height:1.6;color:#94a3b8;margin-bottom:24px;">
                L'affichage de DembaSolution dans un cadre externe ou une iFrame non autorisée est strictement bloqué pour protéger vos identifiants et vos données.
              </p>
              <a href="${window.self.location.href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;background:#10b981;color:#ffffff;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;">
                Accéder directement et en toute sécurité
              </a>
            </div>
          </div>
        `
      }
    }
  }, [])

  return null
}
