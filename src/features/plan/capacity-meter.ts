import type { Signup } from '@/types/wk'
import { defenderContribution } from './auto-sort'

/**
 * The "Remaining" capacity view their old Tower-assignment sheet showed as a
 * running column: a building's captain rally is the total capacity, and each
 * joining defender consumes their march. This computes that for live display
 * during manual drag-drop (auto-sort already does the same math internally via
 * `defenderContribution`; this surfaces it to the planner).
 */
export interface CapacityMeter {
  /** Captain's rally_size = building capacity. 0 when no captain / null rally. */
  cap: number
  /** Σ defenderContribution over the non-captain members (the captain hosts the
   *  rally, so they don't consume capacity — consistent with auto-sort's fill). */
  used: number
  /** used/cap as a 0–100 percentage, clamped to [0,100]. 0 when cap is 0. */
  pct: number
  /** used strictly exceeds cap — the building is over-filled. */
  overCap: boolean
  /** Whether a captain exists at all (callers hide the meter when false). */
  hasCaptain: boolean
}

/**
 * @param members all assignments-resolved signups in the building (incl. captain)
 * @param captainId the signup_id flagged is_captain in this building, or null
 */
export function computeCapacityMeter(
  members: Signup[],
  captainId: string | null,
): CapacityMeter {
  const captain = captainId ? members.find((m) => m.id === captainId) ?? null : null
  // No captain → no rally is being hosted, so the meter is meaningless: nothing
  // is "used". (Callers hide it via hasCaptain anyway.)
  if (!captain) {
    return { cap: 0, used: 0, pct: 0, overCap: false, hasCaptain: false }
  }
  const rawCap = captain.rally_size ?? 0
  const cap = Number.isFinite(rawCap) ? Math.max(0, rawCap) : 0

  let used = 0
  for (const m of members) {
    if (m.id === captainId) continue // captain hosts; doesn't consume capacity
    used += defenderContribution(m)
  }

  const pct = cap > 0 ? Math.min(100, Math.max(0, (used / cap) * 100)) : 0
  return {
    cap,
    used,
    pct,
    overCap: cap > 0 && used > cap,
    hasCaptain: captain != null,
  }
}
