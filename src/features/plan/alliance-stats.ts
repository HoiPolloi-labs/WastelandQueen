import type { Assignment, Building, Signup } from '@/types/wk'

/**
 * Per-alliance participation, mirroring the old Statistics tab: how many of an
 * alliance's members signed up, what % of the alliance that is (vs a planner-
 * entered total), and how many are actually placed in a real defensive building.
 * Pure so the panel re-renders cheaply and the math is unit-tested.
 */
export interface AllianceStat {
  tag: string
  /** # of signups carrying this alliance_tag. */
  signupCount: number
  /** Planner-entered roster size from event.alliance_sizes; null if unset/0. */
  totalMembers: number | null
  /** signupCount / totalMembers × 100; null when total is missing/0 (no DIV/0). */
  participationPct: number | null
  /** participationPct is known and below the minimum line. */
  belowLine: boolean
  /** # of this alliance's players assigned to Hub or a turret (deduped across
   *  shifts — a player in both shift 1 & 2 counts once). */
  inTowers: number
}

/** Buildings that count as "in a tower" for participation — the real defensive
 *  positions (mud/reserve/hit-squad/unassigned don't count). */
export const DEFENSIVE_BUILDINGS: readonly Building[] = [
  'hub',
  'turret-n',
  'turret-s',
  'turret-e',
  'turret-w',
]

export function computeAllianceStats(
  signups: Signup[],
  assignments: Assignment[],
  allianceSizes: Record<string, number>,
  minPct: number,
): AllianceStat[] {
  const defensive = new Set<Building>(DEFENSIVE_BUILDINGS)

  // signup_id → alliance_tag, so we can attribute assignments to alliances.
  const tagBySignup = new Map<string, string>()
  const signupCount = new Map<string, number>()
  for (const s of signups) {
    tagBySignup.set(s.id, s.alliance_tag)
    signupCount.set(s.alliance_tag, (signupCount.get(s.alliance_tag) ?? 0) + 1)
  }

  // Dedup "in towers" by signup_id (a player assigned across both shifts = 1).
  const inTowerSignupIds = new Set<string>()
  for (const a of assignments) {
    if (!defensive.has(a.building)) continue
    inTowerSignupIds.add(a.signup_id)
  }
  const inTowers = new Map<string, number>()
  for (const id of inTowerSignupIds) {
    const tag = tagBySignup.get(id)
    if (!tag) continue
    inTowers.set(tag, (inTowers.get(tag) ?? 0) + 1)
  }

  // Union of tags seen in signups + any pre-entered in alliance_sizes (lets a
  // planner record an alliance's roster size before anyone has signed up).
  const tags = new Set<string>([...signupCount.keys(), ...Object.keys(allianceSizes)])

  const out: AllianceStat[] = []
  for (const tag of tags) {
    const count = signupCount.get(tag) ?? 0
    const rawTotal = allianceSizes[tag]
    const totalMembers =
      typeof rawTotal === 'number' && Number.isFinite(rawTotal) && rawTotal > 0
        ? rawTotal
        : null
    const participationPct = totalMembers ? (count / totalMembers) * 100 : null
    out.push({
      tag,
      signupCount: count,
      totalMembers,
      participationPct,
      belowLine: participationPct != null && participationPct < minPct,
      inTowers: inTowers.get(tag) ?? 0,
    })
  }

  // Most sign-ups first, then alphabetical — matches how a planner scans it.
  out.sort((a, b) =>
    b.signupCount !== a.signupCount
      ? b.signupCount - a.signupCount
      : a.tag.localeCompare(b.tag),
  )
  return out
}
