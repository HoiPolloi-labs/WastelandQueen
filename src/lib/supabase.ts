import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.',
  )
}

// Module-local mutable: the per-event JWT is held here and read by the
// supabase client on every request via accessToken(). Using accessToken instead
// of supabase.auth.setSession() because our synthetic JWTs (event_id+role
// claims, no auth.users row) don't survive setSession's /auth/v1/user
// validation round-trip — it 400s and the session gets dropped.
let currentJwt: string | null = null

// Untyped client — domain types are applied in feature hooks (use-event, use-signups, etc.)
// where we cast .select<>() results.
export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  accessToken: async () => currentJwt,
})

/**
 * Inject a per-event JWT minted by the token-exchange Edge Function. Stored
 * for REST via accessToken() and pushed into Realtime so subscriptions also
 * see the event_id/event_role claims.
 */
export function setEventSession(jwt: string): void {
  currentJwt = jwt
  supabase.realtime.setAuth(jwt)
}

export function clearEventSession(): void {
  currentJwt = null
  supabase.realtime.setAuth(key)
}
