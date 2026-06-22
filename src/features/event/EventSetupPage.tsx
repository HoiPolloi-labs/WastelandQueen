import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { Loader2, Copy, ClipboardCopy, ShieldAlert, Eye, Trophy, ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase, clearEventSession } from '@/lib/supabase'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { PageHeader } from '@/components/ui/PageHeader'
import { nextSaturdayIso, eventIdFromIso, generateEventSalt } from './event-id'
import type { EventConfig, StateGrade, TurretMode } from '@/types/wk'

export function EventSetupPage() {
  const { t } = useTranslation()
  const TURRET_MODES: { value: TurretMode; label: string; hint: string }[] = [
    {
      value: 'duplicate-strongest',
      label: t('event_setup.turret_mode_duplicate_label'),
      hint: t('event_setup.turret_mode_duplicate_hint'),
    },
    {
      value: 'mixed-4th',
      label: t('event_setup.turret_mode_mixed_label'),
      hint: t('event_setup.turret_mode_mixed_hint'),
    },
    {
      value: 'manual',
      label: t('event_setup.turret_mode_manual_label'),
      hint: t('event_setup.turret_mode_manual_hint'),
    },
  ]
  const [params] = useSearchParams()
  const location = useLocation()
  // Source event for clone-mode. Comes either via router state (the PlanPage
  // "Klonen" button passes the already-authenticated event row directly) or
  // via the legacy ?clone=ID query param for bookmarked links. The state
  // path is preferred because the events table is no longer anon-readable
  // post per-event-token RLS.
  const stateCloneFrom = (location.state as { clonedFrom?: EventConfig } | null)?.clonedFrom ?? null
  const cloneFromId = stateCloneFrom?.id ?? params.get('clone')
  const [startsAt, setStartsAt] = useState(() => nextSaturdayIso().slice(0, 16))
  // Salt locked on first render so the displayed eventId is stable across
  // re-renders. Submit reuses the same salt.
  const [salt] = useState(() => generateEventSalt())
  const [turretMode, setTurretMode] = useState<TurretMode>('duplicate-strongest')
  const [homeServer, setHomeServer] = useState('S724')
  const [notes, setNotes] = useState('')
  const [shiftCount, setShiftCount] = useState<number>(2)
  const [hubDefenderTarget, setHubDefenderTarget] = useState<number>(4)
  const [stateGrade, setStateGrade] = useState<StateGrade | null>(null)
  const [governorIgn, setGovernorIgn] = useState('')
  const [assessorIgn, setAssessorIgn] = useState('')
  const [negotiatorIgn, setNegotiatorIgn] = useState('')
  const [foreignTargets, setForeignTargets] = useState('')
  const [heroesEnabled, setHeroesEnabled] = useState(false)
  const [autoFillToCapacity, setAutoFillToCapacity] = useState(false)
  const [requireAwardsScreenshot, setRequireAwardsScreenshot] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const [clonedFrom, setClonedFrom] = useState<string | null>(null)
  const [createdEvent, setCreatedEvent] = useState<EventConfig | null>(null)

  // Defensive: if the user navigated here from an authenticated route, the
  // supabase client may still hold a per-event JWT. Inserting into events as
  // an authenticated role used to fail because the RLS policy only matched
  // anon (now widened in migration 0022 — kept here as belt-and-suspenders).
  useEffect(() => {
    clearEventSession()
  }, [])

  useEffect(() => {
    if (!cloneFromId) return
    const applyClone = (src: EventConfig) => {
      setTurretMode(src.turret_mode)
      setHomeServer(src.home_server)
      setShiftCount(src.shift_count)
      setHubDefenderTarget(src.hub_defender_target)
      setStateGrade(src.state_grade)
      setGovernorIgn(src.governor_ign ?? '')
      setAssessorIgn(src.assessor_ign ?? '')
      setNegotiatorIgn(src.negotiator_ign ?? '')
      setForeignTargets((src.foreign_targets ?? []).join(', '))
      setHeroesEnabled(src.heroes_enabled)
      setAutoFillToCapacity(src.auto_fill_to_capacity)
      setRequireAwardsScreenshot(src.awards_require_screenshot)
      // notes carry over — often the same matchup means same NAP/strategy notes.
      // The "Geklont von" banner cues the planner to review before submit.
      setNotes(src.notes ?? '')
      // discord_webhook_url is a secret + must be re-set per event by the planner
      setClonedFrom(src.id)
    }

    if (stateCloneFrom) {
      applyClone(stateCloneFrom)
      return
    }

    // Legacy ?clone=ID path — anon fetch will only return data if the events
    // table is still anon-readable, which post-token-RLS it isn't. Kept as
    // best-effort fallback for bookmarked links.
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', cloneFromId)
        .maybeSingle()
      if (cancelled || error || !data) return
      applyClone(data as EventConfig)
    })()
    return () => {
      cancelled = true
    }
  }, [cloneFromId, stateCloneFrom])

  // Guard against the user clearing the datetime-local input (empty string)
  // or typing nonsense. Without this, every re-render explodes with
  // `Invalid time value` from Date.toISOString() and unmounts the form.
  const eventId = (() => {
    const d = new Date(startsAt)
    return isNaN(d.getTime()) ? '' : eventIdFromIso(d.toISOString(), salt)
  })()

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const startsDate = new Date(startsAt)
    if (isNaN(startsDate.getTime())) {
      setError(t('event_setup.invalid_start_date'))
      setBusy(false)
      return
    }
    // create_event RPC bypasses RLS for the return path so the freshly
    // generated tokens come back to the client. Direct .insert() fails
    // because PostgREST's implicit SELECT-after-INSERT goes through the
    // event_id_claim()-gated read policy and returns nothing for anon.
    const targets = foreignTargets
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^S\d+$/.test(s))
      .slice(0, 3)
    const { data, error } = await supabase.rpc('create_event', {
      p: {
        id: eventId,
        starts_at_utc: startsDate.toISOString(),
        shift_count: shiftCount,
        hub_defender_target: hubDefenderTarget,
        turret_mode: turretMode,
        home_server: homeServer.toUpperCase(),
        notes: notes || null,
        state_grade: stateGrade,
        governor_ign: governorIgn.trim() || null,
        assessor_ign: assessorIgn.trim() || null,
        negotiator_ign: negotiatorIgn.trim() || null,
        foreign_targets: targets.length > 0 ? targets : null,
        heroes_enabled: heroesEnabled,
        auto_fill_to_capacity: autoFillToCapacity,
        awards_require_screenshot: requireAwardsScreenshot,
      },
    })
    if (error || !data) {
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        setError(t('event_setup.event_exists', { id: eventId }))
      } else {
        setError(error?.message ?? t('event_setup.unknown_error'))
      }
      setBusy(false)
      return
    }
    const ev = data as EventConfig
    // Remember the planner token so the bookmarked /plan/:id route can redirect
    // transparently next visit. Other tokens are public-share-only.
    localStorage.setItem(`tok:planner:${ev.id}`, ev.planner_token)
    setCreatedEvent(ev)
    setBusy(false)
    // NOTE: Discord webhook URL field is intentionally NOT submitted here.
    // The planner sets it from PlanPage settings (separate set_event_secret
    // RPC call) once they're authenticated with the planner JWT.
  }

  if (createdEvent) {
    return <CreatedSuccess event={createdEvent} />
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={t('event_setup.title')}
        subtitle={
          clonedFrom ? (
            <span className="flex items-center gap-1.5 text-yellow-300">
              <Copy className="h-3.5 w-3.5" />
              {t('event_setup.cloned_from', { id: clonedFrom })}
            </span>
          ) : (
            t('event_setup.subtitle')
          )
        }
      />

      <form onSubmit={create} className="flex flex-col gap-4">
        <Input
          label={t('event_setup.start_label')}
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          hint={t('event_setup.event_id_hint', { id: eventId })}
          required
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-sm font-medium text-zinc-300">{t('event_setup.shifts_label')}</span>
            <Segmented
              options={[
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3' },
                { value: 4, label: '4' },
              ]}
              value={shiftCount}
              onChange={setShiftCount}
            />
          </div>
          <Input
            label={t('event_setup.hub_defender_label')}
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={hubDefenderTarget}
            onChange={(e) =>
              setHubDefenderTarget(Math.max(0, Math.min(20, Number(e.target.value) || 0)))
            }
            hint={t('event_setup.hub_defender_hint')}
          />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">
            {t('event_setup.turret_mode_label')}
          </span>
          <div className="flex flex-col gap-2">
            {TURRET_MODES.map((mode) => (
              <label
                key={mode.value}
                className={
                  'flex cursor-pointer items-start gap-3 rounded border bg-zinc-900 p-3 transition ' +
                  (turretMode === mode.value
                    ? 'border-yellow-500'
                    : 'border-zinc-800 hover:border-zinc-700')
                }
              >
                <input
                  type="radio"
                  name="turret-mode"
                  checked={turretMode === mode.value}
                  onChange={() => setTurretMode(mode.value)}
                  className="mt-1 accent-yellow-500"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-100">{mode.label}</span>
                  <span className="mt-0.5 block text-xs text-zinc-400">{mode.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <Input
          label={t('event_setup.home_server_label')}
          value={homeServer}
          onChange={(e) => setHomeServer(e.target.value.toUpperCase())}
          className="font-mono uppercase"
        />

        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">
            {t('event_setup.state_grade_label')} <span className="text-zinc-400">{t('event_setup.state_grade_optional')}</span>
          </span>
          <Segmented
            options={[
              { value: '', label: '—' },
              { value: 'starter', label: t('event_setup.state_grade_starter') },
              { value: 'bronze', label: t('event_setup.state_grade_bronze') },
              { value: 'silver', label: t('event_setup.state_grade_silver') },
              { value: 'gold', label: t('event_setup.state_grade_gold') },
              { value: 'platinum', label: t('event_setup.state_grade_platinum') },
              { value: 'diamond', label: t('event_setup.state_grade_diamond') },
              { value: 'legend', label: t('event_setup.state_grade_legend') },
            ]}
            value={stateGrade ?? ''}
            onChange={(v) => setStateGrade(v === '' ? null : (v as StateGrade))}
          />
          <p className="mt-1 text-xs text-zinc-400">
            {t('event_setup.state_grade_hint')}
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 transition hover:border-zinc-700">
          <input
            type="checkbox"
            checked={heroesEnabled}
            onChange={(e) => setHeroesEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-yellow-500"
          />
          <span className="flex-1">
            <span className="block text-sm font-medium text-zinc-100">
              {t('event_setup.heroes_enabled_label')}
            </span>
            <span className="mt-0.5 block text-xs text-zinc-400">
              {t('event_setup.heroes_enabled_hint')}
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 transition hover:border-zinc-700">
          <input
            type="checkbox"
            checked={autoFillToCapacity}
            onChange={(e) => setAutoFillToCapacity(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-yellow-500"
          />
          <span className="flex-1">
            <span className="block text-sm font-medium text-zinc-100">
              {t('event_setup.auto_fill_label')}
            </span>
            <span className="mt-0.5 block text-xs text-zinc-400">
              {t('event_setup.auto_fill_hint')}
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 transition hover:border-zinc-700">
          <input
            type="checkbox"
            checked={requireAwardsScreenshot}
            onChange={(e) => setRequireAwardsScreenshot(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-yellow-500"
          />
          <span className="flex-1">
            <span className="block text-sm font-medium text-zinc-100">
              {t('event_setup.awards_screenshot_label')}
            </span>
            <span className="mt-0.5 block text-xs text-zinc-400">
              {t('event_setup.awards_screenshot_hint')}
            </span>
          </span>
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label={t('event_setup.governor_label')}
            value={governorIgn}
            onChange={(e) => setGovernorIgn(e.target.value)}
            placeholder={t('event_setup.ign_placeholder')}
            hint={t('event_setup.governor_hint')}
          />
          <Input
            label={t('event_setup.assessor_label')}
            value={assessorIgn}
            onChange={(e) => setAssessorIgn(e.target.value)}
            placeholder={t('event_setup.ign_placeholder')}
            hint={t('event_setup.assessor_hint')}
          />
          <Input
            label={t('event_setup.negotiator_label')}
            value={negotiatorIgn}
            onChange={(e) => setNegotiatorIgn(e.target.value)}
            placeholder={t('event_setup.ign_placeholder')}
            hint={t('event_setup.negotiator_hint')}
          />
        </div>

        <Input
          label={t('event_setup.foreign_targets_label')}
          value={foreignTargets}
          onChange={(e) => setForeignTargets(e.target.value.toUpperCase())}
          placeholder="S850, S612"
          className="font-mono uppercase"
          hint={t('event_setup.foreign_targets_hint')}
        />
        {/* DOMAIN warning — WK guide doctrine: "concentrate on weakest opponent state".
            Splitting Hit-Squad across multiple foreign targets dilutes the attack
            below the threshold needed to actually take any Hub, costing the home
            Hub its automatic foreign-Hub-capture shield. Show only when the user
            entered 2+ targets. */}
        {foreignTargets
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter((s) => /^S\d+$/.test(s)).length > 1 && (
          <p className="-mt-2 flex items-start gap-1.5 rounded border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{t('event_setup.foreign_targets_warning')}</span>
          </p>
        )}

        <p className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-400">
          {t('event_setup.webhook_planner_hint')}
        </p>

        <Textarea
          label={t('event_setup.notes_label')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t('event_setup.notes_placeholder')}
        />

        {error && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" disabled={busy} className="mt-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('event_setup.submit_button')}
        </Button>
      </form>
    </div>
  )
}

/**
 * After-create screen showing all three role-scoped URLs.
 *
 * Critical UX: the planner URL is the ONLY admin entry-point — if it's lost,
 * the event becomes unrecoverable (the legacy URL fallback only works if the
 * token is in this browser's localStorage). We make the warning loud here so
 * the user copies it somewhere durable before leaving.
 */
function CreatedSuccess({ event }: { event: EventConfig }) {
  const { t } = useTranslation()
  const origin = window.location.origin
  const urls = {
    planner: `${origin}/plan/${event.id}/${event.planner_token}`,
    signup: `${origin}/signup/${event.id}/${event.signup_token}`,
    board: `${origin}/board/${event.id}/${event.board_token}`,
  }
  // Short variants for chat-friendly sharing. Resolve to the long URL via
  // a Vercel rewrite → Supabase edge function. Planner/awards intentionally
  // skipped — those tokens grant write access.
  const shortUrls = {
    signup: `${origin}/s/${event.id}`,
    board: `${origin}/b/${event.id}`,
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t('event_setup.success_title', { id: event.id })}
        subtitle={t('event_setup.success_subtitle')}
      />

      <div className="mb-4 flex items-start gap-2 rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>{t('event_setup.success_warning')}</span>
      </div>

      <div className="flex flex-col gap-3">
        <UrlCard
          icon={<ClipboardList className="h-4 w-4" />}
          label={t('event_setup.success_planner_label')}
          tone="amber"
          url={urls.planner}
          to={`/plan/${event.id}/${event.planner_token}`}
        />
        <UrlCard
          icon={<ClipboardCopy className="h-4 w-4" />}
          label={t('event_setup.success_signup_label')}
          tone="sky"
          url={urls.signup}
          shortUrl={shortUrls.signup}
        />
        <UrlCard
          icon={<Eye className="h-4 w-4" />}
          label={t('event_setup.success_board_label')}
          tone="emerald"
          url={urls.board}
          shortUrl={shortUrls.board}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <Link
          to={`/awards/${event.id}/${event.planner_token}`}
          className="text-zinc-400 hover:text-zinc-200"
        >
          <Trophy className="mr-1 inline h-3 w-3" />
          {t('event_setup.success_awards_link')}
        </Link>
      </div>
    </div>
  )
}

function UrlCard({
  icon,
  label,
  url,
  shortUrl,
  tone,
  to,
}: {
  icon: React.ReactNode
  label: string
  url: string
  /** Short variant for chat-friendly sharing. When set, both URLs render and
   *  the short one gets its own copy button. */
  shortUrl?: string
  tone: 'amber' | 'sky' | 'emerald'
  to?: string
}) {
  const { t } = useTranslation()
  const toneClass =
    tone === 'amber'
      ? 'border-amber-500/40 bg-amber-500/5'
      : tone === 'sky'
        ? 'border-sky-500/40 bg-sky-500/5'
        : 'border-emerald-500/40 bg-emerald-500/5'
  return (
    <div className={`flex items-start gap-3 rounded border ${toneClass} p-3`}>
      <div className="mt-0.5 text-zinc-300">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          {label}
        </div>
        <code className="block truncate font-mono text-[11px] text-zinc-400" title={url}>
          {url}
        </code>
        {shortUrl && (
          <div className="mt-1 flex items-center gap-1.5">
            <code
              className="block truncate font-mono text-[11px] text-zinc-200"
              title={shortUrl}
            >
              {shortUrl}
            </code>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(shortUrl)}
              title={t('event_setup.success_copy_short_title')}
              className="rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void navigator.clipboard.writeText(url)}
        title={t('event_setup.success_copy_title')}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      {to && (
        <Link to={to}>
          <Button variant="primary" size="sm">
            {t('event_setup.success_open_button')}
          </Button>
        </Link>
      )}
    </div>
  )
}
