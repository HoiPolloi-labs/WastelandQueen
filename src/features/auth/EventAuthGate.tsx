import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Loader2, ShieldX } from 'lucide-react'
import { clearEventSession, setEventSession } from '@/lib/supabase'

export type EventRole = 'signup' | 'planner' | 'board'

interface AuthState {
  jwt: string | null
  role: EventRole | null
  eventId: string | null
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthState>({
  jwt: null,
  role: null,
  eventId: null,
  loading: true,
  error: null,
})

// eslint-disable-next-line react-refresh/only-export-components
export function useEventAuth(): AuthState {
  return useContext(AuthContext)
}

/**
 * Decode the `exp` claim from a JWT without verifying the signature — we only
 * need to know when to refresh, not whether it's authentic (PostgREST will
 * reject anything we slip past). Returns ms-since-epoch, or 0 when the
 * payload is malformed (callers treat 0 as "schedule a safety refresh soon").
 */
// eslint-disable-next-line react-refresh/only-export-components
export function decodeJwtExpMs(jwt: string): number {
  try {
    const parts = jwt.split('.')
    if (parts.length !== 3) return 0
    const raw = parts[1]!
    const padded = raw + '=='.slice((raw.length + 2) % 4)
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0
  } catch {
    return 0
  }
}

/**
 * Compute the ms-delay until we should re-mint the JWT. Lead time is 5min
 * before exp so writes initiated right before the cutoff still land with the
 * old token. Floor is 60s — never busy-loop the Edge Function. If exp is
 * unknown (0) or already past, also fall back to 60s so a stale tab gets a
 * recovery chance instead of giving up.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function computeRefreshDelayMs(expMs: number, nowMs: number): number {
  const LEAD_MS = 5 * 60 * 1000
  const MIN_MS = 60 * 1000
  if (expMs <= 0) return MIN_MS
  return Math.max(MIN_MS, expMs - nowMs - LEAD_MS)
}

interface EventAuthGateProps {
  children: ReactNode
  requiredRole: EventRole | EventRole[]
}

/**
 * Wraps a route that needs an event JWT. Reads :eventId/:token from URL,
 * calls the token-exchange Edge Function, injects the returned JWT into the
 * shared Supabase client + Realtime, and gates `children` on the resolved role.
 *
 * The route is responsible for matching `/:eventId/:token` — the gate just
 * reads params. Wrong/missing token → 401 UI; insufficient role → 403 UI.
 *
 * Token refresh: the minted JWT lives 24h. A planner tab left open longer
 * than that started 401-ing on every write (rollback masked the real cause
 * — see migration of 2026-05-26). We now schedule a re-mint 5min before exp
 * and also re-mint on tab-visibility-change if the last mint was >5min ago,
 * since Chrome throttles setTimeout in background tabs hard.
 */
export function EventAuthGate({ children, requiredRole }: EventAuthGateProps) {
  const { eventId, token } = useParams<{ eventId: string; token: string }>()
  const [state, setState] = useState<AuthState>({
    jwt: null,
    role: null,
    eventId: eventId ?? null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!eventId || !token) {
      setState({
        jwt: null,
        role: null,
        eventId: eventId ?? null,
        loading: false,
        error: 'missing event_id or token',
      })
      return
    }

    let cancelled = false
    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    let lastMintMs = 0
    const VISIBILITY_REMINT_COOLDOWN_MS = 5 * 60 * 1000
    setState({ jwt: null, role: null, eventId, loading: true, error: null })

    const scheduleRefresh = (delayMs: number): void => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        void mint(true)
      }, delayMs)
    }

    const mint = async (isRefresh: boolean): Promise<void> => {
      lastMintMs = Date.now()
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/token-exchange`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ event_id: eventId, token }),
          },
        )
        const body = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          if (isRefresh) {
            // Transient refresh failure: keep the existing JWT alive until
            // its real exp, retry sooner. Don't tear the user out of their
            // workflow over a flaky network blip.
            console.warn('[EventAuthGate] refresh failed', res.status, body?.error)
            scheduleRefresh(60_000)
            return
          }
          setState({
            jwt: null,
            role: null,
            eventId,
            loading: false,
            error: body?.error ?? `auth failed (${res.status})`,
          })
          return
        }
        const { jwt, role } = body as { jwt: string; role: EventRole }
        setEventSession(jwt)
        if (!isRefresh) localStorage.setItem(`tok:${role}:${eventId}`, token)
        setState({ jwt, role, eventId, loading: false, error: null })
        scheduleRefresh(computeRefreshDelayMs(decodeJwtExpMs(jwt), Date.now()))
      } catch (e) {
        if (cancelled) return
        if (isRefresh) {
          console.warn('[EventAuthGate] refresh exception', (e as Error).message)
          scheduleRefresh(60_000)
          return
        }
        setState({
          jwt: null,
          role: null,
          eventId,
          loading: false,
          error: (e as Error).message,
        })
      }
    }

    const onVisible = (): void => {
      if (document.visibilityState !== 'visible' || cancelled) return
      // Throttle: don't re-mint more than once per 5min from visibility
      // changes alone — the scheduled timer is still the primary path.
      if (Date.now() - lastMintMs < VISIBILITY_REMINT_COOLDOWN_MS) return
      void mint(true)
    }
    document.addEventListener('visibilitychange', onVisible)

    void mint(false)

    return () => {
      cancelled = true
      if (refreshTimer) clearTimeout(refreshTimer)
      document.removeEventListener('visibilitychange', onVisible)
      clearEventSession()
    }
  }, [eventId, token])

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  if (state.error || !state.jwt || !state.role) {
    return <AuthErrorScreen message={state.error ?? 'unauthorized'} eventId={eventId} />
  }
  const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  if (!required.includes(state.role)) {
    return <ForbiddenScreen actual={state.role} required={required} />
  }
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

function AuthErrorScreen({
  message,
  eventId,
}: {
  message: string
  eventId?: string
}) {
  const { t } = useTranslation()
  const body =
    message === 'missing event_id or token'
      ? t('auth.missing_token')
      : message === 'invalid_token'
        ? t('auth.invalid_token')
        : message
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <ShieldX className="mx-auto mb-3 h-10 w-10 text-red-400" />
      <h2 className="mb-2 text-lg font-semibold text-zinc-100">
        {t('auth.access_denied_title')}
      </h2>
      <p className="mb-4 text-sm text-zinc-400">{body}</p>
      {eventId && (
        <p className="text-xs text-zinc-500">
          {t('auth.ask_planner', { eventId })}
        </p>
      )}
      <p className="mt-4 text-xs text-zinc-500">
        <Link to="/" className="text-yellow-400 hover:underline">
          {t('common.back_to_home')}
        </Link>
      </p>
    </div>
  )
}

function ForbiddenScreen({
  actual,
  required,
}: {
  actual: EventRole
  required: EventRole[]
}) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <ShieldX className="mx-auto mb-3 h-10 w-10 text-yellow-400" />
      <h2 className="mb-2 text-lg font-semibold text-zinc-100">
        {t('auth.wrong_role_title')}
      </h2>
      <p
        className="text-sm text-zinc-400"
        dangerouslySetInnerHTML={{
          __html: t('auth.wrong_role_body', {
            required: required.join(' / '),
            actual,
          }),
        }}
      />
    </div>
  )
}
