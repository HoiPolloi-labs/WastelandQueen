import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { Loader2, Copy, ClipboardCopy, ShieldAlert, Eye, Trophy, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { PageHeader } from '@/components/ui/PageHeader'
import { nextSaturdayIso, eventIdFromIso } from './event-id'
import type { EventConfig, StateGrade, TurretMode } from '@/types/wk'

const TURRET_MODES: { value: TurretMode; label: string; hint: string }[] = [
  {
    value: 'duplicate-strongest',
    label: 'Stärksten Typ doppelt',
    hint: 'Der häufigste Typ bekommt 2 Türme, die anderen je 1.',
  },
  {
    value: 'mixed-4th',
    label: '4. Turm gemischt',
    hint: '3 Türme typ-rein, 4. Turm = Leftovers.',
  },
  { value: 'manual', label: 'Manuell', hint: 'Alle Spieler landen in Unassigned.' },
]

export function EventSetupPage() {
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const [clonedFrom, setClonedFrom] = useState<string | null>(null)
  const [createdEvent, setCreatedEvent] = useState<EventConfig | null>(null)

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

  const eventId = eventIdFromIso(new Date(startsAt).toISOString())

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { data, error } = await supabase
      .from('events')
      .insert({
        id: eventId,
        starts_at_utc: new Date(startsAt).toISOString(),
        shift_count: shiftCount,
        hub_defender_target: hubDefenderTarget,
        turret_mode: turretMode,
        home_server: homeServer.toUpperCase(),
        notes: notes || null,
        state_grade: stateGrade,
        governor_ign: governorIgn.trim() || null,
        assessor_ign: assessorIgn.trim() || null,
        negotiator_ign: negotiatorIgn.trim() || null,
        foreign_targets: foreignTargets
          .split(/[,\s]+/)
          .map((s) => s.trim().toUpperCase())
          .filter((s) => /^S\d+$/.test(s))
          .slice(0, 3) // doc: up to 3 opposing states
          .reduce<string[] | null>((acc, s) => (acc ? [...acc, s] : [s]), null),
      })
      .select('*')
      .single()
    if (error || !data) {
      if (error?.code === '23505') {
        setError(`Event ${eventId} existiert schon — gehe direkt zum Planner.`)
      } else {
        setError(error?.message ?? 'unknown error')
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
        title="Neues WK-Event"
        subtitle={
          clonedFrom ? (
            <span className="flex items-center gap-1.5 text-yellow-300">
              <Copy className="h-3.5 w-3.5" />
              Geklont von {clonedFrom} — Datum und Notes anpassen.
            </span>
          ) : (
            'Lege Datum, Modus und Server fest.'
          )
        }
      />

      <form onSubmit={create} className="flex flex-col gap-4">
        <Input
          label="Start (UTC)"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          hint={`Event-ID wird ${eventId}`}
          required
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-sm font-medium text-zinc-300">Shifts</span>
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
            label="Hub-Defender (zusätzlich zum Captain)"
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={hubDefenderTarget}
            onChange={(e) =>
              setHubDefenderTarget(Math.max(0, Math.min(20, Number(e.target.value) || 0)))
            }
            hint="Auto-Sort parkt N Defender vom Captain-Typ auf dem Hub"
          />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">
            Turm-Verteilungsmodus
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
          label="Home Server"
          value={homeServer}
          onChange={(e) => setHomeServer(e.target.value.toUpperCase())}
          className="font-mono uppercase"
        />

        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">
            State Grade <span className="text-zinc-400">(optional)</span>
          </span>
          <Segmented
            options={[
              { value: '', label: '—' },
              { value: 'starter', label: 'Starter' },
              { value: 'bronze', label: 'Bronze' },
              { value: 'silver', label: 'Silver' },
              { value: 'gold', label: 'Gold' },
              { value: 'platinum', label: 'Platinum' },
              { value: 'diamond', label: 'Diamond' },
              { value: 'legend', label: 'Legend' },
            ]}
            value={stateGrade ?? ''}
            onChange={(v) => setStateGrade(v === '' ? null : (v as StateGrade))}
          />
          <p className="mt-1 text-xs text-zinc-400">
            Gold+ schaltet Nataly-Frags frei und erzwingt offensive Strategie (Trophy-Verlust ohne foreign-Hub-Capture).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Governor"
            value={governorIgn}
            onChange={(e) => setGovernorIgn(e.target.value)}
            placeholder="IGN"
            hint="Erbt Award-Boxes"
          />
          <Input
            label="Assessor"
            value={assessorIgn}
            onChange={(e) => setAssessorIgn(e.target.value)}
            placeholder="IGN"
            hint="Entscheidet NAP vs War"
          />
          <Input
            label="Negotiator"
            value={negotiatorIgn}
            onChange={(e) => setNegotiatorIgn(e.target.value)}
            placeholder="IGN"
            hint="Battle-Division-Chat"
          />
        </div>

        <Input
          label="Foreign Targets (optional)"
          value={foreignTargets}
          onChange={(e) => setForeignTargets(e.target.value.toUpperCase())}
          placeholder="S850, S612"
          className="font-mono uppercase"
          hint="Bis zu 3 gegnerische States für Hit-Squad-Ziele. Komma- oder Space-getrennt."
        />

        <p className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-400">
          Discord-Webhook setzt du im Planner — nicht hier. So bleibt die URL hinter
          deinem Planner-Token sicher.
        </p>

        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="NAP-Status, Matchup, etc."
        />

        {error && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" disabled={busy} className="mt-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Event anlegen'}
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
  const origin = window.location.origin
  const urls = {
    planner: `${origin}/plan/${event.id}/${event.planner_token}`,
    signup: `${origin}/signup/${event.id}/${event.signup_token}`,
    board: `${origin}/board/${event.id}/${event.board_token}`,
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Event ${event.id} angelegt`}
        subtitle="Drei URLs, eine pro Rolle. Vor Verlassen kopieren."
      />

      <div className="mb-4 flex items-start gap-2 rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>
          Der <strong>Planner-Link</strong> ist dein einziger Admin-Zugang. Wenn er
          verloren geht, hat niemand mehr Schreibzugriff auf das Event. Bookmarke
          ihn jetzt — wir merken ihn in diesem Browser, aber das ist der einzige
          Backup.
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <UrlCard
          icon={<ClipboardList className="h-4 w-4" />}
          label="Planner — DU"
          tone="amber"
          url={urls.planner}
          to={`/plan/${event.id}/${event.planner_token}`}
        />
        <UrlCard
          icon={<ClipboardCopy className="h-4 w-4" />}
          label="Sign-up — für Spieler (Discord)"
          tone="sky"
          url={urls.signup}
        />
        <UrlCard
          icon={<Eye className="h-4 w-4" />}
          label="Board — read-only (Discord)"
          tone="emerald"
          url={urls.board}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <Link
          to={`/awards/${event.id}/${event.planner_token}`}
          className="text-zinc-400 hover:text-zinc-200"
        >
          <Trophy className="mr-1 inline h-3 w-3" />
          Awards-Link (auch planner-gated)
        </Link>
      </div>
    </div>
  )
}

function UrlCard({
  icon,
  label,
  url,
  tone,
  to,
}: {
  icon: React.ReactNode
  label: string
  url: string
  tone: 'amber' | 'sky' | 'emerald'
  to?: string
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-500/40 bg-amber-500/5'
      : tone === 'sky'
        ? 'border-sky-500/40 bg-sky-500/5'
        : 'border-emerald-500/40 bg-emerald-500/5'
  return (
    <div className={`flex items-center gap-3 rounded border ${toneClass} p-3`}>
      <div className="text-zinc-300">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          {label}
        </div>
        <code className="block truncate font-mono text-[11px] text-zinc-400" title={url}>
          {url}
        </code>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void navigator.clipboard.writeText(url)}
        title="In Zwischenablage kopieren"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      {to && (
        <Link to={to}>
          <Button variant="primary" size="sm">
            Öffnen
          </Button>
        </Link>
      )}
    </div>
  )
}
