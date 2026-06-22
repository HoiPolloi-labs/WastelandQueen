import { useRef, useState } from 'react'
import { useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Trophy, Sparkles, Loader2, BadgeCheck, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import type { Signup } from '@/types/wk'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

interface AwardsSelfEntryProps {
  signup: Signup
  editToken: string | null
  role: string | null
}

/**
 * Post-event self-entry: a player revisits their own sign-up link and submits
 * their WK results (attendance + kill/death/occupation points + the in-game
 * "Aktuelle Pkte" total). Writes go through update_signup_self, which forces
 * awards_verified = false — a player can never self-verify; the planner
 * confirms each row on the Awards page. An optional screenshot of the
 * Personal-Reward screen auto-fills the WK-points total via the same
 * rate-limited Vision endpoint as the profile autofill (kind: 'awards').
 */
export function AwardsSelfEntry({ signup, editToken, role }: AwardsSelfEntryProps) {
  const { t } = useTranslation()
  const { eventId, token } = useParams<{ eventId: string; token: string }>()
  const [attended, setAttended] = useState<boolean>(signup.attended === true)
  const [killPoints, setKillPoints] = useState(String(signup.kill_points || ''))
  const [deathPoints, setDeathPoints] = useState(String(signup.death_points || ''))
  const [occPoints, setOccPoints] = useState(String(signup.occupation_points || ''))
  const [wkPoints, setWkPoints] = useState(signup.wk_points == null ? '' : String(signup.wk_points))
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // screenshot autofill state
  const fileRef = useRef<HTMLInputElement>(null)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrMsg, setOcrMsg] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null)

  const numOrZero = (s: string) => {
    const n = Number(s.trim())
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0
  }

  const submit = async () => {
    setStatus('saving')
    setErrorMsg('')
    const wkTrimmed = wkPoints.trim()
    const wkNum = wkTrimmed === '' ? null : Number(wkTrimmed)
    const patch = {
      attended: attended ? true : null,
      kill_points: numOrZero(killPoints),
      death_points: numOrZero(deathPoints),
      occupation_points: numOrZero(occPoints),
      wk_points: wkNum != null && Number.isFinite(wkNum) && wkNum >= 0 ? Math.round(wkNum) : null,
    }
    const err = await (async () => {
      if (role === 'planner') {
        const { error } = await supabase.from('signups').update(patch).eq('id', signup.id)
        return error
      }
      if (!editToken) return new Error(t('awards_self.err_not_owner'))
      const { error } = await supabase.rpc('update_signup_self', {
        p_signup_id: signup.id,
        p_edit_token: editToken,
        p_patch: patch,
      })
      return error
    })()
    if (err) {
      setStatus('error')
      setErrorMsg(err.message)
      return
    }
    setStatus('success')
  }

  const handleFile = async (file: File) => {
    setOcrMsg(null)
    if (!eventId || !token) return
    if (file.size > MAX_IMAGE_BYTES) {
      setOcrMsg({ kind: 'err', text: t('profile_upload.err_too_large', { mb: MAX_IMAGE_BYTES / 1024 / 1024 }) })
      return
    }
    if (!/^image\//.test(file.type)) {
      setOcrMsg({ kind: 'err', text: t('profile_upload.err_not_image') })
      return
    }
    setOcrBusy(true)
    try {
      const base64 = await fileToBase64(file)
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          event_id: eventId,
          signup_token: token,
          image_base64: base64,
          media_type: file.type || 'image/jpeg',
          kind: 'awards',
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          body?.error === 'invalid_signup_token'
            ? t('profile_upload.err_invalid_token')
            : body?.error === 'anthropic_failed'
              ? t('profile_upload.err_ai_failed', { detail: body.detail?.slice(0, 80) ?? '?' })
              : (body?.error ?? t('profile_upload.err_generic', { status: res.status }))
        setOcrMsg({ kind: 'err', text: String(msg) })
        return
      }
      const wk = body.extracted?.wk_points as number | null | undefined
      if (wk != null && Number.isFinite(wk)) {
        setWkPoints(String(Math.round(wk)))
        setOcrMsg({ kind: 'ok', text: t('awards_self.upload_success', { points: Math.round(wk) }) })
      } else {
        setOcrMsg({ kind: 'warn', text: t('awards_self.upload_no_points') })
      }
    } catch (e) {
      setOcrMsg({ kind: 'err', text: (e as Error).message })
    } finally {
      setOcrBusy(false)
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
      <header className="mb-2 flex items-center gap-1.5">
        <Trophy className="h-4 w-4 text-yellow-400" />
        <h2 className="text-sm font-semibold text-yellow-200">{t('awards_self.title')}</h2>
      </header>
      <p className="mb-3 text-[11px] leading-relaxed text-zinc-400">{t('awards_self.intro')}</p>

      {signup.awards_verified && (
        <p className="mb-3 flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-200">
          <BadgeCheck className="h-3.5 w-3.5" />
          {t('awards_self.verified_note')}
        </p>
      )}

      {/* optional screenshot autofill */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={ocrBusy}
          className={cn(
            'flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition',
            'border-purple-500/40 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {ocrBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {ocrBusy ? t('awards_self.upload_detecting') : t('awards_self.upload_button')}
        </button>
        <span className="text-[10px] text-zinc-500">{t('awards_self.upload_desc')}</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
            e.target.value = ''
          }}
        />
      </div>
      {ocrMsg && (
        <p
          className={cn(
            'mb-3 flex items-start gap-1 text-[11px]',
            ocrMsg.kind === 'ok' ? 'text-emerald-300' : ocrMsg.kind === 'warn' ? 'text-amber-300' : 'text-red-300',
          )}
        >
          {ocrMsg.kind === 'err' && <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />}
          {ocrMsg.text}
        </p>
      )}

      <label className="mb-3 flex items-center gap-2 text-sm text-zinc-200">
        <input
          type="checkbox"
          checked={attended}
          onChange={(e) => setAttended(e.target.checked)}
          className="accent-emerald-500"
        />
        {t('awards_self.attended')}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('awards_self.wk_points_label')} value={wkPoints} onChange={setWkPoints} />
        <Field label={t('awards_self.kill_label')} value={killPoints} onChange={setKillPoints} />
        <Field label={t('awards_self.death_label')} value={deathPoints} onChange={setDeathPoints} />
        <Field label={t('awards_self.occ_label')} value={occPoints} onChange={setOccPoints} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button type="button" variant="primary" size="sm" onClick={submit} disabled={status === 'saving'}>
          {status === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trophy className="h-3.5 w-3.5" />}
          {status === 'saving' ? t('awards_self.submitting') : t('awards_self.submit')}
        </Button>
        {status === 'success' && (
          <span className="text-[11px] text-emerald-300">{t('awards_self.submitted')}</span>
        )}
        {status === 'error' && (
          <span className="text-[11px] text-red-300">{t('awards_self.error', { msg: errorMsg })}</span>
        )}
      </div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
      {label}
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-sm"
      />
    </label>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const result = r.result
      if (typeof result !== 'string') return reject(new Error('FileReader returned non-string'))
      const comma = result.indexOf(',')
      if (comma === -1 || !result.startsWith('data:')) {
        return reject(new Error('Unexpected FileReader output (not a data URL)'))
      }
      resolve(result.slice(comma + 1))
    }
    r.onerror = () => reject(r.error ?? new Error('FileReader error'))
    r.readAsDataURL(file)
  })
}
