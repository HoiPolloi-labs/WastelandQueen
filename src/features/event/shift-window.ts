import type { ShiftNumber } from '@/types/wk'

/**
 * 24h event divided evenly into shiftCount slots.
 * Returns the UTC window for a given shift (1-indexed).
 */
export function shiftWindow(
  eventStartIso: string,
  shiftCount: number,
  shiftNumber: ShiftNumber,
): { startUtc: Date; endUtc: Date } {
  const totalMinutes = 24 * 60
  const slotMinutes = totalMinutes / shiftCount
  const start = new Date(eventStartIso)
  const startMs = start.getTime() + (shiftNumber - 1) * slotMinutes * 60_000
  const endMs = startMs + slotMinutes * 60_000
  return { startUtc: new Date(startMs), endUtc: new Date(endMs) }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function shiftWindowLabel(
  eventStartIso: string,
  shiftCount: number,
  shiftNumber: ShiftNumber,
): string {
  const { startUtc, endUtc } = shiftWindow(eventStartIso, shiftCount, shiftNumber)
  return `${pad(startUtc.getUTCHours())}:${pad(startUtc.getUTCMinutes())}–${pad(
    endUtc.getUTCHours(),
  )}:${pad(endUtc.getUTCMinutes())} UTC`
}
