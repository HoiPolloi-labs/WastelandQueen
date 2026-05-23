/**
 * WK runs every other Saturday at 10:00 UTC. Generate stable event IDs like
 * `wk-2026-05-30-x4q9` — date prefix for human readability plus a 4-char
 * base32 salt for unguessability (short URLs use the event-ID as the public
 * slug; without entropy, `waqu.app/s/wk-YYYY-MM-DD` would be trivially
 * enumerable since WK always falls on Saturdays).
 *
 * Legacy events (created pre-salt) used the date-only form `wk-2026-05-30`.
 * `isoFromEventId` accepts both shapes; only new events get a salt.
 */

/** Crockford-ish base32 minus `0 1 i l o` so handwritten codes don't ambiguate. */
const SALT_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

export function generateEventSalt(): string {
  const buf = new Uint8Array(4)
  crypto.getRandomValues(buf)
  let out = ''
  for (const b of buf) out += SALT_ALPHABET[b % SALT_ALPHABET.length]
  return out
}

export function nextSaturdayIso(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0))
  const daysUntilSat = (6 - d.getUTCDay() + 7) % 7
  // if today IS Saturday but past 10:00 UTC, jump to next week
  if (daysUntilSat === 0 && now.getUTCHours() >= 10) {
    d.setUTCDate(d.getUTCDate() + 7)
  } else {
    d.setUTCDate(d.getUTCDate() + daysUntilSat)
  }
  return d.toISOString()
}

export function eventIdFromIso(iso: string, salt: string): string {
  return `wk-${iso.slice(0, 10)}-${salt}`
}

export function isoFromEventId(id: string): string | null {
  // New form: wk-YYYY-MM-DD-<3-8 char salt>
  // Legacy:   wk-YYYY-MM-DD (no salt)
  const m = /^wk-(\d{4}-\d{2}-\d{2})(?:-[a-z2-9]{3,8})?$/.exec(id)
  if (!m) return null
  return `${m[1]}T10:00:00.000Z`
}
