'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Building2, Upload, CheckCircle2 } from 'lucide-react'
import { DEVISES, type DeviseCode } from '@/lib/currency'
import { updateGieInfos, uploadLogo } from './actions'

type Gie = {
  nom: string
  adresse: string
  telephone: string
  email: string
  identification: string
  devise: string
  logoUrl: string | null
}

export default function ParametresForm({ gie, dict }: { gie: Gie; dict: any }) {
  const t = dict.parametres
  const c = dict.common
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState(gie.logoUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    setError(null)
    setSaved(false)
    const res = await updateGieInfos(formData)
    setSaving(false)
    if (res?.error) setError(res.error)
    else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setLogoError(null)
    const formData = new FormData()
    formData.set('logo', file)
    const res = await uploadLogo(formData)
    setUploading(false)
    if (res?.error) setLogoError(res.error)
    else if (res?.logoUrl) setLogoUrl(res.logoUrl)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="rounded-xl border border-surface-border bg-surface p-6">
        <h2 className="font-semibold text-foreground mb-4">{t.logoTitle}</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-surface-border bg-background">
            {logoUrl ? (
              <Image src={logoUrl} alt={t.logoTitle} width={80} height={80} className="h-full w-full object-contain" unoptimized />
            ) : (
              <Building2 className="h-8 w-8 text-foreground-muted" />
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={uploading}
              className="hidden"
              id="logo-input"
            />
            <label
              htmlFor="logo-input"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-surface border border-surface-border px-3 py-2 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> {uploading ? t.uploading : logoUrl ? t.changeLogo : t.addLogo}
            </label>
            <p className="mt-1 text-xs text-foreground-muted">{t.logoHint}</p>
            {logoError && <p className="mt-1 text-xs text-danger">{logoError}</p>}
          </div>
        </div>
      </div>

      <form action={handleSubmit} className="rounded-xl border border-surface-border bg-surface p-6 space-y-4">
        <h2 className="font-semibold text-foreground mb-2">{t.generalInfo}</h2>
        {error && <p className="text-sm text-danger">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-foreground">{t.companyName}</label>
          <input name="nom" type="text" required defaultValue={gie.nom} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">{t.address}</label>
          <input name="adresse" type="text" defaultValue={gie.adresse} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground">{t.phone}</label>
            <input name="telephone" type="text" defaultValue={gie.telephone} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">{t.email}</label>
            <input name="email" type="email" defaultValue={gie.email} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">{t.identification}</label>
          <input name="identification" type="text" defaultValue={gie.identification} placeholder={t.identificationPlaceholder} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">{t.currency}</label>
          <select name="devise" defaultValue={gie.devise} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
            {(Object.keys(DEVISES) as DeviseCode[]).map((code) => (
              <option key={code} value={code}>{DEVISES[code].label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-foreground-muted">{t.currencyHint}</p>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? c.saving : c.save}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> {t.saved}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
