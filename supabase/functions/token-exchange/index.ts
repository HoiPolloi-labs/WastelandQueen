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

type Algo = 'HS256' | 'ES256'

interface SigningMaterial {
  alg: Algo
  /** Header kid claim. Omitted for HS256 — PostgREST tries all symmetric keys. */
  kid?: string
  cryptoKey: CryptoKey
}

let cachedKey: SigningMaterial | null = null

/**
 * Format-detect the secret. Supports three forms:
 *   - JWK (JSON `{...}`)            → ES256 asymmetric private key
 *   - PKCS#8 PEM (`-----BEGIN`)     → ES256 asymmetric private key
 *   - Otherwise base64-ish string   → HS256 legacy shared secret
 *
 * The legacy HS256 path works as long as the project's "Previous Key" tab
 * still lists the HS256 secret (Supabase verifies against it until it's
 * explicitly revoked). New tokens we mint with HS256 are accepted by
 * PostgREST/Realtime via that legacy key.
 */
async function loadSigningKey(): Promise<SigningMaterial> {
  if (cachedKey) return cachedKey
  const trimmed = JWT_PRIVATE_KEY.trim()

  if (trimmed.startsWith('{')) {
    const jwk = JSON.parse(trimmed) as JsonWebKey & { d?: string }
    if (!jwk.d) throw new Error('JWK lacks private d parameter - that is a PUBLIC key')
    const cryptoKey = await crypto.subtle.importKey(
      'jwk', jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['sign'],
    )
    const kid = await matchJwksKid(jwk.x)
    cachedKey = { alg: 'ES256', kid, cryptoKey }
    return cachedKey
  }

  if (trimmed.includes('BEGIN PRIVATE KEY') || trimmed.includes('BEGIN EC PRIVATE KEY')) {
    const b64 = trimmed
      .replace(/-----BEGIN [A-Z ]+-----/g, '')
      .replace(/-----END [A-Z ]+-----/g, '')
      .replace(/\s+/g, '')
    const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8', der.buffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['sign'],
    )
    const kid = await matchJwksKid()
    cachedKey = { alg: 'ES256', kid, cryptoKey }
    return cachedKey
  }

  // HS256 fallback — treat the secret as a UTF-8 string (matches Supabase's
  // legacy HS256 shared secret format).
  const enc = new TextEncoder().encode(trimmed)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc,
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign', 'verify'],
  )
  cachedKey = { alg: 'HS256', cryptoKey }
  return cachedKey
}

async function matchJwksKid(privX?: string): Promise<string> {
  const jwksRes = await fetch(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
  if (!jwksRes.ok) throw new Error(`jwks fetch failed: ${jwksRes.status}`)
  const jwks = await jwksRes.json() as { keys: Array<{ kid: string; alg: string; x?: string }> }
  const es256Keys = jwks.keys.filter((k) => k.alg === 'ES256')
  if (es256Keys.length === 0) throw new Error('no ES256 key in JWKS')
  const matchingKey = privX ? es256Keys.find((k) => k.x === privX) : es256Keys[0]
  if (!matchingKey) {
    throw new Error(`private key (x=${privX?.slice(0, 12)}...) does not match any ES256 key in JWKS - public counterpart must be uploaded to Supabase JWT Keys`)
  }
  return matchingKey.kid
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

    const sig = await loadSigningKey()
    const header: Record<string, string> = { alg: sig.alg, typ: 'JWT' }
    if (sig.kid) header.kid = sig.kid
    const jwt = await create(
      header as { alg: 'HS256' | 'ES256'; typ: 'JWT' },
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
      sig.cryptoKey,
    )

    return new Response(JSON.stringify({ jwt, role, expires_in: JWT_LIFETIME_SECONDS }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    // Log full stack server-side for debugging; only return a sanitized
    // message to the client so we don't leak file paths / function names.
    console.error('token-exchange exception:', e)
    return new Response(JSON.stringify({ error: 'exception', message: (e as Error).message }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
