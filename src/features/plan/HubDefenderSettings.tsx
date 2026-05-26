import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Shield, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import { Segmented } from '@/components/ui/Segmented'
import type { EventConfig } from '@/types/wk'

interface HubDefenderSettingsProps {
  event: EventConfig
  onChange: (patch: Partial<EventConfig>) => void | Promise<void>
}

const MIN = 0
const MAX = 20

type FillMode = 'fixed' | 'capacity'

/**
 * Planner-side widget that controls Auto-Sort's defender allocation.
 *
 * Two modes:
 *  - **fixed**: park `hub_defender_target` same-type defenders on the Hub.
 *    Turrets fill unbounded with all available same-type leftovers.
 *  - **capacity**: derive defender count from each captain's `rally_size`
 *    (WK domain: captain.rally = building capacity). Hub AND each turret
 *    fill until joiners' rally_size sum approaches the captain's cap.
 *    Surplus same-type players spill into reserve.
 *
 * Re-run Auto-Sort after a change to apply; existing assignments stay
 * untouched until then.
 */
export function HubDefenderSettings({ event, onChange }: HubDefenderSettingsProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<number>(event.hub_defender_target)
  const [busy, setBusy] = useState(false)
  const [savedNote, setSavedNote] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // currentMode is read by handlers below; declared early to make the
  // dependency clear (closures captured it implicitly before).
  const currentMode: FillMode = event.auto_fill_to_capacity ? 'capacity' : 'fixed'

  useEffect(() => {
    setDraft(event.hub_defender_target)
  }, [event.hub_defender_target])

  const clamp = (n: number) => Math.max(MIN, Math.min(MAX, Math.round(n)))

  const persist = async (patch: Partial<EventConfig>) => {
    setBusy(true)
    setSaveError(null)
    const { error } = await supabase.from('events').update(patch).eq('id', event.id)
    if (error) {
      // Common cause: expired JWT (rare now that auto-refresh ships, but
      // the planner shouldn't be left guessing why the toggle "flips back").
      setSaveError(error.message)
    } else {
      await onChange(patch)
      setSavedNote(true)
      setTimeout(() => setSavedNote(false), 1800)
    }
    setBusy(false)
  }

  const onCountBlur = () => {
    const clamped = clamp(draft)
    if (clamped === event.hub_defender_target) return
    void persist({ hub_defender_target: clamped })
  }

  const onModeChange = (mode: FillMode) => {
    if (mode === currentMode) return
    void persist({ auto_fill_to_capacity: mode === 'capacity' })
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Shield className="h-3.5 w-3.5" />
          {t('plan.fill_mode_section')}
        </h3>
        {busy ? (
          <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
        ) : savedNote ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            ✓
          </span>
        ) : null}
      </header>

      <Segmented<FillMode>
        size="sm"
        className="mb-1"
        value={currentMode}
        onChange={onModeChange}
        options={[
          { value: 'fixed', label: t('plan.fill_mode_fixed') },
          { value: 'capacity', label: t('plan.fill_mode_capacity') },
        ]}
      />
      {/* Existing assignments aren't reshuffled on mode/count change — needs
       *  an explicit Auto-Sort re-run. Always-visible hint avoids the
       *  "toggle doesn't do anything" confusion. */}
      <p className="mb-2 text-[10px] uppercase tracking-wider text-amber-400/80">
        {t('plan.fill_mode_rerun_hint')}
      </p>

      {/* Reserve a stable min-height so the section doesn't visibly jump
       *  ~50px when the user toggles between modes (slider+input vs hint
       *  text only). 5.5rem ≈ 88px, matches fixed-mode content height. */}
      <div className="min-h-[5.5rem]">
      {currentMode === 'fixed' ? (
        <>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={1}
              value={draft}
              onChange={(e) => setDraft(clamp(Number(e.target.value)))}
              onMouseUp={onCountBlur}
              onTouchEnd={onCountBlur}
              onKeyUp={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') onCountBlur()
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
              onBlur={onCountBlur}
              className={cn(
                'w-14 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-center text-sm text-zinc-100',
                'focus:border-yellow-500 focus:outline-none',
              )}
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            {t('event_setup.hub_defender_hint')}
          </p>
        </>
      ) : (
        <p className="text-[11px] text-zinc-400">{t('plan.fill_mode_capacity_hint')}</p>
      )}
      </div>
      {saveError ? (
        <p
          role="alert"
          className="mt-2 rounded border border-red-500/40 bg-red-500/10 p-1.5 text-[11px] text-red-300"
        >
          {saveError}
        </p>
      ) : null}
    </section>
  )
}
