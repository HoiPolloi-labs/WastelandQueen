import type {
  Assignment,
  ShiftNumber,
  Signup,
  TroopType,
  TurretMode,
  Turret,
} from '@/types/wk'
import { TURRETS, parseShiftPref } from '@/types/wk'

export interface AutoSortInput {
  signups: Signup[]
  turretMode: TurretMode
  shiftCount: 1 | 2 | 3 | 4
  /** Number of defenders to park on the Hub alongside the captain (same
   *  troop type for Super-Reinforcement synergy). Default 4. Ignored when
   *  `autoFillToCapacity` is true — capacity logic supersedes it. */
  hubDefenderTarget?: number
  /** When true, ignore `hubDefenderTarget` and instead fill Hub + each
   *  turret with as many same-type defenders as the captain's `rally_size`
   *  can hold. Each defender contributes their own `rally_size` to the
   *  building's running total; the captain hosts so doesn't subtract.
   *  Same-type surplus goes to reserve. */
  autoFillToCapacity?: boolean
}

/**
 * WK domain: each defender joining a rally contributes their `march_size`
 * (one march per joiner). Falls back to `rally_size` when march_size is
 * missing — march is always ≤ rally, so the fallback overestimates each
 * defender's footprint and fewer defenders fit (conservative side). 0 if
 * both are missing or non-finite.
 *
 * NaN/Infinity guard: a malformed payload or stray import could surface
 * `NaN`, which silently bypasses every cap comparison (`x + NaN > cap`
 * is always false). Force-finite via `Number.isFinite` before clamping.
 */
export function defenderContribution(s: Signup): number {
  const raw = s.march_size ?? s.rally_size ?? 0
  return Number.isFinite(raw) ? Math.max(0, raw) : 0
}

/**
 * Cap-aware filler used by the Hub and per-turret loops when
 * `autoFillToCapacity` is on. Walks the candidate pool in pre-sorted
 * (strongest-first) order, adding each defender whose `march_size`
 * contribution still fits under the captain's `rally_size` cap. Walks the
 * full pool — doesn't break on first non-fit — so smaller players can still
 * slip in after a big one would have overflowed.
 *
 * Captain's own slot is treated as zero-cost (they ARE the rally host); the
 * cap measures joiner contributions. Cap is the captain's `rally_size`; a
 * missing captain rally falls back to 0 (no defenders fit, manual triage).
 */
export function fillToCapacity(
  candidates: readonly Signup[],
  captainRally: number,
  used: Set<string>,
): Signup[] {
  // NaN/Infinity guard: `Math.max(0, NaN)` is NaN, and `running + x > NaN`
  // is always false → would silently admit everyone. Treat non-finite as 0.
  const cap = Number.isFinite(captainRally) ? Math.max(0, captainRally) : 0
  let running = 0
  const out: Signup[] = []
  for (const s of candidates) {
    if (used.has(s.id)) continue
    const contribution = defenderContribution(s)
    if (running + contribution > cap) continue
    out.push(s)
    running += contribution
  }
  return out
}

export type DraftAssignment = Pick<
  Assignment,
  'signup_id' | 'building' | 'shift' | 'is_captain' | 'position'
>

const ALL_TYPES = ['fighter', 'shooter', 'rider'] as const

/**
 * Higher = better captain.
 *
 * The WK guide (docs/wasteland-king-guide.md) ranks **rally size first**
 * because Captain-Rally = Building-Capacity. This implementation softens
 * that to tier-primary + rally-secondary on Marcel's observation that
 * within his state, tier strongly correlates with troop stats (rally
 * scales with castle level, not skill). The two diverge mainly at the
 * extremes — a fresh T13 with low rally can outrank a maxed T11 with
 * massive rally, where the guide would pick the T11. Audit periodically:
 * if too many "wrong" captains get auto-picked, rebalance toward rally
 * primacy (e.g. `rally/100k × 8 + tier × 10 + lair`).
 *
 *   tier × 20 + rally/100k × 4 + lair × 1
 *
 * Example distribution:
 *   T13 whale  4M / 80  → 500
 *   T12 strong 3M / 60  → 420
 *   T11 mid    2M / 50  → 350
 *   T13 weak   1M / 30  → 330  (rally lets T12 beat T13 within ~2M gap)
 *   T10        1M / 30  → 270
 *   T8 newer  250k / 10 → 178
 */
export function captainScore(s: Signup): number {
  const rallyUnits = (s.rally_size ?? 0) / 100_000
  return s.tier * 20 + rallyUnits * 4 + s.max_solo_lair
}

const strongestFirst = (a: Signup, b: Signup) => captainScore(b) - captainScore(a)

function shiftPoolFor(signups: Signup[], shift: ShiftNumber): Signup[] {
  return signups.filter((s) => parseShiftPref(s.shift_pref).includes(shift))
}

function dominantType(pool: Signup[]): TroopType {
  const counts: Record<TroopType, number> = { fighter: 0, shooter: 0, rider: 0 }
  for (const s of pool) counts[s.troop_type]++
  let best: TroopType = 'fighter'
  let bestN = -1
  for (const t of ALL_TYPES) {
    if (counts[t] > bestN) {
      best = t
      bestN = counts[t]
    }
  }
  return best
}

interface TurretLayout {
  typeToTurrets: Record<TroopType, Turret[]>
  mixedTurret: Turret | null
}

function turretLayout(mode: TurretMode, pool: Signup[]): TurretLayout {
  if (mode === 'mixed-4th') {
    // Each type has its own type-pure turret. turret-w is intentionally left empty
    // by auto-sort — the planner uses it as a manual overflow / "captain's choice" bucket.
    // Players whose type already has a turret never end up in mixedBucket because
    // typeToTurrets[type].length is 1, not 0.
    return {
      typeToTurrets: {
        fighter: ['turret-n'],
        shooter: ['turret-e'],
        rider: ['turret-s'],
      },
      mixedTurret: 'turret-w',
    }
  }
  if (mode === 'manual') {
    return {
      typeToTurrets: { fighter: [], shooter: [], rider: [] },
      mixedTurret: null,
    }
  }
  // duplicate-strongest
  const dom = dominantType(pool)
  const others = ALL_TYPES.filter((t) => t !== dom)
  const layout: Record<TroopType, Turret[]> = {
    fighter: [],
    shooter: [],
    rider: [],
  }
  layout[dom] = ['turret-n', 'turret-s']
  layout[others[0]!] = ['turret-e']
  layout[others[1]!] = ['turret-w']
  return { typeToTurrets: layout, mixedTurret: null }
}

/**
 * Sort signups into a draft assignment list, one entry per (signup × shift).
 * Caller decides whether to upsert.
 */
export function autoSort(input: AutoSortInput): DraftAssignment[] {
  const out: DraftAssignment[] = []
  const shifts: ShiftNumber[] = Array.from(
    { length: input.shiftCount },
    (_, i) => (i + 1) as ShiftNumber,
  )

  // Turret-type layout is an EVENT-level decision, computed ONCE from the full
  // roster — never per shift. Recomputing per shift let `dominantType` differ
  // between shifts (each shift has a different player mix), which flipped a
  // physical turret's troop type from one shift to the next (e.g. North =
  // fighter in shift 1 but shooter in shift 2). The alliance keeps one fixed
  // defensive layout across all shifts, so the same type→turret mapping must
  // apply to every shift. (mixed-4th / manual layouts are already shift-stable
  // — their mapping ignores the pool — so this only changes duplicate-strongest.)
  const layout = turretLayout(input.turretMode, input.signups)

  for (const shift of shifts) {
    const pool = shiftPoolFor(input.signups, shift).sort(strongestFirst)

    if (input.turretMode === 'manual') {
      pool.forEach((s, i) => {
        out.push({
          signup_id: s.id,
          building: 'unassigned',
          shift,
          is_captain: false,
          position: i,
        })
      })
      continue
    }

    const used = new Set<string>()
    const hubDefenders: Signup[] = []

    // Hub: stärkster willing-captain, typunabhängig
    const hubCaptain = pool.find((s) => s.willing_captain)
    if (hubCaptain) used.add(hubCaptain.id)

    // Hub-Defender: same troop type as captain (Super-Reinforcement synergy).
    // Two modes:
    //  - capacity: fill until joiners' rally_size sum approaches captain's
    //    rally cap (WK domain — captain.rally = building capacity)
    //  - fixed: K next-strongest same-type players (hubDefenderTarget)
    // Either way: no captain → no Hub defenders.
    if (hubCaptain) {
      const captainType = hubCaptain.troop_type
      const sameType = pool.filter((s) => s.troop_type === captainType && !used.has(s.id))
      if (input.autoFillToCapacity) {
        const picked = fillToCapacity(sameType, hubCaptain.rally_size ?? 0, used)
        for (const s of picked) {
          used.add(s.id)
          hubDefenders.push(s)
        }
      } else {
        const hubTarget = Math.max(0, input.hubDefenderTarget ?? 4)
        for (const s of sameType) {
          if (hubDefenders.length >= hubTarget) break
          used.add(s.id)
          hubDefenders.push(s)
        }
      }
    }

    // Türme: Captain pro Typ, dann Füllung (Layout ist event-weit fixiert, s.o.)
    const turretMembers: Record<Turret, Signup[]> = {
      'turret-n': [],
      'turret-s': [],
      'turret-e': [],
      'turret-w': [],
    }
    const turretCaptainIds = new Set<string>()

    for (const type of ALL_TYPES) {
      for (const turret of layout.typeToTurrets[type]) {
        const captain = pool.find(
          (s) => s.troop_type === type && s.willing_captain && !used.has(s.id),
        )
        if (captain) {
          used.add(captain.id)
          turretCaptainIds.add(captain.id)
          turretMembers[turret].push(captain)
        }
      }
    }

    // Leftover-Verteilung. In capacity mode we additionally enforce a
    // per-turret cap derived from THAT turret's captain.rally_size; surplus
    // same-type players spill into reserve (or mixed-W for mixed-4th-mode
    // off-types). In fixed mode there's no cap — same as before.
    const rotateIndex: Record<TroopType, number> = { fighter: 0, shooter: 0, rider: 0 }
    const reserves: Signup[] = []
    const mixedBucket: Signup[] = []

    // Pre-compute per-turret capacity tracking (capacity mode only). Captains
    // already in turretMembers[turret] don't subtract — they host the rally.
    //
    // Design intent for the cap=0 case (no captain at all on the turret —
    // happens when there's no willing-captain of the type, or in mixed-4th
    // mode where turret-W is captain-less by design): same-type leftovers
    // get rejected to reserve. That's correct WK domain logic — without a
    // captain there's no rally on that building to join, so parking a
    // defender there in capacity mode would be theatre. Planner sees the
    // gap in the reserve pool + the captain-less turret and decides.
    const turretCap: Record<Turret, number> = {
      'turret-n': 0,
      'turret-s': 0,
      'turret-e': 0,
      'turret-w': 0,
    }
    const turretUsed: Record<Turret, number> = {
      'turret-n': 0,
      'turret-s': 0,
      'turret-e': 0,
      'turret-w': 0,
    }
    if (input.autoFillToCapacity) {
      for (const turret of TURRETS) {
        const captain = turretMembers[turret].find((s) => turretCaptainIds.has(s.id))
        turretCap[turret] = Math.max(0, captain?.rally_size ?? 0)
      }
    }

    const fitsInTurret = (turret: Turret, candidate: Signup): boolean => {
      if (!input.autoFillToCapacity) return true
      return turretUsed[turret] + defenderContribution(candidate) <= turretCap[turret]
    }

    const recordInTurret = (turret: Turret, candidate: Signup): void => {
      turretMembers[turret].push(candidate)
      if (input.autoFillToCapacity) {
        turretUsed[turret] += defenderContribution(candidate)
      }
    }

    for (const s of pool) {
      if (used.has(s.id)) continue
      used.add(s.id)
      const turrets = layout.typeToTurrets[s.troop_type]
      if (turrets.length === 0) {
        if (layout.mixedTurret) mixedBucket.push(s)
        else reserves.push(s)
        continue
      }
      // Round-robin BUT skip turrets that are full (capacity mode). If none
      // fit, the player goes to reserve. We try every turret of this type
      // starting from the round-robin index — first one that fits wins.
      let placed = false
      for (let i = 0; i < turrets.length; i++) {
        const idx = (rotateIndex[s.troop_type] + i) % turrets.length
        const turret = turrets[idx]!
        if (fitsInTurret(turret, s)) {
          recordInTurret(turret, s)
          rotateIndex[s.troop_type] = idx + 1
          placed = true
          break
        }
      }
      if (!placed) reserves.push(s)
    }

    if (layout.mixedTurret) {
      // Mixed-W catches off-type leftovers. Capacity-check it too if active.
      for (const s of mixedBucket) {
        if (fitsInTurret(layout.mixedTurret, s)) {
          recordInTurret(layout.mixedTurret, s)
        } else {
          reserves.push(s)
        }
      }
    }

    // Output: Hub captain + Hub defenders, Turret members, Reserves
    if (hubCaptain) {
      out.push({
        signup_id: hubCaptain.id,
        building: 'hub',
        shift,
        is_captain: true,
        position: 0,
      })
      hubDefenders.forEach((s, i) => {
        out.push({
          signup_id: s.id,
          building: 'hub',
          shift,
          is_captain: false,
          position: i + 1,
        })
      })
    }
    for (const turret of TURRETS) {
      turretMembers[turret].forEach((s, i) => {
        out.push({
          signup_id: s.id,
          building: turret,
          shift,
          is_captain: turretCaptainIds.has(s.id),
          position: i,
        })
      })
    }
    reserves.forEach((s, i) => {
      out.push({
        signup_id: s.id,
        building: 'reserve',
        shift,
        is_captain: false,
        position: i,
      })
    })
  }

  return out
}
