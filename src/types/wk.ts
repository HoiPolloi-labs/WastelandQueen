/**
 * Domain types for the Wasteland King (WK) event.
 * See docs/wasteland-king-guide.md for mechanics background.
 */

export type TroopTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export type TroopType = 'fighter' | 'shooter' | 'rider'

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
  | 'unassigned'

export const TURRETS = ['turret-n', 'turret-s', 'turret-e', 'turret-w'] as const
export type Turret = (typeof TURRETS)[number]

export type ShiftPref = 'first' | 'second' | 'both'
export type ShiftNumber = 1 | 2

export type TurretMode = 'duplicate-strongest' | 'mixed-4th' | 'manual'

export interface EventConfig {
  id: string
  starts_at_utc: string
  shift_count: number
  turret_mode: TurretMode
  home_server: string
  notes: string | null
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
  willing_captain: boolean
  shift_pref: ShiftPref
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
