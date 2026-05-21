import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.',
  )
}

// Untyped client — domain types are applied in feature hooks (use-event, use-signups, etc.)
// where we cast .select<>() results. Adding a generated Database type later is straightforward:
// `npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts`.
//
// `autoRefreshToken: false` matters: per-event JWTs are minted with a fixed 24h
// lifetime by the token-exchange Edge Function and don't have a Supabase refresh
// token. Letting the SDK try to auto-refresh would 401 every minute.
export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/**
 * Inject a per-event JWT minted by the token-exchange Edge Function. Updates
 * both REST headers and Realtime WebSocket auth so RLS policies see the
 * `event_id`/`event_role` claims for both pipelines.
 */
export async function setEventSession(jwt: string): Promise<void> {
  await supabase.auth.setSession({ access_token: jwt, refresh_token: jwt })
  supabase.realtime.setAuth(jwt)
}

export async function clearEventSession(): Promise<void> {
  await supabase.auth.signOut()
  supabase.realtime.setAuth(key)
}
