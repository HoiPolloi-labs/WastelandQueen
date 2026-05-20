import { useState } from 'react'
import { useParams } from 'react-router'
import { Crown, Check, AlertCircle, Loader2, Info, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEvent } from '@/features/event/use-event'
import { shiftWindowLabel } from '@/features/event/shift-window'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Toggle } from '@/components/ui/Toggle'
import { cn } from '@/lib/cn'
import { TypeCard } from './TypeCard'
import { signupSchema, type SignupInput } from './signup-schema'
import {
  parseShiftPref,
  serializeShiftPref,
  type ShiftNumber,
  type Signup,
  type TroopTier,
  type TroopType,
} from '@/types/wk'

type Status = 'idle' | 'submitting' | 'success' | 'error' | 'withdrawn'

const TIER_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1) as TroopTier,
  label: `T${i + 1}`,
}))

export function SignupPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { event, loading } = useEvent(eventId)
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<Partial<Record<keyof SignupInput, string>>>({})
  const [errorMsg, setErrorMsg] = useState<string>('')

  const [ign, setIgn] = useState('')
  const [allianceTag, setAllianceTag] = useState('')
  const [server, setServer] = useState('')
  const [tier, setTier] = useState<TroopTier | null>(null)
  const [troopType, setTroopType] = useState<TroopType | null>(null)
  const [maxSoloLair, setMaxSoloLair] = useState<number | ''>('')
  const [rallySize, setRallySize] = useState<string>('')
  const [willingCaptain, setWillingCaptain] = useState(false)
  const [shifts, setShifts] = useState<ShiftNumber[]>([])
  const [stateAllianceJoined, setStateAllianceJoined] = useState(false)
  const [existing, setExisting] = useState<Signup | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  const prefillFrom = (s: Signup) => {
    setExisting(s)
    setAllianceTag(s.alliance_tag)
    setServer(s.server)
    setTier(s.tier)
    setTroopType(s.troop_type)
    setMaxSoloLair(s.max_solo_lair)
    setRallySize(s.rally_size == null ? '' : String(s.rally_size))
    setWillingCaptain(s.willing_captain)
    setShifts(parseShiftPref(s.shift_pref))
    setStateAllianceJoined(s.state_alliance_joined)
  }

  const lookupExisting = async () => {
    if (!event) return
    const trimmed = ign.trim()
    if (!trimmed) return
    if (existing && existing.ign.toLowerCase() === trimmed.toLowerCase()) return
    setLookingUp(true)
    const { data } = await supabase
      .from('signups')
      .select('*')
      .eq('event_id', event.id)
      .ilike('ign', trimmed)
      .maybeSingle()
    setLookingUp(false)
    if (data) prefillFrom(data as Signup)
    else setExisting(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  if (!event) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-4 text-xl font-semibold">Event nicht gefunden</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Diese Sign-up-URL ist ungültig. Frag im Discord nach dem aktuellen Link.
        </p>
      </div>
    )
  }
  if (status === 'withdrawn') {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
          <X className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Abgemeldet</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {ign} ist aus dem Event raus. Du kannst dich jederzeit wieder eintragen.
        </p>
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setStatus('idle')
            setExisting(null)
            setIgn('')
          }}
        >
          Zurück zum Formular
        </Button>
      </div>
    )
  }
  if (status === 'success') {
    const wasUpdate = Boolean(existing)
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">
          {wasUpdate ? 'Aktualisiert!' : 'Eingetragen!'}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Danke {ign} — {wasUpdate ? 'deine Daten sind aktualisiert' : 'deine Daten sind bei uns'}.
          Du kannst jederzeit zurückkommen und mit derselben IGN anpassen.
        </p>
        <ul className="mx-auto mt-6 max-w-sm space-y-2 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-left text-xs text-zinc-300">
          <li className="font-semibold uppercase tracking-wider text-zinc-500">Pre-Event Checklist</li>
          <li>☐ Infirmary mit T1-Taxis vollfüllen (Casualties → Deep Healing)</li>
          <li>☐ Miraculous Survival in Nova/Research auf Max</li>
          <li>☐ First Aid + Instant Heal Talents geladen</li>
          <li>☐ Trainings-Speedups + Ressourcen für Fast Comeback</li>
          <li>☐ Drei-Tage-Schild stacken falls Mudsitter</li>
        </ul>
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setStatus('idle')
            setExisting(null)
            setIgn('')
            setAllianceTag('')
            setTier(null)
            setTroopType(null)
            setMaxSoloLair('')
            setRallySize('')
            setWillingCaptain(false)
            setShifts([])
          }}
        >
          Noch einen Spieler eintragen
        </Button>
      </div>
    )
  }

  const setFieldError = (field: keyof SignupInput, msg?: string) => {
    setErrors((prev) => {
      const next = { ...prev }
      if (msg) next[field] = msg
      else delete next[field]
      return next
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setErrors({})
    setErrorMsg('')

    const parsed = signupSchema.safeParse({
      ign,
      alliance_tag: allianceTag,
      server: server || event.home_server,
      tier,
      troop_type: troopType,
      max_solo_lair: typeof maxSoloLair === 'number' ? maxSoloLair : Number.NaN,
      rally_size: rallySize ? Number(rallySize.replace(/[.\s,]/g, '')) : null,
      willing_captain: willingCaptain,
      shift_pref: shifts.length > 0 ? serializeShiftPref(shifts) : '',
    })

    // Note: state_alliance_joined isn't in the zod schema (it's optional metadata)
    // — set it directly on the row after validation passes.

    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof SignupInput, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof SignupInput
        fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      setStatus('idle')
      return
    }

    const payload = {
      event_id: event.id,
      ...parsed.data,
      state_alliance_joined: stateAllianceJoined,
    }
    const { error } = existing
      ? await supabase.from('signups').update(payload).eq('id', existing.id)
      : await supabase.from('signups').insert(payload)

    if (error) {
      // Race: another tab inserted between our lookup and submit. Retry as update.
      if (error.code === '23505') {
        const { data: race } = await supabase
          .from('signups')
          .select('id')
          .eq('event_id', event.id)
          .ilike('ign', parsed.data.ign)
          .maybeSingle()
        if (race) {
          const { error: updErr } = await supabase
            .from('signups')
            .update(payload)
            .eq('id', (race as { id: string }).id)
          if (!updErr) {
            setStatus('success')
            return
          }
        }
      }
      setStatus('error')
      setErrorMsg(error.message)
      return
    }

    setStatus('success')
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-6 flex items-center gap-2 text-yellow-400">
        <Crown className="h-5 w-5" />
        <h1 className="text-lg font-semibold tracking-wide">WK Sign-up</h1>
      </div>
      <p className="mb-6 text-xs text-zinc-500">
        Event: {event.id} · Start {new Date(event.starts_at_utc).toLocaleString('de-DE')}
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        {existing && (
          <div className="flex items-start gap-2 rounded border border-yellow-500/40 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-200">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Du bist schon eingetragen — Felder sind vorausgefüllt. Anpassungen aktualisieren
              deinen Eintrag, statt einen neuen anzulegen.
            </span>
          </div>
        )}
        <Input
          label="IGN"
          placeholder="Dein In-Game-Name"
          value={ign}
          onChange={(e) => {
            setIgn(e.target.value)
            setFieldError('ign')
            if (existing && e.target.value.toLowerCase() !== existing.ign.toLowerCase()) {
              setExisting(null)
            }
          }}
          onBlur={lookupExisting}
          hint={lookingUp ? 'Schaue ob du schon eingetragen bist…' : undefined}
          error={errors.ign}
          autoComplete="off"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Alliance Tag"
            placeholder="ABC"
            value={allianceTag}
            onChange={(e) => {
              setAllianceTag(e.target.value.toUpperCase())
              setFieldError('alliance_tag')
            }}
            error={errors.alliance_tag}
            maxLength={4}
            autoComplete="off"
            className="font-mono uppercase"
            required
          />
          <Input
            label="Server"
            placeholder={event.home_server}
            value={server}
            onChange={(e) => {
              setServer(e.target.value.toUpperCase())
              setFieldError('server')
            }}
            error={errors.server}
            autoComplete="off"
            className="font-mono uppercase"
          />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">Truppen-Typ</span>
          <TypeCard
            value={troopType}
            onChange={(t) => {
              setTroopType(t)
              setFieldError('troop_type')
            }}
          />
          {errors.troop_type && <p className="mt-1 text-xs text-red-400">{errors.troop_type}</p>}
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">Höchster Tier</span>
          <Segmented
            options={TIER_OPTIONS}
            value={tier}
            onChange={(v) => {
              setTier(v)
              setFieldError('tier')
            }}
          />
          {errors.tier && <p className="mt-1 text-xs text-red-400">{errors.tier}</p>}
        </div>

        <Input
          label="Max Solo Lair"
          type="number"
          inputMode="numeric"
          min={1}
          max={10}
          placeholder="6"
          value={maxSoloLair}
          onChange={(e) => {
            const n = e.target.value === '' ? '' : Number(e.target.value)
            setMaxSoloLair(n as number | '')
            setFieldError('max_solo_lair')
          }}
          hint="Höchstes Zombie-Lair, das du solo schaffst"
          error={errors.max_solo_lair}
          required
        />

        <Input
          label="Rally Size (optional)"
          type="number"
          inputMode="numeric"
          min={0}
          step={50000}
          placeholder="1500000"
          value={rallySize}
          onChange={(e) => setRallySize(e.target.value)}
          hint="Ungefähr ist OK. Wichtig für Captain-Auswahl."
        />

        <Toggle
          checked={willingCaptain}
          onChange={setWillingCaptain}
          label="Captain möglich"
          hint="Bereit, einen Hub/Turm-Captain zu übernehmen (Super Reinforcement)"
        />

        <Toggle
          checked={stateAllianceJoined}
          onChange={setStateAllianceJoined}
          label="State Alliance beigetreten"
          hint="Hak ab wenn du in der temporären State-Alliance bist (gleiches Flag = keine Friendly-Fire vom Turm)"
        />

        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">
            Verfügbare Shifts {event.shift_count > 1 && <span className="text-zinc-500">(mehrere möglich)</span>}
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: event.shift_count }, (_, i) => {
              const n = (i + 1) as ShiftNumber
              const checked = shifts.includes(n)
              const label = shiftWindowLabel(event.starts_at_utc, event.shift_count, n)
              return (
                <button
                  type="button"
                  key={n}
                  onClick={() => {
                    setFieldError('shift_pref')
                    setShifts((cur) =>
                      checked ? cur.filter((s) => s !== n) : [...cur, n].sort((a, b) => a - b),
                    )
                  }}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded border px-2 py-2 text-sm transition',
                    checked
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-100'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                  )}
                >
                  <span className="font-semibold">Shift {n}</span>
                  <span className="text-[10px] text-zinc-500">{label}</span>
                </button>
              )
            })}
          </div>
          {errors.shift_pref && <p className="mt-1 text-xs text-red-400">{errors.shift_pref}</p>}
        </div>

        {status === 'error' && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {errorMsg || 'Fehler beim Eintragen. Versuch es nochmal.'}
          </div>
        )}

        <Button type="submit" size="lg" disabled={status === 'submitting'} className="mt-2">
          {status === 'submitting' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : existing ? (
            'Aktualisieren'
          ) : (
            'Eintragen'
          )}
        </Button>

        {existing && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm(`${existing.ign} wirklich aus dem Event nehmen?`)) return
              const { error } = await supabase
                .from('signups')
                .delete()
                .eq('id', existing.id)
              if (error) {
                setStatus('error')
                setErrorMsg(error.message)
                return
              }
              setStatus('withdrawn')
            }}
            className="mx-auto mt-1 text-xs text-red-400 underline hover:text-red-300"
          >
            Mich aus dem Event abmelden
          </button>
        )}
      </form>
    </div>
  )
}
