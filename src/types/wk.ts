/**
 * Domain types for the Wasteland King (WK) event.
 * See docs/wasteland-king-guide.md for mechanics background.
 */

export type TroopTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export type TroopType = 'fighter' | 'shooter' | 'rider'

/**
 * State-Grade gates rewards (per WK guide):
 * - Nataly frags only unlock at Gold+ (Gold=5, Platinum=8, Diamond=12)
 * - Gold+ states LOSE trophies if they only defend; they must take a foreign hub
 */
export type StateGrade =
  | 'starter'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'legend'

/** Buildings on the Zenith Plaza. 'unassigned' is the planner-side pool. */
export type Building =
  | 'hub'
  | 'turret-n'
  | 'turret-s'
  | 'turret-e'
  | 'turret-w'
  | 'mud'
  | 'reserve'
  | 'hit-squad'
  | 'unassigned'

export const TURRETS = ['turret-n', 'turret-s', 'turret-e', 'turret-w'] as const
export type Turret = (typeof TURRETS)[number]

/** Comma-separated shift numbers, e.g. "1", "1,2", "1,3,4". */
export type ShiftPref = string
export type ShiftNumber = 1 | 2 | 3 | 4

export function parseShiftPref(pref: string): ShiftNumber[] {
  return pref
    .split(',')
    .map((s) => Number(s.trim()) as ShiftNumber)
    .filter((n): n is ShiftNumber => n >= 1 && n <= 4)
}

export function serializeShiftPref(shifts: ShiftNumber[]): string {
  return [...new Set(shifts)].sort((a, b) => a - b).join(',')
}

export type TurretMode = 'duplicate-strongest' | 'mixed-4th' | 'manual'

export interface EventConfig {
  id: string
  starts_at_utc: string
  shift_count: number
  turret_mode: TurretMode
  home_server: string
  notes: string | null
  state_grade: StateGrade | null
  governor_ign: string | null
  assessor_ign: string | null
  negotiator_ign: string | null
  /** S-codes of the up-to-3 opposing states currently targeted by hit-squad */
  foreign_targets: string[] | null
  created_at: string
}


export interface Signup {
  id: string
  event_id: string
  ign: string
  alliance_tag: string
  server: string
  tier: TroopTier
  troop_type: TroopType
  max_solo_lair: number
  rally_size: number | null
  true_might: number | null
  willing_captain: boolean
  shift_pref: ShiftPref
  planner_notes: string | null
  state_alliance_joined: boolean
  submitted_at: string
}

export interface Assignment {
  id: string
  event_id: string
  signup_id: string
  building: Building
  shift: ShiftNumber
  is_captain: boolean
  position: number
  updated_at: string
}

export type NapStatus = 'proposed' | 'agreed' | 'broken' | 'expired'

export interface NapTerm {
  id: string
  event_id: string
  with_state: string
  terms: string
  status: NapStatus
  created_at: string
  updated_at: string
}

/**
 * Per the pnsdme.com point chart.
 * Kill points = points YOU earn for killing enemy units (at Hub/turrets OR in mud/foreign RSS tiles).
 * Death points = points YOU earn when YOUR troops die (Hub or turret only — mud deaths don't count).
 */
export const KILL_POINTS: Record<TroopTier, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 8,
  5: 12,
  6: 16,
  7: 20,
  8: 30,
  9: 40,
  10: 60,
  11: 80,
  12: 100,
}

export const DEATH_POINTS: Record<TroopTier, number> = {
  1: 4,
  2: 6,
  3: 8,
  4: 12,
  5: 15,
  6: 20,
  7: 25,
  8: 33,
  9: 45,
  10: 60,
  11: 80,
  12: 100,
}

export const OCCUPATION_CAP_POINTS = 2000
export const OCCUPATION_CAP_MINUTES = 120
export const PERSONAL_REWARD_TARGET = 10_000
