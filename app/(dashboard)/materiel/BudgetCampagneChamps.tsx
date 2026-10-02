'use client'

export type ContexteBudgetMateriel = {
  campagnes: { id: string; nom: string }[]
  defaultCampagneId: string
  typesRecette: { type: string; materiel: string }[]
  typesDepense: { type: string; materiel: string }[]
}

const champ =
  'mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm'

/** Campagne à laquelle la prestation ou la consommation est imputée (réalisé du budget Matériel de la campagne). */
export function CampagneBudgetSelect({ budget, defaultValue, dict }: { budget: ContexteBudgetMateriel; defaultValue?: string | null; dict: any }) {
  const t = dict.materiel_pages.budget
  return (
    <div>
      <label htmlFor="campagne_id" className="block text-sm font-medium text-foreground">{t.campaign_label}</label>
      <select name="campagne_id" id="campagne_id" defaultValue={defaultValue === undefined ? budget.defaultCampagneId : defaultValue ?? ''} className={champ}>
        <option value="">{t.no_campaign}</option>
        {budget.campagnes.map((c) => (
          <option key={c.id} value={c.id}>{c.nom}</option>
        ))}
      </select>
    </div>
  )
}

/** Sous-rubriques budgétées (types de prestation ou de consommation), proposées à la saisie du type. */
export function TypesBudgetDatalist({ id, types }: { id: string; types: { type: string; materiel: string }[] }) {
  return (
    <datalist id={id}>
      {types.map((x) => (
        <option key={`${x.materiel}::${x.type}`} value={x.type} label={x.materiel} />
      ))}
    </datalist>
  )
}
