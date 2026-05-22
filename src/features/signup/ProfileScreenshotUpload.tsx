import { useRef, useState } from 'react'
import { Sparkles, Loader2, Image as ImageIcon, X, AlertCircle } from 'lucide-react'
import { useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

interface ExtractedFields {
  ign: string | null
  alliance_tag: string | null
  server: string | null
  might: number | null
  tier: number | null
}

interface ProfileScreenshotUploadProps {
  onExtract: (fields: ExtractedFields) => void
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * Optional auto-fill helper: player drops a screenshot of their P&S profile,
 * we send it to the extract-profile Edge Function (Claude Haiku Vision) and
 * pre-fill the visible fields. The player still reviews + submits — we never
 * skip the human-in-the-loop step.
 */
export function ProfileScreenshotUpload({ onExtract }: ProfileScreenshotUploadProps) {
  const { t } = useTranslation()
  const { eventId, token } = useParams<{ eventId: string; token: string }>()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<{ filledCount: number; remaining: number } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError('')
    setSuccess(null)
    if (!eventId || !token) {
      setError(t('profile_upload.err_missing_url'))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t('profile_upload.err_too_large', { mb: MAX_IMAGE_BYTES / 1024 / 1024 }))
      return
    }
    if (!/^image\//.test(file.type)) {
      setError(t('profile_upload.err_not_image'))
      return
    }

    setBusy(true)
    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)

    try {
      const base64 = await fileToBase64(file)
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-profile`,
        {
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
          }),
        },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          body?.error === 'rate_limited'
            ? t('profile_upload.err_rate_limited')
            : body?.error === 'invalid_signup_token'
              ? t('profile_upload.err_invalid_token')
              : body?.error === 'image too large'
                ? t('profile_upload.err_image_too_large', {
                    mb: (body.limit_bytes / 1024 / 1024).toFixed(0),
                  })
                : body?.error === 'anthropic_failed'
                  ? t('profile_upload.err_ai_failed', { detail: body.detail?.slice(0, 80) ?? '?' })
                  : body?.error ?? t('profile_upload.err_generic', { status: res.status })
        setError(msg)
        return
      }
      const extracted = body.extracted as ExtractedFields
      const filled = Object.values(extracted).filter((v) => v != null).length
      onExtract(extracted)
      setSuccess({ filledCount: filled, remaining: body.remaining ?? 0 })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setSuccess(null)
    setError('')
  }

  return (
    <section className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-purple-200">
          <Sparkles className="h-3.5 w-3.5" />
          {t('profile_upload.title')}
        </h3>
        <span className="text-[10px] text-zinc-400">{t('profile_upload.tag')}</span>
      </header>

      {!preview && !success && !error && (
        <p className="mb-2 text-[11px] text-zinc-400">{t('profile_upload.description')}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className={cn(
            'flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition',
            'border-purple-500/40 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
          {busy ? t('profile_upload.detecting') : t('profile_upload.choose_button')}
        </button>
        {preview && (
          <img
            src={preview}
            alt=""
            className="h-12 w-12 rounded border border-zinc-800 object-cover"
          />
        )}
        {(preview || success || error) && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
            title={t('profile_upload.reset')}
          >
            <X className="h-3 w-3" />
          </button>
        )}
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

      {success && (
        <p className="mt-2 text-[11px] text-emerald-300">
          {t('profile_upload.success', { count: success.filledCount })}
          {success.remaining > 0 && (
            <span className="text-zinc-400"> {t('profile_upload.remaining_hint', { remaining: success.remaining })}</span>
          )}
        </p>
      )}
      {error && (
        <p className="mt-2 flex items-start gap-1 text-[11px] text-red-300">
          <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </section>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const result = r.result
      if (typeof result !== 'string') return reject(new Error('FileReader returned non-string'))
      // data URL must be `data:<mime>;base64,<payload>` — reject anything else
      // so we don't send garbage to the Edge Function.
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
