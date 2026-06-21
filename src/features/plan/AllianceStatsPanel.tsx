import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { Assignment, EventConfig, Signup } from '@/types/wk'
import { computeAllianceStats } from './alliance-stats'

interface AllianceStatsPanelProps {
  event: EventConfig
  signups: Signup[]
  assignments: Assignment[]
  onChange: (patch: Partial<EventConfig>) => void | Promise<void>
}

/**
 * Per-alliance participation dashboard (the old Statistics tab). Sign-up counts
 * and "# in towers" are derived live; the planner enters each alliance's total
 * member count + the minimum-participation line, persisted on the event row
 * (jsonb `alliance_sizes` + `min_participation_pct`). Mirrors the persist
 * pattern of HubDefenderSettings (busy / saved-tick / error).
 */
export function AllianceStatsPanel({
  event,
  signups,
  assignments,
  onChange,
}: AllianceStatsPanelProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [savedNote, setSavedNote] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Local draft of the size inputs so typing doesn't round-trip per keystroke.
  const [sizeDraft, setSizeDraft] = useState<Record<string, string>>({})
  const [minDraft, setMinDraft] = useState<string>(String(event.min_participation_pct))

  useEffect(() => {
    setMinDraft(String(event.min_participation_pct))
  }, [event.min_participation_pct])

  const stats = useMemo(
    () =>
      computeAllianceStats(
        signups,
        assignments,
        event.alliance_sizes ?? {},
        event.min_participation_pct,
      ),
    [signups, assignments, event.alliance_sizes, event.min_participation_pct],
  )

  const persist = async (patch: Partial<EventConfig>) => {
    setBusy(true)
    setSaveError(null)
    const { error } = await supabase.from('events').update(patch).eq('id', event.id)
    if (error) setSaveError(error.message)
    else {
      await onChange(patch)
      setSavedNote(true)
      setTimeout(() => setSavedNote(false), 1800)
    }
    setBusy(false)
  }

  const commitSize = (tag: string) => {
    const raw = sizeDraft[tag]
    if (raw === undefined) return
    const next = { ...(event.alliance_sizes ?? {}) }
    const n = Number(raw.replace(/[.\s,]/g, ''))
    if (!raw.trim() || !Number.isFinite(n) || n <= 0) delete next[tag]
    else next[tag] = Math.round(n)
    // No-op if unchanged.
    if (JSON.stringify(next) === JSON.stringify(event.alliance_sizes ?? {})) return
    void persist({ alliance_sizes: next })
  }

  const commitMin = () => {
    const n = Math.max(0, Math.min(100, Math.round(Number(minDraft) || 0)))
    if (n === event.min_participation_pct) return
    void persist({ min_participation_pct: n })
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Users className="h-3.5 w-3.5" />
          {t('alliance.section_title')}
        </h3>
        {busy ? (
          <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
        ) : savedNote ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            ✓
          </span>
        ) : null}
      </header>

      <div className="mb-2 flex items-center gap-2 text-[11px] text-zinc-400">
        <label className="flex items-center gap-1.5">
          {t('alliance.min_line_label')}
          <input
            type="number"
            min={0}
            max={100}
            value={minDraft}
            onChange={(e) => setMinDraft(e.target.value)}
            onBlur={commitMin}
            className="w-14 rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-center text-xs text-zinc-100 focus:border-yellow-500 focus:outline-none"
          />
          %
        </label>
      </div>

      {stats.length === 0 ? (
        <p className="text-[11px] italic text-zinc-500">{t('alliance.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-zinc-500">
                <th className="px-1 py-0.5 text-left font-medium">{t('alliance.col_tag')}</th>
                <th className="px-1 py-0.5 text-right font-medium">{t('alliance.col_signups')}</th>
                <th className="px-1 py-0.5 text-right font-medium">{t('alliance.col_total')}</th>
                <th className="px-1 py-0.5 text-right font-medium">{t('alliance.col_pct')}</th>
                <th className="px-1 py-0.5 text-right font-medium">{t('alliance.col_towers')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr
                  key={row.tag}
                  className={cn('border-t border-zinc-800/60', row.belowLine && 'bg-red-500/5')}
                >
                  <td className="px-1 py-1 font-mono text-zinc-200">{row.tag}</td>
                  <td className="px-1 py-1 text-right font-mono text-zinc-300">
                    {row.signupCount}
                  </td>
                  <td className="px-1 py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder={t('alliance.total_placeholder')}
                      value={sizeDraft[row.tag] ?? (row.totalMembers != null ? String(row.totalMembers) : '')}
                      onChange={(e) =>
                        setSizeDraft((prev) => ({ ...prev, [row.tag]: e.target.value }))
                      }
                      onBlur={() => commitSize(row.tag)}
                      className="w-14 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-right font-mono text-[11px] text-zinc-100 focus:border-yellow-500 focus:outline-none"
                    />
                  </td>
                  <td
                    className={cn(
                      'px-1 py-1 text-right font-mono',
                      row.belowLine ? 'text-red-400' : 'text-zinc-300',
                    )}
                  >
                    {row.participationPct == null ? '—' : `${row.participationPct.toFixed(0)}%`}
                  </td>
                  <td className="px-1 py-1 text-right font-mono text-zinc-300">{row.inTowers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {saveError && (
        <p
          role="alert"
          className="mt-2 rounded border border-red-500/40 bg-red-500/10 p-1.5 text-[11px] text-red-300"
        >
          {saveError}
        </p>
      )}
    </section>
  )
}
