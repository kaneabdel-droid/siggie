'use client'

import { useState } from 'react'
import { updateSuperficieCampagneMembre } from './actions'

export default function SuperficieCampagneInput({
  campagneId,
  membreId,
  initialValue,
}: {
  campagneId: string
  membreId: string
  initialValue: number
}) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    if (value === initialValue) return
    setSaving(true)
    const res = await updateSuperficieCampagneMembre(campagneId, membreId, value)
    setSaving(false)
    if (res?.error) alert(res.error)
  }

  return (
    <input
      type="number"
      step="0.01"
      min="0"
      value={value}
      onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
      onBlur={handleBlur}
      disabled={saving}
      className="w-24 rounded-md bg-background border border-surface-border text-foreground px-2 py-1 text-right text-sm disabled:opacity-50"
    />
  )
}
