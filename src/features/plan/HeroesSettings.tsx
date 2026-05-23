import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { EventConfig } from '@/types/wk'

interface HeroesSettingsProps {
  event: EventConfig
  onChange: (patch: Partial<EventConfig>) => void | Promise<void>
}

/**
 * Tiny planner-side toggle for the optional hero-frag inventory feature.
 *
 * Off by default. Flip on for Gold+ states coordinating Nataly / Agent X /
 * Dr. J progression — Signup grows three numeric inputs and Awards shows
 * alliance-wide totals. Off-state keeps the columns at 0 silently.
 */
export function HeroesSettings({ event, onChange }: HeroesSettingsProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    setBusy(true)
    const next = !event.heroes_enabled
    const { error } = await supabase
      .from('events')
      .update({ heroes_enabled: next })
      .eq('id', event.id)
    if (!error) await onChange({ heroes_enabled: next })
    setBusy(false)
  }

  const on = event.heroes_enabled
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Sparkles className="h-3.5 w-3.5" />
          {t('plan.heroes_settings_label')}
        </h3>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={cn(
            'rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition',
            on
              ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
              : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
            busy && 'opacity-60',
          )}
        >
          {busy ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : on ? (
            t('plan.heroes_settings_on')
          ) : (
            t('plan.heroes_settings_off')
          )}
        </button>
      </header>
      <p className="text-[11px] text-zinc-400">{t('plan.heroes_settings_hint')}</p>
    </section>
  )
}
