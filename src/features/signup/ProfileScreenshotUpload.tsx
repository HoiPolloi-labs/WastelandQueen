import { useRef, useState } from 'react'
import { Sparkles, Loader2, Image as ImageIcon, X, AlertCircle } from 'lucide-react'
import { useParams } from 'react-router'
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
      setError('URL fehlt event_id oder token')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Bild zu groß (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB).`)
      return
    }
    if (!/^image\//.test(file.type)) {
      setError('Bitte ein Bild auswählen.')
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
            ? 'Zu viele Versuche — max 5/h pro Link.'
            : body?.error === 'invalid_signup_token'
              ? 'Link nicht gültig (Token-Check fehlgeschlagen).'
              : body?.error === 'image too large'
                ? `Bild zu groß. Limit ${(body.limit_bytes / 1024 / 1024).toFixed(0)}MB.`
                : body?.error === 'anthropic_failed'
                  ? `AI-Service hat Fehler: ${body.detail?.slice(0, 80) ?? '?'}`
                  : body?.error ?? `Fehler ${res.status}`
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
          Auto-Fill aus Profil-Screenshot
        </h3>
        <span className="text-[10px] text-zinc-400">optional · KI-gestützt</span>
      </header>

      {!preview && !success && !error && (
        <p className="mb-2 text-[11px] text-zinc-400">
          Profil-Screenshot aus dem Spiel hochladen — IGN, Alliance-Tag, Server, True Might
          und ggf. Tier werden automatisch erkannt. Du checkst danach manuell und ergänzt
          den Rest.
        </p>
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
          {busy ? 'Erkenne…' : 'Screenshot wählen'}
        </button>
        {preview && (
          <img
            src={preview}
            alt="Screenshot Vorschau"
            className="h-12 w-12 rounded border border-zinc-800 object-cover"
          />
        )}
        {(preview || success || error) && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
            title="Zurücksetzen"
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
          ✓ {success.filledCount} Felder erkannt. Bitte unten prüfen + ergänzen.
          {success.remaining > 0 && (
            <span className="text-zinc-400"> {success.remaining} Versuche übrig diese Stunde.</span>
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
      const comma = result.indexOf(',')
      resolve(comma === -1 ? result : result.slice(comma + 1))
    }
    r.onerror = () => reject(r.error ?? new Error('FileReader error'))
    r.readAsDataURL(file)
  })
}
