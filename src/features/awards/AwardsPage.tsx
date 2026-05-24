import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router'
import {
  Loader2,
  Trophy,
  Crown,
  Wand2,
  Eraser,
  Download,
  ArrowLeft,
  Sword,
  Coins,
  Sparkles,
  Calculator,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useEvent } from '@/features/event/use-event'
import { useSignups } from '@/features/plan/use-signups'
import { useAssignments } from '@/features/plan/use-assignments'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Input, Textarea } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import type { BoxTier, EventConfig, Signup } from '@/types/wk'
import { BOX_TIER_LABELS } from '@/types/wk'
import { computeAwardCandidates } from './contribution'
import { useBoxCounts } from './use-box-counts'
import { PointCalcModal } from './PointCalcModal'

const TIER_ORDER: BoxTier[] = ['king', 'rulers', 'loyalty', 'contribution']

const TIER_TONE: Record<BoxTier, string> = {
  king: 'border-yellow-500/60 bg-yellow-500/15 text-yellow-200',
  rulers: 'border-purple-500/50 bg-purple-500/10 text-purple-200',
  loyalty: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200',
  contribution: 'border-sky-500/50 bg-sky-500/10 text-sky-200',
}

export function AwardsPage() {
  const { t, i18n } = useTranslation()
  const { eventId } = useParams<{ eventId: string }>()
  const { event, loading: eventLoading, refresh: refreshEvent } = useEvent(eventId)
  const { signups, refresh: refreshSignups } = useSignups(eventId)
  const { assignments } = useAssignments(eventId)
  const { counts, update: updateBoxCount } = useBoxCounts(eventId)
  const [busy, setBusy] = useState(false)
  const [calcModal, setCalcModal] = useState<{
    kind: 'kill' | 'death'
    signupId: string
  } | null>(null)

  const candidates = useMemo(() => {
    if (!event) return []
    return computeAwardCandidates(signups, assignments, event)
  }, [signups, assignments, event])

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  if (!event) {
    return (
      <div className="text-center text-zinc-400">
        {t('awards.event_not_found')}{' '}
        <Link to="/plan/new" className="text-yellow-400 underline">
          {t('awards.create_new_link')}
        </Link>
      </div>
    )
  }

  // CODE-REVIEW fix: wrap async writes in try/finally so any DB throw
  // releases setBusy. Previously a transient error stranded the toolbar
  // in busy state forever.
  const updateSignup = async (id: string, patch: Partial<Signup>) => {
    setBusy(true)
    try {
      await supabase.from('signups').update(patch).eq('id', id)
      await refreshSignups()
    } finally {
      setBusy(false)
    }
  }

  const updateEvent = async (patch: Partial<EventConfig>) => {
    if (!event) return
    setBusy(true)
    try {
      await supabase.from('events').update(patch).eq('id', event.id)
      await refreshEvent()
    } finally {
      setBusy(false)
    }
  }

  const assignedByTier: Record<BoxTier, number> = {
    king: 0,
    rulers: 0,
    loyalty: 0,
    contribution: 0,
  }
  for (const c of candidates) {
    if (c.signup.box_tier) assignedByTier[c.signup.box_tier]++
  }

  const autoAssign = async () => {
    if (!confirm(t('awards.confirm_autoassign'))) return
    setBusy(true)
    try {
      // top-N by score per tier, order king > rulers > loyalty > contribution.
      // No-shows (attended === false) are never awarded.
      const eligible = candidates.filter((c) => c.signup.attended !== false)
      const ineligible = candidates.filter((c) => c.signup.attended === false)

      const updates: { id: string; tier: BoxTier | null }[] = [
        ...eligible.map((c) => ({ id: c.signup.id, tier: null as BoxTier | null })),
        ...ineligible.map((c) => ({ id: c.signup.id, tier: null as BoxTier | null })),
      ]
      let cursor = 0
      for (const tier of TIER_ORDER) {
        for (let i = 0; i < counts[tier] && cursor < eligible.length; i++, cursor++) {
          updates[cursor]!.tier = tier
        }
      }
      await Promise.all(
        updates.map((u) =>
          supabase.from('signups').update({ box_tier: u.tier }).eq('id', u.id),
        ),
      )
      await refreshSignups()
    } finally {
      setBusy(false)
    }
  }

  const clearAll = async () => {
    if (!confirm(t('awards.confirm_clear_all'))) return
    setBusy(true)
    try {
      await supabase
        .from('signups')
        .update({ box_tier: null })
        .eq('event_id', event.id)
      await refreshSignups()
    } finally {
      setBusy(false)
    }
  }

  const exportMarkdown = () => {
    const lines: string[] = [
      `# Award Distribution — ${event.id}`,
      `_Generated ${new Date().toLocaleString(i18n.language)}_`,
      '',
    ]
    for (const tier of TIER_ORDER) {
      const recipients = candidates.filter((c) => c.signup.box_tier === tier)
      if (recipients.length === 0) continue
      lines.push(`## ${BOX_TIER_LABELS[tier]} (${recipients.length}/${counts[tier]})`)
      for (const c of recipients) {
        lines.push(
          `- **${c.signup.ign}** [${c.signup.alliance_tag}] — score ${c.score} (cap ${c.captainCount}, shifts ${c.shiftCount}, pts ${c.personalPoints})`,
        )
      }
      lines.push('')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `awards-${event.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title={t('awards.title_prefix', { eventId: event.id })}
        subtitle={
          event.governor_ign ? (
            <span>
              {t('awards.subtitle_governor')} <span className="text-yellow-300">{event.governor_ign}</span>
            </span>
          ) : (
            t('awards.subtitle_default')
          )
        }
      >
        <Link to={`/plan/${event.id}`}>
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('awards.planner_button')}
          </Button>
        </Link>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TIER_ORDER.map((tier) => (
          <div
            key={tier}
            className={cn(
              'flex flex-col gap-1 rounded-lg border p-3',
              TIER_TONE[tier],
            )}
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
              <span>{BOX_TIER_LABELS[tier]}</span>
              <Trophy className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold">{assignedByTier[tier]}</span>
              <span className="text-xs opacity-60">/ </span>
              <input
                type="number"
                min={0}
                value={counts[tier]}
                onChange={(e) => updateBoxCount(tier, Number(e.target.value) || 0)}
                className="w-12 bg-transparent text-sm focus:outline-none"
                aria-label={t('awards.boxes_anzahl_aria', { tier })}
              />
            </div>
          </div>
        ))}
      </div>

      <GovernorPanel event={event} signups={signups} onChange={updateEvent} />

      {event.heroes_enabled && <HeroesPanel signups={signups} />}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-400">
          {t('awards.summary_count', {
            count: candidates.length,
            attended: candidates.filter((c) => c.signup.attended === true).length,
            distributed: candidates.filter((c) => c.signup.box_tier).length,
          })}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={exportMarkdown}>
            <Download className="h-3.5 w-3.5" />
            {t('awards.export_md_button')}
          </Button>
          <Button variant="primary" size="sm" onClick={autoAssign} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {t('awards.auto_assign_button')}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <Eraser className="h-3.5 w-3.5" />
            {t('awards.clear_button')}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="min-w-full text-xs">
          <thead className="bg-zinc-900 text-left text-zinc-300">
            <tr>
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">IGN</th>
              <th className="px-2 py-2 text-right">{t('awards.table_score')}</th>
              <th className="px-2 py-2 text-center">{t('awards.table_attended')}</th>
              <th className="px-2 py-2 text-center" title={t('awards.table_cap_count_title')}>{t('awards.table_captain')}</th>
              <th className="px-2 py-2 text-center" title={t('awards.table_shift_count_title')}>{t('awards.table_shifts')}</th>
              <th className="px-2 py-2">{t('awards.table_kill')}</th>
              <th className="px-2 py-2">{t('awards.table_death')}</th>
              <th className="px-2 py-2">{t('awards.table_occ')}</th>
              <th className="px-2 py-2 text-right" title={t('awards.table_total_title')}>{t('awards.table_total')}</th>
              <th
                className="px-2 py-2"
                title={t('awards.table_mlost_title')}
              >
                {t('awards.table_mlost')}
              </th>
              <th
                className="px-2 py-2 text-right"
                title={t('awards.table_fc_cap_title')}
              >
                {t('awards.table_fc_cap')}
              </th>
              <th className="px-2 py-2">{t('awards.table_box')}</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, i) => {
              const s = c.signup
              return (
                <tr key={s.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                  <td className="px-2 py-1.5 text-zinc-400">{i + 1}</td>
                  <td className="px-2 py-1.5">
                    <span className="font-medium text-zinc-100">{s.ign}</span>
                    <span className="ml-1 font-mono text-[10px] text-zinc-400">
                      [{s.alliance_tag}]
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold text-yellow-300">
                    {c.score}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={s.attended === true}
                      onChange={(e) =>
                        updateSignup(s.id, { attended: e.target.checked || null })
                      }
                      className="accent-emerald-500"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center text-zinc-400">
                    {c.captainCount > 0 && <Crown className="inline h-3 w-3 text-yellow-400" />}
                    <span className="ml-0.5 font-mono">{c.captainCount}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono text-zinc-400">
                    {c.shiftCount}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-0.5">
                      <PointInput
                        value={s.kill_points}
                        onChange={(v) => updateSignup(s.id, { kill_points: v })}
                      />
                      <button
                        type="button"
                        onClick={() => setCalcModal({ kind: 'kill', signupId: s.id })}
                        title={t('awards.calc_open_kill_title')}
                        className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                      >
                        <Calculator className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-0.5">
                      <PointInput
                        value={s.death_points}
                        onChange={(v) => updateSignup(s.id, { death_points: v })}
                      />
                      <button
                        type="button"
                        onClick={() => setCalcModal({ kind: 'death', signupId: s.id })}
                        title={t('awards.calc_open_death_title')}
                        className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                      >
                        <Calculator className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <PointInput
                      value={s.occupation_points}
                      onChange={(v) => updateSignup(s.id, { occupation_points: v })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {c.personalPoints >= 10000 ? (
                      <span className="text-emerald-300">{c.personalPoints}</span>
                    ) : (
                      <span className="text-zinc-300">{c.personalPoints}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <PointInput
                      value={s.might_lost}
                      step={1_000_000}
                      onChange={(v) => updateSignup(s.id, { might_lost: v })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-[11px] text-amber-300">
                    {s.might_lost > 0 ? formatMight(s.might_lost * 1.2) : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={s.box_tier ?? ''}
                      onChange={(e) =>
                        updateSignup(s.id, {
                          box_tier: (e.target.value || null) as BoxTier | null,
                        })
                      }
                      className={cn(
                        'rounded border bg-zinc-900 px-1.5 py-0.5 text-[11px]',
                        s.box_tier
                          ? TIER_TONE[s.box_tier]
                          : 'border-zinc-800 text-zinc-400',
                      )}
                    >
                      <option value="">—</option>
                      {TIER_ORDER.map((tier) => (
                        <option key={tier} value={tier}>
                          {BOX_TIER_LABELS[tier]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {calcModal && (() => {
        const target = signups.find((s) => s.id === calcModal.signupId)
        if (!target) return null
        return (
          <PointCalcModal
            kind={calcModal.kind}
            current={
              calcModal.kind === 'kill' ? target.kill_points : target.death_points
            }
            ign={target.ign}
            onApply={(total) =>
              updateSignup(target.id, {
                [calcModal.kind === 'kill' ? 'kill_points' : 'death_points']: total,
              } as Partial<Signup>)
            }
            onClose={() => setCalcModal(null)}
          />
        )
      })()}
    </div>
  )
}

function PointInput({
  value,
  onChange,
  step = 100,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  const [local, setLocal] = useState(String(value))
  // CODE-REVIEW fix: sync the local edit-buffer when the prop changes from
  // outside (realtime update, another tab's edit). Previously the value
  // initialised once and stale-locked until the input was focused.
  // Guard against clobbering the user's mid-edit by only re-syncing when
  // the input isn't currently focused.
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocal(String(value))
    }
  }, [value])
  return (
    <Input
      ref={inputRef}
      type="number"
      inputMode="numeric"
      min={0}
      step={step}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = Number(local) || 0
        if (n !== value) onChange(n)
      }}
      className="w-20 px-1 py-0.5 text-right font-mono text-[11px]"
    />
  )
}

/** "12.3M" / "450k" — Fast Comeback caps are 6–9 figures, raw digits unreadable. */
function formatMight(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(Math.round(n))
}

const KING_SWORD_FRAGS: Record<'gold' | 'platinum' | 'diamond', number> = {
  gold: 10,
  platinum: 16,
  diamond: 20,
}

/**
 * Post-event Governor cockpit:
 *   - King's-Sword recipient + grade (single high-rarity box, value frozen at
 *     award-time so re-grading the state later doesn't rewrite history)
 *   - Coffer collection toggle + free-text log
 *
 * Only shown when the event has a captured governor IGN — pre-event there's
 * no chest pool yet so the panel would just be empty placeholders.
 */
function GovernorPanel({
  event,
  signups,
  onChange,
}: {
  event: EventConfig
  signups: Signup[]
  onChange: (patch: Partial<EventConfig>) => void | Promise<void>
}) {
  const { t, i18n } = useTranslation()
  if (!event.governor_ign) return null

  const igns = [...new Set(signups.map((s) => s.ign))].sort((a, b) => a.localeCompare(b))
  const grade = event.king_sword_grade
  const frags = grade ? KING_SWORD_FRAGS[grade] : null

  return (
    <section className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
      <header className="mb-3 flex items-center gap-1.5">
        <Crown className="h-4 w-4 text-yellow-400" />
        <h2 className="text-sm font-semibold text-yellow-200">
          {t('awards.governor_header', { ign: event.governor_ign })}
        </h2>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
              <Sword className="h-3.5 w-3.5 text-amber-400" />
              {t('awards.kings_sword_title')}
            </span>
            {frags !== null && (
              <span className="text-[10px] text-amber-300">{t('awards.kings_sword_frags_suffix', { frags })}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] text-zinc-400">
              {t('awards.kings_sword_recipient_label')}
              <select
                value={event.king_sword_recipient_ign ?? ''}
                onChange={(e) =>
                  void onChange({ king_sword_recipient_ign: e.target.value || null })
                }
                className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
              >
                <option value="">{t('awards.kings_sword_none_option')}</option>
                {igns.map((ign) => (
                  <option key={ign} value={ign}>
                    {ign}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-zinc-400">
              {t('awards.kings_sword_grade_label')}
              <select
                value={event.king_sword_grade ?? ''}
                onChange={(e) =>
                  void onChange({
                    king_sword_grade:
                      (e.target.value as 'gold' | 'platinum' | 'diamond') || null,
                  })
                }
                className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
              >
                <option value="">{t('awards.kings_sword_grade_unset')}</option>
                <option value="gold">{t('awards.kings_sword_gold')}</option>
                <option value="platinum">{t('awards.kings_sword_platinum')}</option>
                <option value="diamond">{t('awards.kings_sword_diamond')}</option>
              </select>
            </label>
          </div>
        </div>

        <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
              <Coins className="h-3.5 w-3.5 text-emerald-400" />
              {t('awards.coffer_title')}
            </span>
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-300">
              <input
                type="checkbox"
                checked={Boolean(event.coffer_collected_at)}
                onChange={(e) =>
                  void onChange({
                    coffer_collected_at: e.target.checked
                      ? new Date().toISOString()
                      : null,
                  })
                }
                className="accent-emerald-500"
              />
              {t('awards.coffer_collected')}
            </label>
          </div>
          {event.coffer_collected_at && (
            <p className="mb-2 text-[10px] text-emerald-300">
              {new Date(event.coffer_collected_at).toLocaleString(i18n.language)}
            </p>
          )}
          <Textarea
            value={event.coffer_notes ?? ''}
            onChange={(e) => void onChange({ coffer_notes: e.target.value || null })}
            rows={3}
            placeholder={t('awards.coffer_notes_placeholder')}
          />
        </div>
      </div>
    </section>
  )
}

/**
 * Alliance-wide hero-fragment totals. Only rendered when `event.heroes_enabled`.
 * Pulled live from each Signup's `agent_x_frags` / `dr_j_frags` / `nataly_frags`
 * — no separate aggregate table, the planner sees what players self-reported.
 */
function HeroesPanel({ signups }: { signups: Signup[] }) {
  const { t } = useTranslation()
  const totals = signups.reduce(
    (acc, s) => {
      acc.agent_x += s.agent_x_frags
      acc.dr_j += s.dr_j_frags
      acc.nataly += s.nataly_frags
      return acc
    },
    { agent_x: 0, dr_j: 0, nataly: 0 },
  )
  return (
    <section className="mb-4 rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
      <header className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-purple-300" />
        <h2 className="text-sm font-semibold text-purple-200">{t('awards.heroes_title')}</h2>
      </header>
      <div className="grid grid-cols-3 gap-2 text-center">
        <HeroStat label={t('awards.heroes_total_agent_x')} value={totals.agent_x} />
        <HeroStat label={t('awards.heroes_total_dr_j')} value={totals.dr_j} />
        <HeroStat label={t('awards.heroes_total_nataly')} value={totals.nataly} />
      </div>
    </section>
  )
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/60 p-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </div>
      <div className="font-mono text-lg text-purple-100">{value.toLocaleString()}</div>
    </div>
  )
}
