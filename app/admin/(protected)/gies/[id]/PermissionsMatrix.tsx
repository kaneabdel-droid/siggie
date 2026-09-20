'use client'

import {
  ALL_ACTIONS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_MODULES,
  fullPermissions,
  readOnlyPermissions,
  type PermissionAction,
  type PermissionMap,
} from '@/lib/permissions'

// Matrice pages × actions : une ligne par page/module, une colonne par action.
export default function PermissionsMatrix({
  value,
  onChange,
  disabled,
}: {
  value: PermissionMap
  onChange: (next: PermissionMap) => void
  disabled?: boolean
}) {
  const has = (key: string, action: PermissionAction) => value[key]?.includes(action) ?? false

  const toggle = (key: string, action: PermissionAction) => {
    const mod = PERMISSION_MODULES.find((m) => m.key === key)!
    const current = new Set(value[key] ?? [])
    if (current.has(action)) {
      current.delete(action)
      // Retirer la lecture retire aussi les actions d'écriture (elles n'ont pas de sens seules).
      if (action === 'read') current.clear()
    } else {
      current.add(action)
      if (action !== 'read' && mod.actions.includes('read')) current.add('read')
    }
    const next = { ...value }
    if (current.size === 0) delete next[key]
    else next[key] = mod.actions.filter((a) => current.has(a))
    onChange(next)
  }

  const toggleRow = (key: string) => {
    const mod = PERMISSION_MODULES.find((m) => m.key === key)!
    const all = mod.actions.every((a) => has(key, a))
    const next = { ...value }
    if (all) delete next[key]
    else next[key] = [...mod.actions]
    onChange(next)
  }

  const toggleColumn = (action: PermissionAction) => {
    const mods = PERMISSION_MODULES.filter((m) => m.actions.includes(action))
    const all = mods.every((m) => has(m.key, action))
    const next: PermissionMap = { ...value }
    for (const m of mods) {
      const current = new Set(next[m.key] ?? [])
      if (all) {
        current.delete(action)
        if (action === 'read') current.clear()
      } else {
        current.add(action)
        if (action !== 'read' && m.actions.includes('read')) current.add('read')
      }
      if (current.size === 0) delete next[m.key]
      else next[m.key] = m.actions.filter((a) => current.has(a))
    }
    onChange(next)
  }

  const groups = Array.from(new Set(PERMISSION_MODULES.map((m) => m.group)))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" disabled={disabled} onClick={() => onChange(fullPermissions())} className="rounded-md bg-surface-border px-2 py-1 font-medium text-foreground">
          Tout cocher
        </button>
        <button type="button" disabled={disabled} onClick={() => onChange(readOnlyPermissions())} className="rounded-md bg-surface-border px-2 py-1 font-medium text-foreground">
          Lecture seule
        </button>
        <button type="button" disabled={disabled} onClick={() => onChange({})} className="rounded-md bg-surface-border px-2 py-1 font-medium text-foreground">
          Tout décocher
        </button>
      </div>

      <div className="max-h-80 overflow-auto rounded-md border border-surface-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-surface-border">
              <th className="px-2 py-2 text-left font-medium text-foreground-muted">Page</th>
              {ALL_ACTIONS.map((a) => (
                <th key={a} className="px-1 py-2 text-center font-medium text-foreground-muted">
                  <button type="button" disabled={disabled} onClick={() => toggleColumn(a)} title="Cocher/décocher toute la colonne" className="hover:text-foreground">
                    {PERMISSION_ACTION_LABELS[a]}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <GroupRows key={group} group={group} has={has} toggle={toggle} toggleRow={toggleRow} disabled={disabled} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-foreground-muted">
        Cocher une action d&apos;écriture coche aussi la lecture. Abonnement et Aide &amp; Support restent toujours accessibles.
      </p>
    </div>
  )
}

function GroupRows({
  group,
  has,
  toggle,
  toggleRow,
  disabled,
}: {
  group: string
  has: (key: string, action: PermissionAction) => boolean
  toggle: (key: string, action: PermissionAction) => void
  toggleRow: (key: string) => void
  disabled?: boolean
}) {
  return (
    <>
      <tr className="bg-background/60">
        <td colSpan={ALL_ACTIONS.length + 1} className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
          {group}
        </td>
      </tr>
      {PERMISSION_MODULES.filter((m) => m.group === group).map((m) => (
        <tr key={m.key} className="border-t border-surface-border">
          <td className="px-2 py-1.5">
            <button type="button" disabled={disabled} onClick={() => toggleRow(m.key)} className="text-left text-foreground hover:text-primary" title="Cocher/décocher toute la ligne">
              {m.label}
            </button>
            {m.hint && <div className="text-[11px] text-foreground-muted">{m.hint}</div>}
          </td>
          {ALL_ACTIONS.map((a) => (
            <td key={a} className="px-1 py-1.5 text-center">
              {m.actions.includes(a) ? (
                <input
                  type="checkbox"
                  aria-label={`${m.label} — ${PERMISSION_ACTION_LABELS[a]}`}
                  checked={has(m.key, a)}
                  disabled={disabled}
                  onChange={() => toggle(m.key, a)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
              ) : (
                <span className="text-foreground-muted/40">—</span>
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
