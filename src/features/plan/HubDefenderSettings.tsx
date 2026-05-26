import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Shield, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { EventConfig } from '@/types/wk'

interface HubDefenderSettingsProps {
  event: EventConfig
  onChange: (patch: Partial<EventConfig>) => void | Promise<void>
}

const MIN = 0
const MAX = 20

/**
 * Planner-side adjuster for `event.hub_defender_target` — how many same-type
 * defenders Auto-Sort parks on the Hub alongside the captain.
 *
 * EventSetupPage exposes this at create-time, but mid-event the planner
 * often wants to crank it up ("fortify the Hub") or down ("free up turret
 * captains"). Persists straight via `events` update — planner JWT has full
 * CRUD on its own event row.
 *
 * Re-running Auto-Sort after a change applies the new count; existing
 * assignments are untouched until that re-run.
 */
export function HubDefenderSettings({ event, onChange }: HubDefenderSettingsProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<number>(event.hub_defender_target)
  const [busy, setBusy] = useState(false)
  const [savedNote, setSavedNote] = useState(false)

  // Stay in sync with realtime updates from other tabs / planner sessions.
  useEffect(() => {
    setDraft(event.hub_defender_target)
  }, [event.hub_defender_target])

  const clamp = (n: number) => Math.max(MIN, Math.min(MAX, Math.round(n)))

  const persist = async (next: number) => {
    if (next === event.hub_defender_target) return
    setBusy(true)
    const { error } = await supabase
      .from('events')
      .update({ hub_defender_target: next })
      .eq('id', event.id)
    if (!error) {
      await onChange({ hub_defender_target: next })
      setSavedNote(true)
      setTimeout(() => setSavedNote(false), 1800)
    }
    setBusy(false)
  }

  const onBlur = () => void persist(clamp(draft))

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Shield className="h-3.5 w-3.5" />
          {t('event_setup.hub_defender_label')}
        </h3>
        {busy ? (
          <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
        ) : savedNote ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            ✓
          </span>
        ) : null}
      </header>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={1}
          value={draft}
          onChange={(e) => setDraft(clamp(Number(e.target.value)))}
          onMouseUp={onBlur}
          onTouchEnd={onBlur}
          onKeyUp={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') onBlur()
          }}
          className="flex-1 accent-yellow-500"
          aria-label={t('event_setup.hub_defender_label')}
        />
        <input
          type="number"
          min={MIN}
          max={MAX}
          step={1}
          value={draft}
          onChange={(e) => setDraft(clamp(Number(e.target.value) || 0))}
          onBlur={onBlur}
          className={cn(
            'w-14 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-center text-sm text-zinc-100',
            'focus:border-yellow-500 focus:outline-none',
          )}
        />
      </div>
      <p className="mt-2 text-[11px] text-zinc-400">{t('event_setup.hub_defender_hint')}</p>
    </section>
  )
}
