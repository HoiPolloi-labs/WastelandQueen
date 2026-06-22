/**
 * Domain types for the Wasteland King (WK) event.
 * See docs/wasteland-king-guide.md for mechanics background.
 */

export type TroopTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

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

/**
 * Parses both the current comma-separated format AND the pre-Pass-A legacy
 * enum values ('first'/'second'/'both'). Defensive against old browser tabs
 * still running pre-migration bundles, or stray DB rows from outside the app.
 */
export function parseShiftPref(pref: string): ShiftNumber[] {
  const trimmed = pref.trim().toLowerCase()
  if (trimmed === 'first') return [1]
  if (trimmed === 'second') return [2]
  if (trimmed === 'both') return [1, 2]
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
  /** Per-event role tokens. signup_token gates the public signup URL,
   *  planner_token gates the organizer's CRUD URL, board_token gates the
   *  read-only PNG/QR view. All exchanged for JWTs via token-exchange Edge Fn. */
  signup_token: string
  planner_token: string
  board_token: string
  /** How many defenders auto-sort should park on the Hub alongside the captain.
   *  Same troop type as the captain (Super Reinforcement synergy). 0 = captain-only. */
  hub_defender_target: number
  /** Single IGN that received the high-rarity King's-Sword Box (governor's call). */
  king_sword_recipient_ign: string | null
  /** Frozen state grade for King's-Sword box value: Gold=10, Platinum=16, Diamond=20 Nataly frags. */
  king_sword_grade: 'gold' | 'platinum' | 'diamond' | null
  /** When the governor drained the Coffer tax stream. null = not yet collected. */
  coffer_collected_at: string | null
  /** Governor's log: who got Coffer-funded retraining etc. */
  coffer_notes: string | null
  /** When true, Signup form shows hero-frag inputs and Awards shows totals.
   *  Default off; enable for Gold+ states coordinating Nataly progression. */
  heroes_enabled: boolean
  /** When true, Auto-Sort fills Hub + each turret with as many same-type
   *  defenders as the captain's rally_size can hold (estimated march per
   *  defender summed against rally cap) instead of using the fixed
   *  hub_defender_target count. Surplus same-type players go to reserve. */
  auto_fill_to_capacity: boolean
  /** Per-alliance total member counts the planner enters, keyed by alliance tag
   *  (e.g. { LOY: 97, WOW: 79 }). Drives the participation % in the alliance
   *  dashboard; sign-up counts + #-in-towers are derived, not stored. */
  alliance_sizes: Record<string, number>
  /** "Minimum line" — alliances below this participation % are flagged. */
  min_participation_pct: number
  created_at: string
}


/** Pre-event checklist keys. All optional; absence is equivalent to false. */
export type ChecklistKey = 'taxis' | 'speedups' | 'heroes' | 'shield'
export type Checklist = Partial<Record<ChecklistKey, boolean>>

export const CHECKLIST_KEYS: ChecklistKey[] = ['taxis', 'speedups', 'heroes', 'shield']

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
  /** Troops the player can send per march (cap on each rally-join). Optional
   *  on the form; capacity-fill auto-sort uses it to size defender slots and
   *  falls back to rally_size when null. */
  march_size: number | null
  /** Secondary troop type(s) the player can field (1–3 of fighter/shooter/rider),
   *  with its highest tier. Display/filter only — never feeds auto-sort or the
   *  synergy ring (primary troop_type owns those). null = none declared. */
  secondary_troop_types: TroopType[] | null
  secondary_tier: TroopTier | null
  true_might: number | null
  willing_captain: boolean
  /** Available at WLK start to defend the home Hub if it's attacked. */
  defend_at_start: boolean
  /** Consents to be placed on the Hit-Squad (take a foreign state's Hub). */
  willing_foreign_hub: boolean
  shift_pref: ShiftPref
  planner_notes: string | null
  state_alliance_joined: boolean
  /** Pre-event readiness items; player ticks them as they prepare. */
  checklist: Checklist
  /** Post-event capture, set by governor */
  attended: boolean | null
  kill_points: number
  death_points: number
  occupation_points: number
  might_lost: number
  /** In-game WK personal-reward total ("Aktuelle Pkte"). null = not entered;
   *  when present it is the authoritative ranking key on the Awards page
   *  (contribution.ts ranks wk_points-recorded players above the rest). */
  wk_points: number | null
  /** Planner has confirmed this row's post-event numbers. Any player self-write
   *  via update_signup_self force-resets this to false — players can never
   *  self-verify, and re-editing a verified row drops it back to unverified. */
  awards_verified: boolean
  box_tier: BoxTier | null
  /** Hero fragment inventory. Only meaningful when event.heroes_enabled. */
  agent_x_frags: number
  dr_j_frags: number
  nataly_frags: number
  /** UUID returned on insert, client stores in localStorage to gate Withdraw */
  edit_token: string
  submitted_at: string
}

/** Governor's Award Box tiers per WK guide */
export type BoxTier = 'king' | 'rulers' | 'loyalty' | 'contribution'

export const BOX_TIER_LABELS: Record<BoxTier, string> = {
  king: "King's Award",
  rulers: "Rulers' Award",
  loyalty: 'Loyalty Award',
  contribution: 'Contribution Award',
}

export interface Assignment {
  id: string
  event_id: string
  signup_id: string
  building: Building
  shift: ShiftNumber
  is_captain: boolean
  position: number
  /** Live-event flag set by Gov/R5: null = unknown, true = present, false = absent.
   *  Only meaningful when `is_captain` is true; null on non-captain rows. */
  captain_present: boolean | null
  /** For Hit-Squad rows: which foreign state this captain group is tasked with
   *  (e.g. 'S850'). Null for all other buildings. Soft contract — not constrained
   *  to event.foreign_targets, since changing the event-level targets shouldn't
   *  cascade-invalidate live assignments. */
  foreign_target: string | null
  updated_at: string
}

export type NapStatus = 'proposed' | 'agreed' | 'broken' | 'expired'

export interface NapTerm {
  id: string
  event_id: string
  with_state: string
  terms: string
  status: NapStatus
  /** Optional NAP window — null = "until further notice". Both UTC ISO strings. */
  starts_at_utc: string | null
  ends_at_utc: string | null
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
  13: 120, // extrapolated — pnsdme chart only goes to T12; the T11→T12 jump is +20 so a linear extrapolation lands at 120, not 125. Adjust when the official figure surfaces.
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
  13: 120, // extrapolated — same caveat as KILL_POINTS[13], linear from the T11→T12 +20 step.
}

export const OCCUPATION_CAP_POINTS = 2000
export const OCCUPATION_CAP_MINUTES = 120
export const PERSONAL_REWARD_TARGET = 10_000
