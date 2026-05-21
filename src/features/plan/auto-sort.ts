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
   *  troop type for Super-Reinforcement synergy). Default 4. */
  hubDefenderTarget?: number
}

export type DraftAssignment = Pick<
  Assignment,
  'signup_id' | 'building' | 'shift' | 'is_captain' | 'position'
>

const ALL_TYPES = ['fighter', 'shooter', 'rider'] as const

/**
 * Higher = better captain. Rally dominates per WK guide; lair + tier as tiebreakers.
 */
export function captainScore(s: Signup): number {
  const rallyUnits = (s.rally_size ?? 0) / 100_000 // 1M → 10
  return rallyUnits * 6 + s.max_solo_lair * 3 + s.tier
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

    // Hub-Defender: nächste K Spieler vom Captain-Typ (Super-Reinforcement-Synergy).
    // Wenn kein Hub-Captain existiert, kein Hub-Defender-Sense — skip.
    const hubTarget = Math.max(0, input.hubDefenderTarget ?? 4)
    if (hubCaptain && hubTarget > 0) {
      const captainType = hubCaptain.troop_type
      for (const s of pool) {
        if (hubDefenders.length >= hubTarget) break
        if (used.has(s.id)) continue
        if (s.troop_type !== captainType) continue
        used.add(s.id)
        hubDefenders.push(s)
      }
    }

    // Türme: Captain pro Typ, dann Füllung
    const layout = turretLayout(input.turretMode, pool.filter((s) => !used.has(s.id)))
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

    // Leftover-Verteilung
    const rotateIndex: Record<TroopType, number> = { fighter: 0, shooter: 0, rider: 0 }
    const reserves: Signup[] = []
    const mixedBucket: Signup[] = []

    for (const s of pool) {
      if (used.has(s.id)) continue
      used.add(s.id)
      const turrets = layout.typeToTurrets[s.troop_type]
      if (turrets.length === 0) {
        if (layout.mixedTurret) mixedBucket.push(s)
        else reserves.push(s)
      } else {
        const turret = turrets[rotateIndex[s.troop_type] % turrets.length]!
        rotateIndex[s.troop_type]++
        turretMembers[turret].push(s)
      }
    }

    if (layout.mixedTurret) {
      turretMembers[layout.mixedTurret].push(...mixedBucket)
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
