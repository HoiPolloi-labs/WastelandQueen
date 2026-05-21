// Token exchange: client posts {event_id, token}; if the token matches one of
// the event's three role tokens, return a JWT with claims {event_id,
// event_role, role:'authenticated'} signed with the Supabase JWT secret.
// All four standard Supabase auth claims must be present so PostgREST + RLS
// helpers treat the token as a normal authenticated session.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET')!

const JWT_LIFETIME_SECONDS = 60 * 60 * 24 // 24h — single-event use

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

interface Body {
  event_id?: string
  token?: string
}

type Role = 'signup' | 'planner' | 'board'

interface EventRow {
  id: string
  signup_token: string
  planner_token: string
  board_token: string
}

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(JWT_SECRET)
  return crypto.subtle.importKey(
    'raw',
    enc,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function roleFor(row: EventRow, token: string): Role | null {
  if (token === row.planner_token) return 'planner'
  if (token === row.signup_token) return 'signup'
  if (token === row.board_token) return 'board'
  return null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405, headers: CORS_HEADERS })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return new Response('invalid json', { status: 400, headers: CORS_HEADERS })
  }
  const { event_id, token } = body
  if (!event_id || !token) {
    return new Response('missing fields', { status: 400, headers: CORS_HEADERS })
  }

  const lookup = await fetch(
    `${SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(event_id)}&select=id,signup_token,planner_token,board_token`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  )
  if (!lookup.ok) {
    return new Response('lookup failed', { status: 500, headers: CORS_HEADERS })
  }
  const rows = (await lookup.json()) as EventRow[]
  const event = rows[0]
  if (!event) {
    // Don't leak existence — same response as a bad token.
    return new Response(JSON.stringify({ error: 'invalid_token' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
  const role = roleFor(event, token)
  if (!role) {
    return new Response(JSON.stringify({ error: 'invalid_token' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const key = await getKey()
  const jwt = await create(
    { alg: 'HS256', typ: 'JWT' },
    {
      iss: 'supabase',
      sub: `${event.id}:${role}`,
      role: 'authenticated',
      event_id: event.id,
      event_role: role,
      iat: getNumericDate(0),
      exp: getNumericDate(JWT_LIFETIME_SECONDS),
    },
    key,
  )

  return new Response(
    JSON.stringify({ jwt, role, expires_in: JWT_LIFETIME_SECONDS }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  )
})
