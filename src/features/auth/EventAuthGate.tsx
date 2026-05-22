import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
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
    setState({ jwt: null, role: null, eventId, loading: true, error: null })

    void (async () => {
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
        localStorage.setItem(`tok:${role}:${eventId}`, token)
        setState({ jwt, role, eventId, loading: false, error: null })
      } catch (e) {
        if (cancelled) return
        setState({
          jwt: null,
          role: null,
          eventId,
          loading: false,
          error: (e as Error).message,
        })
      }
    })()

    return () => {
      cancelled = true
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
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <ShieldX className="mx-auto mb-3 h-10 w-10 text-red-400" />
      <h2 className="mb-2 text-lg font-semibold text-zinc-100">Zugang verweigert</h2>
      <p className="mb-4 text-sm text-zinc-400">
        {message === 'missing event_id or token'
          ? 'Diese URL ist veraltet — sie braucht jetzt einen Token.'
          : message === 'invalid_token'
            ? 'Token ungültig oder Event existiert nicht.'
            : message}
      </p>
      {eventId && (
        <p className="text-xs text-zinc-500">
          Frage den Organisator (Planner) nach dem aktuellen Link für{' '}
          <span className="font-mono text-zinc-300">{eventId}</span>.
        </p>
      )}
      <p className="mt-4 text-xs text-zinc-500">
        <Link to="/" className="text-yellow-400 hover:underline">
          Zur Startseite
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
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <ShieldX className="mx-auto mb-3 h-10 w-10 text-yellow-400" />
      <h2 className="mb-2 text-lg font-semibold text-zinc-100">Falscher Token-Typ</h2>
      <p className="text-sm text-zinc-400">
        Diese Seite braucht <strong>{required.join(' oder ')}</strong>-Zugang. Dein
        Token gibt dir nur <strong>{actual}</strong>-Zugang.
      </p>
    </div>
  )
}
