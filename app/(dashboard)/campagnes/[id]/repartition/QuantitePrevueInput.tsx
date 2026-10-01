'use client'

import { useState } from 'react'
import { updateQuantitePrevue } from './actions'

export default function QuantitePrevueInput({
  campagneId,
  intrantId,
  initialValue,
  stock,
  useStockLabel,
}: {
  campagneId: string
  intrantId: string
  initialValue: number
  stock: number | null
  useStockLabel: string
}) {
  const [value, setValue] = useState(initialValue)
  const [saved, setSaved] = useState(initialValue)
  const [saving, setSaving] = useState(false)

  async function save(next: number) {
    if (next === saved) return
    setSaving(true)
    const res = await updateQuantitePrevue(campagneId, intrantId, next)
    setSaving(false)
    if (res?.error) {
      alert(res.error)
      setValue(saved)
    } else {
      setSaved(next)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {stock !== null && stock > 0 && stock !== value && (
        <button
          type="button"
          disabled={saving}
          onClick={() => { setValue(stock); save(stock) }}
          className="text-xs font-medium text-primary hover:text-primary-hover whitespace-nowrap disabled:opacity-50"
        >
          {useStockLabel}
        </button>
      )}
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
        onBlur={() => save(value)}
        disabled={saving}
        className="w-28 rounded-md bg-background border border-surface-border text-foreground px-2 py-1 text-right text-sm disabled:opacity-50"
      />
    </div>
  )
}
