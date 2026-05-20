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
export const supabase = createClient(url, key, {
  auth: { persistSession: false },
})
