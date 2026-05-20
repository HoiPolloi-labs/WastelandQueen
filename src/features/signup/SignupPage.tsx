import { useState } from 'react'
import { useParams } from 'react-router'
import { Crown, Check, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEvent } from '@/features/event/use-event'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Toggle } from '@/components/ui/Toggle'
import { TypeCard } from './TypeCard'
import { signupSchema, type SignupInput } from './signup-schema'
import type { ShiftPref, TroopTier, TroopType } from '@/types/wk'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const TIER_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1) as TroopTier,
  label: `T${i + 1}`,
}))

const SHIFT_OPTIONS: { value: ShiftPref; label: string; hint: string }[] = [
  { value: 'first', label: 'Shift 1', hint: '0-12h UTC' },
  { value: 'second', label: 'Shift 2', hint: '12-24h UTC' },
  { value: 'both', label: 'Beides', hint: 'Flexibel' },
]

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
  const [shiftPref, setShiftPref] = useState<ShiftPref | null>(null)

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
  if (status === 'success') {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Eingetragen!</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Danke {ign} — deine Daten sind bei uns. Falls du dich vertippt hast, einfach nochmal absenden.
        </p>
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setStatus('idle')
            setIgn('')
            setAllianceTag('')
            setTier(null)
            setTroopType(null)
            setMaxSoloLair('')
            setRallySize('')
            setWillingCaptain(false)
            setShiftPref(null)
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
      shift_pref: shiftPref,
    })

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

    const { error } = await supabase.from('signups').insert({
      event_id: event.id,
      ...parsed.data,
    })

    if (error) {
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
        <Input
          label="IGN"
          placeholder="Dein In-Game-Name"
          value={ign}
          onChange={(e) => {
            setIgn(e.target.value)
            setFieldError('ign')
          }}
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

        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">Shift</span>
          <Segmented options={SHIFT_OPTIONS} value={shiftPref} onChange={setShiftPref} />
          {errors.shift_pref && <p className="mt-1 text-xs text-red-400">{errors.shift_pref}</p>}
        </div>

        {status === 'error' && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {errorMsg || 'Fehler beim Eintragen. Versuch es nochmal.'}
          </div>
        )}

        <Button type="submit" size="lg" disabled={status === 'submitting'} className="mt-2">
          {status === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eintragen'}
        </Button>
      </form>
    </div>
  )
}
