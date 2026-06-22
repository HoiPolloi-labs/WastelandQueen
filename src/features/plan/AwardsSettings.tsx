import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { EventConfig } from '@/types/wk'

interface AwardsSettingsProps {
  event: EventConfig
  onChange: (patch: Partial<EventConfig>) => void | Promise<void>
}

/**
 * Planner-side toggle for the post-event self-entry input policy.
 *
 * Off (default): players may type their WK results manually, screenshot
 * optional. On: the self-entry form requires a Personal-Reward screenshot
 * upload (OCR-only, never stored) before a player can submit. Also settable
 * at event creation; mirrors the heroes_enabled dual-placement pattern.
 */
export function AwardsSettings({ event, onChange }: AwardsSettingsProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    setBusy(true)
    const next = !event.awards_require_screenshot
    const { error } = await supabase
      .from('events')
      .update({ awards_require_screenshot: next })
      .eq('id', event.id)
    if (!error) await onChange({ awards_require_screenshot: next })
    setBusy(false)
  }

  const on = event.awards_require_screenshot
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Camera className="h-3.5 w-3.5" />
          {t('plan.awards_settings_label')}
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
            t('plan.awards_settings_on')
          ) : (
            t('plan.awards_settings_off')
          )}
        </button>
      </header>
      <p className="text-[11px] text-zinc-400">{t('plan.awards_settings_hint')}</p>
    </section>
  )
}
