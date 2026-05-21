import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

interface Body {
  event_id?: string
  signup_id?: string
  action?: 'inserted' | 'updated' | 'withdrawn'
}

const TYPE_EMOJI: Record<string, string> = {
  fighter: '⚔️',
  shooter: '🎯',
  rider: '⚡',
}

function colorFor(action: string): number {
  if (action === 'inserted') return 0x10b981 // emerald
  if (action === 'withdrawn') return 0xef4444 // red
  return 0xfacc15 // yellow for updates
}

function headlineFor(action: string): string {
  if (action === 'inserted') return '✅ Neue Einschreibung'
  if (action === 'withdrawn') return '❌ Abmeldung'
  return '🔄 Eintrag aktualisiert'
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

  const { event_id, signup_id, action } = body
  if (!event_id || !signup_id || !action) {
    return new Response('missing fields', { status: 400 })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeaders = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  }

  const eventRes = await fetch(
    `${SUPABASE_URL}/rest/v1/events?id=eq.${event_id}&select=id,home_server`,
    { headers: authHeaders },
  )
  const events = await eventRes.json()
  const event = events[0]
  if (!event) {
    return new Response(JSON.stringify({ skipped: 'event not found' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  // Webhook URL lives in event_secrets — read only with service-role.
  const secretRes = await fetch(
    `${SUPABASE_URL}/rest/v1/event_secrets?event_id=eq.${event_id}&select=discord_webhook_url`,
    { headers: authHeaders },
  )
  const secrets = await secretRes.json()
  const webhookUrl = secrets[0]?.discord_webhook_url as string | undefined
  if (!webhookUrl) {
    return new Response(JSON.stringify({ skipped: 'no webhook configured' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const signupRes = await fetch(
    `${SUPABASE_URL}/rest/v1/signups?id=eq.${signup_id}&select=ign,alliance_tag,server,tier,troop_type,max_solo_lair,rally_size,willing_captain,shift_pref,state_alliance_joined`,
    { headers: authHeaders },
  )
  const signups = await signupRes.json()
  const signup = signups[0]
  if (!signup) {
    return new Response(JSON.stringify({ skipped: 'signup not found' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const captainBadge = signup.willing_captain ? ' 👑' : ''
  const joinedBadge = signup.state_alliance_joined ? '✅ in Alliance' : '⚠️ noch nicht in Alliance'
  const desc = [
    `**${signup.ign}** [${signup.alliance_tag}]${captainBadge}`,
    `${TYPE_EMOJI[signup.troop_type] || ''} ${signup.troop_type} · T${signup.tier} · Lair ${signup.max_solo_lair}`,
    `Shifts: \`${signup.shift_pref}\``,
    joinedBadge,
  ].join('\n')

  const embed = {
    title: headlineFor(action),
    description: desc,
    color: colorFor(action),
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
