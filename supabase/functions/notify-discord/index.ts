import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

type SignupAction = 'inserted' | 'updated' | 'withdrawn'
type ReminderAction = 'reminder' | 'mudsit_reminder'
type Action = SignupAction | ReminderAction

interface Body {
  event_id?: string
  signup_id?: string
  action?: Action
  /** For reminder actions: pre-formatted Discord-flavoured message text. */
  content?: string
}

interface JwtClaims {
  event_id?: string
  event_role?: 'planner' | 'signup' | 'board'
  exp?: number
}

const TYPE_EMOJI: Record<string, string> = {
  fighter: '⚔️',
  shooter: '🎯',
  rider: '⚡',
}

function colorFor(action: SignupAction): number {
  if (action === 'inserted') return 0x10b981 // emerald
  if (action === 'withdrawn') return 0xef4444 // red
  return 0xfacc15 // yellow for updates
}

function headlineFor(action: SignupAction): string {
  if (action === 'inserted') return '✅ Neue Einschreibung'
  if (action === 'withdrawn') return '❌ Abmeldung'
  return '🔄 Eintrag aktualisiert'
}

function reminderHeader(action: ReminderAction): string {
  if (action === 'mudsit_reminder') return '🛡️ Mudsit-Shield-Check'
  return '⏰ Pre-Event Reminder'
}

/**
 * Decode the JWT claims without re-verifying the signature. Safe because
 * `verify_jwt: true` is enabled on this function — the runtime already
 * validated the token before the handler ran. We just need to read which
 * event + role the caller authenticated as.
 *
 * SECURITY: previously this function accepted any bearer (including the
 * anon publishable key), which let anyone with the client bundle spam the
 * planner's Discord webhook with arbitrary content. Now: planner-role only
 * for reminder posts, signup-or-planner for signup-event notifications,
 * and the claimed event_id MUST match the body.
 */
function decodeJwtClaims(req: Request): JwtClaims | null {
  const auth = req.headers.get('Authorization') ?? ''
  const m = /^Bearer\s+(.+)$/.exec(auth)
  if (!m) return null
  const parts = m[1].split('.')
  if (parts.length !== 3) return null
  try {
    // JWT payload is base64url-encoded. atob handles standard base64 — convert.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(
      Math.ceil(parts[1].length / 4) * 4,
      '=',
    )
    return JSON.parse(atob(b64)) as JwtClaims
  } catch {
    return null
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return new Response('invalid json', { status: 400 })
  }

  const { event_id, signup_id, action, content } = body
  if (!event_id || !action) {
    return new Response('missing fields', { status: 400 })
  }

  // SECURITY: enforce role-appropriate caller. The runtime guarantees the
  // bearer is a valid Supabase JWT (verify_jwt:true), but that includes the
  // anon publishable key — we additionally require an event-bound JWT.
  const claims = decodeJwtClaims(req)
  if (!claims?.event_id || !claims.event_role) {
    return new Response('event-bound JWT required', { status: 401 })
  }
  if (claims.event_id !== event_id) {
    return new Response('event_id mismatch', { status: 403 })
  }
  if (action === 'reminder' || action === 'mudsit_reminder') {
    if (claims.event_role !== 'planner') {
      return new Response('planner role required for reminders', { status: 403 })
    }
  } else {
    if (claims.event_role !== 'planner' && claims.event_role !== 'signup') {
      return new Response('signup or planner role required', { status: 403 })
    }
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeaders = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  }

  // SECURITY: encodeURIComponent on event_id + signup_id below. Previously
  // these were concatenated directly into the PostgREST query string,
  // letting a crafted id like `wk-x&select=*` change query semantics.
  const eventRes = await fetch(
    `${SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(event_id)}&select=id,home_server`,
    { headers: authHeaders },
  )
  const events = await eventRes.json()
  const event = events[0]
  if (!event) {
    return new Response(JSON.stringify({ skipped: 'event not found' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const secretRes = await fetch(
    `${SUPABASE_URL}/rest/v1/event_secrets?event_id=eq.${encodeURIComponent(event_id)}&select=discord_webhook_url`,
    { headers: authHeaders },
  )
  const secrets = await secretRes.json()
  const webhookUrl = secrets[0]?.discord_webhook_url as string | undefined
  if (!webhookUrl) {
    return new Response(JSON.stringify({ skipped: 'no webhook configured' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ──────────────── Reminder branch ────────────────
  if (action === 'reminder' || action === 'mudsit_reminder') {
    if (!content || !content.trim()) {
      return new Response(JSON.stringify({ skipped: 'empty content' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const embed = {
      title: reminderHeader(action),
      description: content.length > 4000 ? content.slice(0, 3997) + '...' : content,
      color: action === 'mudsit_reminder' ? 0xa16207 : 0x3b82f6,
      footer: { text: `${event.home_server} · ${event.id}` },
      timestamp: new Date().toISOString(),
    }
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
    return new Response(JSON.stringify({ posted: r.ok, status: r.status }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ──────────────── Signup branch ────────────────
  if (!signup_id) {
    return new Response('missing signup_id for signup action', { status: 400 })
  }

  const signupRes = await fetch(
    `${SUPABASE_URL}/rest/v1/signups?id=eq.${encodeURIComponent(signup_id)}&select=ign,alliance_tag,server,tier,troop_type,max_solo_lair,rally_size,willing_captain,shift_pref,state_alliance_joined`,
    { headers: authHeaders },
  )
  const signups = await signupRes.json()
  const signup = signups[0]
  if (!signup) {
    return new Response(JSON.stringify({ skipped: 'signup not found' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const sa = action as SignupAction
  const captainBadge = signup.willing_captain ? ' 👑' : ''
  const joinedBadge = signup.state_alliance_joined ? '✅ in Alliance' : '⚠️ noch nicht in Alliance'
  const desc = [
    `**${signup.ign}** [${signup.alliance_tag}]${captainBadge}`,
    `${TYPE_EMOJI[signup.troop_type] || ''} ${signup.troop_type} · T${signup.tier} · Lair ${signup.max_solo_lair}`,
    `Shifts: \`${signup.shift_pref}\``,
    joinedBadge,
  ].join('\n')

  const embed = {
    title: headlineFor(sa),
    description: desc,
    color: colorFor(sa),
    footer: { text: `${event.home_server} · ${event.id}` },
    timestamp: new Date().toISOString(),
  }

  const r = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  })

  return new Response(
    JSON.stringify({ posted: r.ok, status: r.status }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
