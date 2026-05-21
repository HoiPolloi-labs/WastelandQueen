// Token exchange: client posts {event_id, token}; if the token matches one of
// the event's three role tokens, return a JWT with claims {event_id,
// event_role, role:'authenticated'} signed with the Supabase JWT asymmetric
// private key (ES256). The `kid` header tells Postgres/PostgREST which key
// to verify against — pulled from the live JWKS.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const JWT_PRIVATE_KEY = Deno.env.get('JWT_PRIVATE_KEY') ?? ''

const JWT_LIFETIME_SECONDS = 60 * 60 * 24
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
}

type Role = 'signup' | 'planner' | 'board'
interface EventRow { id: string; signup_token: string; planner_token: string; board_token: string }

function roleFor(row: EventRow, token: string): Role | null {
  if (token === row.planner_token) return 'planner'
  if (token === row.signup_token) return 'signup'
  if (token === row.board_token) return 'board'
  return null
}

let cachedKey: { kid: string; cryptoKey: CryptoKey } | null = null

/**
 * Discover the active signing key once per cold start. The private key is
 * pasted into a function secret in either JWK (JSON) or PKCS#8 PEM form;
 * the kid (key id) is fetched from the project's public JWKS endpoint so
 * we don't have to hardcode it.
 */
async function loadSigningKey(): Promise<{ kid: string; cryptoKey: CryptoKey }> {
  if (cachedKey) return cachedKey

  const jwksRes = await fetch(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
  if (!jwksRes.ok) throw new Error(`jwks fetch failed: ${jwksRes.status}`)
  const jwks = await jwksRes.json() as { keys: Array<{ kid: string; alg: string }> }
  const activeJwk = jwks.keys.find((k) => k.alg === 'ES256')
  if (!activeJwk) throw new Error('no ES256 key in JWKS')

  const trimmed = JWT_PRIVATE_KEY.trim()
  let cryptoKey: CryptoKey

  if (trimmed.startsWith('{')) {
    // JWK form — must include the `d` (private) parameter
    const jwk = JSON.parse(trimmed) as JsonWebKey
    if (!jwk.d) throw new Error('JWK lacks private "d" parameter — that is a PUBLIC key')
    cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    )
  } else if (trimmed.includes('BEGIN PRIVATE KEY') || trimmed.includes('BEGIN EC PRIVATE KEY')) {
    // PKCS#8 PEM form
    const b64 = trimmed
      .replace(/-----BEGIN [A-Z ]+-----/g, '')
      .replace(/-----END [A-Z ]+-----/g, '')
      .replace(/\s+/g, '')
    const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      der.buffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    )
  } else {
    throw new Error('JWT_PRIVATE_KEY must be JWK (JSON) or PKCS#8 PEM')
  }

  cachedKey = { kid: activeJwk.kid, cryptoKey }
  return cachedKey
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
    if (req.method !== 'POST') {
      return new Response('POST only', { status: 405, headers: CORS_HEADERS })
    }

    if (!SUPABASE_URL || !SERVICE_KEY || !JWT_PRIVATE_KEY) {
      const missing = [
        !SUPABASE_URL && 'SUPABASE_URL',
        !SERVICE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
        !JWT_PRIVATE_KEY && 'JWT_PRIVATE_KEY',
      ].filter(Boolean).join(', ')
      return new Response(JSON.stringify({ error: 'config', missing }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => null)
    if (!body?.event_id || !body?.token) {
      return new Response('missing fields', { status: 400, headers: CORS_HEADERS })
    }

    const lookup = await fetch(
      `${SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(body.event_id)}&select=id,signup_token,planner_token,board_token`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    )
    if (!lookup.ok) {
      const text = await lookup.text()
      return new Response(JSON.stringify({ error: 'lookup_failed', status: lookup.status, body: text.slice(0, 200) }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    const rows = (await lookup.json()) as EventRow[]
    const event = rows[0]
    if (!event) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    const role = roleFor(event, body.token)
    if (!role) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { kid, cryptoKey } = await loadSigningKey()
    const jwt = await create(
      { alg: 'ES256', typ: 'JWT', kid },
      {
        iss: `${SUPABASE_URL}/auth/v1`,
        sub: `${event.id}:${role}`,
        role: 'authenticated',
        aud: 'authenticated',
        event_id: event.id,
        event_role: role,
        iat: getNumericDate(0),
        exp: getNumericDate(JWT_LIFETIME_SECONDS),
      },
      cryptoKey,
    )

    return new Response(JSON.stringify({ jwt, role, expires_in: JWT_LIFETIME_SECONDS }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'exception', message: (e as Error).message, stack: (e as Error).stack?.slice(0, 500) }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
