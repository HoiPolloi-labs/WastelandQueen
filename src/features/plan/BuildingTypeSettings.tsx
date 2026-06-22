import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { BuildingTypePins, EventConfig, TroopType } from '@/types/wk'

interface BuildingTypeSettingsProps {
  event: EventConfig
  onChange: (patch: Partial<EventConfig>) => void | Promise<void>
}

type BuildingKey = 'hub' | 'turret-n' | 'turret-e' | 'turret-s' | 'turret-w'

const BUILDINGS: { key: BuildingKey; labelKey: string }[] = [
  { key: 'hub', labelKey: 'plan.building_types_hub' },
  { key: 'turret-n', labelKey: 'plan.building_types_n' },
  { key: 'turret-e', labelKey: 'plan.building_types_e' },
  { key: 'turret-s', labelKey: 'plan.building_types_s' },
  { key: 'turret-w', labelKey: 'plan.building_types_w' },
]

const TYPES: TroopType[] = ['fighter', 'shooter', 'rider']
const TYPE_LABEL: Record<TroopType, string> = {
  fighter: 'Fighter',
  shooter: 'Shooter',
  rider: 'Rider',
}

/**
 * Planner-side per-building troop-type pinning. Lets the planner fix each
 * building (Hub + 4 turrets) to a troop type so Auto-Sort fills that type's
 * captain + defenders there, identical across all shifts — mirroring a state's
 * fixed defensive layout (e.g. Hub=Rider, N=Shooter, E=Fighter, S=Rider,
 * W=Shooter). "Auto" leaves it to the turret_mode / strongest-captain logic.
 */
export function BuildingTypeSettings({ event, onChange }: BuildingTypeSettingsProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const pins = event.building_types ?? {}

  const setPin = async (building: BuildingKey, type: TroopType | '') => {
    setBusy(true)
    const next: BuildingTypePins = { ...pins }
    if (type) next[building] = type
    else delete next[building]
    const { error } = await supabase
      .from('events')
      .update({ building_types: next })
      .eq('id', event.id)
    if (!error) await onChange({ building_types: next })
    setBusy(false)
  }

  const anyPinned = BUILDINGS.some((b) => pins[b.key])

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <LayoutGrid className="h-3.5 w-3.5" />
          {t('plan.building_types_label')}
          {busy && <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />}
        </h3>
      </header>
      <div className="flex flex-col gap-1.5">
        {BUILDINGS.map(({ key, labelKey }) => (
          <label key={key} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-zinc-300">{t(labelKey)}</span>
            <select
              value={pins[key] ?? ''}
              onChange={(e) => void setPin(key, e.target.value as TroopType | '')}
              disabled={busy}
              className={cn(
                'rounded border bg-zinc-900 px-1.5 py-0.5 text-[11px] text-zinc-100',
                pins[key] ? 'border-yellow-600/60 text-yellow-200' : 'border-zinc-700 text-zinc-400',
              )}
            >
              <option value="">{t('plan.building_types_auto')}</option>
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {TYPE_LABEL[ty]}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-zinc-400">
        {anyPinned ? t('plan.building_types_hint_on') : t('plan.building_types_hint')}
      </p>
    </section>
  )
}
