'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { upsertChariowProduit, supprimerChariowProduit } from './actions'

type Produit = { montant: number; product_id: string }

export default function ChariowProduitsEditor({ produits, tarifs }: { produits: Produit[]; tarifs: { niveau: string; prix_annuel: number }[] }) {
  const [montant, setMontant] = useState('')
  const [productId, setProductId] = useState('')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const ajouter = () => {
    const m = parseInt(montant, 10)
    if (!m || !productId.trim()) {
      setMessage('Montant et identifiant produit requis')
      return
    }
    setMessage(null)
    startTransition(async () => {
      const result = await upsertChariowProduit(m, productId)
      if (result.error) setMessage(`Erreur : ${result.error}`)
      else {
        setMontant('')
        setProductId('')
      }
    })
  }

  return (
    <div>
      <p className="text-sm text-foreground-muted mb-3">
        Chariow débite le prix d&apos;un produit préconfiguré dans sa boutique — un produit par montant exact facturé.
        Forfaits actuels : {tarifs.map((t) => `${t.niveau} (${t.prix_annuel.toLocaleString('fr-FR')} FCFA)`).join(', ')}.
      </p>

      {message && <p className="text-sm text-danger mb-3">{message}</p>}

      <table className="w-full text-sm mb-4">
        <thead className="text-foreground-muted text-left">
          <tr>
            <th className="py-2 font-medium">Montant (FCFA)</th>
            <th className="py-2 font-medium">Product ID Chariow</th>
            <th className="py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {produits.map((p) => (
            <tr key={p.montant}>
              <td className="py-2">{p.montant.toLocaleString('fr-FR')}</td>
              <td className="py-2 font-mono text-xs">{p.product_id}</td>
              <td className="py-2">
                <button
                  disabled={isPending}
                  onClick={() => startTransition(async () => { await supprimerChariowProduit(p.montant) })}
                  className="text-danger hover:opacity-70"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          {produits.length === 0 && (
            <tr><td colSpan={3} className="py-3 text-foreground-muted">Aucun produit configuré</td></tr>
          )}
        </tbody>
      </table>

      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Montant"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          className="w-32 rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="product_id Chariow"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="flex-1 rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
        />
        <button disabled={isPending} onClick={ajouter} className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
          Ajouter
        </button>
      </div>
    </div>
  )
}
