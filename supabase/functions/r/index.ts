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
//
// Error responses render a small branded HTML page (not bare text/plain)
// because these URLs get pasted into in-game chat — a player clicking a
// dead link should land somewhere that signals "this is the right app,
// just the wrong event" with a link back to /.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function htmlError(status: number, headline: string, detail: string): Response {
  // Inline, dependency-free HTML. Mirrors the app's dark-yellow palette so
  // the player visually recognises they're on Wasteland Queen.
  const body = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>Wasteland Queen — ${headline}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { background:#09090b; color:#e4e4e7; font-family: ui-sans-serif, system-ui, sans-serif;
    display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:1.5rem; }
  .card { max-width: 28rem; text-align:center; }
  h1 { color:#facc15; font-size:1.25rem; margin: 0 0 .5rem; font-weight:600; }
  p { color:#a1a1aa; font-size:0.875rem; line-height:1.5; margin:.5rem 0; }
  code { background:#18181b; color:#fde047; padding:.1rem .35rem; border-radius:.25rem; font-size:0.8125rem; }
  a { color:#facc15; text-decoration:none; display:inline-block; margin-top:1.25rem; padding:.5rem 1rem;
    border:1px solid rgba(250,204,21,.3); border-radius:.375rem; }
  a:hover { background: rgba(250,204,21,.1); }
</style>
</head><body>
<div class="card">
  <h1>${headline}</h1>
  <p>${detail}</p>
  <a href="/">← Wasteland Queen</a>
</div>
</body></html>`
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] ?? c))
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return htmlError(405, 'Method not allowed', 'Short URLs only respond to GET.')
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return htmlError(500, 'Configuration error', 'Server is misconfigured — let the planner know.')
  }

  const url = new URL(req.url)
  const eventId = url.searchParams.get('e')?.trim() ?? ''
  const kind = url.searchParams.get('k')?.trim().toLowerCase() ?? ''

  // Defensive: event-IDs are `wk-YYYY-MM-DD` (legacy) or `wk-YYYY-MM-DD-xxxx`.
  // Rejecting anything else early avoids hitting the DB on garbage requests.
  if (!/^wk-\d{4}-\d{2}-\d{2}(?:-[a-z2-9]{3,8})?$/.test(eventId)) {
    return htmlError(
      400,
      'Invalid link',
      `<code>${escapeHtml(eventId).slice(0, 64)}</code> doesn&rsquo;t look like a WK event ID.`,
    )
  }
  if (kind !== 's' && kind !== 'b') {
    return htmlError(400, 'Invalid link', 'Short link kind must be s (signup) or b (board).')
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
    return htmlError(502, 'Upstream error', 'The lookup service is temporarily unavailable. Try again in a moment.')
  }
  const events = (await eventsRes.json()) as Array<{
    id: string
    signup_token: string
    board_token: string
  }>
  const event = events[0]
  if (!event) {
    return htmlError(
      404,
      'Event not found',
      `No WK event with ID <code>${escapeHtml(eventId)}</code>. The link may be stale or the planner may have rotated the URL — ask in chat for the current link.`,
    )
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
