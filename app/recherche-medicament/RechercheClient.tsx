'use client'

import { useState } from 'react'
import { Search, MapPin, Pill, ArrowRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

type ResultatRecherche = {
  pharmacie_nom: string
  pharmacie_adresse: string
  pharmacie_telephone: string
  medicament_nom: string
  en_stock: boolean
}

export default function RechercheClient() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<ResultatRecherche[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const supabase = createClient()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      // Rechercher les médicaments correspondants
      const { data: medicaments, error: medError } = await supabase
        .from('medicaments')
        .select('id, nom')
        .ilike('nom', `%${searchTerm}%`)
        .limit(5)

      if (medError) throw medError

      if (!medicaments || medicaments.length === 0) {
        setResults([])
        setIsSearching(false)
        return
      }

      const medIds = medicaments.map(m => m.id)

      // Trouver les pharmacies ayant ce médicament en stock et non périmé
      const today = new Date().toISOString().split('T')[0]
      const { data: stocks, error: stockError } = await supabase
        .from('stocks_pharmacie')
        .select(`
          quantite,
          medicaments (nom),
          gies (nom, telephone, pays) 
        `)
        .in('medicament_id', medIds)
        .gt('quantite', 0)
        .gt('date_peremption', today)

      if (stockError) throw stockError

      // Formater les résultats (Sans afficher ni prix ni quantité exacte)
      const formattedResults: ResultatRecherche[] = (stocks || []).map((s: any) => ({
        pharmacie_nom: s.gies?.nom || 'Pharmacie Inconnue',
        pharmacie_adresse: s.gies?.pays || 'Adresse non renseignée', // Utilisant pays/ville comme proxy
        pharmacie_telephone: s.gies?.telephone || 'Non renseigné',
        medicament_nom: s.medicaments?.nom || 'Médicament',
        en_stock: true
      }))

      // Dédupliquer par pharmacie et par médicament
      const uniqueResults = formattedResults.filter((v, i, a) => 
        a.findIndex(t => (t.pharmacie_nom === v.pharmacie_nom && t.medicament_nom === v.medicament_nom)) === i
      )

      setResults(uniqueResults)
    } catch (error) {
      console.error('Erreur lors de la recherche:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-surface rounded-2xl shadow-xl p-8 mb-12 border border-surface-border text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Pill className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold font-heading mb-4">Trouvez votre médicament</h2>
        <p className="text-foreground-muted mb-8 max-w-2xl mx-auto">
          Recherchez la disponibilité d'un médicament dans les pharmacies du réseau D-PHARMA près de chez vous.
          Conformément à la réglementation, les prix ne sont pas affichés.
        </p>

        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto flex items-center">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-foreground-muted" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-12 pr-32 py-4 border-2 border-surface-border rounded-xl bg-background text-lg focus:ring-primary focus:border-primary shadow-sm transition-all"
            placeholder="Ex: Paracétamol, Amoxicilline..."
          />
          <button
            type="submit"
            disabled={isSearching || !searchTerm.trim()}
            className="absolute inset-y-2 right-2 bg-primary text-white px-6 rounded-lg font-bold hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {isSearching ? '...' : 'Chercher'}
          </button>
        </form>
      </div>

      {hasSearched && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold font-heading flex items-center gap-2">
            Résultats de recherche
            <span className="bg-primary/10 text-primary text-sm py-1 px-3 rounded-full">
              {results.length} trouvée(s)
            </span>
          </h3>

          {results.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((result, idx) => (
                <div key={idx} className="bg-surface border border-surface-border rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg text-foreground">{result.pharmacie_nom}</h4>
                      <div className="text-success text-sm font-medium flex items-center gap-1 mt-1">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse-slow"></div>
                        En stock : {result.medicament_nom}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-foreground-muted">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 shrink-0" />
                      {result.pharmacie_adresse}
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 shrink-0" />
                      Contact : {result.pharmacie_telephone}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface border border-surface-border rounded-xl p-12 text-center">
              <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-foreground-muted" />
              </div>
              <h4 className="font-bold text-lg mb-2">Aucun résultat</h4>
              <p className="text-foreground-muted">
                Aucune pharmacie ne semble avoir ce médicament en stock pour le moment.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
