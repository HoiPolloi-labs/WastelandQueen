// Vision-LLM auto-fill for sign-up form. Client POSTs an event_id +
// signup_token + base64-encoded profile screenshot; this function:
//   1. Asks the DB to rate-limit the caller (5/hr per signup_token).
//   2. Hands the image to Anthropic Claude Haiku 4.5 vision.
//   3. Returns the extracted fields as strict JSON.
//
// Verifying via signup_token (not JWT) because this is meant to be called
// BEFORE the user submits, i.e. before any signup row exists for them.
// The signup_token is in the URL anyway, so requiring it adds the same
// blast-radius gate as the JWT path without requiring auth round-trip.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''

const MODEL = 'claude-haiku-4-5'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB before base64 — Anthropic limit

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
}

const SYSTEM_PROMPT =
  `You will receive a screenshot from the mobile game "Puzzles & Survival" ` +
  `showing a player's profile page. The display language may be German, ` +
  `English, Russian, Chinese, Korean, Japanese, or others.

Extract these fields. Return null for any you cannot determine with high confidence.

- ign: the in-game name (player's display name, usually large text at top)
- alliance_tag: 1–4 character alliance tag, often in [BRACKETS] next to the IGN. Null if no alliance.
- server: server identifier. Game may show as "S724", "Server 724", "#724", or just "724". Normalize to "S<digits>" (e.g. "S724").
- might: True Might value as an integer. Profile typically shows "152.3M Might", "1.52B Might", or with comma/dot thousands separators. Convert to absolute integer (152300000, 1520000000). If only "Power" or "Battle Power" is shown — that is NOT True Might; return null.
- tier: highest troop tier as an integer 1–13. May not be visible on the profile screen — return null if uncertain.

Output STRICT JSON with all keys present. No prose, no markdown fences:
{"ign": string|null, "alliance_tag": string|null, "server": string|null, "might": number|null, "tier": number|null}`

interface Body {
  event_id?: string
  signup_token?: string
  image_base64?: string
  media_type?: string
}

interface Extracted {
  ign: string | null
  alliance_tag: string | null
  server: string | null
  might: number | null
  tier: number | null
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: CORS_HEADERS })

    if (!SUPABASE_URL || !SERVICE_KEY || !ANTHROPIC_API_KEY) {
      const missing = [
        !SUPABASE_URL && 'SUPABASE_URL',
        !SERVICE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
        !ANTHROPIC_API_KEY && 'ANTHROPIC_API_KEY',
      ].filter(Boolean).join(', ')
      return json({ error: 'config', missing }, 500)
    }

    const body = await req.json().catch(() => null) as Body | null
    if (!body?.event_id || !body?.signup_token || !body?.image_base64) {
      return json({ error: 'missing fields' }, 400)
    }
    const media_type = body.media_type ?? 'image/jpeg'
    if (!/^image\/(jpeg|png|webp|gif)$/.test(media_type)) {
      return json({ error: 'unsupported media_type' }, 400)
    }
    // base64-encoded image — rough size check (base64 is ~4/3 of binary).
    if (body.image_base64.length * 3 / 4 > MAX_IMAGE_BYTES) {
      return json({ error: 'image too large', limit_bytes: MAX_IMAGE_BYTES }, 413)
    }

    // Rate-limit + log via DB function. Service-role bypasses RLS.
    const rateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/check_and_log_extraction`,
      {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_event_id: body.event_id,
          p_signup_token: body.signup_token,
          p_max_per_hour: 5,
        }),
      },
    )
    if (!rateRes.ok) {
      const t = await rateRes.text()
      return json({ error: 'rate_check_failed', detail: t.slice(0, 200) }, 500)
    }
    const rateBody = await rateRes.json() as Array<{ ok: boolean; reason: string | null; remaining: number }>
    const rate = rateBody[0]
    if (!rate?.ok) {
      const status = rate?.reason === 'invalid_signup_token' ? 401 : 429
      return json({ error: rate?.reason ?? 'rate_denied' }, status)
    }

    // Call Anthropic.
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type, data: body.image_base64 },
              },
              { type: 'text', text: 'Extract the fields per the system instructions.' },
            ],
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const t = await anthropicRes.text()
      return json({ error: 'anthropic_failed', status: anthropicRes.status, detail: t.slice(0, 300) }, 502)
    }
    const ar = await anthropicRes.json() as { content?: Array<{ type: string; text?: string }> }
    const raw = ar.content?.find((b) => b.type === 'text')?.text?.trim() ?? ''

    // Be lenient with stray code fences just in case.
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    let parsed: Extracted
    try {
      parsed = JSON.parse(jsonStr) as Extracted
    } catch {
      return json({ error: 'parse_failed', raw: raw.slice(0, 300) }, 502)
    }

    // Mark the rate-limit row as successful (best-effort, ignore errors).
    await fetch(
      `${SUPABASE_URL}/rest/v1/extraction_log?signup_token=eq.${body.signup_token}&order=called_at.desc&limit=1`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ success: true, model: MODEL }),
      },
    ).catch(() => {})

    return json({
      extracted: parsed,
      remaining: rate.remaining,
      model: MODEL,
    }, 200)
  } catch (e) {
    return json({ error: 'exception', message: (e as Error).message }, 500)
  }
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
