import { useState } from 'react'
import { useNavigate } from 'react-router'
import { RefreshCw, Copy, ShieldAlert, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

interface TokenRotationProps {
  eventId: string
}

type RoleKey = 'signup' | 'planner' | 'board'

const ROLE_LABEL: Record<RoleKey, string> = {
  signup: 'Sign-up',
  planner: 'Planner',
  board: 'Board',
}

/**
 * Token-rotation panel for the planner sidebar. Each role's token can be
 * invalidated independently — useful when a URL leaks to the wrong audience.
 * After rotation, the new URL is shown with a copy button; existing JWTs
 * minted from the old token stay valid until their 24h expiry.
 */
export function TokenRotation({ eventId }: TokenRotationProps) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState<RoleKey | null>(null)
  const [newUrl, setNewUrl] = useState<{ role: RoleKey; url: string } | null>(null)
  const [error, setError] = useState<string>('')

  const rotate = async (role: RoleKey) => {
    const confirmMsg =
      role === 'planner'
        ? `Planner-Token rotieren? Alte Planner-URL stirbt sofort. Du brauchst den neuen Link um nach Token-Ablauf wieder reinzukommen — kopier ihn und bookmarke ihn.`
        : `${ROLE_LABEL[role]}-Token rotieren? Alle Discord-Posts mit dem alten Link müssen neu geteilt werden.`
    if (!confirm(confirmMsg)) return

    setBusy(role)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('rotate_event_tokens', {
      rotate_signup: role === 'signup',
      rotate_planner: role === 'planner',
      rotate_board: role === 'board',
    })
    setBusy(null)
    if (rpcError || !data || !Array.isArray(data) || data.length === 0) {
      setError(rpcError?.message ?? 'rotation failed')
      return
    }
    const row = data[0] as {
      signup_token: string
      planner_token: string
      board_token: string
    }
    const tokenForRole =
      role === 'signup'
        ? row.signup_token
        : role === 'planner'
          ? row.planner_token
          : row.board_token
    const url = `${window.location.origin}/${role === 'planner' ? 'plan' : role}/${eventId}/${tokenForRole}`
    setNewUrl({ role, url })
    if (role === 'planner') {
      // Order matters: localStorage first (most-important for recovery if
      // anything else fails), then clipboard (best-effort), then navigate
      // (visible side-effect). Awaiting the clipboard so a permission
      // denial doesn't strand the user on an invalid URL.
      localStorage.setItem(`tok:planner:${eventId}`, tokenForRole)
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        // Clipboard API can be denied (insecure context, permission)
        // — the success card still shows the URL with its own copy button.
      }
      navigate(`/plan/${eventId}/${tokenForRole}`, { replace: true })
    }
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <header className="mb-2 flex items-center gap-1.5">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <RefreshCw className="h-3.5 w-3.5" />
          Token-Rotation
        </h3>
      </header>
      <p className="mb-3 text-[11px] text-zinc-400">
        Token rotieren wenn der zugehörige Link versehentlich falsch geteilt
        wurde. Bestehende offene Tabs laufen bis zu 24h weiter.
      </p>

      <div className="flex flex-col gap-1.5">
        {(['signup', 'board', 'planner'] as RoleKey[]).map((role) => (
          <Button
            key={role}
            variant="ghost"
            size="sm"
            onClick={() => void rotate(role)}
            disabled={busy !== null}
            className="justify-start"
          >
            <RefreshCw
              className={cn(
                'h-3.5 w-3.5',
                busy === role && 'animate-spin',
              )}
            />
            {ROLE_LABEL[role]} rotieren
          </Button>
        ))}
      </div>

      {error && (
        <p className="mt-2 text-[11px] text-red-300">{error}</p>
      )}

      {newUrl && (
        <div className="mt-3 flex items-start gap-2 rounded border border-yellow-500/40 bg-yellow-500/10 p-2.5 text-[11px]">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-yellow-300" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 font-semibold text-yellow-200">
              Neue {ROLE_LABEL[newUrl.role]}-URL — alte ist tot
            </div>
            <code className="block truncate font-mono text-[10px] text-zinc-300" title={newUrl.url}>
              {newUrl.url}
            </code>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void navigator.clipboard.writeText(newUrl.url)}
            title="Kopieren"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <button
            type="button"
            onClick={() => setNewUrl(null)}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
            title="Schließen"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </section>
  )
}
