'use client'

import { useState } from 'react'
import { CampagneBudgetSelect, TypesBudgetDatalist, type ContexteBudgetMateriel } from '../BudgetCampagneChamps'

export type ProduitMateriel = { id: string; nom: string; unite: string; variete_obligatoire: boolean }

const champ =
  'mt-1 block w-full min-w-0 max-w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm'
const etiquette = 'block break-words text-sm font-medium text-foreground'
const section = 'min-w-0 space-y-4 rounded-md border border-surface-border p-3'
const titreSection = 'text-xs font-semibold uppercase tracking-wider text-foreground-muted'

function arrondi(n: number) {
  return Math.round(n * 100) / 100
}

/**
 * Champs du pointage d'une prestation : unité (ha, h, sacs ou autre), quantité traitée, client et téléphone,
 * quantité obtenue avec produit et variété (obligatoire selon le produit), paiement en argent ou en part de récolte.
 */
export default function PrestationFields({
  prestation,
  materiels,
  produits,
  varietes,
  budget,
  dict,
}: {
  prestation?: any
  materiels: any[]
  produits: ProduitMateriel[]
  varietes: Record<string, string[]>
  budget: ContexteBudgetMateriel
  dict: any
}) {
  const t = dict.materiel_pages.prestations.form
  const p = prestation ?? {}

  const [unite, setUnite] = useState<string>(p.unite ?? 'ha')
  const [quantite, setQuantite] = useState<string>(p.quantite_traitee ? String(p.quantite_traitee) : p.superficie ? String(p.superficie) : '')
  const [produitId, setProduitId] = useState<string>(p.produit_id ?? '')
  const [obtenue, setObtenue] = useState<string>(p.quantite_obtenue != null ? String(p.quantite_obtenue) : '')
  const [uniteObtenue, setUniteObtenue] = useState<string>(p.unite_obtenue ?? 'sac')
  const [mode, setMode] = useState<string>(p.mode_paiement ?? 'especes')
  const [tarif, setTarif] = useState<string>(p.tarif_unitaire != null ? String(p.tarif_unitaire) : '')
  const [taux, setTaux] = useState<string>(p.taux_part != null ? String(p.taux_part) : '')
  const [prixPart, setPrixPart] = useState<string>(p.prix_unitaire_part != null ? String(p.prix_unitaire_part) : '')
  const [montant, setMontant] = useState<string>(p.montant_facture != null ? String(p.montant_facture) : '')

  const produit = produits.find((x) => x.id === produitId)
  const part = mode === 'part_recolte' && obtenue && taux ? arrondi((Number(obtenue) * Number(taux)) / 100) : null

  // Montant proposé : quantité × tarif, ou part de récolte × valeur unitaire. Le pointeur peut le corriger.
  function proposer(next: { quantite?: string; tarif?: string; obtenue?: string; taux?: string; prixPart?: string; mode?: string }) {
    const m = next.mode ?? mode
    if (m === 'especes') {
      const q = Number(next.quantite ?? quantite)
      const tf = next.tarif ?? tarif
      if (tf && q) setMontant(String(Math.round(q * Number(tf))))
    } else {
      const o = Number(next.obtenue ?? obtenue)
      const tx = Number(next.taux ?? taux)
      const px = next.prixPart ?? prixPart
      if (px && o && tx) setMontant(String(Math.round(((o * tx) / 100) * Number(px))))
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        <div>
          <label htmlFor="materiel_id" className={etiquette}>{t.equipment_label}</label>
          <select name="materiel_id" id="materiel_id" required defaultValue={p.materiel_id ?? ''} className={champ}>
            <option value="">{t.select_machine}</option>
            {materiels.map((mat) => (
              <option key={mat.id} value={mat.id}>{mat.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="date_prestation" className={etiquette}>{t.date_label}</label>
          <input type="date" name="date_prestation" id="date_prestation" required defaultValue={p.date_prestation ?? ''} className={champ} />
        </div>
        <div className="sm:col-span-2">
          <CampagneBudgetSelect budget={budget} defaultValue={prestation ? p.campagne_id ?? null : undefined} dict={dict} />
        </div>
      </div>

      <fieldset className={section}>
        <legend className={titreSection}>{t.section_client}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          <div>
            <label htmlFor="client_nom" className={etiquette}>{t.client_label}</label>
            <input type="text" name="client_nom" id="client_nom" defaultValue={p.client_nom ?? ''} className={champ} />
          </div>
          <div>
            <label htmlFor="client_telephone" className={etiquette}>{t.phone_label} *</label>
            <input
              type="tel"
              name="client_telephone"
              id="client_telephone"
              required
              inputMode="tel"
              autoComplete="off"
              pattern="[0-9+ ().\-]{7,}"
              placeholder={t.phone_placeholder}
              defaultValue={p.client_telephone ?? ''}
              className={champ}
              dir="ltr"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className={titreSection}>{t.section_work}</legend>
        <div>
          <label htmlFor="type_prestation" className={etiquette}>{t.type_label}</label>
          <input type="text" name="type_prestation" id="type_prestation" list="types-budget-recette" placeholder={t.type_placeholder} required defaultValue={p.type_prestation ?? ''} className={champ} />
          <TypesBudgetDatalist id="types-budget-recette" types={budget.typesRecette} />
          <p className="mt-1 text-xs text-foreground-muted">{dict.materiel_pages.budget.type_hint}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          <div>
            <label htmlFor="unite" className={etiquette}>{t.unit_label}</label>
            <select name="unite" id="unite" value={unite} onChange={(e) => setUnite(e.target.value)} className={champ}>
              {(['ha', 'h', 'sac', 'autre'] as const).map((u) => (
                <option key={u} value={u}>{t.unit_options[u]}</option>
              ))}
            </select>
          </div>
          {unite === 'autre' && (
            <div>
              <label htmlFor="unite_autre" className={etiquette}>{t.unit_other_label}</label>
              <input type="text" name="unite_autre" id="unite_autre" required placeholder={t.unit_other_placeholder} defaultValue={p.unite_autre ?? ''} className={champ} />
            </div>
          )}
          <div>
            <label htmlFor="quantite_traitee" className={etiquette}>{t.qty_labels[unite]}</label>
            <input
              type="number"
              name="quantite_traitee"
              id="quantite_traitee"
              required
              min="0.01"
              step="any"
              inputMode="decimal"
              value={quantite}
              onChange={(e) => {
                setQuantite(e.target.value)
                proposer({ quantite: e.target.value })
              }}
              className={champ}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className={titreSection}>{t.section_output}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          <div>
            <label htmlFor="produit_id" className={etiquette}>{t.product_label}</label>
            <select
              name="produit_id"
              id="produit_id"
              value={produitId}
              onChange={(e) => {
                setProduitId(e.target.value)
                const choisi = produits.find((x) => x.id === e.target.value)
                if (choisi) setUniteObtenue(choisi.unite)
              }}
              className={champ}
            >
              <option value="">{t.no_product}</option>
              {produits.map((x) => (
                <option key={x.id} value={x.id}>{x.nom}</option>
              ))}
            </select>
          </div>
          {produit && (
            <div>
              <label htmlFor="variete" className={etiquette}>
                {t.variety_label}
                {produit.variete_obligatoire && <span className="font-normal text-foreground-muted"> * ({t.variety_required_hint})</span>}
              </label>
              <input
                type="text"
                name="variete"
                id="variete"
                required={produit.variete_obligatoire}
                list="varietes-pointees"
                defaultValue={p.produit_id === produit.id ? p.variete ?? '' : ''}
                key={produit.id}
                className={champ}
              />
              <datalist id="varietes-pointees">
                {(varietes[produit.id] ?? []).map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
          )}
          <div>
            <label htmlFor="quantite_obtenue" className={etiquette}>
              {t.obtained_label}
              {mode === 'part_recolte' && ' *'}
            </label>
            <input
              type="number"
              name="quantite_obtenue"
              id="quantite_obtenue"
              min="0"
              step="any"
              inputMode="decimal"
              required={mode === 'part_recolte'}
              value={obtenue}
              onChange={(e) => {
                setObtenue(e.target.value)
                proposer({ obtenue: e.target.value })
              }}
              className={champ}
            />
          </div>
          <div>
            <label htmlFor="unite_obtenue" className={etiquette}>{t.obtained_unit_label}</label>
            <input type="text" name="unite_obtenue" id="unite_obtenue" value={uniteObtenue} onChange={(e) => setUniteObtenue(e.target.value)} className={champ} />
          </div>
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className={titreSection}>{t.section_payment}</legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
          {(['especes', 'part_recolte'] as const).map((m) => (
            <label key={m} className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="mode_paiement"
                value={m}
                checked={mode === m}
                onChange={() => {
                  setMode(m)
                  proposer({ mode: m })
                }}
                className="mt-0.5 shrink-0 text-primary focus:ring-primary"
              />
              {m === 'especes' ? t.payment_cash : t.payment_share}
            </label>
          ))}
        </div>

        {mode === 'especes' ? (
          <div>
            <label htmlFor="tarif_unitaire" className={etiquette}>{t.rate_label}</label>
            <input
              type="number"
              name="tarif_unitaire"
              id="tarif_unitaire"
              min="0"
              inputMode="decimal"
              value={tarif}
              onChange={(e) => {
                setTarif(e.target.value)
                proposer({ tarif: e.target.value })
              }}
              className={champ}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
            <div>
              <label htmlFor="taux_part" className={etiquette}>{t.share_rate_label} *</label>
              <input
                type="number"
                name="taux_part"
                id="taux_part"
                required
                min="0.01"
                max="100"
                step="any"
                inputMode="decimal"
                value={taux}
                onChange={(e) => {
                  setTaux(e.target.value)
                  proposer({ taux: e.target.value })
                }}
                className={champ}
              />
            </div>
            <div>
              <label htmlFor="prix_unitaire_part" className={etiquette}>{t.share_price_label}</label>
              <input
                type="number"
                name="prix_unitaire_part"
                id="prix_unitaire_part"
                min="0"
                inputMode="decimal"
                value={prixPart}
                onChange={(e) => {
                  setPrixPart(e.target.value)
                  proposer({ prixPart: e.target.value })
                }}
                className={champ}
              />
            </div>
            {part !== null && (
              <p className="sm:col-span-2 rounded-md bg-background px-3 py-2 text-sm text-foreground">
                {t.share_qty} : <span className="font-semibold">{part.toLocaleString()} {uniteObtenue}</span>
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="montant_facture" className={etiquette}>{t.amount_label}</label>
          <input
            type="number"
            name="montant_facture"
            id="montant_facture"
            min="0"
            required
            inputMode="decimal"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className={`${champ} ${mode === 'especes' ? 'opacity-75' : ''}`}
            readOnly={mode === 'especes'}
          />
          <p className="mt-1 text-xs text-foreground-muted">{t.amount_auto_hint}</p>
        </div>
      </fieldset>
    </div>
  )
}
