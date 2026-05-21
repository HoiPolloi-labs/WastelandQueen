import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { PageHeader } from '@/components/ui/PageHeader'
import { nextSaturdayIso, eventIdFromIso } from './event-id'
import type { StateGrade, TurretMode } from '@/types/wk'

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
  const navigate = useNavigate()
  const [startsAt, setStartsAt] = useState(() => nextSaturdayIso().slice(0, 16))
  const [turretMode, setTurretMode] = useState<TurretMode>('duplicate-strongest')
  const [homeServer, setHomeServer] = useState('S724')
  const [notes, setNotes] = useState('')
  const [shiftCount, setShiftCount] = useState<number>(2)
  const [stateGrade, setStateGrade] = useState<StateGrade | null>(null)
  const [governorIgn, setGovernorIgn] = useState('')
  const [assessorIgn, setAssessorIgn] = useState('')
  const [negotiatorIgn, setNegotiatorIgn] = useState('')
  const [foreignTargets, setForeignTargets] = useState('')
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')

  const eventId = eventIdFromIso(new Date(startsAt).toISOString())

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.from('events').insert({
      id: eventId,
      starts_at_utc: new Date(startsAt).toISOString(),
      shift_count: shiftCount,
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
      discord_webhook_url: discordWebhookUrl.trim() || null,
    })
    if (error) {
      if (error.code === '23505') {
        setError(`Event ${eventId} existiert schon — gehe direkt zum Planner.`)
      } else {
        setError(error.message)
      }
      setBusy(false)
      return
    }
    navigate(`/plan/${eventId}`)
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Neues WK-Event" subtitle="Lege Datum, Modus und Server fest." />

      <form onSubmit={create} className="flex flex-col gap-4">
        <Input
          label="Start (UTC)"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          hint={`Event-ID wird ${eventId}`}
          required
        />

        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">Shifts</span>
          <Segmented
            options={[
              { value: 1, label: '1 Shift' },
              { value: 2, label: '2 Shifts' },
              { value: 3, label: '3 Shifts' },
              { value: 4, label: '4 Shifts' },
            ]}
            value={shiftCount}
            onChange={setShiftCount}
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

        <Input
          label="Discord Webhook URL (optional)"
          type="url"
          value={discordWebhookUrl}
          onChange={(e) => setDiscordWebhookUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
          hint="Bei jedem Sign-up/Update/Withdraw geht ein Embed an diesen Channel. URL bleibt server-seitig."
        />

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
