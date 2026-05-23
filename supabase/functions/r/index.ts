// Short-link resolver. Vercel rewrites `/s/:eventId` and `/b/:eventId` to
// this function, which looks up the matching signup_token / board_token
// with service-role and returns a 302 to the full URL.
//
// The redirect Location is intentionally a relative path — the browser
// resolves it against whatever host the user came in on (waqu.app, the
// .vercel.app alias, or a future custom domain), so this function doesn't
// need to know its public-facing origin.
//
// Only `s` (signup) and `b` (board) are supported. Planner + awards tokens
// are NEVER short-linked because they grant write access.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return new Response('GET only', { status: 405 })
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response('config: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', {
      status: 500,
    })
  }

  const url = new URL(req.url)
  const eventId = url.searchParams.get('e')?.trim() ?? ''
  const kind = url.searchParams.get('k')?.trim().toLowerCase() ?? ''

  // Defensive: event-IDs are `wk-YYYY-MM-DD` (legacy) or `wk-YYYY-MM-DD-xxxx`.
  // Rejecting anything else early avoids hitting the DB on garbage requests.
  if (!/^wk-\d{4}-\d{2}-\d{2}(?:-[a-z2-9]{3,8})?$/.test(eventId)) {
    return new Response('invalid event id', { status: 400 })
  }
  if (kind !== 's' && kind !== 'b') {
    return new Response('invalid kind (expected s or b)', { status: 400 })
  }

  const eventsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(eventId)}&select=id,signup_token,board_token`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    },
  )
  if (!eventsRes.ok) {
    return new Response(`upstream ${eventsRes.status}`, { status: 502 })
  }
  const events = (await eventsRes.json()) as Array<{
    id: string
    signup_token: string
    board_token: string
  }>
  const event = events[0]
  if (!event) {
    return new Response('event not found', { status: 404 })
  }

  const token = kind === 's' ? event.signup_token : event.board_token
  const path = kind === 's' ? 'signup' : 'board'

  return new Response(null, {
    status: 302,
    headers: {
      // Relative Location → resolves against the user's current host.
      Location: `/${path}/${event.id}/${token}`,
      // No-cache so token rotations propagate immediately.
      'Cache-Control': 'no-store',
    },
  })
})
