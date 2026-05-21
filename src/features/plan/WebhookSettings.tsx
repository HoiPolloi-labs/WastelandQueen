import { useEffect, useState } from 'react'
import { Webhook, Check, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

/**
 * Planner-only Discord-webhook settings panel.
 *
 * The webhook URL itself never leaves the server side — `event_has_webhook()`
 * returns a boolean indicator, `set_event_secret('discord_webhook_url', ...)`
 * writes via SECURITY DEFINER. The textarea always renders empty even when a
 * webhook is configured (write-only field); deleting requires submitting an
 * empty value.
 */
export function WebhookSettings() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const refresh = async () => {
    const { data, error } = await supabase.rpc('event_has_webhook')
    if (error) {
      setConfigured(null)
      return
    }
    setConfigured(Boolean(data))
  }

  useEffect(() => {
    void refresh()
  }, [])

  const save = async () => {
    setBusy(true)
    setStatus('idle')
    const { error } = await supabase.rpc('set_event_secret', {
      p_key: 'discord_webhook_url',
      p_value: url.trim() || null,
    })
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('saved')
      setUrl('')
      await refresh()
    }
    setBusy(false)
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Webhook className="h-3.5 w-3.5" />
          Discord-Webhook
        </h3>
        <span className="text-[10px]">
          {configured === null ? (
            <span className="text-zinc-500">…</span>
          ) : configured ? (
            <span className="flex items-center gap-0.5 text-emerald-300">
              <Check className="h-3 w-3" />
              aktiv
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-zinc-500">
              <X className="h-3 w-3" />
              nicht gesetzt
            </span>
          )}
        </span>
      </header>
      <Input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://discord.com/api/webhooks/..."
        hint={
          configured
            ? 'Schreibgeschützt — neue URL eingeben überschreibt, leer lassen + speichern entfernt'
            : 'URL bleibt server-seitig (event_secrets, no anon read)'
        }
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px]">
          {status === 'saved' && <span className="text-emerald-300">Gespeichert.</span>}
          {status === 'error' && <span className="text-red-300">{errorMsg}</span>}
        </span>
        <Button variant="primary" size="sm" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Speichern'}
        </Button>
      </div>
    </section>
  )
}
