'use client'

import { createContext, useContext } from 'react'
import { uniteMontant } from '@/lib/currency'

// Devise du GIE connecté, fournie par le layout du dashboard : les écrans clients affichent leurs montants avec
// l'unité du GIE (FCFA, €, MAD…) ou sans unité pour un GIE d'un autre pays (devise AUCUNE).
const DeviseContext = createContext('XOF')

export function DeviseProvider({ devise, children }: { devise: string; children: React.ReactNode }) {
  return <DeviseContext.Provider value={devise}>{children}</DeviseContext.Provider>
}

/** Unité à accoler à un montant formaté (« FCFA » précédé d'une espace), chaîne vide si le GIE est sans unité. */
export function useUnite(): string {
  return uniteMontant(useContext(DeviseContext))
}
