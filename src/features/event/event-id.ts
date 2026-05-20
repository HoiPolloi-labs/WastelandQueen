/**
 * WK runs every other Saturday at 10:00 UTC. Generate stable event IDs like 'wk-2026-05-31'.
 */
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

export function eventIdFromIso(iso: string): string {
  return `wk-${iso.slice(0, 10)}`
}

export function isoFromEventId(id: string): string | null {
  const m = /^wk-(\d{4}-\d{2}-\d{2})$/.exec(id)
  if (!m) return null
  return `${m[1]}T10:00:00.000Z`
}
