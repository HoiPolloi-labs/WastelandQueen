import { useState } from 'react'
import { useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Crown, Check, AlertCircle, Loader2, Info, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEvent } from '@/features/event/use-event'
import { useEventAuth } from '@/features/auth/EventAuthGate'
import { shiftWindowLabel } from '@/features/event/shift-window'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Toggle } from '@/components/ui/Toggle'
import { cn } from '@/lib/cn'
import { TypeCard } from './TypeCard'
import { signupSchema, type SignupInput } from './signup-schema'
import { rememberToken, recallToken, forgetToken } from './edit-token'
import { notifyDiscord } from './notify'
import { ProfileScreenshotUpload } from './ProfileScreenshotUpload'
import {
  parseShiftPref,
  serializeShiftPref,
  type ShiftNumber,
  type Signup,
  type TroopTier,
  type TroopType,
} from '@/types/wk'

type Status = 'idle' | 'submitting' | 'success' | 'error' | 'withdrawn'

const TIER_OPTIONS = Array.from({ length: 13 }, (_, i) => ({
  value: (i + 1) as TroopTier,
  label: `T${i + 1}`,
}))

export function SignupPage() {
  const { t, i18n } = useTranslation()
  const { eventId } = useParams<{ eventId: string }>()
  const { event, loading } = useEvent(eventId)
  const { role } = useEventAuth()
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
  const [trueMight, setTrueMight] = useState<string>('')
  const [willingCaptain, setWillingCaptain] = useState(false)
  const [shifts, setShifts] = useState<ShiftNumber[]>([])
  const [stateAllianceJoined, setStateAllianceJoined] = useState(false)
  const [existing, setExisting] = useState<Signup | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const isOwner = Boolean(
    existing && eventId && recallToken(eventId, existing.ign) === existing.edit_token,
  )

  const prefillFrom = (s: Signup) => {
    setExisting(s)
    setAllianceTag(s.alliance_tag)
    setServer(s.server)
    setTier(s.tier)
    setTroopType(s.troop_type)
    setMaxSoloLair(s.max_solo_lair)
    setRallySize(s.rally_size == null ? '' : String(s.rally_size))
    setTrueMight(s.true_might == null ? '' : String(s.true_might))
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
        <h1 className="mt-4 text-xl font-semibold">{t('signup.not_found_title')}</h1>
        <p className="mt-2 text-sm text-zinc-400">{t('signup.not_found_body')}</p>
      </div>
    )
  }
  if (status === 'withdrawn') {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
          <X className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">{t('signup.withdrawn_title')}</h1>
        <p className="mt-2 text-sm text-zinc-400">{t('signup.withdrawn_body', { ign })}</p>
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setStatus('idle')
            setExisting(null)
            setIgn('')
          }}
        >
          {t('common.back_to_form')}
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
          {wasUpdate ? t('signup.success_updated_title') : t('signup.success_inserted_title')}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {wasUpdate ? t('signup.success_updated_body', { ign }) : t('signup.success_inserted_body', { ign })}
        </p>
        <ul className="mx-auto mt-6 max-w-sm space-y-2 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-left text-xs text-zinc-300">
          <li className="font-semibold uppercase tracking-wider text-zinc-400">{t('signup.pre_event_header')}</li>
          <li>{t('signup.pre_event_taxis')}</li>
          <li>{t('signup.pre_event_miraculous')}</li>
          <li>{t('signup.pre_event_talents')}</li>
          <li>{t('signup.pre_event_speedups')}</li>
          <li>{t('signup.pre_event_shield')}</li>
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
            setTrueMight('')
            setWillingCaptain(false)
            setShifts([])
            setStateAllianceJoined(false)
          }}
        >
          {t('signup.signup_more')}
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
      true_might: trueMight ? Number(trueMight.replace(/[.\s,]/g, '')) : null,
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

    if (existing) {
      // Planner role goes direct (RLS allows). Signup role must use RPC
      // which verifies edit_token server-side.
      const updateError = await (async () => {
        if (role === 'planner') {
          const { error } = await supabase
            .from('signups')
            .update(payload)
            .eq('id', existing.id)
          return error
        }
        const editToken = recallToken(event.id, existing.ign)
        if (!editToken || editToken !== existing.edit_token) {
          return new Error(t('signup.error_not_owner'))
        }
        const { error } = await supabase.rpc('update_signup_self', {
          p_signup_id: existing.id,
          p_edit_token: editToken,
          p_patch: payload,
        })
        return error
      })()
      if (updateError) {
        setStatus('error')
        setErrorMsg(updateError.message)
        return
      }
      notifyDiscord(event.id, existing.id, 'updated')
      setStatus('success')
      return
    }

    const { data: inserted, error } = await supabase
      .from('signups')
      .insert(payload)
      .select()
      .single()

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

    // Remember token for this device so the withdraw button appears next visit
    const row = inserted as Signup | null
    if (row?.edit_token) {
      rememberToken(event.id, parsed.data.ign, row.edit_token)
    }
    if (row?.id) {
      notifyDiscord(event.id, row.id, 'inserted')
    }
    setStatus('success')
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-6 flex items-center gap-2 text-yellow-400">
        <Crown className="h-5 w-5" />
        <h1 className="text-lg font-semibold tracking-wide">{t('signup.title')}</h1>
      </div>
      <p className="mb-6 text-xs text-zinc-400">
        {t('signup.event_info', { eventId: event.id, date: new Date(event.starts_at_utc).toLocaleString(i18n.language) })}
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <ProfileScreenshotUpload
          onExtract={(f) => {
            if (f.ign) setIgn(f.ign)
            if (f.alliance_tag) setAllianceTag(f.alliance_tag.toUpperCase())
            if (f.server) setServer(f.server.toUpperCase())
            if (f.might) setTrueMight(String(f.might))
            if (f.tier && f.tier >= 1 && f.tier <= 13) setTier(f.tier as TroopTier)
          }}
        />
        {existing && (
          <div className="flex items-start gap-2 rounded border border-yellow-500/40 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-200">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{t('signup.existing_hint')}</span>
          </div>
        )}
        <Input
          label={t('signup.ign_label')}
          placeholder={t('signup.ign_placeholder')}
          value={ign}
          onChange={(e) => {
            setIgn(e.target.value)
            setFieldError('ign')
            if (existing && e.target.value.toLowerCase() !== existing.ign.toLowerCase()) {
              setExisting(null)
            }
          }}
          onBlur={lookupExisting}
          hint={lookingUp ? t('signup.ign_lookup_hint') : undefined}
          error={errors.ign}
          autoComplete="off"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('signup.alliance_label')}
            placeholder={t('signup.alliance_placeholder')}
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
            label={t('signup.server_label')}
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
          <span className="mb-1 block text-sm font-medium text-zinc-300">{t('signup.type_label')}</span>
          <TypeCard
            value={troopType}
            onChange={(tp) => {
              setTroopType(tp)
              setFieldError('troop_type')
            }}
          />
          {errors.troop_type && <p className="mt-1 text-xs text-red-400">{errors.troop_type}</p>}
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">{t('signup.tier_label')}</span>
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
          label={t('signup.lair_label')}
          type="number"
          inputMode="numeric"
          min={1}
          max={200}
          placeholder={t('signup.lair_placeholder')}
          value={maxSoloLair}
          onChange={(e) => {
            const n = e.target.value === '' ? '' : Number(e.target.value)
            setMaxSoloLair(n as number | '')
            setFieldError('max_solo_lair')
          }}
          hint={t('signup.lair_hint')}
          error={errors.max_solo_lair}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('signup.rally_label')}
            type="number"
            inputMode="numeric"
            min={1}
            step={50000}
            placeholder={t('signup.rally_placeholder')}
            value={rallySize}
            onChange={(e) => setRallySize(e.target.value)}
            hint={t('signup.rally_hint')}
            required
            error={errors.rally_size}
          />
          <Input
            label={t('signup.might_label')}
            type="number"
            inputMode="numeric"
            min={0}
            step={1000000}
            placeholder={t('signup.might_placeholder')}
            value={trueMight}
            onChange={(e) => setTrueMight(e.target.value)}
            hint={t('signup.might_hint')}
          />
        </div>

        <Toggle
          checked={willingCaptain}
          onChange={setWillingCaptain}
          label={t('signup.willing_captain_label')}
          hint={t('signup.willing_captain_hint')}
        />

        <Toggle
          checked={stateAllianceJoined}
          onChange={setStateAllianceJoined}
          label={t('signup.state_alliance_label')}
          hint={t('signup.state_alliance_hint')}
        />

        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-300">
            {t('signup.shifts_label')} {event.shift_count > 1 && <span className="text-zinc-400">{t('signup.shifts_multi_hint')}</span>}
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
                  <span className="font-semibold">{t('signup.shift_n', { n })}</span>
                  <span className="text-[10px] text-zinc-400">{label}</span>
                </button>
              )
            })}
          </div>
          {errors.shift_pref && <p className="mt-1 text-xs text-red-400">{errors.shift_pref}</p>}
        </div>

        {status === 'error' && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {errorMsg || t('signup.error_default')}
          </div>
        )}

        <Button type="submit" size="lg" disabled={status === 'submitting'} className="mt-2">
          {status === 'submitting' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : existing ? (
            t('signup.submit_update')
          ) : (
            t('signup.submit_create')
          )}
        </Button>

        {existing && isOwner && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm(t('signup.withdraw_confirm', { ign: existing.ign }))) return
              const editToken = recallToken(event.id, existing.ign)
              const error = await (async () => {
                if (role === 'planner') {
                  const { error } = await supabase
                    .from('signups')
                    .delete()
                    .eq('id', existing.id)
                  return error
                }
                if (!editToken || editToken !== existing.edit_token) {
                  return new Error(t('signup.error_not_owner'))
                }
                const { error } = await supabase.rpc('delete_signup_self', {
                  p_signup_id: existing.id,
                  p_edit_token: editToken,
                })
                return error
              })()
              if (error) {
                setStatus('error')
                setErrorMsg(error.message)
                return
              }
              notifyDiscord(event.id, existing.id, 'withdrawn')
              forgetToken(event.id, existing.ign)
              setStatus('withdrawn')
            }}
            className="mx-auto mt-1 text-xs text-red-400 underline hover:text-red-300"
          >
            {t('signup.withdraw_button')}
          </button>
        )}
        {existing && !isOwner && (
          <p className="mt-1 text-center text-[11px] text-zinc-400">
            {t('signup.withdraw_not_owner')}
          </p>
        )}
      </form>
    </div>
  )
}
